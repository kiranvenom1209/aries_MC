import React, { useEffect, useMemo, useState } from 'react';
import { useROS } from '../../context/ROSContext';
import { useTelemetryState } from '../../context/TelemetryContext';
import { Wifi, X, Server, Activity, Trash2, Clock, Zap, Radio, ChevronDown, ChevronUp, Camera } from 'lucide-react';
import ROS_TOPICS from '../../config/rosTopics';

const DIRECT_PRESETS = [
  { label: 'Localhost',       url: 'ws://localhost:9090' },
  { label: 'Rover (LAN)',    url: 'ws://192.168.1.50:9090' },
  { label: 'Rover (USB)',    url: 'ws://10.42.0.1:9090' },
  { label: 'Rover (AP)',     url: 'ws://192.168.4.1:9090' },
];

const HISTORY_KEY = 'aries_ros_history';
const MAX_HISTORY = 5;

const getHistory = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
};

const pushHistory = (url: string) => {
  const hist = getHistory().filter(u => u !== url);
  hist.unshift(url);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, MAX_HISTORY)));
};

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({ isOpen, onClose }) => {
  const { connectROS, disconnectROS, connectionStatus, rosUrl, setCameraUrlOverride, isLive } = useROS();
  const { state } = useTelemetryState();
  const [inputUrl, setInputUrl] = useState('ws://localhost:9090');
  const [history, setHistory] = useState<string[]>([]);
  const [cameraInputs, setCameraInputs] = useState<Record<string, string>>({});
  const [showTopics, setShowTopics] = useState(false);
  const presets = useMemo(() => {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const host = window.location.hostname || 'localhost';
    return [
      { label: 'Host Relay', url: `${protocol}//${host}:9393` },
      ...DIRECT_PRESETS,
    ];
  }, []);

  useEffect(() => {
    if (isOpen) {
      setInputUrl(rosUrl || localStorage.getItem('aries_ros_url') || presets[0]?.url || 'ws://localhost:9090');
      setHistory(getHistory());
    }
  }, [isOpen, presets, rosUrl]);

  useEffect(() => {
    if (isOpen) {
      setCameraInputs(Object.fromEntries(state.cameras.map((camera) => [camera.id, camera.url])));
    }
  }, [isOpen, state.cameras]);

  if (!isOpen) return null;

  const handleConnect = (url?: string) => {
    const target = url || inputUrl;
    pushHistory(target);
    setHistory(getHistory());
    connectROS(target);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleConnect();
  };

  const handleDisconnect = () => {
    disconnectROS();
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  const handleCameraInputChange = (cameraId: string, url: string) => {
    setCameraInputs((prev) => ({ ...prev, [cameraId]: url }));
  };

  const handleSaveCameraUrls = () => {
    state.cameras.forEach((camera) => {
      setCameraUrlOverride(camera.id, cameraInputs[camera.id] ?? '');
    });
  };

  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';

  const statusDot = isConnected
    ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.9)] animate-pulse'
    : connectionStatus === 'error'
    ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)]'
    : isConnecting
    ? 'bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.8)] animate-pulse'
    : 'bg-white/20';

  const statusLabel = isConnected
    ? 'text-green-500'
    : connectionStatus === 'error'
    ? 'text-red-500'
    : 'text-white';

  // Unique history items that aren't already in presets
  const presetUrls = new Set(presets.map(p => p.url));
  const filteredHistory = history.filter(u => !presetUrls.has(u));

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] rounded-xl border border-primary-color/50 shadow-[0_0_30px_rgba(254,156,61,0.2)] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-black/60 px-5 py-4 border-b border-primary-color/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Server className="text-white" size={18} />
            <span className="font-mono font-bold tracking-widest text-white uppercase text-sm">
              ROS Bridge
            </span>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 bg-black/95 flex flex-col gap-4 overflow-y-auto">

          {/* Status bar */}
          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDot}`} />
            <div className="flex flex-col flex-1 min-w-0">
              <span className={`text-xs font-mono font-bold uppercase ${statusLabel}`}>
                {connectionStatus}
              </span>
              {(isConnected || isConnecting) && (
                <span className="text-[10px] font-mono text-white/30 truncate">{rosUrl}</span>
              )}
            </div>
            <Activity size={16} className={statusLabel} />
          </div>

          {/* Quick Presets */}
          <div>
            <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Zap size={10} /> Quick Connect
            </div>
            <div className="grid grid-cols-2 gap-2">
              {presets.map(p => {
                const isActive = isConnected && rosUrl === p.url;
                return (
                  <button
                    key={p.url}
                    onClick={() => handleConnect(p.url)}
                    disabled={isActive}
                    className={`text-left px-3 py-2 rounded-lg border font-mono text-[11px] transition-all ${
                      isActive
                        ? 'border-green-500/40 bg-green-900/20 text-green-400 cursor-default'
                        : 'border-white/10 bg-black/40 text-white/70 hover:border-white/40 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-[10px] uppercase tracking-wider mb-0.5">{p.label}</div>
                    <div className="text-[9px] text-white/30 truncate">{p.url}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom URI */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <label className="text-[9px] uppercase font-mono text-white/50 tracking-widest">
              Relay / ROS Endpoint URI
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="http://192.168.1.10:9393 or ws://192.168.1.50:9090"
                className="flex-1 bg-black border border-white/20 rounded-lg px-3 py-2 font-mono text-sm text-white focus:outline-none focus:border-primary-color focus:ring-1 focus:ring-primary-color transition-all"
              />
              <button
                type="submit"
                disabled={isConnecting}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-lg font-mono text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Wifi size={12} /> Connect
              </button>
            </div>
          </form>

          <div className="rounded-lg border border-white/10 bg-black/30 p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                <Camera size={10} /> Camera Feed URLs
              </div>
              <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest">{state.cameras.length} feeds</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {state.cameras.map((camera) => (
                <label key={camera.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-mono text-white/75">{camera.name}</span>
                    <span className="text-[8px] font-mono uppercase tracking-widest text-white/25">{camera.id}</span>
                  </div>
                  <input
                    type="text"
                    value={cameraInputs[camera.id] ?? ''}
                    onChange={(e) => handleCameraInputChange(camera.id, e.target.value)}
                    placeholder="http://192.168.1.50:8080/stream.mjpg"
                    className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-primary-color focus:ring-1 focus:ring-primary-color transition-all"
                  />
                </label>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-[9px] font-mono text-white/25 leading-relaxed">
                Use browser-ready MJPEG / WebRTC / HLS URLs here. Clear a field and save to fall back to the ROS/default feed URL.
              </p>
              <button
                type="button"
                onClick={handleSaveCameraUrls}
                className="shrink-0 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-lg font-mono text-[10px] uppercase tracking-widest font-bold transition-all"
              >
                Save Camera URLs
              </button>
            </div>
          </div>

          {/* Recent history */}
          {filteredHistory.length > 0 && (
            <div>
              <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Clock size={10} /> Recent</span>
                <button onClick={clearHistory} className="text-white/20 hover:text-red-400 transition-colors" title="Clear history">
                  <Trash2 size={10} />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {filteredHistory.map(url => (
                  <button
                    key={url}
                    onClick={() => { setInputUrl(url); handleConnect(url); }}
                    className="text-left px-3 py-1.5 rounded border border-white/5 bg-black/30 font-mono text-[10px] text-white/50 hover:border-primary-color/30 hover:text-primary-color transition-all truncate"
                  >
                    {url}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Disconnect */}
          {isConnected && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-500/50 py-2.5 rounded-lg font-mono text-xs uppercase tracking-widest font-bold transition-all"
            >
              Disconnect
            </button>
          )}

          {/* Data source badge */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-mono uppercase tracking-widest ${
            isLive
              ? 'border-green-500/30 bg-green-900/15 text-green-400'
              : 'border-white/10 bg-white/5 text-white/40'
          }`}>
            <Radio size={12} className={isLive ? 'animate-pulse' : ''} />
            {isLive ? 'Receiving Live ROS Data' : 'Showing Simulated Data (no ROS messages yet)'}
          </div>

          {/* Subscribed Topics */}
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowTopics(p => !p)}
              className="w-full flex items-center justify-between px-3 py-2 bg-black/30 hover:bg-white/5 transition-colors"
            >
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
                Subscribed Topics ({ROS_TOPICS.length})
              </span>
              {showTopics ? <ChevronUp size={12} className="text-white/30" /> : <ChevronDown size={12} className="text-white/30" />}
            </button>
            {showTopics && (
              <div className="max-h-48 overflow-y-auto border-t border-white/5">
                {ROS_TOPICS.map(cfg => (
                  <div key={cfg.topic} className="px-3 py-1.5 border-b border-white/5 last:border-0 flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-mono text-white/60 truncate">{cfg.topic}</span>
                      <span className="text-[8px] font-mono text-white/20 truncate">{cfg.messageType}</span>
                    </div>
                    <span className="text-[8px] font-mono text-white/20 bg-white/5 rounded px-1.5 py-0.5 shrink-0">
                      → {cfg.stateKey}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Help text */}
          <div className="space-y-2">
            <p className="text-[9px] font-mono text-white/25 leading-relaxed">
              <span className="text-white/30 font-bold">1.</span> On your rover run:{' '}
              <code className="text-white/40 bg-black/40 px-1 rounded">roslaunch rosbridge_server rosbridge_websocket_launch.xml</code>
            </p>
            <p className="text-[9px] font-mono text-white/25 leading-relaxed">
              <span className="text-white/30 font-bold">2.</span> For one shared rover connection, run{' '}
              <code className="text-white/40 bg-black/40 px-1 rounded">npm run relay</code>{' '}
              on the host PC and connect dashboards to the host relay URL above.
            </p>
            <p className="text-[9px] font-mono text-white/25 leading-relaxed">
              <span className="text-white/30 font-bold">3.</span> Direct rover WebSocket URLs still work, but each browser will make its own rover connection.
            </p>
            <p className="text-[9px] font-mono text-white/25 leading-relaxed">
              <span className="text-white/30 font-bold">4.</span> Edit{' '}
              <code className="text-white/40 bg-black/40 px-1 rounded">src/config/rosTopics.ts</code>{' '}
              to change topic names / message types to match your rover.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ConnectionModal;
