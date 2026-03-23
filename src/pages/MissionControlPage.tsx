import React from 'react';
import TelemetryReadout from '../components/telemetry/TelemetryReadout';
import AttitudeCombined from '../components/telemetry/AttitudeCombined';
import ODriveStatus from '../components/telemetry/ODriveStatus';
import NetworkStatus from '../components/telemetry/NetworkStatus';
import ComputeStatus from '../components/telemetry/ComputeStatus';
import ArmStatus from '../components/telemetry/ArmStatus';
import DrillStatus from '../components/telemetry/DrillStatus';
import ScienceCompact from '../components/telemetry/ScienceCompact';
import OrientationCompact from '../components/telemetry/OrientationCompact';
import EnvironmentSensors from '../components/telemetry/EnvironmentSensors';
import LiveLogs from '../components/telemetry/LiveLogs';
import CameraGrid from '../components/media/CameraGrid';
import MapView from '../components/media/MapView';

const MissionControlPage: React.FC = () => {
  return (
    <div className="h-full overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
          <div className="grid h-full min-h-0 grid-cols-1 gap-2 xl:grid-cols-12 xl:pr-0">
            <div className="min-h-[1200px] xl:min-h-0 xl:col-span-3">
              <div className="grid h-full min-h-0 grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-2 xl:grid-rows-3">
                <div className="min-h-[240px] xl:min-h-0"><TelemetryReadout /></div>
                <div className="min-h-[180px] xl:min-h-0"><NetworkStatus /></div>
                <div className="min-h-[180px] xl:min-h-0"><ComputeStatus compact /></div>
                <div className="min-h-[200px] xl:min-h-0"><EnvironmentSensors /></div>
                <div className="min-h-[200px] xl:min-h-0"><OrientationCompact /></div>
                <div className="min-h-[200px] xl:min-h-0"><ScienceCompact /></div>
              </div>
            </div>

            <div className="min-h-[980px] xl:min-h-0 xl:col-span-6">
              <div className="grid h-full min-h-0 grid-cols-1 gap-2 xl:grid-rows-[minmax(0,1.62fr)_minmax(0,1.08fr)_minmax(0,0.58fr)]">
                <div className="min-h-[420px] xl:min-h-0"><CameraGrid /></div>
                <div className="min-h-[320px] xl:min-h-0"><MapView /></div>
                <div className="min-h-[200px] xl:min-h-0"><LiveLogs maxEntries={7} scrollable={false} /></div>
              </div>
            </div>

            <div className="min-h-[980px] xl:min-h-0 xl:col-span-3">
              <div className="grid h-full min-h-0 grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-2 xl:grid-rows-[minmax(0,1.18fr)_minmax(0,0.95fr)_minmax(0,1fr)]">
                <div className="min-h-[320px] md:col-span-2 xl:min-h-0"><AttitudeCombined layout="wide" /></div>
                <div className="min-h-[260px] md:col-span-2 xl:min-h-0"><ODriveStatus compact /></div>
                <div className="min-h-[280px] xl:min-h-0"><ArmStatus /></div>
                <div className="min-h-[320px] xl:min-h-0"><DrillStatus /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissionControlPage;