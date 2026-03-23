import { Activity, Sparkles, AlertTriangle, Wind, Waves, ShieldCheck } from 'lucide-react';
import { usePlayback } from '../../context/PlaybackContext';
import { calculateLPI } from '../../utils/scienceMath';

const ChanceOfLifeCard: React.FC = () => {
  const { currentState, logType } = usePlayback();
  
  if (logType !== 'science' || !currentState?.science || !currentState?.environment) return null;

  const { score, confidence } = calculateLPI(currentState.environment, currentState.science);
  
  // High-end professional color mapping
  const getVisuals = (val: number) => {
    if (val > 80) return { 
      status: "STABLE_BIOGENIC", 
      color: "#10b981", // Emerald 500
      accent: "text-emerald-400",
      bg: "bg-emerald-500/5",
      border: "border-emerald-500/20"
    };
    if (val > 40) return { 
      status: "DEVIATION_DETECTED", 
      color: "#f59e0b", // Amber 500
      accent: "text-amber-400",
      bg: "bg-amber-500/5",
      border: "border-amber-500/20"
    };
    if (val > 15) return { 
      status: "TRACE_SIGNATURE", 
      color: "#f97316", // Orange 500
      accent: "text-orange-400",
      bg: "bg-orange-500/5",
      border: "border-orange-500/20"
    };
    return { 
      status: "SIGNAL_LOW", 
      color: "#94a3b8", // Slate 400
      accent: "text-slate-400",
      bg: "bg-slate-500/5",
      border: "border-slate-500/20"
    };
  };

  const visuals = getVisuals(score);
  
  // SVG Ring Calculations
  const size = 200;
  const stroke = 1.5;
  const radius = 80;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`glass-panel rounded-[2rem] border ${visuals.border} ${visuals.bg} backdrop-blur-3xl transition-all duration-1000 relative overflow-hidden h-full flex flex-col group`}>
      
      {/* Subtle Background Aesthetic */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-color/5 rounded-full blur-[80px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary-color/5 rounded-full blur-[80px] -ml-32 -mb-32" />
      </div>

      {/* Minimal Header */}
      <div className="px-8 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <Activity className="text-white/60" size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/80">Life Probability Index</span>
            <span className="text-[7px] font-mono text-white/20 tracking-[0.2em] uppercase mt-0.5">Environmental Correlation Model v1.2</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10">
           <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: visuals.color }} />
           <span className="text-[8px] font-mono font-bold tracking-widest text-white/40 uppercase">{visuals.status}</span>
        </div>
      </div>

      {/* Elegant Main Readout */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
          {/* Technical SVG Ring */}
          <svg width={size} height={size} className="-rotate-90 block">
             {/* Tick Ring (Static) */}
             <circle
                cx={size/2} cy={size/2} r={radius}
                fill="none" stroke="currentColor"
                strokeWidth={stroke}
                strokeDasharray="1, 4"
                className="text-white/10"
             />
             {/* Progress Ring */}
             <circle
                cx={size/2} cy={size/2} r={radius}
                fill="none" stroke={visuals.color}
                strokeWidth={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-[2000ms] ease-out shadow-[0_0_10px_rgba(255,255,255,0.1)]"
             />
          </svg>

          {/* Absolute Centered Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="flex items-baseline justify-center">
               <span className="text-5xl font-light tracking-tight text-white/90 tabular-nums">
                 {score.toFixed(1)}
               </span>
               <span className="text-lg text-white/20 font-light ml-1">%</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 opacity-30">
               <Sparkles size={10} className="text-white" />
               <span className="text-[8px] text-white font-mono uppercase tracking-[0.3em]">Signature Alpha</span>
            </div>
          </div>
        </div>

        {/* Atmospheric KPIs - Live Telemetry */}
        <div className="mt-6 grid grid-cols-3 gap-4 w-full">
           <div className="flex flex-col gap-1 pl-3 border-l border-emerald-500/30">
              <div className="flex items-center gap-1">
                <Wind size={8} className="text-white/20" />
                <span className="text-[7px] uppercase text-white/30 tracking-widest font-medium">Methane</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-light text-emerald-400 tabular-nums tracking-tight">
                  {currentState.environment?.ch4.toFixed(0) ?? 0}
                </span>
                <span className="text-[8px] text-white/20 uppercase">ppb</span>
              </div>
           </div>

           <div className="flex flex-col gap-1 pl-3 border-l border-blue-500/30">
              <div className="flex items-center gap-1">
                <Waves size={8} className="text-white/20" />
                <span className="text-[7px] uppercase text-white/30 tracking-widest font-medium">CO2</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-light text-blue-400 tabular-nums tracking-tight">
                  {currentState.environment?.co2.toFixed(1) ?? 0}
                </span>
                <span className="text-[8px] text-white/20 uppercase">ppm</span>
              </div>
           </div>

           <div className="flex flex-col gap-1 pl-3 border-l border-white/10">
              <div className="flex items-center gap-1">
                <ShieldCheck size={8} className="text-white/20" />
                <span className="text-[7px] uppercase text-white/30 tracking-widest font-medium">Confidence</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-light text-white/70 tabular-nums tracking-tight">
                  {confidence.toFixed(1)}
                </span>
                <span className="text-[8px] text-white/20 uppercase">%</span>
              </div>
           </div>
        </div>
      </div>

      {/* Realistic Technical Footer */}
      <div className="px-8 py-6 flex items-center gap-5 relative z-10 border-t border-white/[0.03] bg-orange-500/[0.02]">
         <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-orange-400" />
         </div>
         <p className="text-[9px] text-white/40 leading-relaxed font-mono uppercase tracking-[0.05em]">
           <span className="text-orange-400/80 font-bold tracking-[0.1em]">PRELIMINARY ASSESSMENT:</span> LPI is an atmospheric correlate derived from real-time gas composition analysis. Accuracy is subject to local atmospheric variance (<span className="text-white/60">~1.2%</span>).
         </p>
      </div>
    </div>
  );
};

export default ChanceOfLifeCard;
