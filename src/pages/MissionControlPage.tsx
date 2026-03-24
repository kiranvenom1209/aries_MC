import React from 'react';
import TelemetryReadout from '../components/telemetry/TelemetryReadout';
import AttitudeCombined from '../components/telemetry/AttitudeCombined';
import ODriveStatus from '../components/telemetry/ODriveStatus';
import NetworkStatus from '../components/telemetry/NetworkStatus';
import ComputeStatus from '../components/telemetry/ComputeStatus';
import ArmStatus from '../components/telemetry/ArmStatus';
import DrillStatus from '../components/telemetry/DrillStatus';
import ScienceCompact from '../components/telemetry/ScienceCompact';
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
            {/* Column 1: Core Diagnostics (2/12) */}
            <div className="min-h-0 xl:col-span-2 flex flex-col gap-2 justify-start">
              <div className="min-h-[300px]"><TelemetryReadout /></div>
              <div className="h-[150px] shrink-0"><ComputeStatus compact /></div>
              <div className="h-[180px] shrink-0"><EnvironmentSensors /></div>
            </div>

            {/* Column 2: Exploration Status (2/12) */}
            <div className="min-h-0 xl:col-span-2 flex flex-col gap-2 justify-start">
              <div className="h-[180px] shrink-0"><NetworkStatus /></div>
              <div className="h-[340px] shrink-0"><ScienceCompact /></div>
              <div className="h-[340px] shrink-0"><DrillStatus /></div>
            </div>

            {/* Column 3: Primary Visuals (5/12) - The Main Focus */}
            <div className="min-h-0 xl:col-span-5 flex flex-col gap-2 justify-start">
              <div className="min-h-[480px] box-glow"><CameraGrid /></div>
              <div className="min-h-[320px]"><MapView /></div>
              <div className="h-[180px] shrink-0"><LiveLogs maxEntries={8} scrollable={false} /></div>
            </div>

            {/* Column 4: Primary Rover Telemetry (3/12) */}
            <div className="min-h-0 xl:col-span-3 flex flex-col gap-2 justify-start">
              <div className="min-h-[360px]"><AttitudeCombined layout="wide" /></div>
              <div className="h-[280px] shrink-0"><ODriveStatus compact /></div>
              <div className="h-[300px] shrink-0"><ArmStatus /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissionControlPage;