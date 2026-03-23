import React, { useState, useEffect } from 'react';
import { Cpu } from 'lucide-react';
import { useTelemetryState } from '../../context/TelemetryContext';

interface ComputeStatusProps {
  compact?: boolean;
}

const Sparkline = ({ data, max = 100, color = '#fe9c3d' }: { data: number[], max?: number, color?: string }) => {
  const width = 100;
  const height = 24; // smaller height to fit standard padding
  
  // Guard against empties
  if (!data || data.length === 0) return null;

  const pts = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const clampedY = Math.min(Math.max(val, 0), max);
    let y = height - ((clampedY / max) * height);
    if (isNaN(y)) y = height;
    return `${x},${y}`;
  }).join(' ');

  const fillPts = `0,${height} ${pts} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible preserve-3d">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#grad-${color})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const ComputeStatus: React.FC<ComputeStatusProps> = ({ compact = false }) => {
  const { state } = useTelemetryState();
  const compute = state.compute;

  const headerPaddingClass = compact ? 'px-3 py-1.5' : 'px-5 py-3';
  const contentClass = compact ? 'p-1.5 gap-1.5' : 'p-3 gap-3';
  const cardPaddingClass = compact ? 'p-1.5' : 'p-2.5';
  const labelClass = compact ? 'text-[8px]' : 'text-[10px]';
  const valueClass = compact ? 'text-sm' : 'text-xl';
  const unitClass = compact ? 'text-[8px]' : 'text-[10px]';
  const rowHeightClass = compact ? 'h-5' : 'h-8';

  // Track the last 40 ticks for the graphs
  const [history, setHistory] = useState({
    cpu: Array(40).fill(0),
    gpu: Array(40).fill(0),
    ram: Array(40).fill(0),
    storage: Array(40).fill(0)
  });

  useEffect(() => {
    if (!compute) return;
    setHistory(prev => ({
      cpu: [...prev.cpu.slice(1), compute.cpuUsage],
      gpu: [...prev.gpu.slice(1), compute.gpuUsage],
      ram: [...prev.ram.slice(1), compute.ramUsage],
      storage: [...prev.storage.slice(1), compute.storageUsage]
    }));
  }, [compute]);

  if (!compute) return null;

  return (
    <div className="glass-panel rounded-xl flex flex-col relative glow-border">
      {/* sim-panel like header */}
      <div className={`${headerPaddingClass} border-b border-border-color/30 shadow-sm flex justify-between items-center bg-black/40 shrink-0`}>
        <div className="flex items-center gap-2">
            <Cpu size={14} className="text-primary-color" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary-color">
            Compute / ASUS NUC 15
            </span>
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${contentClass}`}>
        
        {/* Core Ultra 9 */}
        <div className={`flex flex-col border border-white/5 bg-black/30 rounded-lg shadow-inner justify-between ${cardPaddingClass}`}>
          <div className="flex justify-between items-center mb-0.5 border-b border-white/5 pb-0.5">
            <span className={`${labelClass} font-mono text-white/50 tracking-widest uppercase`}>Core Ultra 9</span>
            <span className={`${labelClass} font-mono text-white`}>{compute.cpuTemp.toFixed(1)}°C</span>
          </div>
          <div className={`flex items-end justify-between mt-0.5 gap-1.5 ${rowHeightClass}`}>
            {/* mix-blend-screen removed: screen-blend against dark bg = no visual change, but costs a compositor layer */}
            <div className="flex-1 h-full opacity-80">
                <Sparkline data={history.cpu} max={100} />
            </div>
            <span className={`${valueClass} font-mono text-white leading-none tracking-tighter`}>
                {compute.cpuUsage.toFixed(0)}<span className={`${unitClass} text-gray-500`}>%</span>
            </span>
          </div>
        </div>

        {/* RTX5080 */}
        <div className={`flex flex-col border border-white/5 bg-black/30 rounded-lg shadow-inner justify-between ${cardPaddingClass}`}>
          <div className="flex justify-between items-center mb-0.5 border-b border-white/5 pb-0.5">
            <span className={`${labelClass} font-mono text-white/50 tracking-widest uppercase`}>RTX5080 GPU</span>
            <span className={`${labelClass} font-mono text-white`}>{compute.gpuTemp.toFixed(1)}°C</span>
          </div>
          <div className={`flex items-end justify-between mt-0.5 gap-1.5 ${rowHeightClass}`}>
            <div className="flex-1 h-full opacity-80">
                <Sparkline data={history.gpu} max={100} />
            </div>
            <span className={`${valueClass} font-mono text-white leading-none tracking-tighter`}>
                {compute.gpuUsage.toFixed(0)}<span className={`${unitClass} text-gray-500`}>%</span>
            </span>
          </div>
        </div>

        {/* RAM */}
        <div className={`flex flex-col border border-white/5 bg-black/30 rounded-lg shadow-inner justify-between ${cardPaddingClass}`}>
          <div className="flex justify-between items-center mb-0.5 border-b border-white/5 pb-0.5">
            <span className={`${labelClass} font-mono text-white/50 tracking-widest uppercase`}>SYS RAM (32GB)</span>
          </div>
          <div className={`flex items-end justify-between mt-0.5 gap-1.5 ${rowHeightClass}`}>
            <div className="flex-1 h-full opacity-80">
                <Sparkline data={history.ram} max={32} />
            </div>
            <span className={`${valueClass} font-mono text-white leading-none tracking-tighter`}>
                {compute.ramUsage.toFixed(1)}<span className={`${unitClass} text-gray-500`}>GB</span>
            </span>
          </div>
        </div>

        {/* Storage */}
        <div className={`flex flex-col border border-white/5 bg-black/30 rounded-lg shadow-inner justify-between ${cardPaddingClass}`}>
          <div className="flex justify-between items-center mb-0.5 border-b border-white/5 pb-0.5">
            <span className={`${labelClass} font-mono text-white/50 tracking-widest uppercase`}>NVMe (2TB)</span>
          </div>
          <div className={`flex items-end justify-between mt-0.5 gap-1.5 ${rowHeightClass}`}>
            <div className="flex-1 h-full opacity-80">
                <Sparkline data={history.storage} max={2} color="#3b82f6" />
            </div>
            <span className={`${valueClass} font-mono text-white leading-none tracking-tighter`}>
                {compute.storageUsage.toFixed(2)}<span className={`${unitClass} text-gray-500`}>TB</span>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ComputeStatus;
