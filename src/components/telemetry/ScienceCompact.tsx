import React from 'react';
import { FlaskConical, Sun, CheckCircle2, Activity, ShieldCheck, Sparkles } from 'lucide-react';
import { useTelemetryState } from '../../context/TelemetryContext';
import { calculateLPI } from '../../utils/scienceMath';

const phColor = (ph: number): string => {
  if (ph < 5) return '#ef4444';
  if (ph < 6) return '#f97316';
  if (ph < 7) return '#eab308';
  if (ph < 8) return '#22c55e';
  if (ph < 9) return '#3b82f6';
  return '#8b5cf6';
};

const ScienceCompact: React.FC = () => {
  const { state } = useTelemetryState();
  const { science, environment } = state;

  if (!science) return null;

  const { score: lifeScore, confidence: lifeConfidence } = calculateLPI(environment, science);
  const color = phColor(science.ph);
  const phPct = science.ph / 14;
  const uvRunMin = Math.floor(science.uvLampRuntime / 60);

  return (
    <div className="glass-panel rounded-xl flex flex-col relative glow-border bg-black/50 overflow-hidden h-full">
      <div className="px-5 py-3 border-b border-border-color/30 shadow-sm flex justify-between items-center bg-black/40 shrink-0">
        <div className="flex items-center gap-2">
          <FlaskConical size={14} className="text-primary-color" />
          <span className="text-[10px] uppercase text-primary-color font-bold tracking-[0.15em]">
            Biological Analysis
          </span>
        </div>
        <div className={`flex items-center gap-2 text-[10px] font-mono px-3 py-1 rounded-full border uppercase tracking-widest ${science.sampleCollected ? 'bg-green-900/40 border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 text-white/30'}`}>
          <CheckCircle2 size={12} />
          {science.sampleCollected ? 'Sample Logged' : 'No Sample'}
        </div>
      </div>

      <div className="p-2 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
        {/* LPI Score - Primary Metric */}
        <div className="bg-primary-color/5 border border-primary-color/20 rounded-xl p-3 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2 relative z-10">
            <div>
              <div className="text-[9px] font-mono text-primary-color uppercase tracking-[0.2em] flex items-center gap-1.5 font-bold">
                <Activity size={10} />Life Probability Index
              </div>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-mono font-bold text-white tracking-tighter tabular-nums">{lifeScore.toFixed(1)}</span>
              <span className="text-[10px] font-mono text-white/20 font-bold">%</span>
            </div>
          </div>
          
          <div className="h-1.5 w-full bg-black/40 rounded-full border border-white/5 overflow-hidden mb-2">
             <div 
               className="h-full bg-primary-color shadow-[0_0_8px_rgba(254,156,61,0.5)] transition-all duration-1000 ease-out"
               style={{ width: `${lifeScore}%` }}
             />
          </div>

          <div className="flex justify-between items-center relative z-10">
             <div className="flex items-center gap-1.5">
                <ShieldCheck size={10} className="text-white/20" />
                <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Confidence</span>
             </div>
             <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono font-bold text-white/60">{lifeConfidence.toFixed(1)}%</span>
                <Sparkles size={8} className="text-primary-color/40" />
             </div>
          </div>
        </div>

        {/* Dual Meter Row: pH & Progress */}
        <div className="grid grid-cols-2 gap-2">
          {/* pH compact */}
          <div className="border border-white/10 bg-black/40 rounded-lg px-2 py-2 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[8px] font-mono text-white/30 uppercase tracking-wider">pH Meter</span>
              <span className="text-xs font-mono font-bold tabular-nums" style={{ color }}>{science.ph.toFixed(1)}</span>
            </div>
            <div className="relative h-1.5 rounded-full border border-white/5 overflow-hidden"
              style={{ background: 'linear-gradient(to right,#ef4444,#f97316,#eab308,#22c55e,#3b82f6,#8b5cf6)' }}>
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]"
                style={{ left: `${phPct * 100}%`, transition: 'left 0.5s ease' }}
              />
            </div>
          </div>

          {/* Moisture compact */}
          <div className="border border-white/10 bg-black/40 rounded-lg px-2 py-2 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[8px] font-mono text-white/30 uppercase tracking-wider">Moisture</span>
              <span className="text-xs font-mono text-white tabular-nums font-bold">{science.soilMoisture.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full bg-black/60 rounded-full border border-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-blue-500/50 transition-all duration-500" style={{ width: `${science.soilMoisture}%` }} />
            </div>
          </div>
        </div>

        {/* UV Lamp - Simple */}
        <div className={`border rounded-lg px-3 py-2 ${science.uvLampOn ? 'bg-violet-900/10 border-violet-500/30' : 'bg-black/20 border-white/5'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Sun size={12} className={science.uvLampOn ? 'text-violet-300' : 'text-white/20'} />
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">TLC UV Source</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono text-white/20 border border-white/5 px-1 rounded uppercase">{uvRunMin}m</span>
              <div className={`w-1.5 h-1.5 rounded-full ${science.uvLampOn ? 'bg-violet-400 animate-pulse' : 'bg-white/10'}`} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ScienceCompact;
