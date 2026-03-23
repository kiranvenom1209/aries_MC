import { FlaskConical, Sun, Droplets, CheckCircle2 } from 'lucide-react';
import { useTelemetryState } from '../../context/TelemetryContext';

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
  const { science } = state;

  if (!science) return null;

  const color = phColor(science.ph);
  const phPct = science.ph / 14;
  const uvRunMin = Math.floor(science.uvLampRuntime / 60);
  const uvRunSec = Math.floor(science.uvLampRuntime % 60);

  return (
    <div className="glass-panel rounded-2xl flex flex-col relative glow-border bg-black/50 overflow-hidden">
      <div className="px-5 py-3 border-b border-border-color/30 shadow-sm flex justify-between items-center bg-black/60 shrink-0">
        <div className="flex items-center gap-2">
          <FlaskConical size={16} className="text-primary-color" />
          <span className="text-[12px] uppercase text-primary-color font-bold tracking-[0.2em]">
            Biological Analysis
          </span>
        </div>
        <div className={`flex items-center gap-2 text-[10px] font-mono px-3 py-1 rounded-full border uppercase tracking-widest ${science.sampleCollected ? 'bg-green-900/40 border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 text-white/30'}`}>
          <CheckCircle2 size={12} />
          {science.sampleCollected ? 'Sample Logged' : 'No Sample'}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* pH row */}
        <div className="border border-white/10 bg-black/40 rounded-xl px-4 py-3">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <Droplets size={14} className="text-white/40" />
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Potential Hydrogen (pH)</span>
            </div>
            <span className="text-3xl font-mono font-bold tabular-nums" style={{ color }}>
              {science.ph.toFixed(2)}
            </span>
          </div>
          <div className="relative h-3 rounded-full border border-white/10 overflow-hidden"
            style={{ background: 'linear-gradient(to right,#ef4444,#f97316,#eab308,#22c55e,#3b82f6,#8b5cf6)' }}>
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
              style={{ left: `${phPct * 100}%`, transition: 'left 0.5s ease' }}
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${science.phValid ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`} />
            <span className="text-[10px] font-mono text-white/40 uppercase">{science.phValid ? 'Sensor Stabilized' : 'Calibration Error'}</span>
          </div>
        </div>

        {/* UV Lamp */}
        <div className={`border rounded-xl px-4 py-3 ${science.uvLampOn ? 'bg-violet-900/30 border-violet-500/50' : 'bg-black/40 border-white/10'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sun size={14} className={science.uvLampOn ? 'text-violet-300' : 'text-white/40'} />
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">TLC UV Source</span>
            </div>
            <span className={`text-[10px] font-mono px-3 py-1 rounded-full border ${science.uvLampOn ? 'bg-violet-500/30 border-violet-400/60 text-violet-300' : 'bg-white/5 border-white/10 text-white/30'}`}>
              {science.uvLampOn ? 'ACTIVE' : 'STANDBY'}
            </span>
          </div>
          <div className="text-[10px] font-mono text-white/50 mt-2 tabular-nums">
            Accumulated Exposure: {uvRunMin}m {uvRunSec.toString().padStart(2, '0')}s
          </div>
        </div>

        {/* Soil Moisture */}
        <div className="border border-white/10 bg-black/40 rounded-xl px-4 py-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Soil Moisture Content</span>
            <span className="text-sm font-mono text-white tabular-nums font-bold">{science.soilMoisture.toFixed(1)}%</span>
          </div>
          <div className="h-2 w-full bg-black/60 rounded-full border border-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500/60 shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${science.soilMoisture}%`, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScienceCompact;

