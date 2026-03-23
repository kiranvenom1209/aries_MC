import React, { useState, useEffect, useCallback } from 'react';
import { AlertOctagon, Gauge, Crosshair } from 'lucide-react';
import { useROS } from '../../context/ROSContext';
import { useTelemetryState } from '../../context/TelemetryContext';
import ROS_COMMANDS from '../../config/rosCommands';

/* ── SVG Arc Gauge ── */
const ArcGauge: React.FC<{
  value: number; min: number; max: number;
  label: string; unit: string;
  startAngle?: number; endAngle?: number;
  size?: number; colorFn?: (v: number) => string;
  centerZero?: boolean;
  buildProgress?: number;
  hideArc?: boolean;
}> = ({ value, min, max, label, unit, startAngle = 225, endAngle = -45, size = 160, colorFn, centerZero = false, buildProgress = 1, hideArc = false }) => {
  const cx = size / 2, cy = size / 2, r = size / 2 - 14;
  const totalAngle = startAngle - endAngle;
  const pct = (value - min) / (max - min);
  const valueAngle = startAngle - pct * totalAngle;

  const centerPct = (0 - min) / (max - min);
  const centerAngle = startAngle - centerPct * totalAngle;
  const baseAngle = centerZero ? centerAngle : startAngle;

  const toXY = (angle: number) => ({
    x: cx + r * Math.cos((angle * Math.PI) / 180),
    y: cy - r * Math.sin((angle * Math.PI) / 180),
  });

  const arcPath = (from: number, to: number) => {
    const s = toXY(from), e = toXY(to);
    const sweep = from - to;
    const largeArc = Math.abs(sweep) > 180 ? 1 : 0;
    const sweepFlag = sweep >= 0 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${e.x} ${e.y}`;
  };

  const color = colorFn ? colorFn(value) : '#fe9c3d';
  const trackOpacity = Math.min(1, Math.max(0, buildProgress / 0.33));
  const ticksOpacity = Math.min(1, Math.max(0, (buildProgress - 0.33) / 0.33));
  const pointerOpacity = Math.min(1, Math.max(0, (buildProgress - 0.66) / 0.34));

  const needleEnd = toXY(valueAngle);
  const ticks = 9;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      <defs>
        <filter id="arcGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /><feComposite in="SourceGraphic" /></filter>
        <filter id="needleGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" /><feComposite in="SourceGraphic" /></filter>
      </defs>
      {/* Track */}
      <path d={arcPath(startAngle, endAngle)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" strokeLinecap="round" opacity={trackOpacity} />
      {/* Value arc */}
      {!hideArc && Math.abs(valueAngle - baseAngle) > 0.001 && <path d={arcPath(baseAngle, valueAngle)} fill="none" stroke={color} strokeWidth="6" strokeLinecap={centerZero ? 'butt' : 'round'} filter="url(#arcGlow)" opacity={pointerOpacity * 0.9} />}
      {!hideArc && Math.abs(valueAngle - baseAngle) > 0.001 && <path d={arcPath(baseAngle, valueAngle)} fill="none" stroke={color} strokeWidth="3" strokeLinecap={centerZero ? 'butt' : 'round'} opacity={pointerOpacity} />}
      {/* Ticks */}
      <g opacity={ticksOpacity}>
        {Array.from({ length: ticks }).map((_, i) => {
          const a = startAngle - (i / (ticks - 1)) * totalAngle;
          const inner = toXY(a), outerR = size / 2 - 6;
          const outer = { x: cx + outerR * Math.cos((a * Math.PI) / 180), y: cy - outerR * Math.sin((a * Math.PI) / 180) };
          return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />;
        })}
      </g>
      {/* Needle & Readout */}
      <g opacity={pointerOpacity}>
        <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y} stroke={color} strokeWidth="2" strokeLinecap="round" filter="url(#needleGlow)" opacity="0.6" />
        <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" fill={color} opacity="0.8" />
        <circle cx={cx} cy={cy} r="2" fill="white" />
        {/* Center readout */}
        <text x={cx} y={cy + 28} textAnchor="middle" className="text-xl font-mono font-bold" fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})`, fontSize: '22px' }}>{value}</text>
        <text x={cx} y={cy + 42} textAnchor="middle" className="font-mono" fill="rgba(255,255,255,0.4)" style={{ fontSize: '9px', letterSpacing: '0.15em' }}>{unit}</text>
        <text x={cx} y={cy - 30} textAnchor="middle" className="font-mono uppercase" fill="rgba(255,255,255,0.3)" style={{ fontSize: '8px', letterSpacing: '0.2em' }}>{label}</text>
      </g>
    </svg>
  );
};

/* ── 6-Wheel Rocker-Bogie Rover Top-Down Silhouette (Tank Steer) ── */
const RoverSilhouette: React.FC<{ steering: number; throttle: number }> = ({ steering, throttle }) => {
  const isMoving = throttle !== 0;
  const isTurning = Math.abs(steering) > 0;
  const isActive = isMoving || isTurning;
  const bodyColor = isActive ? 'rgba(254,156,61,0.5)' : 'rgba(255,255,255,0.15)';
  const pointTurn = isTurning && !isMoving; // zero-radius spin in place

  // Tank steering: differential wheel speeds
  // steering > 0 = turn right → left FWD, right REV (point turn) or left faster (moving)
  // steering < 0 = turn left  → right FWD, left REV (point turn) or right faster (moving)
  const steerNorm = steering / 100; // -1 to 1

  // Wheel colors: brighter = more power
  const leftIntensity  = isTurning ? 0.3 + Math.min(1, Math.abs(steerNorm > 0 ? 1 : steerNorm)) * 0.7 : 0;
  const rightIntensity = isTurning ? 0.3 + Math.min(1, Math.abs(steerNorm < 0 ? 1 : -steerNorm)) * 0.7 : 0;
  const leftColor  = isTurning ? `rgba(254,156,61,${leftIntensity})`  : 'rgba(255,255,255,0.25)';
  const rightColor = isTurning ? `rgba(254,156,61,${rightIntensity})` : 'rgba(255,255,255,0.25)';

  // Arrow directions per side
  // Point turn: left & right go opposite directions
  // Moving + steering: both go same direction but different speeds
  // leftDir/rightDir: 1 = forward arrow (up), -1 = reverse arrow (down), 0 = none
  let leftDir = 0, rightDir = 0;
  if (pointTurn) {
    // Spin in place: opposite directions
    leftDir  = steering > 0 ? 1 : -1;   // turn right → left FWD, turn left → left REV
    rightDir = steering > 0 ? -1 : 1;   // turn right → right REV, turn left → right FWD
  } else if (isMoving && isTurning) {
    const fwd = throttle > 0 ? 1 : -1;
    leftDir = fwd;
    rightDir = fwd;
  }

  return (
    <svg width="90" height="120" viewBox="0 0 90 120" className="overflow-visible">
      <defs>
        <filter id="roverGlow"><feGaussianBlur stdDeviation="2" /><feComposite in="SourceGraphic" /></filter>
      </defs>

      {/* Rocker-bogie linkage lines */}
      <line x1="14" y1="30" x2="14" y2="60" stroke={bodyColor} strokeWidth="0.8" opacity="0.4" />
      <line x1="14" y1="55" x2="14" y2="90" stroke={bodyColor} strokeWidth="0.8" opacity="0.4" />
      <circle cx="14" cy="55" r="2" fill="none" stroke={bodyColor} strokeWidth="0.8" opacity="0.5" />
      <line x1="76" y1="30" x2="76" y2="60" stroke={bodyColor} strokeWidth="0.8" opacity="0.4" />
      <line x1="76" y1="55" x2="76" y2="90" stroke={bodyColor} strokeWidth="0.8" opacity="0.4" />
      <circle cx="76" cy="55" r="2" fill="none" stroke={bodyColor} strokeWidth="0.8" opacity="0.5" />
      <line x1="14" y1="55" x2="76" y2="55" stroke={bodyColor} strokeWidth="0.6" opacity="0.3" strokeDasharray="2 2" />

      {/* Main body */}
      <rect x="24" y="22" width="42" height="76" rx="5" fill="none" stroke={bodyColor} strokeWidth="1.5" />
      <rect x="32" y="28" width="26" height="14" rx="2" fill="none" stroke={bodyColor} strokeWidth="0.8" opacity="0.5" />
      <line x1="45" y1="28" x2="45" y2="18" stroke={bodyColor} strokeWidth="1" opacity="0.4" />
      <circle cx="45" cy="16" r="2" fill="none" stroke={bodyColor} strokeWidth="0.8" opacity="0.5" />

      {/* Direction arrow (only when actually moving forward/backward) */}
      {isMoving && (
        <g opacity="0.8" filter="url(#roverGlow)">
          <path d={throttle > 0 ? 'M45 8 L41 16 L49 16 Z' : 'M45 112 L41 104 L49 104 Z'} fill={throttle > 0 ? '#22c55e' : '#f97316'} />
        </g>
      )}

      {/* Point-turn rotation symbol (circular arrow) */}
      {pointTurn && (
        <g opacity="0.6">
          <path
            d={steering > 0
              ? 'M38 52 A10 10 0 1 1 38 68'  // CW arc
              : 'M52 52 A10 10 0 1 0 52 68'}  // CCW arc
            fill="none" stroke="#fe9c3d" strokeWidth="1.2" strokeDasharray="3 2"
          />
          {/* Arrowhead on the arc */}
          <path
            d={steering > 0
              ? 'M38 68 L35 64 L41 65 Z'  // CW arrow tip
              : 'M52 68 L49 65 L55 64 Z'}  // CCW arrow tip
            fill="#fe9c3d"
          />
        </g>
      )}

      {/* ── 6 Wheels (all fixed straight — tank steer) ── */}
      {/* Left wheels */}
      <rect x="6" y="24" width="16" height="12" rx="3" fill={leftColor} stroke={leftColor} strokeWidth="0.5" />
      <rect x="6" y="54" width="16" height="12" rx="3" fill={leftColor} stroke={leftColor} strokeWidth="0.5" opacity="0.8" />
      <rect x="6" y="84" width="16" height="12" rx="3" fill={leftColor} stroke={leftColor} strokeWidth="0.5" />
      {/* Right wheels */}
      <rect x="68" y="24" width="16" height="12" rx="3" fill={rightColor} stroke={rightColor} strokeWidth="0.5" />
      <rect x="68" y="54" width="16" height="12" rx="3" fill={rightColor} stroke={rightColor} strokeWidth="0.5" opacity="0.8" />
      <rect x="68" y="84" width="16" height="12" rx="3" fill={rightColor} stroke={rightColor} strokeWidth="0.5" />

      {/* Tank steer tread-direction arrows per side */}
      {isTurning && (
        <>
          {/* Left track arrows */}
          {leftDir === 1 && (
            <>
              <path d="M14 20 L11 24 L17 24 Z" fill="#22c55e" opacity="0.7" />
              <path d="M14 100 L17 96 L11 96 Z" fill="#22c55e" opacity="0.35" />
            </>
          )}
          {leftDir === -1 && (
            <>
              <path d="M14 100 L11 96 L17 96 Z" fill="#f97316" opacity="0.7" />
              <path d="M14 20 L17 24 L11 24 Z" fill="#f97316" opacity="0.35" />
            </>
          )}
          {/* Right track arrows */}
          {rightDir === 1 && (
            <>
              <path d="M76 20 L73 24 L79 24 Z" fill="#22c55e" opacity="0.7" />
              <path d="M76 100 L79 96 L73 96 Z" fill="#22c55e" opacity="0.35" />
            </>
          )}
          {rightDir === -1 && (
            <>
              <path d="M76 100 L73 96 L79 96 Z" fill="#f97316" opacity="0.7" />
              <path d="M76 20 L79 24 L73 24 Z" fill="#f97316" opacity="0.35" />
            </>
          )}
        </>
      )}

      {/* Turning arc indicator (only when moving + steering, not point turn) */}
      {isTurning && isMoving && (
        <path
          d={steering > 0
            ? 'M50 25 Q65 60 50 95'
            : 'M40 25 Q25 60 40 95'}
          fill="none" stroke="#fe9c3d" strokeWidth="1" opacity="0.3" strokeDasharray="3 3"
        />
      )}

      {/* Center of mass dot */}
      <circle cx="45" cy="60" r="2.5" fill="#fe9c3d" opacity="0.6" />
    </svg>
  );
};

const AutonomyVisual: React.FC = () => {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      {/* Outer spinning dashed ring */}
      <svg className="absolute inset-0 animate-[spin_8s_linear_infinite] opacity-50" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="4 8" />
      </svg>
      {/* Inner expanding ring */}
      <div className="absolute inset-4 rounded-full border border-green-500/40 animate-pulse" />
      
      {/* Center glowing core */}
      <div className="w-10 h-10 bg-green-900/40 border border-green-500/60 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)]">
        <div className="w-4 h-4 bg-green-400 rounded-full shadow-[0_0_12px_rgba(34,197,94,1)] animate-pulse" />
      </div>
      
      {/* 4 Corner brackets */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-green-500 opacity-60" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-green-500 opacity-60" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-green-500 opacity-60" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-green-500 opacity-60" />
    </div>
  );
};

const DriveControl: React.FC = () => {
  const [throttle, setThrottle] = useState(0);
  const [steering, setSteering] = useState(0);
  const [estopLatched, setEstopLatched] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  
  const estopTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Startup animation state
  const [startupPhase, setStartupPhase] = useState<'idle' | 'announcing' | 'building' | 'sweeping' | 'appearing' | 'autoAnnouncing' | 'done'>('done');
  const [sweepProgress, setSweepProgress] = useState(0);
  const [buildProgress, setBuildProgress] = useState(1);

  const { publishCommand, connectionStatus } = useROS();
  const { state } = useTelemetryState();
  const speed = state.telemetry.speed;
  const heading = state.orientation.heading;
  const headingCardinal = (() => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(((heading % 360 + 360) % 360) / 45) % 8];
  })();

  const publishVector = useCallback((nextThrottle: number, nextSteering: number) => {
    publishCommand('driveVector', {
      throttle: nextThrottle,
      steering: nextSteering,
      source: 'drive-control',
    });
  }, [publishCommand]);

  const startEstopPress = () => {
    if (estopLatched) {
      // Disengage requires a 1.5s long press
      estopTimer.current = setTimeout(() => {
        setEstopLatched(false);
        publishCommand('driveEstop', { engaged: false });
      }, 1500);
    } else {
      // Engage is immediate
      setThrottle(0);
      setSteering(0);
      setEstopLatched(true);
      publishVector(0, 0);
      publishCommand('driveEstop', { engaged: true });
    }
  };

  const cancelEstopPress = () => {
    if (estopTimer.current) clearTimeout(estopTimer.current);
  };

  useEffect(() => {
    if (!estopLatched) {
      publishVector(throttle, steering);
    }
  }, [estopLatched, publishVector, steering, throttle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      if (estopLatched || autoMode) return; // Block input while E-STOP or AUTO is engaged
      const tStep = (e.ctrlKey || e.metaKey || e.shiftKey) ? 5 : 1;
      const sStep = (e.ctrlKey || e.metaKey || e.shiftKey) ? 10 : 1;
      setThrottle(t => { if (e.key === 'ArrowUp') return Math.min(t + tStep, 100); if (e.key === 'ArrowDown') return Math.max(t - tStep, -100); return t; });
      setSteering(s => { if (e.key === 'ArrowLeft') return Math.max(s - sStep, -100); if (e.key === 'ArrowRight') return Math.min(s + sStep, 100); return s; });
    };
    const handleKeyUp = (e: KeyboardEvent) => { 
      if (['ArrowLeft', 'ArrowRight', 'Control', 'Meta', 'Shift'].includes(e.key)) {
        setSteering(0); 
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); publishVector(0, 0); };
  }, [publishVector, estopLatched, autoMode]);

  // Porsche-style startup animation sequence
  useEffect(() => {
    if (!autoMode) {
      setStartupPhase('announcing');
      let start = performance.now();
      const announceDuration = 1800; // 1.8s announce
      const buildDuration = 1200; // 1.2s build gauge sequence
      const duration = 1800; // 1.8s sweep duration
      let frameId: number;
      let phase = 'announcing';

      const animate = (time: number) => {
        let elapsed = time - start;
        if (elapsed < announceDuration) {
          // Announcing phase
          frameId = requestAnimationFrame(animate);
          return;
        }

        const buildElapsed = elapsed - announceDuration;
        if (phase === 'announcing') {
          phase = 'building';
          setStartupPhase('building');
        }

        if (buildElapsed < buildDuration) {
           const bp = buildElapsed / buildDuration;
           setBuildProgress(bp);
           frameId = requestAnimationFrame(animate);
           return;
        }

        const sweepElapsed = buildElapsed - buildDuration;
        if (phase === 'building') {
          phase = 'sweeping';
          setStartupPhase('sweeping');
          setBuildProgress(1); // fully built
        }

        if (sweepElapsed >= duration) {
          setSweepProgress(0);
          setStartupPhase('appearing');
          setTimeout(() => setStartupPhase('done'), 600); // fade in duration
          return;
        }
        const p = sweepElapsed / duration;
        setSweepProgress(p);
        frameId = requestAnimationFrame(animate);
      };
      frameId = requestAnimationFrame(animate);
      
      return () => cancelAnimationFrame(frameId);
    } else {
      setStartupPhase('autoAnnouncing');
      let start = performance.now();
      const announceDuration = 1800; // 1.8s announce
      let frameId: number;

      const animate = (time: number) => {
        if (time - start >= announceDuration) {
          setStartupPhase('done');
          return;
        }
        frameId = requestAnimationFrame(animate);
      };
      frameId = requestAnimationFrame(animate);
      
      return () => cancelAnimationFrame(frameId);
    }
  }, [autoMode]);

  const handleAutoToggle = () => {
    if (!autoMode) {
      // Enter auto mode — zero controls
      setThrottle(0);
      setSteering(0);
      publishVector(0, 0);
      setAutoMode(true);
      publishCommand('driveMode', { mode: 'auto' });
    } else {
      // Manual override
      setAutoMode(false);
      publishCommand('driveMode', { mode: 'manual' });
    }
  };

  const throttleColor = (v: number) => v > 0 ? '#22c55e' : v < 0 ? '#f97316' : '#fe9c3d';
  const steeringColor = () => Math.abs(steering) > 0 ? '#fe9c3d' : 'rgba(255,255,255,0.4)';
  const modeLabel = throttle > 0 ? 'FWD' : throttle < 0 ? 'REV' : 'IDLE';
  const modeColor = throttle > 0 ? 'text-green-500' : throttle < 0 ? 'text-orange-500' : 'text-white/40';

  const isSweeping = startupPhase === 'sweeping';
  const isAnnouncing = startupPhase === 'announcing';
  const isBuilding = startupPhase === 'building';
  const isAutoAnnouncing = startupPhase === 'autoAnnouncing';
  const isStartupActive = isSweeping || isBuilding || isAnnouncing;
  
  const displayThrottle = isStartupActive ? Math.sin(sweepProgress * Math.PI) * 100 : Math.abs(throttle);
  
  const getSteeringSweep = (p: number) => {
    if (p < 0.5) {
      return -Math.cos(p * 2 * Math.PI) * 100; // -100 to +100
    } else {
      const pnorm = (p - 0.5) * 2;
      return ((Math.cos(pnorm * Math.PI) + 1) / 2) * 100; // +100 to 0
    }
  };
  const displaySteering = isStartupActive ? getSteeringSweep(sweepProgress) : steering;
  
  const manualControlsClass = estopLatched
    ? 'opacity-0 scale-90 pointer-events-none transition-all duration-300'
    : autoMode 
      ? 'opacity-0 translate-y-16 scale-90 pointer-events-none transition-all duration-500' // Hidden away
      : isAnnouncing 
        ? 'opacity-0 scale-95 pointer-events-none transition-all duration-500' // Hidden for announce
        : 'opacity-100 scale-100 transition-all duration-700 ease-out'; // Visible state

  const appearClass = (isSweeping || isBuilding || isAnnouncing || estopLatched) ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0 transition-all duration-700 ease-out';

  return (
    <>
      {/* ── FULL SCREEN MODE OVERLAY ── */}
      <div 
        className={`fixed inset-0 pointer-events-none z-[100] transition-all duration-1000 ease-out ${
          isAutoAnnouncing
            ? 'shadow-[inset_0_0_150px_rgba(34,197,94,0.3)] border-[2px] border-green-500/40'
            : isAnnouncing
              ? 'shadow-[inset_0_0_150px_rgba(239,68,68,0.3)] border-[2px] border-red-500/40'
              : autoMode
                ? 'shadow-[inset_0_0_50px_rgba(34,197,94,0.05)] border border-green-500/10'
                : 'shadow-none border border-transparent'
        }`}
      />

      <div className="glass-panel rounded-xl flex flex-col h-full relative glow-border border-primary-color border-2 shadow-[0_0_20px_rgba(254,156,61,0.15)] bg-black overflow-visible">


      {/* Top bar */}
      <div className="px-4 py-2 border-b border-primary-color/20 flex justify-between items-center bg-black/60 shrink-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Gauge size={13} className="text-primary-color" />
          <span className="text-[10px] uppercase text-primary-color font-bold tracking-[0.15em] font-mono">Drive Teleop</span>
          <span className="text-[8px] font-mono text-white/25 ml-1">
            {connectionStatus === 'connected' ? '● LIVE' : '○ SIM'} · {ROS_COMMANDS.driveVector.topic}
          </span>
        </div>
        <button
          onPointerDown={startEstopPress}
          onPointerUp={cancelEstopPress}
          onPointerLeave={cancelEstopPress}
          onContextMenu={(e) => e.preventDefault()}
          title={estopLatched ? "Hold to Disengage E-STOP" : "Engage E-STOP"}
          className={`flex items-center gap-1.5 px-3 py-1 text-[9px] uppercase font-bold tracking-widest transition-all active:scale-95 rounded border select-none ${
            estopLatched
              ? 'text-white bg-red-600 border-red-400 shadow-[0_0_20px_rgba(220,38,38,1)] animate-pulse'
              : 'text-red-400 bg-red-900/30 border-red-500/50 hover:bg-red-600 hover:text-white hover:shadow-[0_0_15px_rgba(220,38,38,0.8)]'
          }`}
        >
          <AlertOctagon size={11} />
          {estopLatched ? 'HOLD TO UNLOCK' : 'E-STOP'}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-stretch p-3 z-10 relative">
        {/* Speed readout (left, left-aligned) — equal column */}
        <div className="flex-1 basis-0 min-w-0 flex flex-col items-start justify-center gap-2 pl-4 pr-6">
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/30">Speed</span>
          <span className="text-7xl font-bold tabular-nums text-green-400 drop-shadow-[0_0_12px_rgba(34,197,94,0.6)] leading-none" style={{ fontFamily: "'DSEG7', monospace" }}>
            {speed.toFixed(2)}
          </span>
          <span className="text-[10px] font-mono text-white/40 tracking-widest">m/s</span>
        </div>

        {/* Center: Manual controls OR Auto mode display */}
        <div className="shrink-0 flex items-center justify-center relative">

          {/* ── E-STOP OVERLAY ── */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 transition-all duration-300 z-30 ${estopLatched ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}>
             <AlertOctagon size={48} className="text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse" />
             <span className="text-xl font-mono font-bold tracking-[0.3em] text-red-500 uppercase drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">E-STOP ENGAGED</span>
             <span className="text-[10px] font-mono text-white/50 tracking-widest uppercase">Hold E-STOP button to disengage</span>
          </div>

          {/* ── AUTO MODE ANNOUNCEMENT ── */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 transition-all duration-500 z-20 ${(isAutoAnnouncing && !estopLatched) ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}>
             <div className="w-16 h-[2px] bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]" />
             <span className="text-lg font-mono font-bold tracking-[0.3em] text-green-500 uppercase drop-shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse">Autonomy Engaged</span>
             <span className="text-[8px] font-mono text-green-400/80 tracking-[0.3em] uppercase opacity-70">AI Navigation Active</span>
             <div className="w-16 h-[2px] bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]" />
          </div>

          {/* ── AUTO MODE DISPLAY ── */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-4 transition-all duration-500 ${(autoMode && !isAutoAnnouncing && !estopLatched) ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-16 scale-95 pointer-events-none'}`}>
            <AutonomyVisual />

            <div className="flex flex-col items-center gap-1 mt-1">
              <span className="text-sm font-mono font-bold tracking-[0.3em] text-green-400 uppercase drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]">Autonomy Engaged</span>
              <span className="text-[9px] font-mono text-white/50 tracking-[0.2em] uppercase">Navigation & Pathfinding Active</span>
              <div className="flex items-center gap-2 mt-2 opacity-60">
                <span className="text-[8px] font-mono text-green-500 tracking-widest">SYS: ONLINE</span>
                <span className="text-[8px] font-mono text-green-500 tracking-widest">|</span>
                <span className="text-[8px] font-mono text-green-500 tracking-widest animate-pulse">NAV: CALCULATING</span>
              </div>
            </div>

            <button
              onClick={handleAutoToggle}
              className="mt-2 flex items-center gap-2 px-6 py-1.5 text-[9px] uppercase font-bold tracking-[0.2em] font-mono rounded border border-red-500/40 bg-red-900/20 text-red-500 hover:bg-red-500/30 hover:border-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all active:scale-95"
            >
              Manual Override
            </button>
          </div>

          {/* ── MANUAL OVERRIDE ANNOUNCEMENT ── */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 transition-all duration-500 z-20 ${(isAnnouncing && !estopLatched) ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}>
             <div className="w-16 h-[2px] bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
             <span className="text-lg font-mono font-bold tracking-[0.3em] text-red-500 uppercase drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]">Manual Mode Active</span>
             <span className="text-[8px] font-mono text-red-400/80 tracking-[0.3em] uppercase opacity-70">System Control Transferred</span>
             <div className="w-16 h-[2px] bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
          </div>

          {/* ── MANUAL CONTROLS ── */}
          <div className={`flex items-center justify-center gap-2 z-10 relative ${manualControlsClass}`}>
            {/* Throttle Arc Gauge */}
            <div className="flex flex-col items-center gap-1">
              <ArcGauge buildProgress={isAnnouncing ? 0 : isBuilding ? buildProgress : 1} value={Math.round(displayThrottle)} min={0} max={100} label="Throttle" unit="% PWR" colorFn={() => isSweeping ? '#fe9c3d' : throttleColor(throttle)} />
              <div className={`flex items-center gap-2 ${appearClass}`}>
                <span className={`text-xs font-mono font-bold tracking-widest ${modeColor} drop-shadow-[0_0_5px_currentColor]`}>{modeLabel}</span>
              </div>
              <input type="range" min="-100" max="100" value={throttle}
                onChange={(e) => setThrottle(parseInt(e.target.value))}
                className={`w-32 h-1 appearance-none bg-white/10 rounded-full mt-1 outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary-color [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(254,156,61,0.8)] ${appearClass}`}
              />
            </div>

            {/* Center: Rover Silhouette + Auto button + Mode */}
            <div className={`flex flex-col items-center gap-1 mx-2 ${appearClass}`}>
              {/* AUTO button above rover */}
              <button
                onClick={handleAutoToggle}
                className="px-4 py-1 mb-1 text-[9px] uppercase font-bold tracking-[0.2em] font-mono rounded border border-green-500/40 bg-green-900/20 text-green-400 hover:bg-green-500/30 hover:border-green-400 hover:text-green-300 hover:shadow-[0_0_12px_rgba(34,197,94,0.4)] transition-all active:scale-95"
              >
                Auto
              </button>
              <div className="relative">
                <RoverSilhouette steering={steering} throttle={throttle} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <Crosshair size={60} className="text-primary-color" strokeWidth={0.5} />
                </div>
              </div>
              <div className="flex gap-1 mt-1 opacity-30">
                <kbd className="px-1 py-0.5 text-[7px] font-mono border border-white/20 rounded bg-white/5 text-white/50">↑</kbd>
                <kbd className="px-1 py-0.5 text-[7px] font-mono border border-white/20 rounded bg-white/5 text-white/50">↓</kbd>
                <kbd className="px-1 py-0.5 text-[7px] font-mono border border-white/20 rounded bg-white/5 text-white/50">←</kbd>
                <kbd className="px-1 py-0.5 text-[7px] font-mono border border-white/20 rounded bg-white/5 text-white/50">→</kbd>
              </div>
            </div>

            {/* Steering Arc Gauge */}
            <div className="flex flex-col items-center gap-1">
              <ArcGauge hideArc={isStartupActive} buildProgress={isAnnouncing ? 0 : isBuilding ? buildProgress : 1} centerZero value={Math.round(displaySteering)} min={-100} max={100} label="Steering" unit={`${steering > 0 ? 'RIGHT' : steering < 0 ? 'LEFT' : 'CENTER'}`} colorFn={() => isStartupActive ? '#fe9c3d' : steeringColor()} />
              <div className={`flex items-center gap-3 ${appearClass}`}>
                <span className="text-[9px] font-mono text-white/30 tracking-widest">L</span>
                <span className={`text-xs font-mono font-bold tracking-widest drop-shadow-[0_0_5px_currentColor] ${Math.abs(steering) > 0 ? 'text-primary-color' : 'text-white/40'}`}>{steering}°</span>
                <span className="text-[9px] font-mono text-white/30 tracking-widest">R</span>
              </div>
              <input type="range" min="-100" max="100" value={steering}
                onChange={(e) => setSteering(parseInt(e.target.value))}
                onMouseUp={() => setSteering(0)} onMouseLeave={() => setSteering(0)} onTouchEnd={() => setSteering(0)}
                className={`w-32 h-1 appearance-none bg-white/10 rounded-full mt-1 outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary-color [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(254,156,61,0.8)] ${appearClass}`}
              />
            </div>
          </div>

        </div>

        {/* Heading readout (right, right-aligned) — equal column */}
        <div className="flex-1 basis-0 min-w-0 flex flex-col items-end justify-center gap-2 pl-6 pr-4">
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/30">Heading</span>
          <span className="text-7xl font-bold tabular-nums text-primary-color drop-shadow-[0_0_12px_rgba(254,156,61,0.5)] leading-none" style={{ fontFamily: "'DSEG7', monospace" }}>
            {Math.round(heading)}
          </span>
          <span className="text-[10px] font-mono text-white/60 tracking-widest font-bold">° {headingCardinal}</span>
        </div>
      </div>

      {/* Bottom telemetry strip */}
      <div className="px-4 py-1.5 border-t border-primary-color/15 flex justify-between items-center bg-black/40 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <span className="text-[8px] font-mono text-white/25 uppercase tracking-widest">Vector</span>
          <span className="text-[10px] font-mono text-white/50">T:{throttle > 0 ? '+' : ''}{throttle} S:{steering > 0 ? '+' : ''}{steering}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-1.5 rounded-full ${autoMode ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.8)] animate-pulse' : throttle !== 0 || steering !== 0 ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.8)] animate-pulse' : 'bg-white/15'}`} />
          <span className="text-[8px] font-mono text-white/25 uppercase tracking-widest">{autoMode ? 'Auto' : throttle !== 0 || steering !== 0 ? 'Transmitting' : 'Standby'}</span>
        </div>
      </div>
    </div>
    </>
  );
};

export default DriveControl;
