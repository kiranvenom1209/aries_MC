import React from 'react';
import { useROS } from '../context/ROSContext';
import CameraGrid from '../components/media/CameraGrid';
import DrillStatus from '../components/telemetry/DrillStatus';
import SciencePayload from '../components/telemetry/SciencePayload';
import DrillControls from '../components/operations/DrillControls';

const DrillOpsPage: React.FC = () => {
  const { state } = useROS();
  const drillCamera = state.cameras.find((camera) => camera.name.toLowerCase().includes('drill')) ?? state.cameras[2];
  const feedList = drillCamera ? [drillCamera] : [];

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full flex flex-col gap-4">
        <div className="shrink-0 glass-panel rounded-xl p-4 glow-border">
          <div className="text-lg font-mono uppercase tracking-[0.2em] text-white">Drill Operations</div>
          <div className="text-sm text-white/45 mt-1">Single-screen drill camera, status, and command console for sampling operations.</div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mt-4 text-[10px] font-mono uppercase tracking-widest">
            <div className="rounded-lg border border-white/10 bg-black/30 p-3"><span className="text-white/35 block mb-1">Mode</span><span className="text-xl text-primary-color">{state.drill?.status ?? 'unknown'}</span></div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-3"><span className="text-white/35 block mb-1">Depth</span><span className="text-xl text-white">{state.drill?.drillDepth.toFixed(0) ?? 0} mm</span></div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-3"><span className="text-white/35 block mb-1">Actuator</span><span className="text-xl text-white">{state.drill?.actuatorPosition.toFixed(0) ?? 0} mm</span></div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-3"><span className="text-white/35 block mb-1">Camera</span><span className="text-xl text-white">{drillCamera?.id ?? 'n/a'}</span></div>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[1.25fr_0.95fr] gap-4 overflow-y-auto custom-scrollbar">
          <div className="min-h-[500px] h-full"><CameraGrid feeds={feedList} title="Drill Camera" /></div>
          <div className="min-h-0 flex flex-col gap-4">
            <div className="shrink-0"><DrillControls /></div>
            <div className="shrink-0"><DrillStatus /></div>
            <div className="shrink-0"><SciencePayload /></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrillOpsPage;