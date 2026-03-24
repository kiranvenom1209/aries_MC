import type { RoverState } from '../types/telemetry';

// ── ERC Mars Yard exploration sim ──
const NAV_BOUNDS = { xMin: 0, xMax: 45, yMin: 0, yMax: 35 };

const EXPLORATION_PHASES = [
  { x: 20.00, y:  6.00, label: 'Deployment & System Init',       speed: 0.35, action: 'none'  as const },
  { x: 30.00, y: 11.00, label: 'Apex-Mount Specimen Collection', speed: 0.15, action: 'arm'   as const },
  { x: 31.00, y: 29.00, label: 'Chassis Stability Test',         speed: 0.40, action: 'none'  as const },
  { x: 11.00, y: 26.00, label: 'Subsurface Drill Operation',      speed: 0.25, action: 'drill' as const },
  { x: 19.00, y: 18.00, label: 'Mast & Arm Articulation Eval',   speed: 0.20, action: 'none'  as const },
  { x: 20.00, y:  6.00, label: 'Return to Base / Maintenance',    speed: 0.30, action: 'none'  as const },
];

const BATTERY_CAPACITY_WH = 960; // 48V, 20Ah pack
let currentBatteryLevel = 100.0;

// ── Terrain Heightmap (ERC Mars Yard – full satellite feature analysis, 45m × 35m)
// Origin: top-left. +X = right, +Y = down. h in metres (positive=raised, negative=crater)
const TERRAINS = [
  // ── 1. Large Central Spiral / Ridge Mound (dominant sandy orange rise, wraps NW quadrant)
  { cx: 16, cy: 18, r: 10, h: 2.6 },
  { cx: 20, cy: 14, r:  6, h: 1.8 }, // trailing arm of spiral NE
  { cx: 12, cy: 22, r:  5, h: 1.4 }, // trailing arm of spiral SW

  // ── 2. Deep Bowl Crater (centre-right, dark circular depression)
  { cx: 30, cy: 22, r:  8, h: -3.1 },

  // ── 3. NW Secondary Crater (top-left dark hollow)
  { cx: 10, cy: 12, r:  5, h: -1.6 },

  // ── 4. Small Centre-East Bowl (partial crater visible near X:28, Y:18)
  { cx: 28, cy: 18, r:  4, h: -1.0 },

  // ── 5. SW Reddish Dome (isolated round mound, SW corner)
  { cx: 10, cy: 26, r:  4, h: 2.0 },

  // ── 6. Second SW Dome (lighter sandy colour, slightly south)
  { cx: 14, cy: 29, r:  3, h: 1.6 },

  // ── 7. Blue/Dark Gravel Pit (oblong depression, centre-south)
  { cx: 22, cy: 29, r:  5, h: -1.8 },

  // ── 8. SE White Sandy Flat (bright patch, raised slightly)
  { cx: 36, cy: 30, r:  4, h: 0.8 },

  // ── 9. NE Boulder Mound (behind the scree field)
  { cx: 36, cy: 12, r:  5, h: 1.5 },

  // ── 10. Right-Centre Rock Wall (eastern edge cluster)
  { cx: 40, cy: 20, r:  4, h: 1.2 },

  // ── 11. Northern Rim Ridge (dark border rock at top)
  { cx: 22, cy:  4, r:  4, h: 0.7 },
  { cx: 34, cy:  5, r:  3, h: 0.9 },
  { cx: 10, cy:  5, r:  3, h: 0.6 },

  // ── 12. Western Edge Berm (slight raised soil edge, left boundary)
  { cx:  2, cy: 18, r:  4, h: 0.5 },
];

const getTerrainHeight = (x: number, y: number) => {
  return TERRAINS.reduce((acc, t) => {
    const dist = Math.hypot(x - t.cx, y - t.cy);
    if (dist < t.r) {
      const factor = Math.cos((dist / t.r) * (Math.PI / 2));
      return acc + (t.h * factor * factor);
    }
    return acc;
  }, 0);
};

const getTerrainGradient = (x: number, y: number) => {
  const step = 0.1;
  const hL = getTerrainHeight(x - step, y);
  const hR = getTerrainHeight(x + step, y);
  const hU = getTerrainHeight(x, y - step);
  const hD = getTerrainHeight(x, y + step);
  return { dx: (hR - hL) / (2 * step), dy: (hD - hU) / (2 * step) };
};

// ── Rough Terrain Zones (full satellite feature analysis) ──
// factor: 0.0 = glassy smooth | 1.0 = violent boulder field
const ROUGH_ZONES = [
  // 1. NE primary boulder / scree field (max intensity)
  { xMin: 27, xMax: 42, yMin:  4, yMax: 17, factor: 1.0 },
  // 2. Eastern rock wall / cluster (right edge)
  { xMin: 37, xMax: 45, yMin: 16, yMax: 27, factor: 0.8 },
  // 3. Northern rubble band (loose rock rim at top)
  { xMin: 10, xMax: 42, yMin:  2, yMax:  8, factor: 0.65 },
  // 4. Dark perimeter stone border (all outer edges)
  { xMin:  0, xMax: 45, yMin:  0, yMax:  3, factor: 0.5 },
  { xMin:  0, xMax:  4, yMin:  0, yMax: 35, factor: 0.5 },
  { xMin: 41, xMax: 45, yMin:  0, yMax: 35, factor: 0.5 },
  { xMin:  0, xMax: 45, yMin: 32, yMax: 35, factor: 0.5 },
  // 5. Blue/dark gravel pit (oblong centre-south)
  { xMin: 18, xMax: 27, yMin: 25, yMax: 33, factor: 0.7 },
  // 6. Crater rim loose rubble (ring around deep bowl)
  { xMin: 23, xMax: 38, yMin: 15, yMax: 30, factor: 0.4 },
  // 7. NW drill ruts (loose displaced soil from tracks)
  { xMin:  5, xMax: 18, yMin:  8, yMax: 22, factor: 0.35 },
  // 8. SW soft sandy soil (low rolling sway)
  { xMin:  4, xMax: 20, yMin: 20, yMax: 34, factor: 0.25 },
  // 9. Hard-packed central track (minimal jitter – deliberate path)
  { xMin: 17, xMax: 24, yMin: 14, yMax: 21, factor: 0.08 },
  // 10. SE white sandy flat (slightly loose but stable)
  { xMin: 32, xMax: 42, yMin: 26, yMax: 35, factor: 0.2 },
];

const getRockyFactor = (x: number, y: number): number => {
  if (x < 27 || x > 42 || y < 4 || y > 17) return 0;
  // Fixed 1m entry ramp: full intensity by X:28 / Y:5
  const RAMP = 1.0;
  const ex = Math.min(x - 27, 42 - x, RAMP) / RAMP;
  const ey = Math.min(y -  4, 17 -  y, RAMP) / RAMP;
  return Math.min(1, ex) * Math.min(1, ey);
};

// General surface roughness – reaches full factor within FADE_M of any zone edge
const ZONE_FADE_M = 1.5; // metres – full intensity ramp distance from boundary
const getSurfaceRoughness = (x: number, y: number): number => {
  let max = 0;
  for (const z of ROUGH_ZONES) {
    if (x >= z.xMin && x <= z.xMax && y >= z.yMin && y <= z.yMax) {
      const ex = Math.min(x - z.xMin, z.xMax - x, ZONE_FADE_M) / ZONE_FADE_M;
      const ey = Math.min(y - z.yMin, z.yMax - y, ZONE_FADE_M) / ZONE_FADE_M;
      const f = z.factor * ex * ey;
      if (f > max) max = f;
    }
  }
  return Math.min(1, max);
};

// ── LEAP-One Rover Physical Constants (from datasheet) ──
// Wheel radius R=0.12m | Weight W=706.3N (~72kg) | Motor τ=5Nm/wheel
// Belly clearance=0.215m | CoM h=0.282m | Max RPM=110
// Rocker-bogie safe climb: ~1× wheel radius (0.12m)
// Rocks 0.12–0.215m cause hard chassis deflection; >0.215m = belly contact
const WHEEL_RADIUS    = 0.120;  // m
const WHEEL_TORQUE    = 5.0;    // Nm per wheel
const NUM_WHEELS      = 6;
const MAX_WHEEL_RPM   = 110;
const MAX_SPEED_MS    = (MAX_WHEEL_RPM * 2 * Math.PI / 60) * WHEEL_RADIUS; // 1.382 m/s
// Max drive power: τ × ω × 6 wheels ≈ 346W
const MAX_DRIVE_POWER_W = WHEEL_TORQUE * (MAX_WHEEL_RPM * 2 * Math.PI / 60) * NUM_WHEELS;
// Rocky penalty scalar: normalised so rockyFactor=1 at max speed ≈ half of max drive power
const ROCKY_POWER_SCALAR = MAX_DRIVE_POWER_W * 0.55; // ~190W at rocky=1, speed=MAX

const NOMINAL_DRIVE_CURRENT = 1.2; 
const NOMINAL_DRILL_CURRENT = 1.8; 
const STARTUP_SPIKE_FACTOR = 4.5;  

const addJitter = (value: number, amount: number) => value + (Math.random() - 0.5) * amount;
const osc = (freq: number, amp: number, time: number) => Math.sin(time * freq) * amp;

const STOW_ANGLES = [1, 21, 122, 81, 11, -3]; // User Calibrated Idle (v2)

export const STOW_PRESETS = {
  COMPACT: [0, -85, 120, 0, 55, 0],
  VERTICAL: [0, 0, 0, 0, 0, 0],
  SENTRY: [0, -45, 95, 0, 45, 0],
  PICK: [-2, 86, 70, 84, 14, -3],
  APPROACH: [49, 2, 90, 84, 14, -3],
  PLACE: [168, 44, 123, 79, 8, -4],
  OFFICIAL: STOW_ANGLES,
};

let currentStowAngles = STOW_PRESETS.OFFICIAL;

export const setStowPreset = (preset: keyof typeof STOW_PRESETS) => {
  currentStowAngles = [...STOW_PRESETS[preset]];
};

export const updateJointAngle = (index: number, angle: number) => {
  currentStowAngles[index] = angle;
};

const SAMPLING_SEQUENCE = [
  { t: 4,  angles: STOW_PRESETS.SENTRY,     label: 'Scanning Sample Site' },    
  { t: 8,  angles: STOW_PRESETS.APPROACH,   label: 'Approaching Target' },     
  { t: 15, angles: STOW_PRESETS.PICK,       label: 'Extracting Soil Sample' },   
  { t: 20, angles: STOW_PRESETS.APPROACH,   label: 'Clearing Obstacles' },   
  { t: 28, angles: STOW_PRESETS.PLACE,      label: 'Storing Sample (OOB Container)' },      
  { t: 32, angles: STOW_PRESETS.OFFICIAL,   label: 'Mission Sequence Complete' },      
];

let navHeading = 0;
let navSpeed = EXPLORATION_PHASES[0].speed;
let currentPhase = 0;
let phaseStatus: 'moving' | 'operating' = 'moving';
let phaseDwellTimer = 0; 
let lastNavSpeed = 0;

const mockState: RoverState = {
  location: { x: 20, y: 6, z: 0 },
  orientation: { pitch: 0, roll: 0, yaw: 0, heading: 0, tilt: 0 },
  telemetry: {
    speed: 0, batteryLevel: 100, batteryVoltage: 48.0,
    connectionStatus: 'connected', signalStrength: 85, temperature: 32.5,
    statusMessage: 'Systems Nominal',
  },
  cameras: [
    { id: 'cam1', name: 'RealSense D435i — Fwd', url: 'mock_fwd', status: 'online' },
    { id: 'cam2', name: 'RealSense D435i — Arm', url: 'mock_arm', status: 'online' },
    { id: 'cam3', name: 'Logitech Brio 100 — Drill', url: 'mock_drill', status: 'online' },
    { id: 'cam4', name: '360° Cam', url: 'mock_360', status: 'online' },
    { id: 'microscope', name: 'Microscope Optics Feed', url: 'mock_microscope', status: 'online' },
  ],
  wheels: [
    { id: 'FL', velocity: 0, current: 0, temperature: 30, voltage: 24.5, status: 'normal' },
    { id: 'FR', velocity: 0, current: 0, temperature: 30, voltage: 24.5, status: 'normal' },
    { id: 'ML', velocity: 0, current: 0, temperature: 30, voltage: 24.5, status: 'normal' },
    { id: 'MR', velocity: 0, current: 0, temperature: 30, voltage: 24.5, status: 'normal' },
    { id: 'RL', velocity: 0, current: 0, temperature: 30, voltage: 24.5, status: 'normal' },
    { id: 'RR', velocity: 0, current: 0, temperature: 30, voltage: 24.5, status: 'normal' }
  ],
  compute: {
    cpuUsage: 15, cpuTemp: 45, gpuUsage: 5, gpuTemp: 40, ramUsage: 12.4, storageUsage: 0.8
  },
  network: { signalStrength: -45, uplink: 120.5, downlink: 250.2 },
  arm: {
    status: 'idle',
    payload: 0,
    joints: STOW_ANGLES.map((a: number, i: number) => ({ id: `J${i+1}`, angle: a, temp: 25 }))
  },
  batteryCells: [
    { id: 'B1', voltage: 12.539129567397445, current: 3.2269377163530524, temp: 30.14, soc: 100 },
    { id: 'B2', voltage: 12.5148312608437, current: 2.7477122391358573, temp: 31.37, soc: 100 },
    { id: 'B3', voltage: 12.466925731155884, current: 2.500438965772535, temp: 29.96, soc: 100 },
    { id: 'B4', voltage: 12.439457101401306, current: 2.712459803434199, temp: 27.20, soc: 100 },
  ],
  drill: {
    motors: [
      { id: 'thrust', label: 'Thrust Motor', ratedRpm: 246, currentRpm: 0, current: 0, voltage: 24.0, temp: 28, status: 'idle' },
      { id: 'auger', label: 'Auger Motor', ratedRpm: 14, currentRpm: 0, current: 0, voltage: 24.0, temp: 28, status: 'idle' },
    ],
    actuatorPosition: 0, actuatorExtended: false, limitSwitchTop: true, limitSwitchBottom: false, drillDepth: 0, status: 'idle',
  },
  environment: {
    humidity: 40.0, airPressure: 1020.0, temperature: 12.0, soilTemperature: 22.0, soilMoisture: 16.0,
    co2: 420.0, nh3: 80.0, ch4: 1900.0,
  },
  science: {
    ph: 7.0, phValid: true, uvLampOn: false, uvLampRuntime: 0, soilMoisture: 0, sampleCollected: false,
    pumpOn: false, microscopeOn: false, ramanStatus: 'idle', ramanResult: '', rockSampleWeight: 0, soilSampleWeight: 0, liquidSampleLevel: 0,
  },
  timestamp: Date.now(),
};

export const generateMockData = (): RoverState => {
  const now = Date.now();
  const time = now / 1000;
  mockState.timestamp = now;

  // --- Mission State Sequencer ---
  if (phaseStatus === 'moving') {
    const dx = EXPLORATION_PHASES[currentPhase].x - mockState.location.x;
    const dy = EXPLORATION_PHASES[currentPhase].y - mockState.location.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.2) {
      if (EXPLORATION_PHASES[currentPhase].action !== 'none') {
        phaseStatus = 'operating';
        phaseDwellTimer = 0;
      } else {
        currentPhase = (currentPhase + 1) % EXPLORATION_PHASES.length;
      }
    } else {
      const phase = EXPLORATION_PHASES[currentPhase];
      navSpeed = phase.speed;
      const angle = Math.atan2(dy, dx);
      mockState.location.x += Math.cos(angle) * navSpeed * 0.1;
      mockState.location.y += Math.sin(angle) * navSpeed * 0.1;
      navHeading = angle;
    }
  } else {
    navSpeed = 0;
    phaseDwellTimer += 0.1;
    const isArmPhase = EXPLORATION_PHASES[currentPhase].action === 'arm';
    const maxDwell = isArmPhase ? 33 : 12; // Allow more time for complex arm maneuvers
    if (phaseDwellTimer >= maxDwell) {
      phaseStatus = 'moving';
      currentPhase = (currentPhase + 1) % EXPLORATION_PHASES.length;
    }
  }

  const pos = mockState.location;
  const terrainZ = getTerrainHeight(pos.x, pos.y);
  mockState.location.z = parseFloat(terrainZ.toFixed(3)); // Live Z from heightmap

  const gradient = getTerrainGradient(pos.x, pos.y);
  const roughness = getSurfaceRoughness(pos.x, pos.y);
  const rockyFactor = Math.max(roughness, getRockyFactor(pos.x, pos.y));
  // Non-linear: small rocks hit hard on a tiny ERC rover (low ground clearance)
  // Even 0.2 roughness gives 1.94x; 0.5 gives 4.75x; 1.0 gives 16x
  const jitterMult = 1 + rockyFactor * rockyFactor * 15;

  // Orientation logic: Pitch slope along heading, Roll slope perpendicular
  const rad = navHeading;
  const cosHeading = Math.cos(rad);
  const sinHeading = Math.sin(rad);
  const slopeAlong = gradient.dx * cosHeading + gradient.dy * sinHeading;
  const slopePerp  = -gradient.dx * sinHeading + gradient.dy * cosHeading;

  // Gate: when stopped, only tiny IMU noise — no terrain-induced chassis jitter
  const isMoving = navSpeed > 0.01;
  const dynamicJitter = isMoving ? jitterMult : 0.05; // IMU noise floor when parked
  const dynamicOscAmp = isMoving ? 1.0 : 0.0;         // oscillations stop when stationary

  mockState.orientation = {
    pitch:   addJitter(Math.atan(slopeAlong) * (180 / Math.PI) + osc(2.5, (0.6 + rockyFactor * 6) * dynamicOscAmp, time), 0.8 * dynamicJitter),
    roll:    addJitter(Math.atan(slopePerp)  * (180 / Math.PI) + osc(3.1, (0.5 + rockyFactor * 5) * dynamicOscAmp, time), 0.7 * dynamicJitter),
    yaw:     addJitter((navHeading * 180 / Math.PI + 360) % 360, 0.05 * dynamicJitter),
    heading: addJitter((navHeading * 180 / Math.PI + 360) % 360 + osc(1.2, 1.2 * dynamicOscAmp, time), 0.1 * dynamicJitter),
    tilt:    Math.sqrt(slopeAlong * slopeAlong + slopePerp * slopePerp) * (180 / Math.PI) + (isMoving ? addJitter(0, rockyFactor * 8) : 0),
  };

  mockState.telemetry.speed = addJitter(navSpeed, navSpeed > 0 ? 0.04 + rockyFactor * 0.08 : 0);
  mockState.telemetry.batteryVoltage = addJitter(51.0 - (navSpeed * 1.5) + osc(0.5, 0.2, time), 0.15 + rockyFactor * 0.3);
  
  // --- Physics-Based Power Drain Engine ---
  // 1. Compute Power (15W base + load factor)
  const computePower = 15 + (30 * ((mockState.compute?.cpuUsage || 0) + (mockState.compute?.gpuUsage || 0)) / 200);
  // 2. Comms Power (Ubiquiti/Starlink-sim)
  const commsPower = 10;
  // 3. Drive Power — derived from real motor spec (τ=5Nm, 6 wheels, R=0.12m)
  // Power per wheel = τ × ω; scale by speed fraction of max.
  const speedFrac = Math.min(1, navSpeed / MAX_SPEED_MS);
  const baseDrivePower = speedFrac * MAX_DRIVE_POWER_W; // 0–346W
  const terrainInclinePenalty = Math.max(0, slopeAlong * baseDrivePower * 1.5 * speedFrac);
  const rockyPenalty = rockyFactor * rockyFactor * speedFrac * ROCKY_POWER_SCALAR;
  const drivePower = baseDrivePower + terrainInclinePenalty + rockyPenalty;
  
  // 4. Arm Power (15W idle + 70W if moving)
  const isMovingArm = phaseStatus === 'operating' && EXPLORATION_PHASES[currentPhase].action === 'arm';
  const armPower = 15 + (isMovingArm ? 70 : 0);
  // 5. Drill Power (25W deploy, 210W drilling)
  let drillPower = 0;
  if (mockState.drill?.status === 'drilling') drillPower = 210;
  else if (mockState.drill?.status === 'deploying' || mockState.drill?.status === 'retracting') drillPower = 25;
  
  const totalPowerW = computePower + commsPower + drivePower + armPower + drillPower;
  
  // Integrate: Wh = (W * seconds) / 3600
  // Since this updates approx at 10Hz (0.1s steps), factor = 0.1
  const drainWh = (totalPowerW * 0.1) / 3600;
  currentBatteryLevel = Math.max(0, currentBatteryLevel - (drainWh / BATTERY_CAPACITY_WH * 100));
  mockState.telemetry.batteryLevel = currentBatteryLevel;
  
  // Compute Volatility
  mockState.compute = {
    cpuUsage: Math.max(5, Math.min(100, addJitter(25, 12))),
    cpuTemp: addJitter(48 + Math.sin(time * 0.1) * 5, 1.5),
    gpuUsage: Math.max(2, Math.min(100, addJitter(85, 35))), // GPU spikes are heavy in CSV
    gpuTemp: addJitter(62 + Math.cos(time * 0.1) * 3, 2.0),
    ramUsage: addJitter(31.8, 0.1),
    storageUsage: 0.8
  };

  if (mockState.batteryCells) {
    mockState.batteryCells = mockState.batteryCells.map((cell, i) => ({
      ...cell,
      voltage: addJitter(12.5 - (i * 0.02), 0.005),
      current: addJitter(3.0 - (navSpeed * 0.5), 0.8),
      temp: addJitter(30 + i + Math.sin(time * 0.05) * 2, 0.5),
    }));
  }

  mockState.telemetry.statusMessage = phaseStatus === 'operating' 
    ? `EXEC: ${EXPLORATION_PHASES[currentPhase].label}...`
    : `NAV: ${EXPLORATION_PHASES[currentPhase].label}`;

  // Network Volatility (Matched to CSV Signal/Throughput ranges)
  mockState.network = {
    signalStrength: Math.round(addJitter(-55 + osc(0.8, 10, time), 3)),
    uplink: Math.max(8, addJitter(35 + osc(1.2, 20, time), 5)),
    downlink: Math.max(150, addJitter(285 + osc(0.5, 60, time), 15)),
  };

  // Clamping
  mockState.location.x = Math.max(NAV_BOUNDS.xMin, Math.min(NAV_BOUNDS.xMax, mockState.location.x));
  mockState.location.y = Math.max(NAV_BOUNDS.yMin, Math.min(NAV_BOUNDS.yMax, mockState.location.y));

  // --- Wheel Dynamics with Startup Spikes ---
  const acceleration = navSpeed - lastNavSpeed;
  lastNavSpeed = navSpeed;
  const baseVelocity = navSpeed * 120;

  if (mockState.wheels) {
    mockState.wheels = mockState.wheels.map((wheel, index) => {
      const variation = addJitter(Math.sin(time * 2 + index) * 5, 2);
      const velocity = baseVelocity > 0 ? baseVelocity + variation : 0;
      let current = 0.1;
      if (velocity > 0) {
        current = (velocity / 240) * NOMINAL_DRIVE_CURRENT;
        if (acceleration > 0.01) current += acceleration * STARTUP_SPIKE_FACTOR * 10;
        current += Math.random() * 0.2;
      }
      return {
        ...wheel,
        velocity: Math.max(0, velocity),
        current: Math.max(0.1, current),
        temperature: 30 + (velocity / 200) * 15 + Math.sin(time * 0.1 + index) * 2,
        voltage: mockState.telemetry.batteryVoltage / 2 - (current * 0.1) 
      };
    });
  }

  // --- IGUS REBEL 6 Sampling Sequence ---
  if (mockState.arm) {
    const isOperatingArm = phaseStatus === 'operating' && EXPLORATION_PHASES[currentPhase].action === 'arm';
    const status = isOperatingArm ? 'moving' : 'idle';
    
    let targetAngles = currentStowAngles;
    if (isOperatingArm) {
      const step = SAMPLING_SEQUENCE.find(s => phaseDwellTimer <= s.t) || SAMPLING_SEQUENCE[SAMPLING_SEQUENCE.length - 1];
      targetAngles = step.angles;
      mockState.telemetry.statusMessage = `ARM: ${step.label}`;
    }

    mockState.arm = {
      ...mockState.arm,
      status,
      joints: mockState.arm.joints.map((j, idx) => {
        const target = targetAngles[idx];
        const diff = Math.abs(target - j.angle);
        
        // Breathing motion (slow sine wave) to show "life" even when stowed
        const breathing = Math.sin(time * 1.0 + idx) * 0.5;
        
        // Propagate chassis jitter to the arm - later joints (J4-J6) shake more due to lever effects
        const leverFactor = 1.0 + (idx > 2 ? (idx - 2) * 0.4 : 0); // J4=1.4x, J5=1.8x, J6=2.2x
        const armJitter = dynamicJitter * leverFactor * 0.8; // Scaled slightly for arm rigidity
        
        return {
          ...j,
          angle: addJitter(j.angle + (target - j.angle) * 0.12 + breathing, armJitter),
          temp: 25 + (diff > 0.5 ? 8 : 0) + Math.random()
        };
      })
    };
  }

  // --- Drill Dynamics with Power Spikes ---
  if (mockState.drill) {
    const isOperatingDrill = phaseStatus === 'operating' && EXPLORATION_PHASES[currentPhase].action === 'drill';
    if (isOperatingDrill) {
      if (phaseDwellTimer < 3) {
        mockState.drill.status = 'deploying';
        mockState.drill.actuatorPosition = Math.min(300, (phaseDwellTimer / 3) * 300);
        mockState.drill.motors[0].current = phaseDwellTimer < 0.5 ? NOMINAL_DRILL_CURRENT * 3 : NOMINAL_DRILL_CURRENT;
      } else if (phaseDwellTimer < 9) {
        mockState.drill.status = 'drilling';
        const drillProgress = (phaseDwellTimer - 3) / 6;
        mockState.drill.drillDepth = Math.min(500, drillProgress * 500);
        const contactTimer = phaseDwellTimer - 3;
        mockState.drill.motors[1].current = contactTimer < 0.8 ? NOMINAL_DRILL_CURRENT * 4 : NOMINAL_DRILL_CURRENT * 1.5;
        mockState.drill.motors[0].current = NOMINAL_DRILL_CURRENT * 0.8;
        mockState.drill.motors[0].currentRpm = 220 + Math.random() * 20;
        mockState.drill.motors[1].currentRpm = 12 + Math.random() * 2;
      } else {
        mockState.drill.status = 'retracting';
        const retractProgress = (phaseDwellTimer - 9) / 3;
        mockState.drill.actuatorPosition = Math.max(0, 300 - (retractProgress * 300));
        mockState.drill.drillDepth = Math.max(0, 500 - (retractProgress * 500));
        mockState.drill.motors.forEach(m => m.current = NOMINAL_DRILL_CURRENT * 0.5);
      }
    } else {
      mockState.drill.status = 'idle';
      mockState.drill.motors.forEach(m => { m.currentRpm = 0; m.current = 0.05; });
    }
    mockState.drill.limitSwitchTop = mockState.drill.actuatorPosition < 5;
    mockState.drill.limitSwitchBottom = mockState.drill.actuatorPosition > 295;
  }

  // Environment & Science
  const e = mockState.environment;
  if (e) {
    const x = mockState.location.x;
    const y = mockState.location.y;
    const plume = 1400 * Math.exp(-Math.sqrt(Math.pow(x - 11, 2) + Math.pow(y - 26, 2)) / 10);
    e.ch4 = addJitter(1800 + plume, 45); // Aggressive methane jitter from CSV
    e.humidity = addJitter(40.0, 3.5);
    e.airPressure = addJitter(1020.0, 1.2);
    e.temperature = addJitter(12.0 + osc(0.01, 2, time), 0.5);
    
    e.soilTemperature += (mockState.drill?.status === 'drilling' ? 0.2 : -0.05);
    e.soilTemperature = Math.max(16, Math.min(32, addJitter(e.soilTemperature, 0.2)));
    
    if (mockState.science) {
      mockState.science.ph = Math.max(4.0, Math.min(9.5, addJitter(mockState.science.ph, 0.08)));
      if (mockState.drill?.status === 'drilling') mockState.science.soilMoisture = addJitter(e.soilMoisture, 5);
      
      const methaneLifeFactor = Math.min(40, (e.ch4 - 1800) / 20);
      const phLifeFactor = Math.max(0, (7.0 - mockState.science.ph) * 10);
      
      mockState.science.lifeScore = Math.min(99.8, addJitter(15 + methaneLifeFactor + phLifeFactor, 5));
      mockState.science.lifeConfidence = addJitter(85, 10);
    }
  }

  return { ...mockState };
};
