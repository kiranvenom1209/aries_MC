import React, { useState, useEffect, useCallback } from 'react';
import { useROS } from '../context/ROSContext';
import CameraGrid from '../components/media/CameraGrid';
import { Activity, Beaker, Droplets, TestTube, Scale, StopCircle, PlayCircle, Download } from 'lucide-react';
import type { EnvironmentData, ScienceData } from '../types/telemetry';
import type { RosCommandKey } from '../config/rosCommands';
import MapView from '../components/media/MapView';
import EnvironmentSensors from '../components/telemetry/EnvironmentSensors';
import SciencePayload from '../components/telemetry/SciencePayload';
import { encryptLog } from '../utils/logFormat';
import { calculateLPI } from '../utils/scienceMath';

type PublishFn = (topic: RosCommandKey, msg: unknown) => void;

const PumpControls: React.FC<{ pumpOn: boolean, publish: PublishFn }> = ({ pumpOn, publish }) => (
  <div className="glass-panel p-4 rounded-xl border border-white/5 bg-black/40 h-full flex flex-col justify-between hover:bg-black/50 transition-colors">
    <div className="flex items-center gap-2 mb-2 text-blue-400 font-mono uppercase tracking-widest text-[10px]">
      <Droplets size={14} /> Peristaltic Pump
    </div>
    <div className="flex items-center justify-between mt-auto pt-2">
      <div className="text-xs text-white/50 font-mono">{pumpOn ? 'Pump is dispensing fluid.' : 'Pump is idle.'}</div>
      <button 
        onClick={() => publish('scienceAction', { action: pumpOn ? 'pump_off' : 'pump_on', source: 'ui' })}
        className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest rounded border transition-all ${
          pumpOn ? 'bg-red-900/30 border-red-500/50 text-red-400 hover:bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                 : 'bg-green-900/30 border-green-500/50 text-green-400 hover:bg-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
        }`}
      >
        {pumpOn ? 'Stop Pump' : 'Start Pump'}
      </button>
    </div>
  </div>
);

const RamanSpectrometer: React.FC<{ ramanStatus: string, ramanResult: string, publish: PublishFn }> = ({ ramanStatus, ramanResult, publish }) => (
  <div className="glass-panel p-4 rounded-xl border border-white/5 bg-black/40 h-full flex flex-col justify-between hover:bg-black/50 transition-colors">
    <div className="flex items-center gap-2 mb-2 text-green-400 font-mono uppercase tracking-widest text-[10px]">
      <Beaker size={14} /> Raman Spectrometer
    </div>
    <div className="flex flex-col gap-2 mt-auto pt-2">
      {(ramanResult || ramanStatus === 'scanning') && (
        <div className="mb-2 text-[10px] text-green-300 font-mono">
          {ramanStatus === 'scanning' ? 'Analyzing spectral signature...' : `COMPOSITION: ${ramanResult}`}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-white/50 font-mono">Status: <span className="text-white font-mono uppercase ml-1">{ramanStatus}</span></div>
        <button 
          onClick={() => publish('scienceAction', { action: 'raman_scan', source: 'ui' })}
          disabled={ramanStatus === 'scanning'}
          className="px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest rounded border border-white/20 bg-white/5 hover:bg-white/10 text-white disabled:opacity-50 transition-all"
        >
          {ramanStatus === 'scanning' ? 'Scanning...' : 'Run Scan'}
        </button>
      </div>
    </div>
  </div>
);

const SampleStorage: React.FC<{ science?: ScienceData }> = ({ science }) => {
  if (!science) return null;
  return (
    <div className="glass-panel p-4 rounded-xl border border-white/5 bg-black/40">
      <div className="flex items-center gap-2 mb-3 text-orange-400 font-mono uppercase tracking-widest text-[10px]">
        <Scale size={14} /> Specimen Storage Scales
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[9px] font-mono uppercase text-white/40 tracking-widest">
        <div className="pb-1 bg-transparent flex flex-col gap-1">
          <span>Rock Samples</span>
          <span className="text-xl text-white font-bold">{science.rockSampleWeight.toFixed(1)} g</span>
        </div>
        <div className="pb-1 bg-transparent flex flex-col gap-1">
          <span>Deep Soil (Drill)</span>
          <span className="text-xl text-white font-bold">{science.soilSampleWeight.toFixed(1)} g</span>
        </div>
        <div className="pb-1 bg-transparent flex flex-col gap-1">
          <span>pH Test Liquid</span>
          <span className="text-xl text-blue-400 font-bold">{science.liquidSampleLevel.toFixed(1)} mL</span>
        </div>
      </div>
    </div>
  );
};

export interface LoggedSample {
  id: string;
  time: string;
  x: number;
  y: number;
  lifeScore: number;
  temp: number;
  soilTemp: number;
  humidity: number;
  pressure: number;
  soilMoisture: number;
  co2: number;
  nh3: number;
  ch4: number;
  ph: number;
}


const DataLogger: React.FC<{ env?: EnvironmentData, science?: ScienceData, loc: {x: number, y: number} }> = ({ env, science, loc }) => {
  const [isLogging, setIsLogging] = useState(false);
  const [logs, setLogs] = useState<LoggedSample[]>([]);
  const { score: finalScore } = calculateLPI(env, science);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLogging) {
      interval = setInterval(() => {
        setLogs(prev => {
          const newLog: LoggedSample = {
            id: `SMP-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
            time: new Date().toLocaleTimeString(),
            x: loc.x,
            y: loc.y,
            lifeScore: calculateLPI(env, science).score,
            temp: env?.temperature || 0,
            soilTemp: env?.soilTemperature || 0,
            humidity: env?.humidity || 0,
            pressure: env?.airPressure || 0,
            soilMoisture: env?.soilMoisture || 0,
            co2: env?.co2 || 0,
            nh3: env?.nh3 || 0,
            ch4: env?.ch4 || 0,
            ph: science?.ph || 0,
          };
          return [newLog, ...prev];
        });
      }, 100); // Auto log every 0.1s while active
    }
    return () => clearInterval(interval);
  }, [isLogging, loc, science, env]);

  const exportLog = useCallback(() => {
    if (logs.length === 0) return;
    const header = "ID,Time,X,Y,Life_Score_Pct,Temp_C,SoilTemp_C,Humidity_pct,Pressure_mb,SoilMoist_pct,CO2_ppm,NH3_ppm,CH4_ppb,pH\n";
    const csvContent = logs.map(l => 
      `${l.id},${l.time},${l.x.toFixed(2)},${l.y.toFixed(2)},${l.lifeScore},${l.temp.toFixed(2)},${l.soilTemp.toFixed(2)},${l.humidity.toFixed(1)},${l.pressure.toFixed(1)},${l.soilMoisture.toFixed(1)},${l.co2.toFixed(1)},${l.nh3.toFixed(1)},${l.ch4.toFixed(1)},${l.ph.toFixed(2)}`
    ).join("\n");
    const encryptedData = encryptLog(header + csvContent);
    const blob = new Blob([encryptedData.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `environmental_samples_${new Date().getTime()}.lp1`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [logs]);

  return (
    <div className="glass-panel p-4 rounded-xl border border-white/5 bg-black/40 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-gray-300 font-mono uppercase tracking-widest text-[10px]">
          <Activity size={14} /> Auto-Logger & CSV Export
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsLogging(!isLogging)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest border rounded transition-all ${
              isLogging 
                ? 'border-red-500/50 bg-red-900/30 text-red-500 hover:bg-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.2)]' 
                : 'border-green-500/50 bg-green-900/20 text-green-500 hover:bg-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.15)]'
            }`}
          >
            {isLogging ? <StopCircle size={12} /> : <PlayCircle size={12} />}
            {isLogging ? 'Stop Logging' : 'Start Logging'}
          </button>
          <button 
            onClick={exportLog}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest border border-blue-500/30 rounded bg-blue-900/20 hover:bg-blue-500/20 text-blue-500 disabled:opacity-30 disabled:shadow-none transition-all shadow-[0_0_8px_rgba(59,130,246,0.15)]"
          >
            <Download size={12} /> Export .LP1
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 items-end">
         <div className="flex flex-col">
           <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-mono mb-1">Environmental LPI Score</span>
           <span className={`text-3xl font-mono leading-none ${finalScore >= 70 ? 'text-green-400 drop-shadow-[0_0_12px_rgba(34,197,94,0.4)]' : finalScore >= 40 ? 'text-orange-400' : 'text-red-400'}`}>
             {finalScore}%
           </span>
         </div>
         <div className="text-[9px] font-mono uppercase tracking-widest text-white/40 pb-1 flex flex-col justify-end">
           <span>Records InMemory: <span className="text-white ml-2">{logs.length}</span></span>
         </div>
      </div>
    </div>
  );
};


const ScienceOpsPage: React.FC = () => {
  const { state, publishCommand } = useROS();
  const science = state.science;
  const env = state.environment;
  
  // Automatically identify the microscope feed or render a placeholder
  const microscopeCam = state.cameras.find((c) => c.name.toLowerCase().includes('microscope')) 
    ?? { id: 'microscope', name: 'Microscope Optics Feed', url: science?.microscopeOn ? 'mock_microscope' : '', status: science?.microscopeOn ? 'online' : 'offline' };

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full flex flex-col gap-4">
        
        {/* Header Block */}
        <div className="shrink-0 flex flex-col">
          <div className="text-lg font-mono uppercase tracking-[0.2em] text-blue-400 flex items-center gap-3 px-2">
            <TestTube size={20} /> Science Operations
          </div>
          <div className="text-xs text-white/40 mt-1 mb-4 px-2">Dedicated workspace for sample analysis, environmental telemetry, and habitability assessment.</div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 glass-panel">
              <span className="text-white/40 text-[9px] uppercase tracking-widest block mb-2 font-mono">Raman Spectrometer</span>
              <span className={`text-xl font-mono uppercase ${science?.ramanStatus === 'idle' ? 'text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 'text-white'}`}>
                {science?.ramanStatus || 'OFFLINE'}
              </span>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 glass-panel">
              <span className="text-white/40 text-[9px] uppercase tracking-widest block mb-2 font-mono">Peristaltic Pump</span>
              <span className="text-xl font-mono uppercase text-white/90">{science?.pumpOn ? 'ACTIVE' : 'STANDBY'}</span>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 glass-panel">
              <span className="text-white/40 text-[9px] uppercase tracking-widest block mb-2 font-mono">Microscope Optics</span>
              <span className="text-xl font-mono uppercase text-white/90">{science?.microscopeOn ? 'ONLINE' : 'SECURED'}</span>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 glass-panel">
              <span className="text-white/40 text-[9px] uppercase tracking-widest block mb-2 font-mono">Sample pH</span>
              <span className="text-xl font-mono uppercase text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]">{science?.phValid ? science?.ph.toFixed(1) : '--'}</span>
            </div>
          </div>
        </div>

        {/* Content Splitting */}
        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-4 overflow-y-auto custom-scrollbar">
          
          {/* Left Side: Map, Environment, pH */}
          <div className="min-h-0 flex flex-col gap-4">
            <div className="shrink-0 min-h-[420px] rounded-xl overflow-hidden glass-panel border border-white/5 relative">
               <div className="absolute inset-0">
                 <MapView />
               </div>
            </div>
            <div className="shrink-0 min-h-[350px]">
               <EnvironmentSensors />
            </div>
          </div>

          <div className="min-h-0 flex flex-col gap-4">
            
            {/* Microscope feed wrapper */}
            <div className="shrink-0 min-h-[400px] rounded-xl border border-white/10 overflow-hidden relative group glass-panel bg-black/20">
              <CameraGrid feeds={[microscopeCam]} title="Microscope Optics" />
              
              {/* Particle Size Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-60">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <g stroke="rgba(34, 197, 94, 0.4)" strokeWidth="1">
                    <line x1="50%" y1="0" x2="50%" y2="100%" />
                    <line x1="0" y1="50%" x2="100%" y2="50%" />
                    <circle cx="50%" cy="50%" r="20%" fill="none" strokeDasharray="4 4" />
                    <circle cx="50%" cy="50%" r="40%" fill="none" strokeDasharray="4 4" />
                  </g>
                  <text x="71%" y="48%" fill="rgba(34, 197, 94, 0.8)" fontSize="9" fontFamily="monospace">10 μm</text>
                  <text x="91%" y="48%" fill="rgba(34, 197, 94, 0.8)" fontSize="9" fontFamily="monospace">20 μm</text>
                  <path d="M 50% 50% l 20% 0 m 0 -5 l 0 10" stroke="rgba(34,197,94,0.6)" strokeWidth="1" />
                  <path d="M 50% 50% l 40% 0 m 0 -5 l 0 10" stroke="rgba(34,197,94,0.6)" strokeWidth="1" />
                </svg>
              </div>

              <div className="absolute top-2 right-2 z-20">
                <button 
                  onClick={() => publishCommand('scienceAction', { action: science?.microscopeOn ? 'microscope_off' : 'microscope_on', source: 'ui' })}
                  className={`px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest rounded transition-all shadow-lg backdrop-blur-md border ${
                    science?.microscopeOn 
                      ? 'border-red-500/40 bg-red-900/40 text-red-100 hover:bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                      : 'border-white/50 bg-black/50 text-white hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {science?.microscopeOn ? 'Deactivate Optics' : 'Activate Optics'}
                </button>
              </div>
            </div>

            <div className="shrink-0">
               <DataLogger env={env} science={science} loc={state.location} />
            </div>
            
            <div className="shrink-0">
               <SampleStorage science={science} />
            </div>
            
            <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4">
               <PumpControls pumpOn={!!science?.pumpOn} publish={publishCommand} />
               <RamanSpectrometer ramanStatus={science?.ramanStatus || 'idle'} ramanResult={science?.ramanResult || 'Awaiting Specimen'} publish={publishCommand} />
            </div>

            <div className="shrink-0 min-h-[320px]">
               <SciencePayload />
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default ScienceOpsPage;
