import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Camera, PackageCheck, Send, ShieldCheck } from 'lucide-react';
import { useROS } from '../../context/ROSContext';
import ROS_COMMANDS from '../../config/rosCommands';
import type { ArmPresetCommand } from '../../config/rosCommands';

const PRESETS: Array<{ preset: ArmPresetCommand['preset']; label: string; icon: React.ElementType }> = [
  { preset: 'stow', label: 'Stow', icon: ShieldCheck },
  { preset: 'deploy', label: 'Deploy', icon: Bot },
  { preset: 'sample', label: 'Sample Pose', icon: PackageCheck },
  { preset: 'camera', label: 'Camera Pose', icon: Camera },
];

const ArmControls: React.FC = () => {
  const { state, publishCommand, connectionStatus } = useROS();
  const joints = state.arm?.joints ?? [];
  const [targets, setTargets] = useState<Record<string, number>>({});

  useEffect(() => {
    setTargets((prev) => Object.fromEntries(joints.map((joint) => [joint.id, prev[joint.id] ?? joint.angle])));
  }, [joints]);

  const jointPayload = useMemo(
    () => joints.map((joint) => ({ id: joint.id, angle: targets[joint.id] ?? joint.angle })),
    [joints, targets],
  );

  const syncTargets = () => setTargets(Object.fromEntries(joints.map((joint) => [joint.id, joint.angle])));

  return (
    <div className="glass-panel rounded-xl flex flex-col glow-border overflow-hidden">
      <div className="px-5 py-3 border-b border-border-color/30 bg-black/40 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary-color">Manipulator Controls</div>
          <div className="text-[9px] font-mono text-white/30">Topic: {ROS_COMMANDS.armJointTargets.topic}</div>
        </div>
        <div className={`text-[9px] font-mono px-2 py-1 rounded border uppercase tracking-widest ${connectionStatus === 'connected' ? 'border-green-500/40 bg-green-900/20 text-green-400' : 'border-red-500/30 bg-red-900/20 text-red-400'}`}>
          {connectionStatus === 'connected' ? 'ready' : 'offline'}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map(({ preset, label, icon: Icon }) => (
            <button
              key={preset}
              onClick={() => publishCommand('armPreset', { preset, source: 'arm-ops' })}
              className="rounded-lg border border-white/10 bg-black/40 hover:border-primary-color/50 hover:bg-primary-color/10 p-3 text-left transition-all"
            >
              <div className="flex items-center gap-2 text-primary-color mb-1"><Icon size={14} /><span className="text-[10px] font-mono uppercase tracking-[0.15em]">{label}</span></div>
              <div className="text-[10px] text-white/35">Preset pose publish</div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-white/35">
          <span>Joint targets</span>
          <button onClick={syncTargets} className="text-primary-color hover:text-white transition-colors">sync live</button>
        </div>

        <div className="flex flex-col gap-3">
          {joints.map((joint) => (
            <div key={joint.id} className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="flex items-center justify-between mb-2 text-[10px] font-mono uppercase tracking-widest">
                <span className="text-white/45">{joint.id}</span>
                <span className="text-primary-color">{(targets[joint.id] ?? joint.angle).toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={targets[joint.id] ?? joint.angle}
                onChange={(e) => setTargets((prev) => ({ ...prev, [joint.id]: Number(e.target.value) }))}
                className="w-full accent-[#fe9c3d]"
              />
              <div className="flex justify-between text-[10px] font-mono text-white/30 mt-2">
                <span>live {joint.angle.toFixed(1)}°</span>
                <span>{joint.temp.toFixed(1)}°C</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => publishCommand('armJointTargets', { joints: jointPayload, source: 'arm-ops' })}
          className="w-full rounded-lg border border-primary-color/40 bg-primary-color/15 hover:bg-primary-color/25 text-primary-color p-3 flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] transition-all"
        >
          <Send size={14} /> Send All Targets
        </button>
      </div>
    </div>
  );
};

export default ArmControls;