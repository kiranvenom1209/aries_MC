import { FlaskConical, Sun, Droplets, CheckCircle2, Activity, ShieldCheck, Sparkles } from 'lucide-react';
import { useTelemetryState } from '../../context/TelemetryContext';
import { calculateLPI } from '../../utils/scienceMath';

// pH colour scale: acid → neutral → alkaline
const phColor = (ph: number): string => {
  if (ph < 5)  return '#ef4444'; // red   — strongly acid
  if (ph < 6)  return '#f97316'; // orange
  if (ph < 7)  return '#eab308'; // yellow
  if (ph < 8)  return '#22c55e'; // green  — neutral
  if (ph < 9)  return '#3b82f6'; // blue
  return '#8b5cf6';              // violet — strongly alkaline
};

const phLabel = (ph: number): string => {
  if (ph < 5)  return 'Strongly Acidic';
  if (ph < 6)  return 'Acidic';
  if (ph < 7)  return 'Slightly Acidic';
  if (ph < 8)  return 'Neutral';
  if (ph < 9)  return 'Slightly Alkaline';
  return 'Alkaline';
};

const SciencePayload: React.FC = () => {
  const { state } = useTelemetryState();
  const { science, environment } = state;

  if (!science) return null;

  const { score: lifeScore, confidence: lifeConfidence } = calculateLPI(environment, science);
  const color = phColor(science.ph);
  const phPct = science.ph / 14; // 0–14 scale → 0–100%
  const uvRunMin = Math.floor(science.uvLampRuntime / 60);
  const uvRunSec = Math.floor(science.uvLampRuntime % 60);

  return (
    <div className="glass-panel rounded-xl flex flex-col h-full relative glow-border">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border-color/30 shadow-sm flex justify-between items-center bg-black/40 shrink-0">
        <div className="flex items-center gap-2">
          <FlaskConical size={14} className="text-primary-color" />
          <span className="text-[11px] uppercase text-primary-color font-bold tracking-[0.15em]">
            Science Payload
          </span>
        </div>
        <div className={`flex items-center gap-1.5 text-[9px] font-mono px-2 py-0.5 rounded border uppercase tracking-widest ${science.sampleCollected ? 'bg-green-900/20 border-green-500/40 text-green-400' : 'bg-white/5 border-white/10 text-white/30'}`}>
          <CheckCircle2 size={10} />
          {science.sampleCollected ? 'Sample OK' : 'No Sample'}
        </div>
      </div>

      <div className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto">

        {/* Life Probability Index (LPI) — Environmental Correlation Model */}
        <div className="bg-primary-color/5 border border-primary-color/20 rounded-lg p-3 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-3 relative z-10">
            <div>
              <div className="text-[10px] font-mono text-primary-color uppercase tracking-[0.2em] flex items-center gap-1.5">
                <Activity size={10} />Life Probability Index
              </div>
              <div className="text-[7px] font-mono text-white/20 mt-1 uppercase tracking-widest">Atmospheric/Soil Correlation L7</div>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-mono font-bold text-white tracking-tighter tabular-nums">{lifeScore.toFixed(1)}</span>
                <span className="text-xs font-mono text-white/20 font-bold">%</span>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-1.5 w-full bg-black/40 rounded-full border border-white/5 overflow-hidden mb-3">
             <div 
               className="h-full bg-primary-color transition-all duration-1000 ease-out"
               style={{ width: `${lifeScore}%` }}
             />
          </div>

          <div className="flex justify-between items-center relative z-10">
             <div className="flex items-center gap-1.5">
                <ShieldCheck size={10} className="text-white/30" />
                <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Confidence Rating</span>
             </div>
             <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono font-bold text-white/80">{lifeConfidence.toFixed(1)}%</span>
                <Sparkles size={8} className="text-primary-color/60" />
             </div>
          </div>
        </div>

        {/* pH Meter — DFRobot Gravity Analog pH Sensor/Meter Pro Kit V2 */}
        <div className="border border-white/10 bg-black/30 rounded-lg p-3">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                <Droplets size={10} />pH Sensor
              </div>
              <div className="text-[8px] font-mono text-white/20 mt-0.5">DFRobot Gravity Analog pH V2</div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-2xl font-mono font-bold" style={{ color }}>{science.ph.toFixed(2)}</span>
              <span className="text-[9px] font-mono" style={{ color }}>{phLabel(science.ph)}</span>
            </div>
          </div>

          {/* pH colour gradient bar */}
          <div className="relative h-3 rounded-full border border-white/10 mb-1"
            style={{ background: 'linear-gradient(to right,#ef4444,#f97316,#eab308,#22c55e,#3b82f6,#8b5cf6)' }}>
            {/* cursor */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]"
              style={{ left: `${phPct * 100}%`, willChange: 'left', transition: 'left 0.5s ease' }}
            />
          </div>
          <div className="flex justify-between text-[8px] font-mono text-white/20">
            <span>0 Acid</span><span>7 Neutral</span><span>14 Base</span>
          </div>

          {/* Valid indicator */}
          <div className="flex items-center gap-1.5 mt-2">
            <div className={`w-1.5 h-1.5 rounded-full ${science.phValid ? 'bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.8)]' : 'bg-red-400 animate-pulse'}`} />
            <span className="text-[9px] font-mono text-white/40">{science.phValid ? 'Sensor Calibrated · Reading Valid' : 'Sensor Error'}</span>
          </div>
        </div>

        {/* UV Lamp */}
        <div className={`border rounded-lg p-2.5 flex flex-col gap-2 ${science.uvLampOn ? 'bg-violet-900/20 border-violet-500/40' : 'bg-black/30 border-white/10'}`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                <Sun size={10} className={science.uvLampOn ? 'text-violet-300' : ''} />UV Lamp
              </div>
              <div className="text-[8px] font-mono text-white/20 mt-0.5">For TLC plate analysis</div>
            </div>
            <div className={`text-[9px] font-mono px-2 py-0.5 rounded border ${science.uvLampOn ? 'bg-violet-500/20 border-violet-400/60 text-violet-300' : 'bg-white/5 border-white/10 text-white/30'}`}>
              {science.uvLampOn ? 'ON' : 'OFF'}
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <div className="flex flex-col">
              <span className="text-white/30">Runtime</span>
              <span className="text-white tabular-nums">{uvRunMin}m {uvRunSec.toString().padStart(2,'0')}s</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white/30">Type</span>
              <span className="text-white/60">UV-A/UV-C</span>
            </div>
          </div>
        </div>

        {/* Soil Moisture placeholder */}
        <div className="border border-white/5 bg-black/20 rounded-lg p-2.5">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Soil Moisture</span>
            <span className="text-[9px] font-mono text-white/20 italic">pending sensor</span>
          </div>
          <div className="h-1 w-full bg-black/50 rounded-full border border-white/10">
            <div
              className="h-full w-full rounded-full origin-left bg-blue-500/50"
              style={{ transform: `scaleX(${science.soilMoisture / 100})`, transition: 'transform 0.5s ease', willChange: 'transform' }}
            />
          </div>
          <span className="text-[9px] font-mono text-white/20 mt-1 block">{science.soilMoisture.toFixed(0)} %</span>
        </div>

      </div>
    </div>
  );
};

export default SciencePayload;

