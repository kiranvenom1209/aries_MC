import React from 'react';
import { useROS } from '../context/ROSContext';
import HistoryChart from '../components/telemetry/HistoryChart';
import ComputeStatus from '../components/telemetry/ComputeStatus';
import ODriveStatus from '../components/telemetry/ODriveStatus';

const ElectricalPage: React.FC = () => {
  const { state, history } = useROS();
  const batteryCurrent = state.batteryCells?.reduce((sum, cell) => sum + cell.current, 0) ?? 0;
  const cellDelta = state.batteryCells?.length ? Math.max(...state.batteryCells.map((cell) => cell.voltage)) - Math.min(...state.batteryCells.map((cell) => cell.voltage)) : 0;
  const estimatedLoad = state.wheels?.reduce((sum, wheel) => sum + wheel.current * wheel.voltage, 0) ?? 0;

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full flex flex-col gap-4">
        <div className="shrink-0 glass-panel rounded-xl p-4 glow-border">
          <div className="text-lg font-mono uppercase tracking-[0.2em] text-white">Electrical + Power Graphs</div>
          <div className="text-sm text-white/45 mt-1">Battery pack stability, drivetrain electrical load, and onboard compute power behavior.</div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mt-4 text-[10px] font-mono uppercase tracking-widest">
            <div className="rounded-lg border border-white/10 bg-black/30 p-3"><span className="text-white/35 block mb-1">Pack Voltage</span><span className="text-xl text-white">{state.telemetry.batteryVoltage.toFixed(1)}V</span></div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-3"><span className="text-white/35 block mb-1">Pack Current</span><span className="text-xl text-primary-color">{batteryCurrent.toFixed(1)}A</span></div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-3"><span className="text-white/35 block mb-1">Cell Delta</span><span className="text-xl text-white">{cellDelta.toFixed(2)}V</span></div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-3"><span className="text-white/35 block mb-1">Drive Load</span><span className="text-xl text-white">{estimatedLoad.toFixed(0)}W</span></div>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4 overflow-y-auto custom-scrollbar">
          <div className="min-h-0 flex flex-col gap-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 shrink-0">
              <HistoryChart title="Battery Voltage" data={history.map((point) => point.batteryVoltage)} max={60} unit="V" />
              <HistoryChart title="Battery State of Charge" data={history.map((point) => point.batteryLevel)} max={100} unit="%" color="#22c55e" />
              <HistoryChart title="Battery Current" data={history.map((point) => point.batteryCurrent)} max={30} unit="A" color="#60a5fa" />
              <HistoryChart title="Drive Current" data={history.map((point) => point.wheelCurrent)} max={60} unit="A" color="#f97316" />
            </div>

            <div className="glass-panel rounded-xl p-4 glow-border shrink-0">
              <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-primary-color mb-3">Battery Cell Health</div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {state.batteryCells?.map((cell) => (
                  <div key={cell.id} className="rounded-lg border border-white/10 bg-black/30 p-3">
                    <div className="flex justify-between items-center mb-3"><span className="text-sm font-mono text-white">{cell.id}</span><span className="text-[10px] font-mono text-white/35">SOC {cell.soc.toFixed(0)}%</span></div>
                    <div className="space-y-1 text-[10px] font-mono text-white/55">
                      <div className="flex justify-between"><span>Voltage</span><span className="text-white">{cell.voltage.toFixed(2)}V</span></div>
                      <div className="flex justify-between"><span>Current</span><span className="text-white">{cell.current.toFixed(1)}A</span></div>
                      <div className="flex justify-between"><span>Temp</span><span className="text-white">{cell.temp.toFixed(1)}°C</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex flex-col gap-4">
            <div className="shrink-0"><ComputeStatus /></div>
            <div className="shrink-0"><ODriveStatus /></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElectricalPage;