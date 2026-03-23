import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useROS } from './ROSContext';
import { encryptLog } from '../utils/logFormat';

interface MissionDataPoint {
  timestamp: string;
  // Localization (The "Where")
  x: number;
  y: number;
  z: number;
  // Basic Telemetry
  batteryLevel: number;
  batteryVoltage: number;
  temperature: number;
  speed: number;
  // Orientation
  pitch: number;
  roll: number;
  yaw: number;
  heading: number;
  tilt: number;
  // Network/Compute
  signalStrength: number;
  uplink: number;
  downlink: number;
  cpuUsage: number;
  cpuTemp: number;
  gpuUsage: number;
  gpuTemp: number;
  ramUsage: number;
  storageUsage: number;
  // Subsystems (Snapshots)
  batteryCells?: any[];
  wheels?: any[];
  arm?: any;
  drill?: any;
  science?: any;
  environment?: any;
  checklist?: Record<string, boolean>;
}

interface MissionContextType {
  isMissionActive: boolean;
  startMission: (checklist: Record<string, boolean>) => void;
  stopMission: () => void;
  missionStartTime: number | null;
}

const MissionContext = createContext<MissionContextType | undefined>(undefined);

export const MissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useROS();
  const [isMissionActive, setIsMissionActive] = useState(false);
  const [missionStartTime, setMissionStartTime] = useState<number | null>(null);
  const stateRef = useRef(state);
  const dataPointsRef = useRef<MissionDataPoint[]>([]);
  const currentChecklistRef = useRef<Record<string, boolean>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const startMission = useCallback((checklist: Record<string, boolean>) => {
    dataPointsRef.current = [];
    currentChecklistRef.current = checklist;
    setMissionStartTime(Date.now());
    setIsMissionActive(true);
  }, []);

  const downloadLog = useCallback(() => {
    if (dataPointsRef.current.length === 0) return;

    // Build comprehensive column list
    const columns: { header: string; getValue: (p: MissionDataPoint) => any }[] = [
      { header: 'Timestamp', getValue: (p) => p.timestamp },
      // Localization
      { header: 'Pos_X (m)', getValue: (p) => p.x.toFixed(3) },
      { header: 'Pos_Y (m)', getValue: (p) => p.y.toFixed(3) },
      { header: 'Pos_Z (m)', getValue: (p) => p.z.toFixed(3) },
      // Basic Telemetry
      { header: 'Battery (%)', getValue: (p) => p.batteryLevel.toFixed(1) },
      { header: 'Bus Voltage (V)', getValue: (p) => p.batteryVoltage.toFixed(2) },
      { header: 'Core Temp (°C)', getValue: (p) => p.temperature.toFixed(1) },
      { header: 'Speed (m/s)', getValue: (p) => p.speed.toFixed(2) },
      // Orientation
      { header: 'Pitch (°)', getValue: (p) => p.pitch.toFixed(2) },
      { header: 'Roll (°)', getValue: (p) => p.roll.toFixed(2) },
      { header: 'Yaw (°)', getValue: (p) => p.yaw.toFixed(2) },
      { header: 'Heading (°)', getValue: (p) => p.heading.toFixed(0) },
      { header: 'Tilt (°)', getValue: (p) => p.tilt.toFixed(2) },
      { header: 'Signal (dBm)', getValue: (p) => p.signalStrength.toFixed(0) },
      { header: 'Uplink (Mbps)', getValue: (p) => p.uplink.toFixed(2) },
      { header: 'Downlink (Mbps)', getValue: (p) => p.downlink.toFixed(2) },
      { header: 'CPU_Load (%)', getValue: (p) => p.cpuUsage.toFixed(1) },
      { header: 'CPU_Temp (°C)', getValue: (p) => p.cpuTemp.toFixed(1) },
      { header: 'GPU_Load (%)', getValue: (p) => p.gpuUsage.toFixed(1) },
      { header: 'GPU_Temp (°C)', getValue: (p) => p.gpuTemp.toFixed(1) },
      { header: 'RAM_Used (GB)', getValue: (p) => p.ramUsage.toFixed(2) },
      { header: 'Storage_Used (TB)', getValue: (p) => p.storageUsage.toFixed(3) },
    ];

    // Individual Battery Cells
    for (let i = 0; i < 4; i++) {
       columns.push(
        { header: `Cell_${i+1}_V`, getValue: (p) => p.batteryCells?.[i]?.voltage ?? 0 },
        { header: `Cell_${i+1}_A`, getValue: (p) => p.batteryCells?.[i]?.current ?? 0 },
        { header: `Cell_${i+1}_T`, getValue: (p) => p.batteryCells?.[i]?.temp ?? 0 },
        { header: `Cell_${i+1}_SOC`, getValue: (p) => p.batteryCells?.[i]?.soc ?? 0 }
      );
    }

    // Wheels (6 motors)
    const wheelIds = ['FL', 'FR', 'ML', 'MR', 'RL', 'RR'];
    wheelIds.forEach((id, i) => {
      columns.push(
        { header: `Wheel_${id}_Velo_RPM`, getValue: (p) => p.wheels?.[i]?.velocity ?? 0 },
        { header: `Wheel_${id}_Curr_A`, getValue: (p) => p.wheels?.[i]?.current ?? 0 },
        { header: `Wheel_${id}_Volt_V`, getValue: (p) => p.wheels?.[i]?.voltage ?? 0 },
        { header: `Wheel_${id}_Temp_C`, getValue: (p) => p.wheels?.[i]?.temperature ?? 0 },
        { header: `Wheel_${id}_Stat`, getValue: (p) => p.wheels?.[i]?.status ?? 'offline' }
      );
    });

    // Arm (6 joints)
    for (let i = 0; i < 6; i++) {
      columns.push(
        { header: `Joint_${i+1}_Angle`, getValue: (p) => p.arm?.joints?.[i]?.angle ?? 0 },
        { header: `Joint_${i+1}_Temp`, getValue: (p) => p.arm?.joints?.[i]?.temp ?? 0 }
      );
    }
    columns.push(
      { header: 'Arm_Payload_KG', getValue: (p) => p.arm?.payload ?? 0 },
      { header: 'Arm_Status', getValue: (p) => p.arm?.status ?? 'idle' }
    );

    // Drill
    columns.push(
      { header: 'Drill_Depth_mm', getValue: (p) => p.drill?.drillDepth ?? 0 },
      { header: 'Drill_Actuator_mm', getValue: (p) => p.drill?.actuatorPosition ?? 0 },
      { header: 'Drill_Status', getValue: (p) => p.drill?.status ?? 'idle' },
      { header: 'Drill_LS_Top', getValue: (p) => p.drill?.limitSwitchTop ? 1 : 0 },
      { header: 'Drill_LS_Bot', getValue: (p) => p.drill?.limitSwitchBottom ? 1 : 0 }
    );
    // Drill Motors
    ['thrust', 'auger'].forEach((m, i) => {
      columns.push(
        { header: `Drill_${m}_RPM`, getValue: (p) => p.drill?.motors?.[i]?.currentRpm ?? 0 },
        { header: `Drill_${m}_Curr_A`, getValue: (p) => p.drill?.motors?.[i]?.current ?? 0 },
        { header: `Drill_${m}_Volt_V`, getValue: (p) => p.drill?.motors?.[i]?.voltage ?? 0 },
        { header: `Drill_${m}_Temp_C`, getValue: (p) => p.drill?.motors?.[i]?.temp ?? 0 }
      );
    });

    // Science
    columns.push(
      { header: 'Sci_pH', getValue: (p) => p.science?.ph ?? 0 },
      { header: 'Sci_ph_Valid', getValue: (p) => p.science?.phValid ? 1 : 0 },
      { header: 'Sci_UV', getValue: (p) => p.science?.uvLampOn ? 1 : 0 },
      { header: 'Sci_UV_Runtime', getValue: (p) => p.science?.uvLampRuntime ?? 0 },
      { header: 'Sci_Pump', getValue: (p) => p.science?.pumpOn ? 1 : 0 },
      { header: 'Sci_Microscope', getValue: (p) => p.science?.microscopeOn ? 1 : 0 },
      { header: 'Sci_Raman', getValue: (p) => p.science?.ramanStatus ?? 'idle' },
      { header: 'Sci_Rock_W', getValue: (p) => p.science?.rockSampleWeight ?? 0 },
      { header: 'Sci_Soil_W', getValue: (p) => p.science?.soilSampleWeight ?? 0 },
      { header: 'Sci_Liq_L', getValue: (p) => p.science?.liquidSampleLevel ?? 0 },
      { header: 'Sci_Moist', getValue: (p) => p.science?.soilMoisture ?? 0 }
    );

    // Environment
    columns.push(
      { header: 'Env_Humid', getValue: (p) => p.environment?.humidity ?? 0 },
      { header: 'Env_Press', getValue: (p) => p.environment?.airPressure ?? 0 },
      { header: 'Env_Temp', getValue: (p) => p.environment?.temperature ?? 0 },
      { header: 'Env_Soil_T', getValue: (p) => p.environment?.soilTemperature ?? 0 },
      { header: 'Env_Soil_M', getValue: (p) => p.environment?.soilMoisture ?? 0 },
      { header: 'Env_CO2', getValue: (p) => p.environment?.co2 ?? 0 },
      { header: 'Env_NH3', getValue: (p) => p.environment?.nh3 ?? 0 },
      { header: 'Env_CH4', getValue: (p) => p.environment?.ch4 ?? 0 },
      // Checklist (Start Conditions)
      { header: 'Check_Power', getValue: (p) => p.checklist?.['pwr'] ? 1 : 0 },
      { header: 'Check_Drive', getValue: (p) => p.checklist?.['drv'] ? 1 : 0 },
      { header: 'Check_Comms', getValue: (p) => p.checklist?.['com'] ? 1 : 0 },
      { header: 'Check_Sci', getValue: (p) => p.checklist?.['sci'] ? 1 : 0 },
      { header: 'Check_Drill', getValue: (p) => p.checklist?.['drill'] ? 1 : 0 },
      { header: 'Check_Arm', getValue: (p) => p.checklist?.['arm'] ? 1 : 0 }
    );

    const headers = columns.map(c => c.header).join(',');
    const rows = dataPointsRef.current.map(point => 
      columns.map(c => c.getValue(point)).join(',')
    );

    const csvContent = [headers, ...rows].join('\n');
    const encryptedData = encryptLog(csvContent);
    const blob = new Blob([encryptedData.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `mission_log_${new Date().toISOString().replace(/[:.]/g, '-')}.lp1`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const stopMission = useCallback(() => {
    setIsMissionActive(false);
    downloadLog();
    setMissionStartTime(null);
  }, [downloadLog]);

  useEffect(() => {
    if (isMissionActive) {
      intervalRef.current = setInterval(() => {
        const currentState = stateRef.current;
        const point: MissionDataPoint = {
          timestamp: new Date().toISOString(),
          // Localization
          x: currentState.location.x,
          y: currentState.location.y,
          z: currentState.location.z,
          // Basic Telemetry
          batteryLevel: currentState.telemetry.batteryLevel,
          batteryVoltage: currentState.telemetry.batteryVoltage,
          temperature: currentState.telemetry.temperature,
          speed: currentState.telemetry.speed,
          pitch: currentState.orientation.pitch,
          roll: currentState.orientation.roll,
          yaw: currentState.orientation.yaw,
          heading: currentState.orientation.heading,
          tilt: currentState.orientation.tilt,
          signalStrength: currentState.network?.signalStrength ?? -100,
          uplink: currentState.network?.uplink ?? 0,
          downlink: currentState.network?.downlink ?? 0,
          cpuUsage: currentState.compute?.cpuUsage ?? 0,
          cpuTemp: currentState.compute?.cpuTemp ?? 0,
          gpuUsage: currentState.compute?.gpuUsage ?? 0,
          gpuTemp: currentState.compute?.gpuTemp ?? 0,
          ramUsage: currentState.compute?.ramUsage ?? 0,
          storageUsage: currentState.compute?.storageUsage ?? 0,
          batteryCells: currentState.batteryCells?.map((c: any) => ({ ...c })),
          wheels: currentState.wheels?.map((w: any) => ({ ...w })),
          arm: currentState.arm ? { 
            ...currentState.arm, 
            joints: currentState.arm.joints?.map((j: any) => ({ ...j })) 
          } : undefined,
          drill: currentState.drill ? { 
            ...currentState.drill, 
            motors: currentState.drill.motors?.map((m: any) => ({ ...m })) 
          } : undefined,
          science: currentState.science ? { ...currentState.science } : undefined,
          environment: currentState.environment ? { ...currentState.environment } : undefined,
          checklist: currentChecklistRef.current,
        };
        dataPointsRef.current.push(point);
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isMissionActive]);

  return (
    <MissionContext.Provider value={{ isMissionActive, startMission, stopMission, missionStartTime }}>
      {children}
    </MissionContext.Provider>
  );
};

export const useMission = () => {
  const context = useContext(MissionContext);
  if (!context) throw new Error('useMission must be used within a MissionProvider');
  return context;
};
