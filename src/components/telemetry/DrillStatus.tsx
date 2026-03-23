import React from 'react';
import { useTelemetryState } from '../../context/TelemetryContext';
import { AlertTriangle, Zap, ArrowDown, ArrowUp } from 'lucide-react';

const DrillStatus: React.FC = () => {
  const { state } = useTelemetryState();
  const { drill } = state;

  if (!drill) return null;

  const statusColor: Record<string, string> = {
    idle: 'text-white/40',
    drilling: 'text-green-400',
    retracting: 'text-white',
    fault: 'text-red-400',
  };

  const statusBg: Record<string, string> = {
    idle: 'bg-white/5 border-white/10',
    drilling: 'bg-green-900/20 border-green-500/40',
    retracting: 'bg-orange-900/20 border-primary-color/40',
    fault: 'bg-red-900/20 border-red-500/50',
  };

  const currentColor = statusColor[drill.status] || statusColor.idle;
  const currentBg = statusBg[drill.status] || statusBg.idle;

  return (
    <div className="glass-panel rounded-xl flex flex-col h-full relative glow-border">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border-color/30 shadow-sm flex justify-between items-center bg-black/40 shrink-0">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-primary-color" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary-color">
            Drill Assembly
          </span>
        </div>
        <div className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase tracking-widest ${currentBg} ${currentColor}`}>
          {drill.status}
        </div>
      </div>

      <div className="flex-1 p-3 flex flex-col gap-3">

        {/* Motors */}
        {drill.motors.map((motor: any) => {
          const rpmPct = Math.min(motor.currentRpm / motor.ratedRpm, 1);
          const isFault = motor.status === 'fault';
          const isRunning = motor.status === 'running';
          return (
            <div key={motor.id} className={`border rounded-lg p-2.5 flex flex-col gap-1.5 ${isFault ? 'bg-red-900/20 border-red-500/50' : 'bg-black/40 border-primary-color/20'}`}>
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">{motor.label}</span>
                  <span className="text-[8px] font-mono text-white/20">Rated {motor.ratedRpm} RPM · 24V · 2.1A</span>
                </div>
                <div className="flex items-center gap-2">
                  {isFault && <AlertTriangle size={12} className="text-red-400 animate-pulse" />}
                  <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)] animate-pulse' : 'bg-white/20'}`} />
                </div>
              </div>

              {/* RPM bar */}
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-mono text-white/30 w-6">RPM</span>
                <div className="flex-1 h-1 bg-black/50 rounded-full border border-white/10">
                  <div
                    className="h-full w-full rounded-full origin-left bg-primary-color shadow-[0_0_5px_rgba(254,156,61,0.8)]"
                    style={{ transform: `scaleX(${rpmPct})`, transition: 'transform 0.3s ease', willChange: 'transform' }}
                  />
                </div>
                <span className="text-[10px] font-mono text-white tabular-nums w-10 text-right">{motor.currentRpm.toFixed(0)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                <div className="flex flex-col"><span className="text-white/30">CUR</span><span className="text-white">{motor.current.toFixed(1)}<span className="text-white/30 text-[8px]"> A</span></span></div>
                <div className="flex flex-col"><span className="text-white/30">VOLT</span><span className="text-white">{motor.voltage.toFixed(1)}<span className="text-white/30 text-[8px]"> V</span></span></div>
                <div className="flex flex-col"><span className="text-white/30">TEMP</span><span className={motor.temp > 50 ? 'text-orange-400' : 'text-white'}>{motor.temp.toFixed(1)}<span className="text-white/30 text-[8px]">°C</span></span></div>
              </div>
            </div>
          );
        })}

        {/* Linear Actuator */}
        <div className="border border-white/10 bg-black/30 rounded-lg p-2.5">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Linear Actuator</span>
            <span className="text-[8px] font-mono text-white/20">TC24-300-1000 · 300mm</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUp size={10} className={drill.limitSwitchTop ? 'text-primary-color' : 'text-white/20'} />
            <div className="flex-1 h-2 bg-black/50 rounded-full border border-white/10">
              <div
                className="h-full w-full rounded-full origin-left bg-primary-color/80 shadow-[0_0_4px_rgba(254,156,61,0.6)]"
                style={{ transform: `scaleX(${drill.actuatorPosition / 300})`, transition: 'transform 0.4s ease', willChange: 'transform' }}
              />
            </div>
            <ArrowDown size={10} className={drill.limitSwitchBottom ? 'text-red-400' : 'text-white/20'} />
            <span className="text-[10px] font-mono text-white tabular-nums w-12 text-right">{drill.actuatorPosition.toFixed(0)} mm</span>
          </div>
        </div>

        {/* Drill Depth + Limit Switches */}
        <div className="grid grid-cols-2 gap-2">
          <div className="border border-white/10 bg-black/30 rounded-lg p-2">
            <div className="text-[8px] font-mono text-white/30 uppercase mb-1">Drill Depth</div>
            <div className="text-base font-mono text-white font-bold">{drill.drillDepth.toFixed(0)}<span className="text-[9px] text-white/30 ml-1">mm</span></div>
          </div>
          <div className="border border-white/10 bg-black/30 rounded-lg p-2">
            <div className="text-[8px] font-mono text-white/30 uppercase mb-1.5">Limit Sw. (Omron SS-01D)</div>
            <div className="flex gap-3">
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${drill.limitSwitchTop ? 'bg-primary-color shadow-[0_0_4px_rgba(254,156,61,0.8)]' : 'bg-white/15'}`} />
                <span className="text-[8px] font-mono text-white/40">TOP</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${drill.limitSwitchBottom ? 'bg-red-400 shadow-[0_0_4px_rgba(248,113,113,0.8)]' : 'bg-white/15'}`} />
                <span className="text-[8px] font-mono text-white/40">BTM</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DrillStatus;

