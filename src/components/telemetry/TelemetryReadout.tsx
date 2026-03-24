import { useROS } from '../../context/ROSContext';
import { useTelemetryState } from '../../context/TelemetryContext';
import { Battery, Wifi, WifiOff, Thermometer, Activity } from 'lucide-react';

const TelemetryReadout: React.FC = () => {
  const { connectionStatus } = useROS();
  const { state } = useTelemetryState();
  const isConnected = connectionStatus === 'connected';
  const { telemetry } = state;
  // batteryCells accessed via state.batteryCells in the JSX below

  return (
    <div className="glass-panel rounded-xl flex flex-col relative glow-border bg-black/50 overflow-hidden">
      {/* sim-panel like header */}
      <div className="px-5 py-3 border-b border-border-color/30 shadow-sm flex justify-between items-center bg-black/40 shrink-0">
        <div className="flex items-center gap-2">
            <Activity size={14} className="text-primary-color" />
            <span className="text-[10px] uppercase text-primary-color font-bold tracking-[0.15em]">
            System Diagnostics
            </span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Speed */}
        <div className="flex flex-col gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/40">
              <Activity size={14} />
              <span className="text-[10px] uppercase tracking-widest font-mono">Velocity</span>
            </div>
            <div className="text-2xl font-mono text-white font-bold tracking-tighter">
              {telemetry.speed.toFixed(2)} <span className="text-[12px] text-white/40 font-normal ml-1">m/s</span>
            </div>
          </div>
          {/* Speed bar */}
          <div className="h-2 w-full bg-black/60 rounded-full border border-white/10 overflow-hidden">
            <div
              className="h-full w-full rounded-full bg-primary-color shadow-[0_0_10px_rgba(254,156,61,0.6)] origin-left"
              style={{
                transform: `scaleX(${Math.min((telemetry.speed / 5), 1)})`,
                transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />
          </div>
        </div>

        {/* Battery Pack */}
        <div className="flex flex-col gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/40">
              <Battery size={14} className={telemetry.batteryLevel < 20 ? 'text-red-500' : 'text-green-500'} />
              <span className="text-[10px] uppercase tracking-widest font-mono">Main Power Pack</span>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-mono text-white font-bold tracking-tighter">
                {telemetry.batteryLevel.toFixed(0)}%
              </div>
              <div className="text-[11px] font-mono text-white/30">
                {telemetry.batteryVoltage.toFixed(1)}V
              </div>
            </div>
          </div>
          {/* Pack-level bar */}
          <div className="h-1.5 w-full bg-black/50 rounded-full border border-white/10">
            <div
              className={`h-full w-full rounded-full origin-left ${
                telemetry.batteryLevel < 20
                  ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)] animate-pulse'
                  : telemetry.batteryLevel < 50
                  ? 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]'
                  : 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]'
              }`}
              style={{
                transform: `scaleX(${telemetry.batteryLevel / 100})`,
                transition: 'transform 0.5s ease',
                willChange: 'transform',
              }}
            />
          </div>
          {/* Individual cell voltages — 4x 12V LiFePO4 30Ah */}
          {state.batteryCells && (
            <div className="grid grid-cols-4 gap-0.5 mt-0.5">
              {state.batteryCells.map((cell) => {
                const socPct = cell.soc / 100;
                const cellColor = cell.soc < 20 ? 'bg-red-500' : cell.soc < 50 ? 'bg-orange-500' : 'bg-green-500';
                return (
                  <div key={cell.id} className="flex flex-col items-center gap-0 border border-white/5 bg-black/30 rounded px-1 py-0.5">
                    <span className="text-[7px] font-mono text-white/30 uppercase">{cell.id}</span>
                    <div className="w-full h-4 bg-black/50 rounded border border-white/10 flex flex-col-reverse">
                      <div
                        className={`w-full ${cellColor} origin-bottom`}
                        style={{ height: `${socPct * 100}%`, transition: 'height 0.5s ease' }}
                      />
                    </div>
                    <span className="text-[7px] font-mono text-white tabular-nums leading-tight">{cell.voltage.toFixed(1)}V</span>
                    <span className={`text-[6px] font-mono tabular-nums leading-tight ${cell.temp > 45 ? 'text-orange-400' : 'text-white/30'}`}>{cell.temp.toFixed(0)}°C</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Temperature */}
        <div className="flex flex-col gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/40">
              <Thermometer size={14} className={telemetry.temperature > 40 ? 'text-red-500' : 'text-orange-400'} />
              <span className="text-[10px] uppercase tracking-widest font-mono">Thermal State</span>
            </div>
            <div className="text-2xl font-mono text-white font-bold tracking-tighter">
              {telemetry.temperature.toFixed(1)}°C
            </div>
          </div>
          {/* Temp bar — max 80°C | scaleX avoids layout reflow */}
          <div className="h-1 w-full bg-black/50 rounded-full border border-white/10 overflow-hidden">
            <div
              className={`h-full w-full rounded-full origin-left ${
                telemetry.temperature > 60
                  ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)]'
                  : telemetry.temperature > 40
                  ? 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]'
                  : 'bg-primary-color shadow-[0_0_6px_rgba(254,156,61,0.7)]'
              }`}
              style={{
                transform: `scaleX(${Math.min(telemetry.temperature / 80, 1)})`,
                transition: 'transform 0.3s ease',
                willChange: 'transform',
              }}
            />
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between bg-black/40 px-2 py-1 rounded-lg border border-gray-800">
          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <Wifi size={14} className="text-primary-color animate-pulse" />
            ) : (
              <WifiOff size={14} className="text-red-500" />
            )}
            <span className="text-[10px] uppercase tracking-wider text-gray-300">
              ROS COMMS
            </span>
          </div>
          <div className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isConnected ? 'bg-primary-color/20 text-white' : 'bg-red-500/20 text-red-500'}`}>
            {isConnected ? 'LINK_ACTIVE' : 'OFFLINE'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelemetryReadout;
