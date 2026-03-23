import React from 'react';
import { Wifi, ArrowDown, ArrowUp } from 'lucide-react';
import { useTelemetryState } from '../../context/TelemetryContext';

const NetworkStatus: React.FC = () => {
  const { state } = useTelemetryState();
  const network = state.network;

  if (!network) return null;

  return (
    <div className="glass-panel rounded-xl flex flex-col relative overflow-hidden glow-border">
      {/* sim-panel like header */}
      <div className="px-3 py-2 border-b border-border-color/30 shadow-sm flex justify-between items-center bg-black/40 shrink-0">
        <div className="flex items-center gap-1.5">
            <Wifi size={12} className="text-primary-color" />
            <span className="text-[10px] uppercase text-primary-color font-bold tracking-[0.15em]">
            Comms / Ubiquiti Omni
            </span>
        </div>
      </div>

      <div className="p-2">

        <div className="grid grid-cols-2 gap-1.5">
            {/* Signal */}
            <div className="col-span-2 border border-white/5 bg-black/30 rounded-lg p-2 flex justify-between items-center shadow-inner">
                <div className="flex flex-col gap-1 flex-1 mr-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-white/50 tracking-widest uppercase">Signal Strength</span>
                      <span className={`text-sm font-mono ${network.signalStrength > -60 ? 'text-green-500' : network.signalStrength > -80 ? 'text-orange-500' : 'text-red-500'}`}>
                        {network.signalStrength.toFixed(0)} <span className="text-[9px] text-gray-500">dBm</span>
                      </span>
                    </div>
                    {/* Segmented signal bars */}
                    {(() => {
                      const pct = Math.max(0, Math.min(1, (network.signalStrength + 100) / 60));
                      const filled = Math.round(pct * 12);
                      return (
                        <div className="flex gap-0.5 items-end h-3.5">
                          {Array.from({ length: 12 }, (_, i) => {
                            const active = i < filled;
                            const color = i < 4 ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.9)]'
                                        : i < 8 ? 'bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.9)]'
                                        : 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.9)]';
                            return (
                              <div
                                key={i}
                                className={`flex-1 rounded-[2px] transition-all duration-300 ${active ? color : 'bg-white/10'}`}
                                style={{ height: `${30 + i * 6}%` }}
                              />
                            );
                          })}
                        </div>
                      );
                    })()}
                </div>
                <Wifi size={22} className={`opacity-70 shrink-0 ${network.signalStrength > -60 ? 'text-green-500' : network.signalStrength > -80 ? 'text-orange-500' : 'text-red-500'}`} />
            </div>

            {/* Speeds */}
            <div className="border border-white/5 bg-black/30 rounded-lg p-2 flex flex-col justify-between shadow-inner">
                <div className="flex items-center gap-1">
                    <ArrowUp size={10} className="text-primary-color" />
                    <span className="text-[9px] font-mono text-white/50 tracking-widest uppercase">Uplink</span>
                </div>
                <span className="text-sm font-mono text-white text-right mt-0.5">{network.uplink.toFixed(1)} <span className="text-[9px] text-gray-500">Mbps</span></span>
            </div>

            <div className="border border-white/5 bg-black/30 rounded-lg p-2 flex flex-col justify-between shadow-inner">
                <div className="flex items-center gap-1">
                    <ArrowDown size={10} className="text-primary-color" />
                    <span className="text-[9px] font-mono text-white/50 tracking-widest uppercase">Downlink</span>
                </div>
                <span className="text-sm font-mono text-white text-right mt-0.5">{network.downlink.toFixed(1)} <span className="text-[9px] text-gray-500">Mbps</span></span>
            </div>
        </div>

      </div>
    </div>
  );
};

export default NetworkStatus;
