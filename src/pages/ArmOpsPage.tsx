import React from 'react';
import { useROS } from '../context/ROSContext';
import CameraGrid from '../components/media/CameraGrid';
import ArmStatus3D from '../components/telemetry/ArmStatus3D';
import ArmControls from '../components/operations/ArmControls';

const ArmOpsPage: React.FC = () => {
  const { state } = useROS();
  const armFeeds = state.cameras.filter((camera) => {
    const name = camera.name.toLowerCase();
    return name.includes('arm') || name.includes('fwd') || name.includes('360');
  });

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full flex flex-col gap-4">
        <div className="shrink-0 glass-panel rounded-xl p-4 glow-border">
          <div className="text-lg font-mono uppercase tracking-[0.2em] text-white">Robotic Arm</div>
          <div className="text-sm text-white/45 mt-1">Manipulator control station with arm cam, forward cam, 360 cam, and pose commands.</div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mt-4 text-[10px] font-mono uppercase tracking-widest">
            <div className="rounded-lg border border-white/10 bg-black/30 p-3"><span className="text-white/35 block mb-1">Status</span><span className="text-xl text-primary-color">{state.arm?.status ?? 'unknown'}</span></div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-3"><span className="text-white/35 block mb-1">Joints</span><span className="text-xl text-white">{state.arm?.joints.length ?? 0}</span></div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-3"><span className="text-white/35 block mb-1">Payload</span><span className="text-xl text-white">{state.arm?.payload.toFixed(2) ?? '0.00'} kg</span></div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-3"><span className="text-white/35 block mb-1">Feeds</span><span className="text-xl text-white">{armFeeds.length}</span></div>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4 overflow-y-auto custom-scrollbar">
          <div className="min-h-0 flex flex-col gap-4">
            <div className="shrink-0 h-[560px]"><CameraGrid feeds={armFeeds.length ? armFeeds : state.cameras} title="Manipulator Visual Suite" /></div>
            <div className="shrink-0"><ArmStatus3D /></div>
          </div>
          <div className="min-h-0">
            <div className="shrink-0"><ArmControls /></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArmOpsPage;