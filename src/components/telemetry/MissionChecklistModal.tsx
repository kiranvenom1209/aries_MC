import React, { useState } from 'react';
import { X, CheckCircle2, Shield, Beaker, Radio, Navigation2, Play } from 'lucide-react';
import { useROS } from '../../context/ROSContext';
import { useTelemetryState } from '../../context/TelemetryContext';

interface DepartmentStatus {
  id: string;
  name: string;
  label: string;
  icon: React.ElementType;
  isReady: boolean;
  value: string;
}

interface MissionChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (checklist: Record<string, boolean>) => void;
}

const MissionChecklistModal: React.FC<MissionChecklistModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const { connectionStatus } = useROS();
  const { state } = useTelemetryState();
  const [clearedDepts, setClearedDepts] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const departments: DepartmentStatus[] = [
    { 
      id: 'pwr', 
      name: 'Power & Thermal', 
      label: 'Main Bus & Thermal Buffer', 
      icon: Shield, 
      isReady: state.telemetry.batteryLevel > 30 && state.telemetry.temperature < 55,
      value: `${state.telemetry.batteryLevel.toFixed(0)}% / ${state.telemetry.temperature.toFixed(1)}°C`
    },
    { 
      id: 'drv', 
      name: 'Drivetrain', 
      label: 'ODrive Motor Controllers', 
      icon: Navigation2, 
      isReady: !!state.wheels && state.wheels.length > 0 && state.wheels.every(w => w.status === 'normal'),
      value: state.wheels?.every(w => w.status === 'normal') ? '6/6 NOMINAL' : 'DRIVE ERROR'
    },
    { 
      id: 'com', 
      name: 'Communications', 
      label: 'Uplink & Signal Stability', 
      icon: Radio, 
      isReady: connectionStatus === 'connected' && (state.network?.signalStrength ?? -100) > -75,
      value: `${(state.network?.signalStrength ?? -100).toFixed(0)} dBm`
    },
    { 
      id: 'sci', 
      name: 'Science & Analysis', 
      label: 'Payload Instrumental Sync', 
      icon: Beaker, 
      isReady: !!state.science?.phValid,
      value: state.science?.phValid ? 'SYNCED' : 'OFFLINE'
    },
    { 
      id: 'drill', 
      name: 'Excavation', 
      label: 'Drill Stowed & Locked', 
      icon: X, 
      isReady: !!state.drill?.limitSwitchTop && state.drill?.status === 'idle',
      value: state.drill?.limitSwitchTop ? 'STOWED' : 'UNSAFE'
    },
    { 
      id: 'arm', 
      name: 'Manipulator', 
      label: 'Robotic Arm Pose Check', 
      icon: Shield, 
      isReady: state.arm?.status === 'idle',
      value: state.arm?.status?.toUpperCase() ?? 'N/A'
    },
  ];

  const toggleDept = (id: string) => {
    setClearedDepts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const allCleared = departments.every(dept => clearedDepts[dept.id]);
  const readyCount = departments.filter(d => clearedDepts[d.id]).length;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn" onClick={onClose}>
      <div 
        className="glass-panel w-full max-w-lg rounded-2xl border border-primary-color/40 shadow-[0_0_50px_rgba(254,156,61,0.2)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-black/60 px-6 py-5 border-b border-primary-color/20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="text-primary-color" size={20} />
            <h2 className="font-mono font-bold tracking-[0.2em] text-primary-color uppercase text-sm">System Readiness Checklist</h2>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-[10px] text-white/45 font-mono uppercase tracking-widest mb-4 border-b border-white/5 pb-4">
             Obtain final departmental clearance before mission descent or operations.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {departments.map((dept) => {
              const Icon = dept.icon;
              const isCleared = clearedDepts[dept.id];
              const isNominal = dept.isReady;
              
              return (
                <button
                  key={dept.id}
                  onClick={() => toggleDept(dept.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 relative group/item ${
                    isCleared 
                      ? isNominal 
                        ? 'border-green-500/50 bg-green-500/10' 
                        : 'border-orange-500/50 bg-orange-500/10 animate-pulse' // Overridden warning
                      : isNominal 
                        ? 'border-primary-color/20 bg-primary-color/5 hover:border-primary-color/40'
                        : 'border-red-500/40 bg-red-500/5 hover:border-red-500/60' // Critical but clickable
                  }`}
                >
                  <div className={`p-1.5 rounded-lg transition-colors ${
                    isCleared 
                      ? isNominal ? 'text-green-400' : 'text-orange-400'
                      : isNominal ? 'text-primary-color' : 'text-red-500'
                  }`}>
                    <Icon size={18} />
                  </div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between gap-1">
                       <div className={`text-[8px] font-mono uppercase tracking-wider truncate ${
                         isCleared 
                          ? isNominal ? 'text-green-400/70' : 'text-orange-400/70'
                          : isNominal ? 'text-primary-color/70' : 'text-red-500/70'
                       }`}>
                        {dept.name}
                        {isCleared && !isNominal && <span className="ml-1 text-[7px] text-orange-500 font-bold">[OVERRIDDEN]</span>}
                      </div>
                      <div className={`text-[9px] font-mono font-bold whitespace-nowrap ${isNominal ? 'text-white/40' : 'text-red-500 animate-pulse'}`}>
                        {dept.value}
                      </div>
                    </div>
                    <div className={`text-[10px] font-medium mt-0.5 truncate ${
                      isCleared 
                        ? 'text-white' 
                        : isNominal ? 'text-white/80' : 'text-red-400/80 hover:text-red-300'
                    }`}>
                      {isNominal ? dept.label : 'PARAMETER CRITICAL'}
                    </div>
                  </div>

                  <div className={`w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                    isCleared 
                      ? isNominal ? 'bg-green-500 border-green-500 text-black' : 'bg-orange-500 border-orange-500 text-black'
                      : isNominal ? 'border-primary-color/30' : 'border-red-500/40'
                  }`}>
                    {isCleared && <CheckCircle2 size={10} strokeWidth={4} />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-6">
            <button
              disabled={!allCleared}
              onClick={() => onConfirm(clearedDepts)}
              className={`group relative w-full py-5 rounded-xl font-mono font-bold uppercase tracking-[0.3em] transition-all duration-500 overflow-hidden border-2 ${
                allCleared
                  ? departments.some(d => clearedDepts[d.id] && !d.isReady)
                    ? 'bg-orange-600 text-black border-orange-600 shadow-[0_0_40px_rgba(234,88,12,0.4)] animate-pulse hover:scale-[1.02]' // Warn if any item is overridden
                    : 'bg-[#fe9c3d] text-black border-[#fe9c3d] shadow-[0_0_40px_rgba(254,156,61,0.4)] hover:scale-[1.02]'
                  : 'bg-white/5 text-white/10 border-white/5 cursor-not-allowed'
              }`}
            >
              <div className="relative flex items-center justify-center gap-3">
                {allCleared ? (
                  <>
                    <Play size={22} fill="currentColor" />
                    <span>
                      {departments.some(d => clearedDepts[d.id] && !d.isReady) ? 'INITIATE (FORCE)' : 'INITIALIZE MISSION'}
                    </span>
                  </>
                ) : (
                  <>
                    <Shield size={18} className="opacity-40" />
                    <span className="opacity-40">LOCKED</span>
                  </>
                )}
              </div>
            </button>
            
            <div className={`mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-500 ${
              allCleared ? 'bg-white/5' : 'bg-white/5'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                allCleared ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-white/10'
              }`} />
              <span className={`text-[9px] font-mono uppercase tracking-[0.2em] ${
                allCleared ? 'text-green-400 font-bold' : 'text-white/20'
              }`}>
                {departments.some(d => clearedDepts[d.id] && !d.isReady) 
                  ? 'System Override Active — Proceed with Caution' 
                  : `Clearance: ${readyCount} / ${departments.length} Verified`
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissionChecklistModal;
