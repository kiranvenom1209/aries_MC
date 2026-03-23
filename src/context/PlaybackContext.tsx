import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { RoverState } from '../types/telemetry';
import { decryptLog } from '../utils/logFormat';

interface PlaybackContextType {
  playbackData: RoverState[];
  currentIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  
  // Controls
  loadLog: (file: File) => void;
  seekTo: (index: number) => void;
  togglePlayback: () => void;
  setSpeed: (speed: number) => void;
  exportToCSV: () => void;
  isLeapOne: boolean;
  logType: 'mission' | 'science' | null;
  error: string | null;
  clearError: () => void;
  
  // Computed
  currentState: RoverState | null;
  playbackProgress: number; // 0 to 1
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export const PlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [playbackData, setPlaybackData] = useState<RoverState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [originalCSV, setOriginalCSV] = useState<string | null>(null);
  const [isLeapOneFile, setIsLeapOneFile] = useState(false);
  const [logType, setLogType] = useState<'mission' | 'science' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) return;

        const { text: csvText, isLeapOne } = decryptLog(buffer);
        if (!csvText) {
          setError("Inappropriate file: No readable data.");
          return;
        }

        const lines = csvText.split('\n').filter(l => l.trim());
        if (lines.length < 2) {
          setError("Inappropriate file: Incomplete data.");
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        
        // Detection
        const isScience = headers.includes('Life_Score_Pct') || headers.includes('SoilTemp_C');
        const isMission = headers.includes('Pos_X (m)') && headers.includes('Battery (%)');

        if (!isScience && !isMission) {
          setError("Inappropriate file structure or missing telemetry data.");
          return;
        }

        setLogType(isScience ? 'science' : 'mission');
        setOriginalCSV(csvText);
        setIsLeapOneFile(isLeapOne);

        const dataRows = lines.slice(1);
        const states: RoverState[] = dataRows.map(row => {
          const values = row.split(',').map(v => v.trim());
          const d: Record<string, string> = {};
          headers.forEach((h, i) => d[h] = values[i]);

          const getVal = (key: string) => parseFloat(d[key]) || 0;

          if (isScience) {
            return {
              timestamp: new Date(d['Time']).getTime() || Date.now(),
              location: { x: getVal('X'), y: getVal('Y'), z: 0 },
              orientation: { pitch: 0, roll: 0, yaw: 0, heading: 0, tilt: 0 },
              telemetry: {
                speed: 0,
                batteryLevel: 100,
                batteryVoltage: 24,
                connectionStatus: 'connected',
                signalStrength: 100,
                temperature: getVal('Temp_C'),
                statusMessage: 'Science Log Replay'
              },
              science: {
                lifeScore: getVal('Life_Score_Pct'),
                ph: getVal('pH'),
                phValid: true,
                uvLampOn: false,
                uvLampRuntime: 0,
                soilMoisture: getVal('SoilMoist_pct'),
                sampleCollected: true,
                pumpOn: false,
                microscopeOn: false,
                ramanStatus: 'idle',
                ramanResult: '',
                rockSampleWeight: 0,
                soilSampleWeight: 0,
                liquidSampleLevel: 0
              },
              environment: {
                humidity: getVal('Humidity_pct'),
                airPressure: getVal('Pressure_mb'),
                temperature: getVal('Temp_C'),
                soilTemperature: getVal('SoilTemp_C'),
                soilMoisture: getVal('SoilMoist_pct'),
                co2: getVal('CO2_ppm'),
                nh3: getVal('NH3_ppm'),
                ch4: getVal('CH4_ppb')
              },
              cameras: [],
              checklistStatus: {
                pwr: true, drv: true, com: true, sci: true, drill: true, arm: true
              },
              wheels: [],
              arm: { status: 'idle', joints: [], payload: 0 },
              drill: { 
                drillDepth: 0, actuatorPosition: 0, status: 'idle', 
                limitSwitchTop: false, limitSwitchBottom: false, 
                motors: [], actuatorExtended: false 
              }
            } as any as RoverState;
          }

          // Mission Parser
          return {
            timestamp: getVal('Timestamp') || Date.now(),
            location: { x: getVal('Pos_X (m)'), y: getVal('Pos_Y (m)'), z: getVal('Pos_Z (m)') },
            orientation: { 
              pitch: getVal('Pitch (°)'), 
              roll: getVal('Roll (°)'), 
              yaw: getVal('Yaw (°)'), 
              heading: getVal('Heading (°)'),
              tilt: getVal('Tilt (°)') 
            },
            telemetry: {
              speed: getVal('Speed (m/s)'),
              batteryLevel: getVal('Battery (%)'),
              batteryVoltage: getVal('Bus Voltage (V)'),
              connectionStatus: 'connected',
              signalStrength: getVal('Signal (dBm)'),
              temperature: getVal('Core Temp (°C)'),
              statusMessage: 'Historical Log Replay'
            },
            network: {
              signalStrength: getVal('Signal (dBm)'),
              uplink: getVal('Uplink (Mbps)'),
              downlink: getVal('Downlink (Mbps)')
            },
            compute: {
              cpuUsage: getVal('CPU_Load (%)'),
              cpuTemp: getVal('CPU_Temp (°C)'),
              gpuUsage: getVal('GPU_Load (%)'),
              gpuTemp: getVal('GPU_Temp (°C)'),
              ramUsage: getVal('RAM_Used (GB)'),
              storageUsage: getVal('Storage_Used (TB)')
            },
            batteryCells: [1, 2, 3, 4].map(i => ({
              id: `B${i}`,
              voltage: getVal(`Cell_${i}_V`),
              current: getVal(`Cell_${i}_A`),
              temp: getVal(`Cell_${i}_T`),
              soc: getVal(`Cell_${i}_SOC`) || 100 
            })),
            wheels: ['FL', 'FR', 'ML', 'MR', 'RL', 'RR'].map(id => ({
              id,
              velocity: getVal(`Wheel_${id}_Velo_RPM`),
              current: getVal(`Wheel_${id}_Curr_A`),
              voltage: getVal(`Wheel_${id}_Volt_V`),
              temperature: getVal(`Wheel_${id}_Temp_C`),
              status: (d[`Wheel_${id}_Stat`] || 'normal') as any,
            })),
            arm: {
              status: (d['Arm_Status'] || 'idle') as any,
              payload: getVal('Arm_Payload_KG'),
              joints: [1, 2, 3, 4, 5, 6].map(i => ({ 
                id: `J${i}`,
                angle: getVal(`Joint_${i}_Angle`), 
                temp: getVal(`Joint_${i}_Temp`) 
              }))
            },
            drill: {
              drillDepth: getVal('Drill_Depth_mm'),
              actuatorPosition: getVal('Drill_Actuator_mm'),
              status: (d['Drill_Status'] || 'idle') as any,
              limitSwitchTop: d['Drill_LS_Top'] === '1',
              limitSwitchBottom: d['Drill_LS_Bot'] === '1',
              motors: [
                { id: 'thrust', label: 'Thrust Motor', ratedRpm: 246, currentRpm: getVal('Drill_thrust_RPM'), current: getVal('Drill_thrust_Curr_A'), voltage: getVal('Drill_thrust_Volt_V'), temp: getVal('Drill_thrust_Temp_C'), status: 'idle' },
                { id: 'auger', label: 'Auger Motor', ratedRpm: 13.5, currentRpm: getVal('Drill_auger_RPM'), current: getVal('Drill_auger_Curr_A'), voltage: getVal('Drill_auger_Volt_V'), temp: getVal('Drill_auger_Temp_C'), status: 'idle' }
              ] as any,
              actuatorExtended: getVal('Drill_Actuator_mm') > 0
            },
            science: {
              lifeScore: getVal('Sci_Life_Score'),
              ph: getVal('Sci_pH'),
              phValid: d['Sci_ph_Valid'] === '1',
              uvLampOn: d['Sci_UV'] === '1',
              uvLampRuntime: getVal('Sci_UV_Runtime'),
              pumpOn: d['Sci_Pump'] === '1',
              microscopeOn: d['Sci_Microscope'] === '1',
              ramanStatus: (d['Sci_Raman'] || 'idle') as any,
              ramanResult: '', 
              rockSampleWeight: getVal('Sci_Rock_W'),
              soilSampleWeight: getVal('Sci_Soil_W'),
              liquidSampleLevel: getVal('Sci_Liq_L'),
              soilMoisture: getVal('Sci_Moist'),
              sampleCollected: d['Sci_Rock_W'] !== '0' || d['Sci_Soil_W'] !== '0'
            },
            environment: {
              humidity: getVal('Env_Humid'),
              airPressure: getVal('Env_Press'),
              temperature: getVal('Env_Temp'),
              soilTemperature: getVal('Env_Soil_T'),
              soilMoisture: getVal('Env_Soil_M'),
              co2: getVal('Env_CO2'),
              ch4: getVal('Env_CH4'),
              nh3: getVal('Env_NH3')
            },
            checklistStatus: {
              pwr: d['Check_Power'] === '1',
              drv: d['Check_Drive'] === '1',
              com: d['Check_Comms'] === '1',
              sci: d['Check_Sci'] === '1',
              drill: d['Check_Drill'] === '1',
              arm: d['Check_Arm'] === '1',
            },
            cameras: []
          } as any as RoverState;
        });

        setPlaybackData(states);
      setCurrentIndex(0);
      setIsPlaying(false);
      setError(null);
    } catch (err: any) {
      console.error("Playback load error:", err);
      setError("Inappropriate file or invalid security format.");
    }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const seekTo = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(playbackData.length - 1, index)));
  }, [playbackData.length]);

  const togglePlayback = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const exportToCSV = useCallback(() => {
    if (!originalCSV) return;
    const blob = new Blob([originalCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `decrypted_mission_log_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [originalCSV]);

  const currentState = useMemo(() => {
    return playbackData[currentIndex] || null;
  }, [playbackData, currentIndex]);

  const playbackProgress = useMemo(() => {
    if (playbackData.length === 0) return 0;
    return currentIndex / (playbackData.length - 1);
  }, [playbackData.length, currentIndex]);

  // Playback Loop
  React.useEffect(() => {
    if (!isPlaying || playbackData.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= playbackData.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 100 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackData.length, playbackSpeed]);
  const value = useMemo(() => ({
    playbackData,
    currentIndex,
    isPlaying,
    playbackSpeed,
    loadLog: loadFile,
    seekTo,
    togglePlayback,
    setSpeed: setPlaybackSpeed,
    exportToCSV,
    currentState,
    playbackProgress,
    isLeapOne: isLeapOneFile,
    logType,
    error,
    clearError: () => setError(null)
  }), [playbackData, currentIndex, isPlaying, playbackSpeed, loadFile, seekTo, togglePlayback, currentState, playbackProgress, isLeapOneFile, logType, error]);

  return (
    <PlaybackContext.Provider value={value}>
      {children}
    </PlaybackContext.Provider>
  );
};

export const usePlayback = () => {
  const context = useContext(PlaybackContext);
  if (!context) throw new Error('usePlayback must be used within a PlaybackProvider');
  return context;
};
