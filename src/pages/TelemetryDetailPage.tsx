import React from 'react';
import { useROS } from '../context/ROSContext';
import { useMission } from '../context/MissionContext';
import TelemetryReadout from '../components/telemetry/TelemetryReadout';
import AttitudeCombined from '../components/telemetry/AttitudeCombined';
import ODriveStatus from '../components/telemetry/ODriveStatus';
import NetworkStatus from '../components/telemetry/NetworkStatus';
import ArmStatus from '../components/telemetry/ArmStatus';
import DrillStatus from '../components/telemetry/DrillStatus';
import SciencePayload from '../components/telemetry/SciencePayload';
import EnvironmentSensors from '../components/telemetry/EnvironmentSensors';
import MapView from '../components/media/MapView';
import MissionChecklistModal from '../components/telemetry/MissionChecklistModal';
import { Play, Square } from 'lucide-react';

const TelemetryDetailPage: React.FC = () => {
  const { state } = useROS();
  const { isMissionActive, startMission, stopMission } = useMission();
  const [isChecklistOpen, setIsChecklistOpen] = React.useState(false);

  const health = [
    { label: 'Battery', value: `${state.telemetry.batteryLevel.toFixed(0)}%`, status: state.telemetry.batteryLevel > 50 ? 'nominal' : state.telemetry.batteryLevel > 25 ? 'watch' : 'critical' },
    { label: 'Core Temp', value: `${state.telemetry.temperature.toFixed(1)}°C`, status: state.telemetry.temperature < 45 ? 'nominal' : state.telemetry.temperature < 60 ? 'watch' : 'critical' },
    { label: 'Tilt', value: `${state.orientation.tilt.toFixed(1)}°`, status: state.orientation.tilt < 18 ? 'nominal' : state.orientation.tilt < 28 ? 'watch' : 'critical' },
    { label: 'Signal', value: `${(state.network?.signalStrength ?? -100).toFixed(0)} dBm`, status: (state.network?.signalStrength ?? -100) > -65 ? 'nominal' : (state.network?.signalStrength ?? -100) > -80 ? 'watch' : 'critical' },
  ] as const;
  const colorFor = (status: string) => status === 'nominal' ? 'text-green-400 border-green-500/30 bg-green-900/15' : status === 'watch' ? 'text-orange-400 border-orange-500/30 bg-orange-900/15' : 'text-red-400 border-red-500/30 bg-red-900/15';

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full flex flex-col gap-4">
        <div className="shrink-0 glass-panel rounded-xl p-4 glow-border">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-lg font-mono uppercase tracking-[0.2em] text-white">Detailed Telemetry</div>
              <div className="text-sm text-white/45 mt-1">Operational envelope check for power, orientation, communications, drill, arm, and science systems.</div>
            </div>
            
            <div className="flex items-center gap-3">
              {isMissionActive ? (
                <button
                  onClick={stopMission}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 font-mono text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse"
                >
                  <Square size={14} fill="currentColor" />
                  Stop Mission
                </button>
              ) : (
                <button
                  onClick={() => setIsChecklistOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-color/10 border border-primary-color/50 rounded-lg text-primary-color font-mono text-xs uppercase tracking-widest hover:bg-primary-color/20 transition-all shadow-[0_0_15px_rgba(254,156,61,0.2)]"
                >
                  <Play size={14} fill="currentColor" />
                  Start Mission
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
            {health.map((item) => (
              <div key={item.label} className={`rounded-lg border p-3 ${colorFor(item.status)}`}>
                <div className="text-[10px] font-mono uppercase tracking-[0.15em] opacity-75">{item.label}</div>
                <div className="text-2xl font-mono mt-1">{item.value}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest mt-2">{item.status}</div>
              </div>
            ))}
          </div>
        </div>

        <MissionChecklistModal 
          isOpen={isChecklistOpen}
          onClose={() => setIsChecklistOpen(false)}
          onConfirm={(checklist) => {
            setIsChecklistOpen(false);
            startMission(checklist);
          }}
        />

        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar">
          <div className="min-h-0 flex flex-col gap-4">
            <div className="shrink-0"><TelemetryReadout /></div>
            <div className="shrink-0 h-[300px]"><MapView /></div>
            <div className="shrink-0"><NetworkStatus /></div>
          </div>

          <div className="min-h-0 flex flex-col gap-4">
            <div className="shrink-0"><AttitudeCombined /></div>
            <div className="shrink-0"><ODriveStatus /></div>
            <div className="shrink-0"><ArmStatus /></div>
          </div>

          <div className="min-h-0 flex flex-col gap-4">
            <div className="shrink-0"><DrillStatus /></div>
            <div className="shrink-0"><SciencePayload /></div>
            <div className="shrink-0"><EnvironmentSensors /></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelemetryDetailPage;