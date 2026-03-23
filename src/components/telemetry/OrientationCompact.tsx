import React from 'react';
import { Compass, Navigation, MapPin } from 'lucide-react';
import { useTelemetryState } from '../../context/TelemetryContext';

const OrientationCompact: React.FC = () => {
  const { state } = useTelemetryState();
  const { orientation, location } = state;

  return (
    <div className="glass-panel rounded-xl flex flex-col relative glow-border">
      <div className="px-3 py-1.5 border-b border-border-color/30 shadow-sm flex justify-between items-center bg-black/40 shrink-0">
        <div className="flex items-center gap-1.5">
          <Compass size={12} className="text-primary-color" />
          <span className="text-[10px] uppercase text-primary-color font-bold tracking-[0.15em]">
            Orientation
          </span>
        </div>
        <div className="flex items-center gap-1 text-[9px] font-mono text-white/30 uppercase tracking-widest">
          <Navigation size={9} className="text-primary-color/60" />
          {orientation.heading.toFixed(0)}°
        </div>
      </div>

      <div className="p-2 flex flex-col gap-1.5">
        {/* Heading large */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-1.5">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Navigation size={12} />
            <span className="text-[10px] uppercase tracking-wider">Heading</span>
          </div>
          <span className="text-lg font-mono font-bold text-white tabular-nums">
            {orientation.heading.toFixed(1)}<span className="text-[10px] text-white/40">°</span>
          </span>
        </div>

        {/* Pitch / Roll / Tilt row */}
        <div className="grid grid-cols-3 gap-1.5 text-center">
          {[
            { label: 'Pitch', value: orientation.pitch, warn: 15 },
            { label: 'Roll', value: orientation.roll, warn: 12 },
            { label: 'Tilt', value: orientation.tilt, warn: 20 },
          ].map(({ label, value, warn }) => {
            const abs = Math.abs(value);
            const color = abs > warn ? 'text-red-400' : abs > warn * 0.6 ? 'text-yellow-400' : 'text-white';
            return (
              <div key={label} className="border border-white/5 bg-black/30 rounded-md px-1 py-1">
                <div className="text-[8px] font-mono text-white/30 uppercase tracking-widest">{label}</div>
                <div className={`text-sm font-mono font-bold tabular-nums ${color}`}>
                  {value.toFixed(1)}<span className="text-[8px] text-white/30">°</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Location */}
        <div className="border border-white/5 bg-black/30 rounded-md px-2 py-1.5">
          <div className="flex items-center gap-1 mb-1">
            <MapPin size={9} className="text-primary-color/60" />
            <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Position</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-center">
            {['x', 'y', 'z'].map((axis) => (
              <div key={axis}>
                <span className="text-[8px] font-mono text-white/20 uppercase">{axis}</span>
                <div className="text-[11px] font-mono text-white tabular-nums">
                  {location[axis as keyof typeof location].toFixed(2)}<span className="text-[8px] text-white/20">m</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrientationCompact;

