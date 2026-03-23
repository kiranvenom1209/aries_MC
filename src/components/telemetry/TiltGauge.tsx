import { useTelemetryState } from '../../context/TelemetryContext';

const TiltGauge: React.FC = () => {
  const { state } = useTelemetryState();
  const { tilt } = state.orientation;

  // Max tilt considered 45 degrees
  const tiltPercentage = Math.min((tilt / 45) * 100, 100);
  
  // Color logic
  const isDanger = tilt > 30;
  const isWarning = tilt > 20 && tilt <= 30;
  
  const barColorClass = isDanger 
    ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' 
    : isWarning 
    ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)]' 
    : 'bg-primary-color shadow-[0_0_10px_rgba(254,156,61,0.6)]';

  return (
    <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center h-full relative overflow-hidden">
      <div className="absolute top-2 left-4 text-xs text-primary-color uppercase tracking-widest font-bold">
        Incline / TILT
      </div>

      <div className="flex items-center justify-center w-full h-full mt-6 gap-6">
        {/* The Gauge */}
        <div className="relative w-8 h-32 md:h-48 bg-gray-900 rounded-full border border-gray-700 overflow-hidden">
          <div 
            className={`absolute bottom-0 w-full rounded-b-full transition-all duration-300 ease-in-out ${barColorClass}`}
            style={{ height: `${tiltPercentage}%` }}
          ></div>
          
          {/* Danger zone marker */}
          <div className="absolute top-[33%] w-full h-0.5 bg-red-500/50"></div>
          {/* Warning zone marker */}
          <div className="absolute top-[55%] w-full h-0.5 bg-orange-500/50"></div>
        </div>

        {/* Readout */}
        <div className="flex flex-col items-center">
            <span className={`text-3xl font-mono font-bold ${isDanger ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-white'}`}>
                {tilt.toFixed(1)}°
            </span>
            <span className="text-[10px] text-gray-500 uppercase mt-1">Declination</span>
            
            <div className={`mt-4 text-xs px-2 py-1 rounded font-mono ${isDanger ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-green-500/20 text-green-500 border border-green-500/50'}`}>
                {isDanger ? 'CRITICAL TILT' : 'SAFE'}
            </div>
        </div>
      </div>
    </div>
  );
};

export default TiltGauge;
