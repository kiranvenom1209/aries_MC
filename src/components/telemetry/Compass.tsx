import { useTelemetryState } from '../../context/TelemetryContext';

const Compass: React.FC = () => {
  const { state } = useTelemetryState();
  const heading = state.orientation.heading;

  return (
    <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center h-full relative overflow-hidden">
      <div className="absolute top-2 left-4 text-xs text-primary-color uppercase tracking-widest font-bold">
        Heading / MAG
      </div>
      
      <div className="relative w-32 h-32 md:w-48 md:h-48 mt-4">
        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-border-color shadow-[0_0_15px_rgba(254,156,61,0.2)]"></div>
        
        {/* Tick marks */}
        <div 
          className="absolute inset-2 rounded-full border border-gray-700 transition-transform duration-100 ease-linear"
          style={{ transform: `rotate(${-heading}deg)` }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-red-500 font-bold">N</div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 text-[10px] text-gray-400">S</div>
          <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 text-[10px] text-gray-400">E</div>
          <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-gray-400">W</div>
          
          {/* Degree markers */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
             <div 
               key={deg}
               className="absolute w-1 h-3 bg-gray-600 left-1/2 top-0 origin-bottom"
               style={{ 
                 transform: `translateX(-50%) rotate(${deg}deg)`,
                 transformOrigin: '50% 100%',
                 height: '50%'
               }}
             >
               <div className="w-1 h-2 bg-gray-500 rounded-sm"></div>
             </div>
          ))}
        </div>

        {/* Center fixed pointer */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[20px] border-l-transparent border-r-transparent border-b-primary-color mb-1"></div>
            <div className="w-3 h-3 rounded-full bg-border-color z-10"></div>
        </div>
      </div>
      
      <div className="mt-6 text-3xl font-mono text-primary-color font-bold tracking-wider">
        {heading.toFixed(1)}°
      </div>
    </div>
  );
};

export default Compass;
