import React, { useRef } from 'react';
import { usePlayback } from '../context/PlaybackContext';
import { 
  FileUp, Play, Pause, FastForward, Rewind, 
  Map as MapIcon, LayoutDashboard, Clock, Activity,
  Download, Trash2, Shield, Navigation2, Radio, Beaker, CheckCircle2, X
} from 'lucide-react';
import TelemetryReadout from '../components/telemetry/TelemetryReadout';
import AttitudeCombined from '../components/telemetry/AttitudeCombined';
import ODriveStatus from '../components/telemetry/ODriveStatus';
import NetworkStatus from '../components/telemetry/NetworkStatus';
import ComputeStatus from '../components/telemetry/ComputeStatus';
import ArmStatus from '../components/telemetry/ArmStatus';
import DrillStatus from '../components/telemetry/DrillStatus';
import ScienceCompact from '../components/telemetry/ScienceCompact';
import OrientationCompact from '../components/telemetry/OrientationCompact';
import EnvironmentSensors from '../components/telemetry/EnvironmentSensors';
import MapView from '../components/media/MapView';
import ChanceOfLifeCard from '../components/telemetry/ChanceOfLifeCard';

const DataAnalyserPage: React.FC = () => {
  const { 
    playbackData, 
    currentIndex, 
    isPlaying,
    playbackSpeed,
    loadLog, 
    seekTo, 
    togglePlayback, 
    setSpeed,
    playbackProgress,
    exportToCSV,
    isLeapOne,
    logType,
    error,
    clearError
  } = usePlayback();

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Drill and Arm Activity Logic
  const drillActivePeriods = React.useMemo(() => {
    if (!playbackData.length) return [];
    const periods: Array<{ start: number; end: number }> = [];
    let current: { start: number } | null = null;
    playbackData.forEach((d, i) => {
      const active = d.drill?.status === 'drilling' || d.drill?.status === 'retracting';
      if (active && !current) {
        current = { start: i };
      } else if (!active && current) {
        periods.push({ start: current.start, end: i - 1 });
        current = null;
      }
    });
    if (current) {
      periods.push({ start: (current as { start: number }).start, end: playbackData.length - 1 });
    }
    return periods;
  }, [playbackData]);

  const armActivePeriods = React.useMemo(() => {
    if (!playbackData.length) return [];
    const periods: Array<{ start: number; end: number }> = [];
    let current: { start: number } | null = null;
    playbackData.forEach((d, i) => {
      const active = d.arm?.status === 'moving';
      if (active && !current) {
        current = { start: i };
      } else if (!active && current) {
        periods.push({ start: current.start, end: i - 1 });
        current = null;
      }
    });
    if (current) {
      periods.push({ start: (current as { start: number }).start, end: playbackData.length - 1 });
    }
    return periods;
  }, [playbackData]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadLog(file);
    }
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const hasData = playbackData.length > 0;
  const currentData = hasData ? playbackData[currentIndex] : null;
  const totalTime = hasData ? (playbackData[playbackData.length - 1].timestamp - playbackData[0].timestamp) / 1000 : 0;
  const currentTime = hasData ? (playbackData[currentIndex].timestamp - playbackData[0].timestamp) / 1000 : 0;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#03060b]">
      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#0a0f16] border-2 border-red-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.2)] relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
             
             <div className="flex flex-col items-center text-center gap-6">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <X size={40} className="text-red-500 animate-pulse" />
                </div>
                
                <div>
                  <h2 className="text-xl font-bold text-white uppercase font-mono tracking-widest mb-2">Inappropriate File</h2>
                  <p className="text-sm text-white/60 font-mono leading-relaxed">{error}</p>
                </div>

                <button 
                  onClick={clearError}
                  className="w-full py-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 font-bold font-mono tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  DISMISS TERMINAL ERROR
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Analysis Toolbar */}
      <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-md z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <LayoutDashboard size={18} className="text-primary-color" />
            <h1 className="text-sm font-bold uppercase tracking-[0.2em] text-primary-color font-mono">Mission Data Analyser</h1>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".lp1,.csv" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-primary-color bg-primary-color/10 text-primary-color hover:bg-primary-color hover:text-black transition-all duration-300 text-[11px] font-bold font-mono uppercase tracking-[0.1em] shadow-[0_0_15px_var(--primary-color)] shadow-opacity-20"
            >
              <FileUp size={14} strokeWidth={3} />
              {hasData ? 'Load New Mission' : 'Upload LeapOne File or CSV'}
            </button>
            {hasData && (
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-mono">
                 <Activity size={12} />
                 {playbackData.length} DATAPOINTS LOADED
               </div>
            )}
          </div>
        </div>

        {hasData && (
          <div className="flex items-center gap-4">
            {/* Playback Controls */}
            <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-1 shadow-inner">
               <button 
                onClick={() => setSpeed(Math.max(0.5, playbackSpeed / 2))}
                className="p-1.5 text-white/40 hover:text-white transition-colors"
                title="Slower"
               >
                 <Rewind size={16} />
               </button>
               <button 
                onClick={togglePlayback}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-color text-black shadow-[0_0_15px_rgba(254,156,61,0.4)] hover:scale-105 active:scale-95 transition-all"
               >
                 {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
               </button>
               <button 
                onClick={() => setSpeed(Math.min(16, playbackSpeed * 2))}
                className="p-1.5 text-white/40 hover:text-white transition-colors"
                title="Faster"
               >
                 <FastForward size={16} />
               </button>
            </div>

            <div className="flex flex-col items-end gap-0.5">
               <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Playback Speed</div>
               <div className="text-sm font-mono font-bold text-primary-color">{playbackSpeed}x</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Analysis View */}
      <div className="flex-1 min-h-0 relative overflow-y-auto custom-scrollbar">
        {!hasData ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-12 text-center">
            <div className="w-32 h-32 rounded-full bg-primary-color/10 border-2 border-primary-color/30 flex items-center justify-center relative mb-4">
               <div className="absolute inset-0 rounded-full border-2 border-primary-color/20 animate-pulse-glow opacity-50" />
               <div className="absolute inset-[-15px] rounded-full border border-primary-color/10 animate-flicker opacity-20" />
               <FileUp size={48} className="text-primary-color" style={{ filter: 'drop-shadow(0 0 15px var(--primary-color))' }} />
            </div>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-white mb-3 uppercase font-mono tracking-[0.4em] drop-shadow-glow">Terminal Standby</h2>
              <p className="max-w-md text-white/40 text-[12px] font-mono leading-relaxed mx-auto italic">
                {">"} Link established. Awaiting mission telemetry uplink. <br/>
                {">"} Reconstruct synchronized trajectories and subsystem states.
              </p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex items-center gap-4 px-12 py-5 rounded-2xl bg-primary-color text-black font-black uppercase tracking-[0.4em] transition-all duration-500 overflow-hidden shadow-[0_0_50px_var(--primary-color)] shadow-opacity-40 hover:scale-110 active:scale-95"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-[-20deg]" />
              <FileUp size={22} strokeWidth={3} />
              <span className="relative">Select Mission Source (.lp1 / .csv)</span>
            </button>
            
            <div className="mt-12 flex items-center gap-8 opacity-20 filter grayscale group">
              <img src="/hs-logo.png" alt="Uni Logo" className="h-6 brightness-0 invert" />
              <div className="h-4 w-px bg-white/50" />
              <span className="text-[10px] font-mono tracking-[0.5em] uppercase text-white">Aries Systems MCC</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-2 p-2">
            {/* Left Column: Subsystems */}
            <div className="xl:col-span-3 flex flex-col gap-2">
              <TelemetryReadout />
              {logType !== 'science' ? (
                <>
                  <NetworkStatus />
                  <ComputeStatus compact />
                  <EnvironmentSensors />
                  <OrientationCompact />
                </>
              ) : (
                <ScienceCompact />
              )}
            </div>

            {/* Middle Column: Map & Timeline */}
            <div className={logType === 'science' ? 'xl:col-span-6 flex flex-col gap-2' : 'xl:col-span-6 flex flex-col gap-2'}>
              <div className="min-h-[500px] rounded-xl overflow-hidden border border-white/10 bg-black/40 relative">
                <MapView />
                <div className="absolute bottom-4 right-4 z-10 p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
                   <div className="flex items-center gap-2 mb-2">
                     <MapIcon size={14} className="text-primary-color" />
                     <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-primary-color">Trajectory View</span>
                   </div>
                   <div className="text-[12px] font-mono text-white/80">
                     X: {currentData?.location.x.toFixed(2)} m
                   </div>
                   <div className="text-[12px] font-mono text-white/80">
                     Y: {currentData?.location.y.toFixed(2)} m
                   </div>
                </div>
              </div>

              {/* Timeline Scrubber */}
              <div className="sticky bottom-4 z-30 bg-black/80 backdrop-blur-xl rounded-2xl border border-primary-color/30 p-5 shadow-[0_0_50px_rgba(0,0,0,0.5)] mt-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-color/10 flex items-center justify-center border border-primary-color/20">
                      <Clock size={16} className="text-primary-color" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold font-mono uppercase tracking-[0.2em] text-white/40 block">Mission Timeline</span>
                      <span className="text-[10px] font-mono text-primary-color/60 uppercase">{currentData?.timestamp ? new Date(currentData.timestamp).toLocaleTimeString() : '--:--:--'}</span>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-2xl font-bold text-white tabular-nums drop-shadow-glow">{formatTime(currentTime)}</span>
                    <span className="text-xs text-white/30">/ {formatTime(totalTime)}</span>
                  </div>
                </div>
                <div className="relative group px-1 h-8 flex items-center">
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-white/10 rounded-full pointer-events-none">
                    {/* Activity Segments */}
                    {drillActivePeriods.map((p, i) => (
                      <div 
                        key={`drill-${i}`}
                        className="absolute h-full bg-cyan-400"
                        style={{ 
                          left: `${(p.start / (playbackData.length - 1)) * 100}%`,
                          width: `${((p.end - p.start) / (playbackData.length - 1)) * 100}%`
                        }}
                      />
                    ))}
                    {armActivePeriods.map((p, i) => (
                      <div 
                        key={`arm-${i}`}
                        className="absolute h-full bg-purple-500"
                        style={{ 
                          left: `${(p.start / (playbackData.length - 1)) * 100}%`,
                          width: `${((p.end - p.start) / (playbackData.length - 1)) * 100}%`
                        }}
                      />
                    ))}
                  </div>

                  <input 
                    type="range" 
                    min="0" 
                    max={playbackData.length - 1} 
                    value={currentIndex}
                    onChange={(e) => seekTo(parseInt(e.target.value))}
                    className="w-full h-3 bg-transparent rounded-full appearance-none cursor-pointer group-hover:bg-white/5 transition-all focus:outline-none relative z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-primary-color [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_20px_rgba(254,156,61,0.6)] [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
                  />
                  {/* Progress filler */}
                  <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-primary-color/40 rounded-full pointer-events-none shadow-[0_0_10px_rgba(254,156,61,0.3)] z-[5]" 
                    style={{ width: `${playbackProgress * 100}%` }}
                  />
                </div>

                <div className="flex justify-between mt-4 px-1">
                   <div className="flex items-center gap-6">
                     <div className="flex flex-col gap-1">
                       <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em]">Activity Key</span>
                       <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-cyan-400" />
                            <span className="text-[9px] font-mono text-white/40 uppercase">Drill</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            <span className="text-[9px] font-mono text-white/40 uppercase">Arm</span>
                          </div>
                       </div>
                     </div>
                     <div className="w-[1px] h-8 bg-white/10" />
                     <div className="flex flex-col">
                       <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em]">Entry Index</span>
                       <span className="text-[11px] font-mono text-white/60">{currentIndex + 1} <span className="text-white/20">/</span> {playbackData.length}</span>
                     </div>
                     <div className="w-[1px] h-8 bg-white/10" />
                     <div className="flex flex-col">
                       <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em]">Data Source</span>
                       <span className="text-[11px] font-mono text-primary-color/80 uppercase">Mission_Log.lp1</span>
                     </div>
                   </div>

                   <div className="flex items-center gap-3">
                     <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1 border border-white/5 mr-2">
                        <button onClick={togglePlayback} className="p-2 rounded-md hover:bg-primary-color hover:text-black transition-all text-white/60">
                          {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                        </button>
                     </div>
                     {isLeapOne && (
                       <button 
                         onClick={exportToCSV}
                         className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all text-[11px] font-mono uppercase tracking-wider"
                       >
                         <Download size={14} className="text-primary-color" />
                         Export CSV
                       </button>
                     )}
                     <button className="p-2.5 rounded-xl bg-red-500/5 hover:bg-red-500/20 border border-red-500/10 text-red-400/40 hover:text-red-400 transition-all">
                       <Trash2 size={16}/>
                     </button>
                   </div>
                </div>
              </div>
              
              {logType !== 'science' && (
                <>
                  <div className="shrink-0 mt-4">
                    <ODriveStatus />
                  </div>
                  <div className="mt-4 shrink-0">
                    <ScienceCompact />
                  </div>
                </>
              )}
            </div>

            {/* Right Column: Attitude & Science Detail */}
            {logType !== 'science' ? (
              <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-2 content-start">
                {/* Pre-Mission Checklist Status Card */}
                <div className="glass-panel rounded-xl border border-white/10 bg-black/40 relative h-fit">
                  <div className="px-4 py-2 border-b border-white/5 bg-white/5 flex items-center gap-2">
                    <Shield size={14} className="text-secondary-color" />
                    <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-primary-color">Pre-Mission Checklist</span>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-2">
                    {[
                      { id: 'pwr', label: 'Power', icon: Shield },
                      { id: 'drv', label: 'Drive', icon: Navigation2 },
                      { id: 'com', label: 'Comms', icon: Radio },
                      { id: 'sci', label: 'Science', icon: Beaker },
                      { id: 'drill', label: 'Drill', icon: X },
                      { id: 'arm', label: 'Arm', icon: Shield }
                    ].map(dept => {
                      const isCleared = currentData?.checklistStatus?.[dept.id];
                      const Icon = dept.icon;
                      return (
                        <div key={dept.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isCleared ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                          <Icon size={12} className="shrink-0" />
                          <span className="text-[9px] font-mono font-bold uppercase truncate">{dept.label}</span>
                          <div className="ml-auto">
                            {isCleared ? <CheckCircle2 size={10} /> : <X size={10} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="h-fit"><AttitudeCombined layout="wide" /></div>
                <div className="h-fit"><ArmStatus /></div>
                <div className="h-fit"><DrillStatus /></div>
              </div>
            ) : (
              <div className="xl:col-span-3 flex flex-col gap-2">
                 <div className="flex-1 min-h-[400px]"><ChanceOfLifeCard /></div>
              </div>
            )}

            {/* Full-width Atmospheric Metrics at bottom for science logs */}
            {logType === 'science' && (
              <div className="xl:col-span-12 mt-2">
                <EnvironmentSensors layout="grid-4" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataAnalyserPage;
