import React from 'react';
import TelemetryReadout from '../components/telemetry/TelemetryReadout';
import NetworkStatus from '../components/telemetry/NetworkStatus';
import AttitudeCombined from '../components/telemetry/AttitudeCombined';
import ODriveStatus from '../components/telemetry/ODriveStatus';
import DriveControl from '../components/telemetry/DriveControl';
import CameraGrid from '../components/media/CameraGrid';
import MapView from '../components/media/MapView';

const ManualDrivePage: React.FC = () => {
  return (
    <div className="h-full overflow-hidden">
      <div className="h-full flex flex-col gap-4">
        <div className="shrink-0 glass-panel rounded-xl p-4 glow-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-lg font-mono uppercase tracking-[0.2em] text-white">Manual Driving Console</div>
            <div className="text-sm text-white/45">Dedicated teleoperation screen with focused driving cameras, drive vectors, and navigation context while Mission Control stays on the main display.</div>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-[0.15em]">
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300">Teleop Station</div>
            <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white/55">Arrow keys enabled</div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-y-auto custom-scrollbar">
          <div className="min-h-0 flex flex-col pr-1 lg:col-span-3">
            <div className="shrink-0 mb-4"><TelemetryReadout /></div>
            <div className="shrink-0 mb-4"><NetworkStatus /></div>
            <div className="shrink-0 h-[320px]"><MapView /></div>
          </div>

          <div className="min-h-0 flex flex-col pr-1 lg:col-span-6">
            <div className="shrink-0 mb-4"><CameraGrid isManualMode title="Driving Cameras" /></div>
            <div className="shrink-0"><DriveControl /></div>
          </div>

          <div className="min-h-0 flex flex-col pr-1 lg:col-span-3">
            <div className="shrink-0 mb-4"><AttitudeCombined /></div>
            <div className="shrink-0"><ODriveStatus /></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualDrivePage;