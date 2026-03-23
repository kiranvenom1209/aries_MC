export interface RoverLocation {
  x: number;  // meters, local frame (from localization / odometry)
  y: number;  // meters, local frame
  z: number;  // meters, local frame (usually 0 for ground rovers)
}

// BOM: 4x Exact LiFePO4 30Ah 12V batteries (BOM_ROVER item 5)
export interface BatteryCell {
  id: string;          // e.g. 'B1', 'B2', 'B3', 'B4'
  voltage: number;     // Volts (nominal 12V each)
  current: number;     // Amps draw
  temp: number;        // Celsius
  soc: number;         // State of Charge 0-100%
}

// BOM: Drill assembly motors (BOM_DRILL UPdated)
// - Motor for thrust:  TRU COMPONENTS IG420024X00106R — 246 RPM, 24V, 2.1A, 0.785 Nm
// - Motor for auger:   TRU COMPONENTS IG420504-252M1R — 13.5 RPM, 24V, 2.1A, 2.942 Nm
export interface DrillMotor {
  id: 'thrust' | 'auger';
  label: string;         // Human-readable label
  ratedRpm: number;      // From BOM spec
  currentRpm: number;    // Live reading
  current: number;       // Amps
  voltage: number;       // Volts
  temp: number;          // Celsius
  status: 'idle' | 'running' | 'fault';
}

// BOM: Drill assembly (BOM_DRILL UPdated)
// Includes: 2 DC motors, linear actuator (TC24-300-1000), Omron limit switches (SS-01D)
export interface DrillData {
  motors: DrillMotor[];
  actuatorPosition: number;   // mm (0–300 mm stroke, TC24-300-1000)
  actuatorExtended: boolean;
  limitSwitchTop: boolean;    // Omron SS-01D — top of travel
  limitSwitchBottom: boolean; // Omron SS-01D — bottom of travel
  drillDepth: number;         // mm — derived from lead-screw encoder
  status: 'idle' | 'deploying' | 'drilling' | 'retracting' | 'fault';
}

// BOM: Scientific payload (BOM_SCIENTIFC PAYLOAD)
// - DFRobot Gravity Analog pH Sensor/Meter Pro Kit V2
// - UV Lamp (for TLC plate analysis)
export interface ScienceData {
  lifeScore?: number;         // 0–100% (LeapOne proprietary index)
  lifeConfidence?: number;    // 0–100% (Signal quality and model agreement)
  ph: number;              // 0–14 pH reading from DFRobot sensor
  phValid: boolean;        // Sensor calibrated & reading valid
  uvLampOn: boolean;       // UV lamp power state
  uvLampRuntime: number;   // seconds
  soilMoisture: number;    // % (future sensor placeholder)
  sampleCollected: boolean;
  pumpOn: boolean;         // Peristaltic pump power state
  microscopeOn: boolean;   // Microscope camera power state
  ramanStatus: 'idle' | 'scanning' | 'complete' | 'error';
  ramanResult: string;     // e.g. 'No traces found', 'Trace organics', etc.
  rockSampleWeight: number; // grams
  soilSampleWeight: number; // grams
  liquidSampleLevel: number; // mL
}

export interface ODriveTelemetry {
  id: string; // e.g. 'FL', 'FR', 'ML', 'MR', 'RL', 'RR'
  velocity: number; // RPM
  current: number; // Amps
  temperature: number; // Celsius
  voltage: number; // Volts
  status: 'normal' | 'warning' | 'fault';
}

export interface RoverOrientation {
  pitch: number; // degrees
  roll: number;  // degrees
  yaw: number;   // degrees
  heading: number; // magnetic heading 0-359
  tilt: number;  // overall tilt gauge value
}

export interface TelemetryData {
  speed: number; // m/s
  batteryLevel: number; // 0-100%
  batteryVoltage: number; // V
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  signalStrength: number; // 0-100%
  temperature: number; // Celsius
  statusMessage: string;
}

export interface CameraStream {
  id: string;
  name: string;
  url: string; // ROS stream URL or mock video
  status: 'online' | 'offline';
}

export interface ComputeData {
  cpuUsage: number;
  cpuTemp: number;
  gpuUsage: number;
  gpuTemp: number;
  ramUsage: number; // GB (out of 32)
  storageUsage: number; // TB (out of 2)
}

export interface NetworkData {
  signalStrength: number; // dBm
  uplink: number; // Mbps
  downlink: number; // Mbps
}

export interface ArmJoint {
  id: string; // J1 through J6
  angle: number;
  temp: number;
}

export interface ArmData {
  status: 'idle' | 'moving' | 'fault';
  payload: number;
  joints: ArmJoint[];
}

// Teensy environmental sensor module (connected to ROS PC via serial)
export interface EnvironmentData {
  humidity: number;        // % relative humidity
  airPressure: number;     // mb (millibar)
  temperature: number;     // °C ambient air temperature
  soilTemperature: number; // °C soil probe
  soilMoisture: number;    // % volumetric water content
  co2: number;             // ppm
  nh3: number;             // ppm
  ch4: number;             // ppb
}

export interface RoverState {
  location: RoverLocation;
  orientation: RoverOrientation;
  telemetry: TelemetryData;
  cameras: CameraStream[];
  wheels?: ODriveTelemetry[];
  compute?: ComputeData;
  network?: NetworkData;
  arm?: ArmData;
  // BOM-derived additions
  batteryCells?: BatteryCell[];
  drill?: DrillData;
  science?: ScienceData;
  environment?: EnvironmentData;
  checklistStatus?: Record<string, boolean>;
  timestamp: number; // Unix timestamp in ms
}
