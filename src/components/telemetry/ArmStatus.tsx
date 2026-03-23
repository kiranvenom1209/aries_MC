import React from 'react';
import { GitMerge } from 'lucide-react';
import { useTelemetryState } from '../../context/TelemetryContext';
import ArmVisualizer3D from './ArmVisualizer3D';

const ArmStatus: React.FC = () => {
  const { state } = useTelemetryState();
  const arm = state.arm;

  if (!arm) return null;

  return (
    <div className="glass-panel rounded-xl flex flex-col h-full relative glow-border">
      {/* sim-panel like header */}
      <div className="px-5 py-3 border-b border-border-color/30 shadow-sm flex justify-between items-center bg-black/40 shrink-0">
        <div className="flex items-center gap-2">
            <GitMerge size={14} className="text-primary-color" />
            <span className="text-[11px] uppercase text-primary-color font-bold tracking-[0.15em]">
            Manipulator / Igus Rebel 6
            </span>
        </div>
        <div className="text-[10px] font-mono text-white/50 tracking-widest uppercase">
          Status: <span className={arm.status === 'moving' ? 'text-white' : arm.status === 'fault' ? 'text-red-500 animate-pulse' : 'text-green-500'}>{arm.status}</span>
        </div>
      </div>

      <div className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
        {/* 3D Visualizer */}
        <div className="h-[200px] shrink-0">
            <ArmVisualizer3D />
        </div>

        <div className="flex justify-between bg-black/30 p-3 rounded-lg border border-white/5 shadow-inner">
            <span className="text-[10px] font-mono text-white/50 tracking-widest uppercase">Payload TCP</span>
           <span className="text-[10px] font-mono text-white">{arm.payload.toFixed(2)} KG</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {arm.joints.map((joint: any) => (
            <div key={joint.id} className="flex flex-col gap-1 border border-white/5 bg-black/30 p-2.5 rounded-lg shadow-inner">
              <div className="flex justify-between items-center border-b border-white/5 pb-1">
                <span className="text-[10px] font-mono text-white/50">{joint.id}</span>
                <span className="text-xs font-mono text-white">{joint.angle.toFixed(1)}°</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-[9px] font-mono text-white/30 uppercase">Temp</span>
                <span className={`text-[9px] font-mono ${joint.temp > 60 ? 'text-red-500' : 'text-gray-400'}`}>{joint.temp.toFixed(1)}°C</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArmStatus;
