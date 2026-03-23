import { Activity, AlertTriangle, Zap, Thermometer } from 'lucide-react';
import { useTelemetryState } from '../../context/TelemetryContext';

interface ODriveStatusProps {
  compact?: boolean;
}

const ODriveStatus: React.FC<ODriveStatusProps> = ({ compact = false }) => {
  const { state } = useTelemetryState();
  const { wheels } = state;

  const headerPaddingClass = compact ? 'px-4 py-2' : 'px-5 py-3';
  const contentClass = compact
    ? 'flex-1 p-2 grid grid-cols-2 sm:grid-cols-3 gap-2'
    : 'flex-1 p-3 grid grid-cols-2 gap-3';
  const cardPaddingClass = compact ? 'p-2' : 'p-2.5';
  const cardRadiusClass = compact ? 'rounded-lg' : 'rounded-xl';
  const wheelIdClass = compact ? 'text-[11px]' : 'text-sm';
  const metricGridClass = compact ? 'grid grid-cols-2 gap-x-1.5 gap-y-1 text-[9px] font-mono' : 'grid grid-cols-2 gap-x-2 gap-y-2 text-[10px] font-mono';
  const unitClass = compact ? 'text-[7px]' : 'text-[8px]';
  const labelClass = compact ? 'text-white/30 tracking-[0.12em]' : 'text-white/30 tracking-wider';
  const iconSize = compact ? 7 : 8;

  if (!wheels || wheels.length === 0) return null;

  return (
    <div className="glass-panel rounded-xl flex flex-col h-full relative glow-border">
      {/* sim-panel like header */}
      <div className={`${headerPaddingClass} border-b border-border-color/30 shadow-sm flex justify-between items-center bg-black/40 shrink-0`}>
        <div className="flex items-center gap-2">
            <Activity size={14} className="text-primary-color" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary-color">
            Drivetrain / ODrive S1
            </span>
        </div>
      </div>

      <div className={contentClass}>
        {wheels.map((wheel) => {
          const isFault = wheel.status === 'fault' || wheel.status === 'warning';
          
          return (
            <div 
              key={wheel.id} 
              className={`border ${cardRadiusClass} ${cardPaddingClass} flex flex-col justify-between transition-all duration-300 ${
                isFault 
                  ? 'bg-red-900/20 border-red-500/50 shadow-[inset_0_0_15px_rgba(239,68,68,0.2)]' 
                  : 'bg-black/40 border-primary-color/20 hover:border-primary-color/50 hover:shadow-[inset_0_0_10px_rgba(254,156,61,0.1)]'
              }`}
            >
              <div className={`flex justify-between items-center border-b border-white/5 pb-1 ${compact ? 'mb-1' : 'mb-2'}`}>
                <span className={`${wheelIdClass} font-black font-mono tracking-wider ${isFault ? 'text-red-400' : 'text-white'}`}>
                  [{wheel.id}]
                </span>
                {isFault ? (
                  <AlertTriangle size={compact ? 12 : 14} className="text-red-500 animate-pulse" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)] animate-pulse"></div>
                )}
              </div>
              
              <div className={metricGridClass}>
                <div className="flex flex-col">
                  <span className={labelClass}>VEL</span>
                  <span className="text-white font-medium">{wheel.velocity.toFixed(0)} <span className={`text-white/40 ${unitClass}`}>RPM</span></span>
                </div>
                <div className="flex flex-col">
                  <span className={`${labelClass} flex items-center gap-1`}><Zap size={iconSize}/> CUR</span>
                  <span className="text-white font-medium">{wheel.current.toFixed(1)} <span className={`text-white/40 ${unitClass}`}>A</span></span>
                </div>
                <div className="flex flex-col">
                  <span className={`${labelClass} flex items-center gap-1`}><Thermometer size={iconSize}/> TMP</span>
                  <span className={`font-medium ${wheel.temperature > 50 ? 'text-orange-400' : 'text-white'}`}>
                    {wheel.temperature.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className={labelClass}>BUS</span>
                  <span className="text-white font-medium">{wheel.voltage.toFixed(1)} <span className={`text-white/40 ${unitClass}`}>V</span></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ODriveStatus;
