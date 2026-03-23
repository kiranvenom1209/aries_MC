import type { RoverState } from '../types/telemetry';

// ── ERC Mars Yard exploration sim ──
// Yard dimensions: 45 m (width/X) × 35 m (height/Y).
// Origin (0,0) = absolute bottom-left corner of the yard.
const NAV_BOUNDS = { xMin: 0, xMax: 45, yMin: 0, yMax: 35 };

// 6-waypoint exploration loop (ERC Mars Yard strategic path)
// Coordinates: (0,0) = top-left of image; +X = right, +Y = down
// Waypoints re-mapped to stay within the dirt perimeter
const EXPLORATION_PHASES = [
  // Start — Deployment & System Init (top area of dirt)
  { x: 20.00, y: 6.00, label: 'Deployment & System Init', speed: 0.35, action: 'none' },
  // WP1 — Hazard Avoidance (right side, boulder field)
  { x: 30.00, y: 11.00, label: 'Arm Sample Collection', speed: 0.15, action: 'arm' },
  // WP2 — Flat Terrain Calibration (bottom-right, clear plains)
  { x: 31.00, y: 29.00, label: 'Flat Terrain Calibration', speed: 0.40, action: 'none' },
  // WP3 — Deep Soil Probing (bottom-left, red-soil crater)
  { x: 11.00, y: 26.00, label: 'Deep Soil Drilling', speed: 0.25, action: 'drill' },
  // WP4 — Articulation Test (center, serpentine ridges)
  { x: 19.00, y: 18.00, label: 'Articulation Test', speed: 0.20, action: 'none' },
  // End — Extraction & Maintenance (return to start)
  { x: 20.00, y: 6.00, label: 'Extraction & Maintenance', speed: 0.30, action: 'none' },
];

let navHeading = 0;
let navSpeed = EXPLORATION_PHASES[0].speed;
let currentPhase = 0;
let phaseStatus: 'moving' | 'operating' = 'moving';
let phaseDwellTimer = 0; // seconds spent at current operational waypoint

const mockState: RoverState = {
  location: {
    // Start at ops base (top area of dirt)
    x: 20.00,
    y: 6.00,
    z: 0,
  },
  orientation: {
    pitch: 0,
    roll: 0,
    yaw: 0,
    heading: 0,
    tilt: 0,
  },
  telemetry: {
    speed: 0,
    batteryLevel: 98,
    batteryVoltage: 48.0, // 4x 12V LiFePO4 in series
    connectionStatus: 'connected',
    signalStrength: 85,
    temperature: 32.5,
    statusMessage: 'Systems Nominal',
  },
  // BOM: Cameras — Logitech Brio 100 (drill), 2x Intel RealSense D435i (arm, fwd)
  cameras: [
    { id: 'cam1', name: 'RealSense D435i — Fwd', url: 'mock_fwd',   status: 'online' },
    { id: 'cam2', name: 'RealSense D435i — Arm', url: 'mock_arm',   status: 'online' },
    { id: 'cam3', name: 'Logitech Brio 100 — Drill', url: 'mock_drill', status: 'online' },
    { id: 'cam4', name: '360° Cam',              url: 'mock_360',   status: 'online' },
    { id: 'microscope', name: 'Microscope Optics Feed', url: 'mock_microscope', status: 'online' },
  ],
  // BOM: 6x Botwheel + ODrive S1 Kit — FL/FR/ML/MR/RL/RR (item 1, BOM_ROVER)
  wheels: [
    { id: 'FL', velocity: 0, current: 0, temperature: 30, voltage: 24.5, status: 'normal' },
    { id: 'FR', velocity: 0, current: 0, temperature: 30, voltage: 24.5, status: 'normal' },
    { id: 'ML', velocity: 0, current: 0, temperature: 30, voltage: 24.5, status: 'normal' },
    { id: 'MR', velocity: 0, current: 0, temperature: 30, voltage: 24.5, status: 'normal' },
    { id: 'RL', velocity: 0, current: 0, temperature: 30, voltage: 24.5, status: 'normal' },
    { id: 'RR', velocity: 0, current: 0, temperature: 30, voltage: 24.5, status: 'normal' }
  ],
  // BOM: ROG NUC 2025 (RNUC15JNK9X28AA2) — RTX5080, 32GB RAM, 2TB NVMe (item 78, BOM_ROVER)
  compute: {
    cpuUsage: 15, cpuTemp: 45,
    gpuUsage: 5, gpuTemp: 40,
    ramUsage: 12.4, storageUsage: 0.8
  },
  // BOM: airMAX Rocket AC (2x 5GHz) + Teltonika TSW010 switch (BOM_COMMUNICATIONS)
  network: {
    signalStrength: -45, uplink: 120.5, downlink: 250.2
  },
  // BOM: IGUS REBEL 6DOF cobot arm (item 1, BOM_ROBOTIC_ARM)
  arm: {
    status: 'idle',
    payload: 0,
    joints: [
      { id: 'J1', angle: 0, temp: 25 },
      { id: 'J2', angle: 45, temp: 25 },
      { id: 'J3', angle: -30, temp: 25 },
      { id: 'J4', angle: 0, temp: 25 },
      { id: 'J5', angle: 90, temp: 25 },
      { id: 'J6', angle: 0, temp: 25 }
    ]
  },
  // BOM: 4x Exact LiFePO4 30Ah 12V (item 5, BOM_ROVER) — individual cell monitoring
  batteryCells: [
    { id: 'B1', voltage: 12.8, current: 3.2, temp: 28, soc: 97 },
    { id: 'B2', voltage: 12.8, current: 3.2, temp: 29, soc: 97 },
    { id: 'B3', voltage: 12.7, current: 3.1, temp: 28, soc: 96 },
    { id: 'B4', voltage: 12.8, current: 3.2, temp: 27, soc: 97 },
  ],
  // BOM: Drill assembly (BOM_DRILL UPdated)
  // Motor thrust:  TRU COMPONENTS IG420024X00106R — 246 RPM, 24V, 2.1A, 0.785 Nm
  // Motor auger:   TRU COMPONENTS IG420504-252M1R — 13.5 RPM, 24V, 2.1A, 2.942 Nm
  // Linear actuator: TC24-300-1000 — 300mm stroke, 24V, 3A
  // Limit switches: Omron SS-01D (10x installed)
  drill: {
    motors: [
      {
        id: 'thrust', label: 'Thrust Motor',
        ratedRpm: 246, currentRpm: 0,
        current: 0, voltage: 24.0, temp: 28,
        status: 'idle',
      },
      {
        id: 'auger', label: 'Auger Motor',
        ratedRpm: 14, currentRpm: 0,
        current: 0, voltage: 24.0, temp: 28,
        status: 'idle',
      },
    ],
    actuatorPosition: 0,
    actuatorExtended: false,
    limitSwitchTop: true,
    limitSwitchBottom: false,
    drillDepth: 0,
    status: 'idle',
  },
  // Teensy environmental sensor module
  environment: {
    humidity: 40.0,
    airPressure: 1020.0,
    temperature: 12.0,
    soilTemperature: 22.0,
    soilMoisture: 16.0,
    co2: 420.0,
    nh3: 80.0,
    ch4: 1900.0,
  },
  science: {
    ph: 7.0,
    phValid: true,
    uvLampOn: false,
    uvLampRuntime: 0,
    soilMoisture: 0,
    sampleCollected: false,
    pumpOn: false,
    microscopeOn: false,
    ramanStatus: 'idle',
    ramanResult: '',
    rockSampleWeight: 0,
    soilSampleWeight: 0,
    liquidSampleLevel: 0,
  },
  timestamp: Date.now(),
};

export const generateMockData = (): RoverState => {
  // Add some random noise to simulate sensor data
  const now = Date.now();
  const time = now / 1000;
  
  mockState.timestamp = now;
  mockState.orientation = {
    pitch: Math.sin(time * 0.5) * 5 + (Math.random() * 2 - 1),
    roll: Math.cos(time * 0.3) * 3 + (Math.random() * 1 - 0.5),
    yaw: (time * 10) % 360,
    heading: ((navHeading * 180 / Math.PI) + 90 + (Math.sin(time * 5) * 2) + 360) % 360,
    tilt: Math.abs(Math.sin(time * 0.5) * 10),
  };

  mockState.telemetry.speed = navSpeed * (0.85 + Math.sin(time * 1.3) * 0.15);
  mockState.telemetry.batteryLevel = Math.max(0, 98 - (time % 3600) / 36);
  mockState.telemetry.temperature = 30 + Math.sin(time * 0.1) * 5;
    // --- Mission State Sequencer (Stop-and-Go) ---
    if (phaseStatus === 'moving') {
      const dx = EXPLORATION_PHASES[currentPhase].x - mockState.location.x;
      const dy = EXPLORATION_PHASES[currentPhase].y - mockState.location.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.2) {
        // Arrived at waypoint
        if (EXPLORATION_PHASES[currentPhase].action !== 'none') {
          phaseStatus = 'operating';
          phaseDwellTimer = 0;
        } else {
          currentPhase = (currentPhase + 1) % EXPLORATION_PHASES.length;
        }
      } else {
        // Move towards waypoint
        const phase = EXPLORATION_PHASES[currentPhase];
        navSpeed = phase.speed;
        const angle = Math.atan2(dy, dx);
        mockState.location.x += Math.cos(angle) * navSpeed * 0.1;
        mockState.location.y += Math.sin(angle) * navSpeed * 0.1;
        mockState.orientation.heading = (angle * 180) / Math.PI;
      }
    } else if (phaseStatus === 'operating') {
      navSpeed = 0;
      phaseDwellTimer += 0.1; // 100ms tick

      const action = EXPLORATION_PHASES[currentPhase].action;
      let actionDuration = action === 'drill' ? 12 : 6; // 12s for drilling, 6s for arm

      if (phaseDwellTimer >= actionDuration) {
        // Operation complete
        phaseStatus = 'moving';
        currentPhase = (currentPhase + 1) % EXPLORATION_PHASES.length;
      }
    }

    mockState.telemetry.speed = navSpeed;
    mockState.telemetry.statusMessage = phaseStatus === 'operating' 
      ? `EXEC: ${EXPLORATION_PHASES[currentPhase].label}...`
      : `NAV: ${EXPLORATION_PHASES[currentPhase].label}`;

  mockState.location.z = 0;

  // Clamp to yard bounds
  mockState.location.x = Math.max(NAV_BOUNDS.xMin, Math.min(NAV_BOUNDS.xMax, mockState.location.x));
  mockState.location.y = Math.max(NAV_BOUNDS.yMin, Math.min(NAV_BOUNDS.yMax, mockState.location.y));

  // Animate wheel data
  const baseVelocity = mockState.telemetry.speed * 120; // convert m/s to approximate RPM
  if (mockState.wheels) {
    mockState.wheels = mockState.wheels.map((wheel, index) => {
      // Add tiny variation for each wheel
      const variation = Math.sin(time * 2 + index) * 5;
      const velocity = baseVelocity > 0 ? baseVelocity + variation : 0;
      
      // Current correlates with velocity but adds noise
      const current = velocity > 0 ? (velocity / 50) + Math.random() : 0.1;
      
      // Temp slowly drifts
      const temperature = 30 + (velocity / 200) * 15 + Math.sin(time * 0.1 + index) * 2;
      
      // Calculate occasional random fault status for realism
      const faultTrigger = Math.random() > 0.999 ? 'warning' : 'normal';

      return {
        ...wheel,
        velocity: Math.max(0, velocity),
        current: Math.max(0, current),
        temperature,
        status: wheel.status === 'warning' && Math.random() > 0.95 ? 'normal' : faultTrigger,
        voltage: mockState.telemetry.batteryVoltage - (current * 0.05)
      };
    });
  }

  // Animate Compute metrics
  if (mockState.compute) {
    mockState.compute.cpuUsage = Math.min(100, Math.max(5, mockState.compute.cpuUsage + (Math.random() * 10 - 5)));
    mockState.compute.cpuTemp = 40 + (mockState.compute.cpuUsage * 0.4);
    mockState.compute.gpuUsage = Math.min(100, Math.max(0, mockState.compute.gpuUsage + (Math.random() * 15 - 7)));
    mockState.compute.gpuTemp = 35 + (mockState.compute.gpuUsage * 0.3);
    mockState.compute.ramUsage = Math.min(32, Math.max(10, mockState.compute.ramUsage + (Math.random() * 0.5 - 0.2)));
  }

  // Animate Network metrics
  if (mockState.network) {
    mockState.network.signalStrength = -40 - Math.abs(Math.sin(time) * 30) - (Math.random() * 5);
    mockState.network.uplink = Math.max(10, mockState.network.uplink + (Math.random() * 40 - 20));
    mockState.network.downlink = Math.max(50, mockState.network.downlink + (Math.random() * 80 - 40));
  }

  // Animate Arm metrics
  if (mockState.arm) {
    const isOperatingArm = phaseStatus === 'operating' && EXPLORATION_PHASES[currentPhase].action === 'arm';
    
    // Animate arm only during operation phase
    mockState.arm.status = isOperatingArm ? 'moving' : 'idle';
    
    mockState.arm.joints.forEach((j, idx) => {
      let targetAngle = 0;
      if (isOperatingArm) {
        // Perform a "sampling" motion
        targetAngle = Math.sin(phaseDwellTimer * 2 + idx) * 45;
      } else {
        // Return to stow/rest position
        const stowAngles = [0, 45, -30, 0, 90, 0];
        targetAngle = stowAngles[idx];
      }
      j.angle += (targetAngle - j.angle) * 0.1;
      j.temp = 25 + (isOperatingArm ? 5 : 0) + Math.random();
    });
  }

  // Animate Battery Cells (4x LiFePO4 12V 30Ah)
  if (mockState.batteryCells) {
    const dischargeFactor = (time % 3600) / 3600; // slow discharge over simulated hour
    mockState.batteryCells = mockState.batteryCells.map((cell, i) => {
      const noise = Math.sin(time * 0.3 + i) * 0.05;
      const voltage = Math.max(10.5, 12.8 - dischargeFactor * 2.3 + noise);
      const soc = Math.max(0, Math.round(97 - dischargeFactor * 97 + noise * 5));
      const current = 3.0 + Math.sin(time * 0.5 + i) * 0.5;
      const temp = 27 + Math.sin(time * 0.1 + i) * 3 + current * 0.5;
      return { ...cell, voltage, soc, current: Math.max(0, current), temp };
    });
    // Reflect pack voltage in top-level telemetry (sum of 4 cells in series)
    const packV = mockState.batteryCells.reduce((s, c) => s + c.voltage, 0);
    mockState.telemetry.batteryVoltage = Math.round(packV * 10) / 10;
    const avgSoc = mockState.batteryCells.reduce((s, c) => s + c.soc, 0) / 4;
    mockState.telemetry.batteryLevel = Math.round(avgSoc);
  }

  // Animate Drill assembly - Only during Drill Action
  if (mockState.drill) {
    const isOperatingDrill = phaseStatus === 'operating' && EXPLORATION_PHASES[currentPhase].action === 'drill';
    
    if (isOperatingDrill) {
      // 12s sequence: 0-3s Deploy, 3-9s Drill, 9-12s Retract
      if (phaseDwellTimer < 3) {
        mockState.drill.status = 'deploying';
        mockState.drill.actuatorPosition = Math.min(300, (phaseDwellTimer / 3) * 300);
      } else if (phaseDwellTimer < 9) {
        mockState.drill.status = 'drilling';
        const drillProgress = (phaseDwellTimer - 3) / 6;
        mockState.drill.drillDepth = Math.min(500, drillProgress * 500);
        
        // Motors running during drilling
        mockState.drill.motors[0].currentRpm = 220 + Math.random() * 20;
        mockState.drill.motors[1].currentRpm = 12 + Math.random() * 2;
      } else {
        mockState.drill.status = 'retracting';
        const retractProgress = (phaseDwellTimer - 9) / 3;
        mockState.drill.actuatorPosition = Math.max(0, 300 - (retractProgress * 300));
        mockState.drill.drillDepth = Math.max(0, 500 - (retractProgress * 500));
        
        if (phaseDwellTimer > 11.5 && mockState.science) {
          mockState.science.sampleCollected = true;
          mockState.science.soilSampleWeight = 45.2; // Sample acquired
        }
      }
    } else {
      mockState.drill.status = 'idle';
      mockState.drill.motors.forEach(m => {
        m.currentRpm = 0;
        m.current = 0;
      });
    }

    // Limit switches
    mockState.drill.limitSwitchTop    = mockState.drill.actuatorPosition < 5;
    mockState.drill.limitSwitchBottom = mockState.drill.actuatorPosition > 290;
  }

  // Animate Environment Sensors (Teensy)
  if (mockState.environment) {
    const e = mockState.environment;
    const { x, y } = mockState.location;

    // ── Global Atmospheric Oscillator ──
    const gust = Math.sin(time * 0.2) * 2; // slow drift
    const flicker = Math.sin(time * 15.0) * 0.5; // high-freq flicker for graphs

    // ── Methane (CH4) Plume Model ──
    const distToPlume1 = Math.sqrt(Math.pow(x - 11, 2) + Math.pow(y - 26, 2));
    const distToPlume2 = Math.sqrt(Math.pow(x - 32, 2) + Math.pow(y - 12, 2));
    const ch4Plume = Math.max(0, 1400 * Math.exp(-distToPlume1 / 10)) + 
                     Math.max(0, 700 * Math.exp(-distToPlume2 / 15));
    
    e.ch4 = 1800 + ch4Plume + flicker * 12 + (Math.random() * 8 - 4);

    // ── CO2 Gradient Model ──
    const co2Base = 412;
    const co2ElevationOffset = (y / 35) * 60 - (x / 45) * 20; 
    e.co2 = co2Base + co2ElevationOffset + gust + (Math.random() * 5 - 2.5);

    // ── Ammonia (NH3) Correlation ──
    if (distToPlume1 < 8) e.nh3 = Math.min(15, e.nh3 + 0.25);
    else e.nh3 = Math.max(0, e.nh3 - 0.1);
    e.nh3 += flicker * 0.5 + (Math.random() * 0.2 - 0.1);

    // ── Drilling Impact on Soil Sensors ──
    const isDrilling = mockState.drill?.status === 'drilling';
    const drillNoise = isDrilling ? (Math.random() * 2 - 1) : 0;

    // Other environmental sensors (Teensy 4.1 drift + correlate noise)
    e.humidity = Math.max(15, Math.min(70, e.humidity + (gust * 0.1) + (Math.random() * 0.8 - 0.4)));
    e.airPressure = Math.max(1005, Math.min(1025, e.airPressure + (Math.random() * 0.3 - 0.15)));
    e.temperature = Math.max(5, Math.min(25, e.temperature + (gust * 0.05) + (Math.random() * 0.2 - 0.1)));
    
    // Soil metrics localized to drill bit during operation
    e.soilTemperature = Math.max(16, Math.min(32, e.soilTemperature + (isDrilling ? 0.3 : -0.05) + drillNoise * 0.2));
    e.soilMoisture = Math.max(4, Math.min(25, e.soilMoisture + (isDrilling ? 0.5 : -0.1) + drillNoise * 0.4));
  }

  // Animate Science Payload
  if (mockState.science) {
    // pH drifts slowly (DFRobot sensor noise + real soil variation)
    mockState.science.ph = Math.max(4.0, Math.min(9.5,
      mockState.science.ph + (Math.random() * 0.04 - 0.02)
    ));
    if (mockState.science.uvLampOn) {
      mockState.science.uvLampRuntime += 0.1; // 100ms tick
    }
  }

  return { ...mockState };
};
