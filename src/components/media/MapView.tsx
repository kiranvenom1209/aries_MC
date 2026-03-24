import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Crosshair } from 'lucide-react';
import { useTelemetryState } from '../../context/TelemetryContext';
import marsYardImg from '../../../images/ERC-Mars-Yard-from-top-scaled.jpg.webp';

/* ── Local-frame 2D position tracker ──
 * Renders the rover's x/y position from localization on a zoomable
 * grid with a short trail.  Background: Mars Yard top-down image.
 */

const TRAIL_MAX = 200;
const GRID_COLOR = 'rgba(254,156,61,0.08)';
const AXIS_COLOR = 'rgba(254,156,61,0.25)';
const TRAIL_COLOR = 'rgba(254,156,61,0.45)';
const DOT_COLOR = '#fe9c3d';

import { usePlayback } from '../../context/PlaybackContext';

const MapView: React.FC = () => {
  const { state } = useTelemetryState();
  const { x, y, z } = state.location;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const offsetRef = useRef({ x: 0, y: 0 }); // pan offset in px
  const scaleRef = useRef(28); // px per meter
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const trackingRef = useRef(true); // auto-center on rover
  const [showTrackBtn, setShowTrackBtn] = useState(false);
  const [operationMarkers, setOperationMarkers] = useState<{ x: number, y: number, type: 'drill' | 'arm' }[]>([]);

  // Preload background image
  useEffect(() => {
    const img = new Image();
    img.src = marsYardImg;
    img.onload = () => { bgImageRef.current = img; };
  }, []);

  const { playbackData, currentIndex } = usePlayback();
  const hasPlayback = playbackData.length > 0;
  const playbackDataRef = useRef(playbackData);
  useEffect(() => { playbackDataRef.current = playbackData; }, [playbackData]);

  // Track operation markers for both Live and Playback
  useEffect(() => {
    const markers: { x: number, y: number, type: 'drill' | 'arm' }[] = [];
    let lastDrill = false;
    let lastArm = false;

    if (hasPlayback) {
      // In playback mode, scan the entire mission log once
      playbackData.forEach(d => {
        const sD = d.drill?.status?.toLowerCase() || 'idle';
        const sA = d.arm?.status?.toLowerCase() || 'idle';
        const isDrilling = sD === 'drilling' || sD === 'retracting' || sD === 'deploying';
        const isArmMoving = sA === 'moving';
        
        if (isDrilling && !lastDrill) markers.push({ x: d.location.x, y: d.location.y, type: 'drill' });
        if (isArmMoving && !lastArm)   markers.push({ x: d.location.x, y: d.location.y, type: 'arm'   });
        
        lastDrill = isDrilling;
        lastArm = isArmMoving;
      });
      setOperationMarkers(markers);
    } else {
      // In live mode, we accumulate markers as they happen (logic below is a simplification, 
      // in a real app this would be more stateful but for mock sims we scan the current state)
      const sD = state.drill?.status?.toLowerCase() || 'idle';
      const sA = state.arm?.status?.toLowerCase() || 'idle';
      const isDrilling = sD === 'drilling' || sD === 'retracting' || sD === 'deploying';
      const isArmMoving = sA === 'moving';

      if (isDrilling || isArmMoving) {
        setOperationMarkers(prev => {
          const type = isDrilling ? 'drill' : 'arm';
          const pos = state.location;
          // Only add if not already marked at this general location (within 0.5m)
          const exists = prev.find(m => m.type === type && Math.hypot(m.x - pos.x, m.y - pos.y) < 0.5);
          if (!exists) return [...prev, { x: pos.x, y: pos.y, type }];
          return prev;
        });
      }
    }
  }, [playbackData, state.location.x, state.location.y, state.drill?.status, state.arm?.status, hasPlayback]);

  const currentIndexRef = useRef(currentIndex);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  // Track trail
  useEffect(() => {
    const trail = trailRef.current;
    if (playbackData.length > 0) {
      // In playback mode, we don't manually track local trail, 
      // we just show the full path + current point.
      // But we can clear it to avoid confusion.
      if (trail.length > 0) trailRef.current = [];
      return;
    }
    const last = trail[trail.length - 1];
    if (!last || Math.hypot(x - last.x, y - last.y) > 0.01) {
      trail.push({ x, y });
      if (trail.length > TRAIL_MAX) trail.shift();
    }
  }, [x, y, playbackData.length]);

  // Keep latest x/y in refs so the RAF loop always reads current values
  const xRef = useRef(x);
  const yRef = useRef(y);
  useEffect(() => { xRef.current = x; yRef.current = y; }, [x, y]);

  // ── Drawing ──
  const draw = useCallback(() => {
    const x = xRef.current;
    const y = yRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use logical (CSS) dimensions, not physical canvas pixels
    const W = (canvas as any).__lw || canvas.clientWidth || canvas.width;
    const H = (canvas as any).__lh || canvas.clientHeight || canvas.height;
    const scale = scaleRef.current;

    // Auto-track: keep rover centered every frame
    if (trackingRef.current) {
      // In playback mode, center on the playback position, otherwise live position
      const trackX = playbackDataRef.current.length > 0 ? playbackDataRef.current[currentIndexRef.current]?.location.x ?? x : x;
      const trackY = playbackDataRef.current.length > 0 ? playbackDataRef.current[currentIndexRef.current]?.location.y ?? y : y;
      offsetRef.current = { x: -(trackX * scale), y: -(trackY * scale) };
    }
    const off = offsetRef.current;

    // ERC Mars Yard: 45 m × 35 m
    // Origin (0,0) = top-left of image; +X right, +Y down
    const YARD_W = 45; // metres
    const YARD_H = 35; // metres

    // World → canvas: rover position centered in viewport via offset
    // off.x/off.y shift so the rover dot sits at canvas center
    const toCanvasX = (wx: number) => W / 2 + (wx * scale) + off.x;
    const toCanvasY = (wy: number) => H / 2 + (wy * scale) + off.y; // +Y = down, no flip

    ctx.clearRect(0, 0, W, H);

    // Background image: top-left at world (0,0)
    const bgImg = bgImageRef.current;
    if (bgImg) {
      const drawW = YARD_W * scale;
      const drawH = YARD_H * scale;
      const imgLeft = toCanvasX(0);
      const imgTop = toCanvasY(0);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(bgImg, imgLeft, imgTop, drawW, drawH);
      ctx.globalAlpha = 1.0;
    }

    // Grid
    const gridStep = scale >= 15 ? 1 : scale >= 5 ? 5 : 10; // adaptive metres
    const startWx = Math.floor((-W / 2 - off.x) / scale / gridStep) * gridStep;
    const endWx = Math.ceil((W / 2 - off.x) / scale / gridStep) * gridStep;
    const startWy = Math.floor((-H / 2 - off.y) / scale / gridStep) * gridStep;
    const endWy = Math.ceil((H / 2 - off.y) / scale / gridStep) * gridStep;

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let gx = startWx; gx <= endWx; gx += gridStep) {
      const cx = toCanvasX(gx);
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
    }
    for (let gy = startWy; gy <= endWy; gy += gridStep) {
      const cy = toCanvasY(gy);
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    }

    // Axis lines through origin
    ctx.strokeStyle = AXIS_COLOR;
    ctx.lineWidth = 1.5;
    const ox = toCanvasX(0); const oy = toCanvasY(0);
    ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(W, oy); ctx.stroke();

    // Full Mission Trajectory (if in playback mode)
    const fullPath = playbackDataRef.current;
    if (fullPath.length > 1) {
      const idx = currentIndexRef.current;
      // 1. Draw Entire Mission Baseline (Thick White)
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 3.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(toCanvasX(fullPath[0].location.x), toCanvasY(fullPath[0].location.y));
      for (let i = 1; i < fullPath.length; i++) {
        ctx.lineTo(toCanvasX(fullPath[i].location.x), toCanvasY(fullPath[i].location.y));
      }
      ctx.stroke();

      // 2. Draw "Traveled" Progress (Thick Orange) - Grows as the timeline scrubbs
      ctx.strokeStyle = DOT_COLOR;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(toCanvasX(fullPath[0].location.x), toCanvasY(fullPath[0].location.y));
      for (let i = 1; i <= idx; i++) {
        ctx.lineTo(toCanvasX(fullPath[i].location.x), toCanvasY(fullPath[i].location.y));
      }
      ctx.stroke();
      
      // Add start marker (Green)
      ctx.fillStyle = '#4ade80'; 
      ctx.beginPath();
      ctx.arc(toCanvasX(fullPath[0].location.x), toCanvasY(fullPath[0].location.y), 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Mission Operation Markers (Milestones)
    operationMarkers.forEach(m => {
      const mx = toCanvasX(m.x);
      const my = toCanvasY(m.y);
      const color = m.type === 'drill' ? '#22d3ee' : '#a855f7';
      
      // Target Ring
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mx, my, 8, 0, Math.PI * 2);
      ctx.stroke();
      
      // Center Dot
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(mx, my, 3, 0, Math.PI * 2);
      ctx.fill();

      // Label (adaptive)
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(m.type.toUpperCase(), mx + 12, my + 3);
    });

    // Recent Trail (local)
    const trail = trailRef.current;
    if (trail.length > 1) {
      ctx.strokeStyle = TRAIL_COLOR;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(toCanvasX(trail[0].x), toCanvasY(trail[0].y));
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(toCanvasX(trail[i].x), toCanvasY(trail[i].y));
      }
      ctx.stroke();
    }

    // Rover dot
    const rx = toCanvasX(x);
    const ry = toCanvasY(y);
    ctx.beginPath();
    ctx.arc(rx, ry, 6, 0, Math.PI * 2);
    ctx.fillStyle = DOT_COLOR;
    ctx.shadowColor = DOT_COLOR;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Ping ring
    ctx.beginPath();
    ctx.arc(rx, ry, 12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(254,156,61,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Grid scale label
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '10px monospace';
    ctx.fillText(`${gridStep} m/div`, 8, H - 8);
  }, [operationMarkers]); // stable — reads everything from refs or state deps

  // Resize observer + animation frame (runs once, never restarts)
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      canvas.style.width = `${parent.clientWidth}px`;
      canvas.style.height = `${parent.clientHeight}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      (canvas as any).__lw = parent.clientWidth;
      (canvas as any).__lh = parent.clientHeight;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    resize();

    let raf: number;
    const loop = () => { drawRef.current(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);

    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, []); // stable — loop never tears down

  // ── Wheel zoom (must be non-passive to preventDefault) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      scaleRef.current = Math.max(2, Math.min(200, scaleRef.current * (e.deltaY < 0 ? 1.15 : 0.87)));
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    // Manual pan → disable tracking
    if (trackingRef.current) {
      trackingRef.current = false;
      setShowTrackBtn(true);
    }
    offsetRef.current = {
      x: dragRef.current.ox + (e.clientX - dragRef.current.sx),
      y: dragRef.current.oy + (e.clientY - dragRef.current.sy),
    };
  }, []);

  const onPointerUp = useCallback(() => { dragRef.current = null; }, []);

  const enableTracking = useCallback(() => {
    trackingRef.current = true;
    setShowTrackBtn(false);
    scaleRef.current = 28;
  }, []);

  return (
    <div className="glass-panel rounded-xl flex flex-col h-full relative glow-border">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border-color/30 shadow-sm flex justify-between items-center bg-black/40 shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <Crosshair size={14} className="text-primary-color" />
          <span className="text-[10px] uppercase text-primary-color font-bold tracking-[0.15em]">
            Nav. Systems / Localization
          </span>
        </div>
        <div className="text-[10px] font-mono text-gray-400 bg-black/50 px-2 py-0.5 rounded border border-gray-800">
          X: {x.toFixed(2)} | Y: {y.toFixed(2)} | Z: {z.toFixed(2)}
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative cursor-grab active:cursor-grabbing">
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
        {showTrackBtn && (
          <button
            onClick={enableTracking}
            className="absolute bottom-4 left-4 z-10 bg-black/80 hover:bg-primary-color/20 text-primary-color border border-primary-color text-[10px] px-3 py-1 font-mono uppercase tracking-wider rounded transition-colors animate-pulse"
          >
            Reset View
          </button>
        )}
      </div>
    </div>
  );
};

export default MapView;
