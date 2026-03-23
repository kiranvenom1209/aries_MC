import React, { useId } from 'react';

interface HistoryChartProps {
  title: string;
  data: number[];
  max: number;
  min?: number;
  unit?: string;
  color?: string;
}

const HistoryChart: React.FC<HistoryChartProps> = ({
  title,
  data,
  max,
  min = 0,
  unit = '',
  color = '#fe9c3d',
}) => {
  const gradientId = useId().replace(/[:]/g, '');
  const width = 320;
  const height = 112;
  const safeData = data.length > 0 ? data : [0];
  const current = safeData[safeData.length - 1] ?? 0;
  const range = Math.max(max - min, 1);

  const points = safeData
    .map((value, index) => {
      const x = (index / Math.max(safeData.length - 1, 1)) * width;
      const normalized = (Math.max(min, Math.min(max, value)) - min) / range;
      const y = height - normalized * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="glass-panel rounded-xl p-4 glow-border flex flex-col gap-3 h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">{title}</div>
          <div className="text-[11px] font-mono text-primary-color/80">Last {safeData.length}s</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono text-white tabular-nums">{current.toFixed(1)}</div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/30">{unit || 'value'}</div>
        </div>
      </div>

      <div className="relative flex-1 min-h-[120px] rounded-lg border border-white/10 bg-black/40 p-2">
        <div className="absolute inset-2 grid grid-rows-4 pointer-events-none opacity-20">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="border-t border-white/20 last:border-t-0" />
          ))}
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full relative z-10">
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#${gradientId})`} />
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-white/25">
        <span>{min.toFixed(0)}{unit}</span>
        <span>live trend</span>
        <span>{max.toFixed(0)}{unit}</span>
      </div>
    </div>
  );
};

export default HistoryChart;