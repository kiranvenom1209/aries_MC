import { useTelemetryState } from '../../context/TelemetryContext';

const Gyroscope: React.FC = () => {
  const { state } = useTelemetryState();
  const { pitch, roll } = state.orientation;

  // Artificial Horizon styles based on pitch and roll
  const horizonTransform = `rotate(${roll}deg) translateY(${pitch * 2}px)`;

  return (
    <div className="glass-panel p-4 rounded-xl flex flex-col items-center h-full relative overflow-hidden">
      <div className="absolute top-2 left-4 text-xs text-primary-color uppercase tracking-widest font-bold">
        Attitude / GYRO
      </div>

      <div className="relative w-32 h-32 md:w-48 md:h-48 mt-6 rounded-full border-4 border-gray-800 overflow-hidden bg-blue-900/30 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
        {/* The Horizon Ground/Sky split */}
        <div 
          className="absolute inset-[-50%] transition-transform duration-100 ease-linear"
          style={{ transform: horizonTransform }}
        >
          <div className="w-full h-1/2 bg-sky-600/60 border-b-2 border-white"></div>
          <div className="w-full h-1/2 bg-amber-800/60 border-t-2 border-white"></div>
          
          {/* Pitch lines */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[20px] w-12 border-b-[1.5px] border-white/50"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[20px] w-12 border-b-[1.5px] border-white/50"></div>
        </div>

        {/* Fixed Reticle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-0.5 bg-primary-color relative">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-primary-color bg-transparent"></div>
          </div>
        </div>
      </div>

      <div className="w-full flex justify-between mt-4 px-4 font-mono text-sm">
        <div className="text-gray-400 flex flex-col items-center">
            <span className="text-[10px] uppercase text-gray-500 mb-1">Pitch</span>
            <span className="text-white">{pitch.toFixed(1)}°</span>
        </div>
        <div className="text-gray-400 flex flex-col items-center">
            <span className="text-[10px] uppercase text-gray-500 mb-1">Roll</span>
            <span className="text-white">{roll.toFixed(1)}°</span>
        </div>
      </div>
    </div>
  );
};

export default Gyroscope;
