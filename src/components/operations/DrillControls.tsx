import React, { useState } from 'react';
import { ArrowDown, ArrowUp, FlaskConical, Play, RotateCcw, Square } from 'lucide-react';
import { useROS } from '../../context/ROSContext';
import ROS_COMMANDS from '../../config/rosCommands';
import type { DrillActionCommand } from '../../config/rosCommands';

const DRILL_ACTIONS: Array<{ action: DrillActionCommand['action']; label: string; icon: React.ElementType }> = [
  { action: 'start', label: 'Start Drill', icon: Play },
  { action: 'stop', label: 'Stop', icon: Square },
  { action: 'extend', label: 'Extend', icon: ArrowDown },
  { action: 'retract', label: 'Retract', icon: ArrowUp },
  { action: 'home', label: 'Home', icon: RotateCcw },
  { action: 'sample', label: 'Collect Sample', icon: FlaskConical },
];

const DrillControls: React.FC = () => {
  const { publishCommand, connectionStatus } = useROS();
  const [power, setPower] = useState(55);
  const [lastAction, setLastAction] = useState<string>('idle');

  const sendAction = (action: DrillActionCommand['action']) => {
    const ok = publishCommand('drillAction', { action, power, source: 'drill-ops' });
    if (ok) setLastAction(action);
  };

  return (
    <div className="glass-panel rounded-xl flex flex-col glow-border overflow-hidden">
      <div className="px-5 py-3 border-b border-border-color/30 bg-black/40 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary-color">Drill Controls</div>
          <div className="text-[9px] font-mono text-white/30">Topic: {ROS_COMMANDS.drillAction.topic}</div>
        </div>
        <div className={`text-[9px] font-mono px-2 py-1 rounded border uppercase tracking-widest ${connectionStatus === 'connected' ? 'border-green-500/40 bg-green-900/20 text-green-400' : 'border-red-500/30 bg-red-900/20 text-red-400'}`}>
          {connectionStatus === 'connected' ? 'link ready' : 'ros offline'}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="border border-white/10 rounded-lg bg-black/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Command Power</span>
            <span className="text-lg font-mono text-white">{power}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={power}
            onChange={(e) => setPower(Number(e.target.value))}
            className="w-full accent-[#fe9c3d]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {DRILL_ACTIONS.map(({ action, label, icon: Icon }) => (
            <button
              key={action}
              onClick={() => sendAction(action)}
              className="rounded-lg border border-white/10 bg-black/40 hover:border-primary-color/50 hover:bg-primary-color/10 p-3 text-left transition-all"
            >
              <div className="flex items-center gap-2 mb-2 text-primary-color">
                <Icon size={14} />
                <span className="text-[10px] font-mono uppercase tracking-[0.15em]">{label}</span>
              </div>
              <div className="text-[10px] text-white/35">Send `{action}` to rover drill controller</div>
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center justify-between">
          <span>Last command</span>
          <span className="text-primary-color">{lastAction}</span>
        </div>
      </div>
    </div>
  );
};

export default DrillControls;