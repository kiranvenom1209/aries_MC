import React, { useRef, useEffect, useId } from 'react';
import { useTelemetryState } from '../../context/TelemetryContext';
import { Thermometer } from 'lucide-react';

const HISTORY_LEN = 60; // 60 data points (~6 s at 100 ms tick)

interface SensorDef {
  key: string;
  label: string;
  unit: string;
  color: string;
  min: number;
  max: number;
  decimals?: number;
}

const SENSORS: SensorDef[] = [
  { key: 'humidity',        label: 'Humid.',   unit: '%',   color: '#e040a0', min: 10, max: 70 },
  { key: 'airPressure',     label: 'Press.',   unit: 'mb',  color: '#40e040', min: 990, max: 1050 },
  { key: 'temperature',     label: 'Temp.',    unit: '°C',  color: '#e04080', min: -5, max: 30 },
  { key: 'soilTemperature', label: 'Soil T.',  unit: '°C',  color: '#40d0d0', min: 10, max: 35 },
  { key: 'soilMoisture',    label: 'Soil M.',  unit: '%',   color: '#c0d020', min: 5, max: 30 },
  { key: 'co2',             label: 'CO₂',      unit: 'ppm', color: '#e02020', min: 200, max: 600 },
  { key: 'nh3',             label: 'NH₃',      unit: 'ppm', color: '#e060e0', min: 0, max: 200 },
  { key: 'ch4',             label: 'CH₄',      unit: 'ppb', color: '#c0a0e0', min: 1700, max: 2050, decimals: 0 },
];

/* ── Tiny inline sparkline chart ── */
const MiniChart: React.FC<{ def: SensorDef; data: number[] }> = ({ def, data }) => {
  const uid = useId().replace(/[:]/g, '');
  const W = 400, H = 100;
  const safe = data.length > 0 ? data : [0];
  const range = Math.max(def.max - def.min, 1);
  const pts = safe
    .map((v, i) => {
      const x = (i / Math.max(safe.length - 1, 1)) * W;
      const y = H - ((Math.max(def.min, Math.min(def.max, v)) - def.min) / range) * H;
      return `${x},${y}`;
    })
    .join(' ');
  const cur = safe[safe.length - 1] ?? 0;
  const dec = def.decimals ?? 1;

  return (
    <div className="border border-white/10 bg-black/50 rounded-xl p-2.5 flex flex-col gap-1 min-w-0 h-full hover:bg-white/5 transition-colors group">
      {/* Label + live value on same row */}
      <div className="flex justify-between items-baseline gap-1 min-w-0 shrink-0 mb-1">
        <span className="text-[9px] font-mono uppercase tracking-widest text-white/40 group-hover:text-white/60 transition-colors truncate shrink">{def.label}</span>
        <span className="text-[14px] font-mono text-white tabular-nums font-bold whitespace-nowrap shrink-0">
          {cur.toFixed(dec)}<span className="text-[9px] text-white/30 ml-0.5 font-normal">{def.unit}</span>
        </span>
      </div>
      {/* Sparkline — no side labels */}
      <div className="relative flex-1 min-h-[24px] rounded-lg border border-white/5 bg-black/40 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity">
          <defs>
            <linearGradient id={uid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={def.color} stopOpacity="0.5" />
              <stop offset="100%" stopColor={def.color} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#${uid})`} />
          <polyline points={pts} fill="none" stroke={def.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};

interface EnvironmentSensorsProps {
  layout?: 'default' | 'grid-4';
}

const EnvironmentSensors: React.FC<EnvironmentSensorsProps> = ({ layout = 'default' }) => {
  const { state } = useTelemetryState();
  const env = state.environment;
  const histRef = useRef<Record<string, number[]>>(
    Object.fromEntries(SENSORS.map(s => [s.key, []]))
  );

  // Push latest values into rolling history buffers
  useEffect(() => {
    if (!env) return;
    for (const s of SENSORS) {
      const arr = histRef.current[s.key];
      arr.push((env as any)[s.key] ?? 0);
      if (arr.length > HISTORY_LEN) arr.shift();
    }
  });

  if (!env) return null;

  return (
    <div className="glass-panel rounded-2xl flex flex-col relative glow-border bg-black/50 overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10 shadow-sm flex justify-between items-center bg-black/60 shrink-0">
        <div className="flex items-center gap-2">
          <Thermometer size={16} className="text-secondary-color" />
          <span className="text-[12px] uppercase text-secondary-color font-bold tracking-[0.2em]">
            Atmospheric Metrics
          </span>
        </div>
        <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.3em]">Module-S</span>
      </div>

      <div className="p-3">
        <div className={`grid gap-3 ${layout === 'grid-4' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'}`}>
          {SENSORS.map(s => (
            <MiniChart key={s.key} def={s} data={histRef.current[s.key]} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnvironmentSensors;

