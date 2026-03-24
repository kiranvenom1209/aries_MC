import React, { useEffect, useMemo, useState } from 'react';
import { useROS } from '../../context/ROSContext';
import { Camera, Maximize2, ArrowLeft } from 'lucide-react';
import type { CameraStream } from '../../types/telemetry';

const hasBrowserFeedUrl = (url: string) => /^(https?:\/\/|data:image\/)/i.test(url);

const CameraFeed: React.FC<{ feed: CameraStream & { onClick?: () => void } }> = ({ feed }) => {
  const { state } = useROS();
  const [loadError, setLoadError] = useState(false);
  const [frameIdx, setFrameIdx] = useState(1);
  const canRenderImage = hasBrowserFeedUrl(feed.url) && !loadError;

  useEffect(() => {
    setLoadError(false);
  }, [feed.url]);

  useEffect(() => {
    // 500ms per frame to simulate approx 2fps low-res transmission
    const interval = setInterval(() => setFrameIdx(f => (f === 1 ? 2 : 1)), 500);
    return () => clearInterval(interval);
  }, []);

  const getOfflineBackground = (): React.CSSProperties => {
    const nameLower = feed.name.toLowerCase();
    if (nameLower.includes('microscope')) {
      return { backgroundImage: `url('/images/fwd_cam_1.png')` };
    }
    if (nameLower.includes('drill')) {
      // Map localization (0-45m X, 0-35m Y) to 0-100% background position
      const xPercent = (state.location.x / 45) * 100;
      const yPercent = (state.location.y / 35) * 100;
      return {
        backgroundImage: `url('/images/ERC-Mars-Yard-from-top-scaled.jpg.webp')`,
        backgroundSize: '2500% 2500%',
        backgroundPosition: `${xPercent.toFixed(2)}% ${yPercent.toFixed(2)}%`,
        transition: 'background-position 0.15s linear',
      };
    }
    if (nameLower.includes('arm')) {
      return { backgroundImage: `url('/images/arm_cam_${frameIdx}.png')` };
    }
    return { backgroundImage: `url('/images/fwd_cam_${frameIdx}.png')` };
  };

  return (
    <div className="relative w-full h-full border border-gray-800 rounded bg-black/60 overflow-hidden group cursor-pointer" onClick={feed.onClick}>
      {/* HUD Overlay */}
      <div className="absolute top-2 left-2 flex items-center gap-2 z-10">
        <div className={`w-2 h-2 rounded-full ${feed.status === 'online' ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`}></div>
        <span className="text-[10px] font-mono text-white bg-black/50 px-1 rounded uppercase tracking-wider">
          {feed.name}
        </span>
      </div>
      
      {/* Expand icon on hover */}
      {feed.onClick && (
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 size={14} className="text-white/70" />
        </div>
      )}

      {/* Corner Brackets */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary-color/50 z-10"></div>
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary-color/50 z-10"></div>
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary-color/50 z-10"></div>
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary-color/50 z-10"></div>

      {feed.status === 'online' && canRenderImage ? (
          <img
            src={feed.url}
            alt={feed.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setLoadError(true)}
          />
      ) : (
          <div className="relative w-full h-full flex flex-col items-center justify-center text-gray-700 overflow-hidden bg-black">
             {/* Context-Specific Camera Sequence Background */}
             {feed.name.toLowerCase().includes('360') ? (
               <video 
                 src="/images/360_video.mp4" 
                 autoPlay 
                 loop 
                 muted 
                 playsInline 
                 className={`absolute inset-0 w-full h-full object-cover ${feed.status === 'online' ? 'opacity-[0.85]' : 'opacity-[0.3] grayscale-[0.5]'}`}
               />
             ) : (
               <div 
                 className={`absolute inset-0 bg-cover bg-center ${feed.status === 'online' ? 'opacity-[0.85]' : 'opacity-[0.3] grayscale-[0.5]'}`}
                 style={getOfflineBackground()}
               />
             )}
             <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-500/20 border border-red-500/50 rounded text-[9px] font-mono font-bold uppercase tracking-widest text-red-500 z-10 animate-pulse">
               Simulated
             </div>
          </div>
      )}
    </div>
  );
};

interface CameraGridProps {
  isManualMode?: boolean;
  feeds?: CameraStream[];
  title?: string;
}

const CameraGrid: React.FC<CameraGridProps> = ({ isManualMode = false, feeds, title }) => {
  const { state } = useROS();
  const cameras = useMemo(() => (feeds && feeds.length > 0 ? feeds : state.cameras), [feeds, state.cameras]);
  const [activeCamId, setActiveCamId] = useState<string>('cam1'); // Default to Front Cam
  const [fullscreenCamId, setFullscreenCamId] = useState<string | null>(null);

  useEffect(() => {
    if (cameras.length > 0 && !cameras.some((camera) => camera.id === activeCamId)) {
      setActiveCamId(cameras[0].id);
    }
  }, [activeCamId, cameras]);

  const activeFeed = cameras.find(c => c.id === activeCamId) || cameras[0];
  const thumbnailFeeds = cameras.filter(c => c.id !== activeCamId);
  const gridClass = cameras.length <= 1 ? 'grid-cols-1' : cameras.length === 2 ? 'grid-cols-2 grid-rows-1' : 'grid-cols-2 grid-rows-2';

  if (cameras.length === 0) {
    return (
      <div className="glass-panel rounded-xl flex flex-col h-full relative glow-border">
        <div className="px-5 py-3 border-b border-border-color/30 shadow-sm flex justify-between items-center bg-black/40 shrink-0">
          <div className="flex items-center gap-2">
            <Camera size={14} className="text-primary-color" />
            <span className="text-[10px] uppercase text-primary-color font-bold tracking-[0.15em]">
              {title ?? 'Visual Subsystems'}
            </span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-center p-6 text-white/40 font-mono text-sm">
          No camera feeds configured.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-xl flex flex-col h-full relative glow-border">
      {/* sim-panel like header */}
      <div className="px-5 py-3 border-b border-border-color/30 shadow-sm flex justify-between items-center bg-black/40 shrink-0">
        <div className="flex items-center gap-2">
            <Camera size={14} className="text-primary-color" />
            <span className="text-[10px] uppercase text-primary-color font-bold tracking-[0.15em]">
            {title ?? (isManualMode ? 'Primary Driving Optics' : 'Visual Subsystems')}
            </span>
        </div>
        <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">{cameras.length} feeds</span>
      </div>

      {fullscreenCamId && cameras.find(c => c.id === fullscreenCamId) ? (
          // Fullscreen single camera view
          <div className="flex-1 p-3 flex flex-col">
            <button
              onClick={() => setFullscreenCamId(null)}
              className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/60 hover:text-primary-color transition-colors self-start px-2 py-1 rounded border border-white/10 hover:border-primary-color/40 bg-black/40"
            >
              <ArrowLeft size={12} />
              Back to Grid
            </button>
            <div className="flex-1 border-2 border-primary-color/30 rounded shadow-[0_0_15px_rgba(254,156,61,0.2)]">
              <CameraFeed feed={cameras.find(c => c.id === fullscreenCamId)!} />
            </div>
          </div>
      ) : isManualMode ? (
          // Manual Driving Mode Layout (Focused + Thumbnails)
          <div className="flex-1 p-3 flex flex-col gap-3">
              {/* Primary Active Camera */}
              <div className="flex-[4] w-full min-h-[450px] border-2 border-primary-color/30 rounded shadow-[0_0_15px_rgba(254,156,61,0.2)]">
                  <CameraFeed feed={activeFeed} />
              </div>

              {/* Selectable Thumbnails Strip */}
              {thumbnailFeeds.length > 0 ? (
                <div className="flex-1 w-full min-h-[100px] max-h-[160px] flex gap-3">
                  {thumbnailFeeds.map((cam) => (
                      <div
                        key={cam.id}
                        className="flex-1 cursor-pointer opacity-50 hover:opacity-100 transition-opacity active:scale-95 border border-white/10 hover:border-primary-color/50 rounded overflow-hidden"
                        onClick={() => setActiveCamId(cam.id)}
                      >
                          <CameraFeed feed={cam} />
                      </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 w-full min-h-[100px] rounded border border-white/10 bg-black/30 flex items-center justify-center text-[10px] font-mono uppercase tracking-widest text-white/30">
                  Single feed focus mode
                </div>
              )}
          </div>
      ) : (
          // Autonomous Mode Layout (2x2 Grid)
          <div className={`flex-1 p-3 grid ${gridClass} gap-3`}>
            {cameras.map((cam) => (
              <CameraFeed key={cam.id} feed={{...cam, onClick: () => setFullscreenCamId(cam.id)}} />
            ))}
          </div>
      )}
    </div>
  );
};

export default CameraGrid;
