import React, { useState, useEffect, useRef } from 'react';
import { ROSProvider } from './context/ROSContext';
import { Activity, BatteryCharging, Camera, LayoutDashboard, LogOut, Bot, Plug, Settings, Unplug, Wrench, X, Clock } from 'lucide-react';
import { useROS } from './context/ROSContext';
import SplashScreen from './components/auth/SplashScreen';
import LoginScreen from './components/auth/LoginScreen';
import ConnectionModal from './components/telemetry/ConnectionModal';
import MissionControlPage from './pages/MissionControlPage';
import ManualDrivePage from './pages/ManualDrivePage';
import CamerasPage from './pages/CamerasPage';
import ElectricalPage from './pages/ElectricalPage';
import TelemetryDetailPage from './pages/TelemetryDetailPage';
import DrillOpsPage from './pages/DrillOpsPage';
import ArmOpsPage from './pages/ArmOpsPage';
import ScienceOpsPage from './pages/ScienceOpsPage';
import DataAnalyserPage from './pages/DataAnalyserPage';
import ArmCalibrationPage from './pages/ArmCalibrationPage';

type PageKey = 'mission' | 'drive' | 'cameras' | 'electrical' | 'telemetry' | 'drill' | 'arm' | 'science' | 'analyser' | 'calib';

const AUTH_STORAGE_KEY = 'aries_mc_authenticated';

const NAV_ITEMS: Array<{
  key: PageKey;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  { key: 'mission', label: 'Mission Control', description: 'Overview display for mapping, telemetry, and subsystem oversight.', icon: LayoutDashboard },
  { key: 'drive', label: 'Manual Driving', description: 'Dedicated teleop console.', icon: Activity },
  { key: 'cameras', label: 'Cameras', description: 'Full camera matrix for mission visual awareness.', icon: Camera },
  { key: 'electrical', label: 'Electrical', description: 'Battery, load, and power trend analysis.', icon: BatteryCharging },
  { key: 'telemetry', label: 'Telemetry Detail', description: 'Operational parameter verification across subsystems.', icon: Activity },
  { key: 'drill', label: 'Drill Ops', description: 'Sampling drill camera, controls, and science status.', icon: Wrench },
  { key: 'arm', label: 'Robotic Arm', description: 'Manipulator camera suite and arm pose controls.', icon: Bot },
  { key: 'science', label: 'Science Ops', description: 'Peristaltic pump, microscope, and Raman spectrometer analysis.', icon: Activity },
  { key: 'analyser', label: 'Data Analyser', description: 'Post-mission CSV log analysis, playback, and trajectory review.', icon: Clock },
  { key: 'calib', label: 'Arm Studio', description: 'Advanced 6-DOF kinematics calibration and assembly suite.', icon: Wrench },
];

const getPageFromHash = (hash: string): PageKey => {
  const normalized = hash.replace('#', '') as PageKey;
  return NAV_ITEMS.some((item) => item.key === normalized) ? normalized : 'mission';
};

const ModeSelectModal: React.FC<{
  isOpen: boolean;
  activePage: PageKey;
  onClose: () => void;
  onSelect: (page: PageKey) => void;
}> = ({ isOpen, activePage, onClose, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass-panel w-full max-w-2xl rounded-xl border border-primary-color/50 shadow-[0_0_30px_rgba(254,156,61,0.2)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-black/60 px-5 py-4 border-b border-primary-color/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="text-white" size={18} />
            <span className="font-mono font-bold tracking-widest text-white uppercase text-sm">Mode Select</span>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 bg-black/95">
          <div className="text-xs text-white/40 mb-4">Choose which mission workspace you want to open.</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {NAV_ITEMS.map(({ key, label, description, icon: Icon }) => {
              const active = key === activePage;
              return (
                <button
                  key={key}
                  onClick={() => {
                    onSelect(key);
                    onClose();
                  }}
                  className={`rounded-xl border p-4 text-left transition-all ${active ? 'border-primary-color/50 bg-primary-color/15 shadow-[0_0_14px_rgba(254,156,61,0.15)]' : 'border-white/10 bg-black/30 hover:border-white/30 hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon size={16} className={active ? 'text-white' : 'text-white/45'} />
                    <span className={`text-[11px] font-mono uppercase tracking-[0.14em] ${active ? 'text-white font-bold' : 'text-white/75'}`}>{label}</span>
                  </div>
                  <div className="text-[11px] leading-relaxed text-white/35">{description}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const EasterEggModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn" onClick={onClose}>
      <div 
        className="glass-panel w-full max-w-lg rounded-2xl border border-primary-color/40 shadow-[0_0_50px_rgba(254,156,61,0.25)] overflow-hidden relative flex flex-col items-center p-10 text-center animate-fadeInUp"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="flex flex-col items-center justify-center gap-4 mb-10 w-full mt-2">
          {/* Main Aries Logo */}
          <img src="/HSM-Aries-logo-white.png" alt="Aries Logo" className="h-[48px] md:h-[56px] opacity-95 drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]" />
          
          <div className="flex items-center gap-3 w-full max-w-[220px] opacity-40 mt-1">
            <div className="h-px bg-gradient-to-r from-transparent via-white/50 to-white/50 flex-1"></div>
            <span className="text-[7.5px] font-mono tracking-[0.4em] uppercase text-white whitespace-nowrap">An initiative of</span>
            <div className="h-px bg-gradient-to-l from-transparent via-white/50 to-white/50 flex-1"></div>
          </div>

          {/* Uni Logo */}
          <img src="/hs-logo.png" alt="University Logo" className="h-[28px] md:h-[32px] opacity-80 brightness-0 invert object-contain" />
        </div>

        <div className="flex flex-col items-center mb-10 w-full">
          <h2 className="text-base md:text-lg font-mono tracking-[0.25em] uppercase mb-2.5 flex items-center justify-center text-center flex-wrap gap-x-3 gap-y-1">
            <span className="font-bold text-white">LEAPONE</span>
            <span className="text-white/90 font-light drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">MISSION CONTROL</span>
          </h2>
          
          <div className="flex items-center justify-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.6)]"></span>
            <div className="text-[8.5px] md:text-[9px] font-mono tracking-[0.25em] uppercase text-white/40 flex items-center gap-2">
              <span>v1.0.4-beta</span>
              <span className="h-2 border-l border-white/20 mx-1"></span>
              <span>Build {new Date().getFullYear()}.03</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 w-full px-4 mb-2">
          <div>
            <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/50 mb-1.5">Architects & Engineering</div>
            <div className="text-white/90 font-medium text-lg">Kiran Achari</div>
            <div className="text-white/60 text-sm mt-0.5">Harsha Gottimukkala</div>
          </div>

          <div>
             <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/50 mb-1.5">Property Of</div>
             <div className="text-white/90 font-medium text-lg">HSM Aries Systems</div>
             <a href="https://hsmaries.space" target="_blank" rel="noreferrer" className="text-white hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-all font-mono text-xs mt-1.5 inline-block border-b border-white/30 hover:border-white/60 pb-0.5">
               hsmaries.space
             </a>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/5 w-full text-[8.5px] font-mono text-white/25 tracking-widest uppercase text-center">
          © {new Date().getFullYear()} HSM Aries Systems. All Rights Reserved.<br/>Proprietary & Confidential.
        </div>
      </div>
    </div>
  );
};

/* ─── Quick-Connect Widget (header) ─── */
const QuickConnect: React.FC<{ onOpenModal: () => void }> = ({ onOpenModal }) => {
  const { connectionStatus, rosUrl, connectROS, disconnectROS, isLive } = useROS();

  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';
  const isError = connectionStatus === 'error';

  const dotColor = isConnected
    ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.9)]'
    : isConnecting
    ? 'bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.8)] animate-pulse'
    : isError
    ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)] animate-pulse'
    : 'bg-white/20';

  const label = isConnected
    ? 'LINKED'
    : isConnecting
    ? 'CONNECTING…'
    : isError
    ? 'ERROR'
    : 'OFFLINE';

  const labelColor = isConnected
    ? 'text-green-400'
    : isConnecting
    ? 'text-orange-400'
    : isError
    ? 'text-red-400'
    : 'text-white/40';

  const handleToggle = () => {
    if (isConnected || isConnecting) {
      disconnectROS();
    } else {
      connectROS(rosUrl);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* One-click connect / disconnect */}
      <button
        onClick={handleToggle}
        title={isConnected ? 'Disconnect from ROS' : `Connect to ${rosUrl}`}
        className={`flex items-center gap-2 px-3 py-1.5 rounded border font-mono text-[10px] uppercase tracking-widest transition-all duration-300 ${
          isConnected
            ? 'border-green-500/40 bg-green-900/20 hover:bg-red-900/30 hover:border-red-500/40 group'
            : isError
            ? 'border-red-500/40 bg-red-900/20 hover:bg-primary-color/20 hover:border-primary-color/40'
            : 'border-primary-color/30 bg-primary-color/10 hover:bg-primary-color/20'
        }`}
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        {isConnected ? (
          <>
            <span className="text-green-400 group-hover:hidden">{label}</span>
            <span className="text-red-400 hidden group-hover:inline">DISCONNECT</span>
            <Unplug size={12} className="text-green-400 group-hover:text-red-400 hidden group-hover:block" />
            <Plug size={12} className="text-green-400 group-hover:hidden" />
          </>
        ) : (
          <>
            <span className={labelColor}>{label}</span>
            <Plug size={12} className={labelColor} />
          </>
        )}
      </button>

      {/* LIVE / MOCK badge */}
      <div className={`text-[8px] font-mono font-bold uppercase tracking-widest px-2 py-1 rounded border ${
        isLive
          ? 'border-green-500/40 bg-green-900/20 text-green-400'
          : 'border-white/10 bg-white/5 text-white/30'
      }`}>
        {isLive ? '● LIVE' : '◌ SIM'}
      </div>

      {/* Gear icon → open full modal for URL editing */}
      <button
        onClick={onOpenModal}
        title="ROS Bridge Settings"
        className="p-1.5 border border-white/10 hover:border-primary-color/40 hover:bg-primary-color/10 rounded transition-all text-white/40 hover:text-primary-color"
      >
        <Settings size={14} />
      </button>
    </div>
  );
};

const LockScreenOverlay: React.FC<{ 
  isOpen: boolean; 
  onUnlock: () => void;
  missionClock: string; 
}> = ({ isOpen, onUnlock, missionClock }) => {
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startUnlock = () => {
    unlockTimer.current = setTimeout(() => {
      onUnlock();
    }, 2000);
  };

  const cancelUnlock = () => {
    if (unlockTimer.current) clearTimeout(unlockTimer.current);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] bg-[#000000] flex flex-col items-center p-8 md:p-12 lg:p-16 animate-fadeIn overflow-hidden selection:bg-transparent text-white">

      {/* Top Bar */}
      <div className="w-full flex justify-between items-start opacity-70">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_12px_rgba(220,38,38,0.9)]" />
            <span className="text-[10px] md:text-sm font-mono tracking-[0.4em] uppercase font-bold text-red-500">System Standby</span>
          </div>
          <span className="text-[8px] md:text-[9.5px] font-mono tracking-[0.4em] uppercase text-white/50 ml-5 mt-1">
            Hold Aries Logo To Authenticate
          </span>
        </div>
        
        <div className="flex flex-col items-end text-right gap-1.5">
          <span className="text-[9px] md:text-[10px] font-mono tracking-[0.4em] uppercase text-white/40">Secure Uplink</span>
          <span className="text-[10px] md:text-xs font-mono tracking-[0.3em] uppercase text-green-500/80">AES-256 Encrypted</span>
        </div>
      </div>

      {/* Main Core */}
      <div className="flex-1 flex flex-col justify-center items-center w-full max-w-5xl relative gap-10 md:gap-14 my-8">
        
        {/* Main Logo */}
        <img 
          src="/HSM-Aries-logo-white.png" 
          alt="Aries Logo" 
          className="h-20 md:h-28 lg:h-32 opacity-100 cursor-pointer active:scale-95 transition-transform select-none"
          onPointerDown={startUnlock}
          onPointerUp={cancelUnlock}
          onPointerLeave={cancelUnlock}
          onContextMenu={(e) => e.preventDefault()}
          title="Hold to Resume Mission"
        />

        {/* Hero Clock */}
        <div className="flex flex-col items-center">
          <div className="text-[10px] md:text-xs font-mono tracking-[0.8em] uppercase text-white/50 mb-4 ml-3">
            Mission Elapsed Time
          </div>
          <div className="text-6xl md:text-[7rem] lg:text-[10rem] font-mono font-light tracking-widest tabular-nums leading-none">
            {missionClock}
          </div>
        </div>

        {/* Mission Badge */}
        <img 
          src="/HSM-Aries_BADGE_LeapOne_Mission.png" 
          alt="Mission Badge" 
          className="h-28 md:h-36 lg:h-44 opacity-95 drop-shadow-[0_0_20px_rgba(254,156,61,0.15)]"
        />

      </div>

      {/* Bottom Bar: Data Readout & Uni Logo */}
      <div className="w-full flex justify-between items-end mt-auto relative pt-8">
        <div className="flex flex-col gap-1.5 opacity-50 text-[8px] md:text-[9.5px] font-mono tracking-[0.3em] uppercase text-white/70">
          <div>Vehicle: <span className="text-white">LeapOne Rover</span></div>
          <div>Class: <span className="text-white">Planetary Explorer</span></div>
          <div>Location: <span className="text-white">ERC Mars Yard</span></div>
          <div className="mt-2 text-white/40 animate-pulse">Telemetry block active.</div>
        </div>

        {/* Center Uni watermark */}
        <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 flex flex-col items-center opacity-40">
           <div className="flex items-center gap-4 w-full justify-center mb-4">
             <div className="h-px bg-white/20 w-12 md:w-20"></div>
             <span className="text-[8px] md:text-[9px] font-mono tracking-[0.5em] uppercase text-white/80 whitespace-nowrap">Initiative of</span>
             <div className="h-px bg-white/20 w-12 md:w-20"></div>
           </div>
           <img src="/hs-logo.png" alt="University Logo" className="h-[24px] md:h-[32px] brightness-0 invert object-contain" />
        </div>

        <div className="flex flex-col gap-1.5 opacity-50 text-[8px] md:text-[9.5px] font-mono tracking-[0.3em] uppercase text-white/70 text-right">
          <div>SYS_CORE: <span className="text-white">ONLINE</span></div>
          <div>PWR_DIST: <span className="text-white">NOMINAL</span></div>
          <div>THERMAL: <span className="text-white">STABLE</span></div>
          <div className="mt-2 text-white/40">SYS_AUTH_REQ</div>
        </div>
      </div>

    </div>
  );
};

const ResumingOverlay: React.FC<{ isResuming: boolean }> = ({ isResuming }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isResuming) {
      setStep(0);
      const t1 = setTimeout(() => setStep(1), 300);
      const t2 = setTimeout(() => setStep(2), 800);
      const t3 = setTimeout(() => setStep(3), 1500);
      const t4 = setTimeout(() => setStep(4), 2200); // Trigger fade out
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    }
  }, [isResuming]);

  if (!isResuming) return null;

  return (
    <div className={`fixed inset-0 z-[4000] bg-black text-white flex flex-col items-center justify-center transition-opacity duration-500 ${step >= 4 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      
      <div className="flex flex-col items-center max-w-2xl w-full px-8 md:px-12">
        <img 
          src="/HSM-Aries-logo-white.png" 
          alt="Aries Logo" 
          className={`h-24 md:h-32 mb-16 transition-all duration-700 ease-out ${step >= 3 ? 'opacity-100 scale-100 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]' : 'opacity-30 scale-95'}`} 
        />
        
        <div className="w-full flex justify-between text-[10px] md:text-xs font-mono tracking-[0.4em] uppercase mb-4">
           <span className={`transition-colors duration-300 ${step >= 1 ? 'text-green-500 font-bold drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'text-white/30 truncate'}`}>
             {step >= 1 ? 'HANDSHAKE SECURED' : 'INITIATING CONNECTION...'}
           </span>
           <span className="text-white/40">SYS_AUTH</span>
        </div>

        {/* Cinematic Progress Bar */}
        <div className="w-full h-[2px] bg-white/10 relative overflow-hidden mb-8">
          <div 
            className="absolute top-0 left-0 h-full bg-primary-color transition-all duration-[600ms] ease-out shadow-[0_0_15px_rgba(254,156,61,0.8)]"
            style={{ width: step === 0 ? '15%' : step === 1 ? '45%' : step === 2 ? '85%' : '100%' }}
          />
        </div>

        {/* Terminal Text lines */}
        <div className="w-full flex justify-between text-[8px] md:text-[10px] font-mono tracking-[0.4em] uppercase text-white/50 h-32">
           <div className="flex flex-col gap-4">
             <span className={`${step >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'} transition-all duration-300 ease-out text-white/70`}>
               {'>'} RESTORING TELEMETRY FEEDS...
             </span>
             <span className={`${step >= 2 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'} transition-all duration-300 ease-out text-white/90`}>
               {'>'} REINITIALIZING CORE SYSTEMS...
             </span>
              <span className={`${step >= 3 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'} transition-all duration-300 ease-out text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]`}>
                {'>'} COMMAND INTERFACE ONLINE
              </span>
           </div>
           
           <div className={`flex flex-col gap-4 text-right transition-opacity duration-500 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`}>
             <span>NODE: <span className="text-white ml-2">ALPHA</span></span>
             <span>LINK: <span className="text-green-400 ml-2">STABLE</span></span>
             <span>PING: <span className="text-green-400 ml-2">18MS</span></span>
           </div>
        </div>

      </div>

    </div>
  );
};

const DashboardShell: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [isEasterEggOpen, setIsEasterEggOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [missionClock, setMissionClock] = useState('');
  const [activePage, setActivePage] = useState<PageKey>(() => getPageFromHash(window.location.hash));
  
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPress = () => {
    pressTimer.current = setTimeout(() => {
      setIsEasterEggOpen(true);
    }, 2000);
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const startLockPress = () => {
    if (isResuming) return;
    lockTimer.current = setTimeout(() => {
      setIsLocked(true);
    }, 2000);
  };
  const cancelLockPress = () => {
    if (lockTimer.current) clearTimeout(lockTimer.current);
  };

  const handleUnlock = () => {
    setIsLocked(false);
    setIsResuming(true);
    setTimeout(() => {
      setIsResuming(false);
    }, 2800); // Complete animation and hide
  };

  useEffect(() => {
    const handleHashChange = () => setActivePage(getPageFromHash(window.location.hash));
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const s = now.getSeconds().toString().padStart(2, '0');
      setMissionClock(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const navigateTo = (page: PageKey) => {
    window.location.hash = page;
    setActivePage(page);
  };

  const activeNavItem = NAV_ITEMS.find((item) => item.key === activePage) ?? NAV_ITEMS[0];

  const renderPage = () => {
    switch (activePage) {
      case 'drive':
        return <ManualDrivePage />;
      case 'cameras':
        return <CamerasPage />;
      case 'electrical':
        return <ElectricalPage />;
      case 'telemetry':
        return <TelemetryDetailPage />;
      case 'drill':
        return <DrillOpsPage />;
      case 'arm':
        return <ArmOpsPage />;
      case 'science':
        return <ScienceOpsPage />;
      case 'analyser':
        return <DataAnalyserPage />;
      case 'calib':
        return <ArmCalibrationPage />;
      case 'mission':
      default:
        return <MissionControlPage />;
    }
  };

  return (
    <>
      {/* Global overlay effects */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Radial vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_50%,rgba(0,0,0,0.55)_100%)]" />

      </div>


      <div className="h-screen overflow-hidden px-1.5 py-1.5 md:px-2 md:py-1.5 flex flex-col gap-1.5 text-white relative z-10">
        {/* Header */}
        <header className="shrink-0 flex flex-col xl:flex-row xl:items-center justify-between gap-4 glass-panel px-6 py-4 rounded-xl shadow-[0_0_20px_rgba(254,156,61,0.1)] border-b border-primary-color/30">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-4">
              <img 
                src="/HSM-Aries-logo-white.png" 
                alt="HSM Aries Team Logo" 
                className="h-12 w-auto object-contain opacity-90 cursor-pointer active:scale-95 transition-transform" 
                onPointerDown={startLockPress}
                onPointerUp={cancelLockPress}
                onPointerLeave={cancelLockPress}
                onContextMenu={(e) => e.preventDefault()}
                title="Hold to lock terminal"
              />
              <div className="hidden sm:block h-8 w-px bg-white/20"></div>
              <img 
                src="/hs-logo.png" 
                alt="University Logo" 
                className="hidden sm:block h-6 w-auto object-contain brightness-0 invert" 
              />
            </div>
            
            <div className="flex flex-col border-l border-primary-color/30 pl-4 min-w-0">
              <div className="font-mono font-bold tracking-[0.2em] text-lg uppercase text-white truncate">
                LeapOne <span className="text-white font-light">Mission Control</span>
              </div>
              <span className="text-xs text-white/60 uppercase tracking-[0.2em] font-mono mt-1 truncate hidden md:inline-block">
                {activeNavItem.label} // {activeNavItem.description}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 xl:gap-6">
            <img 
              src="/HSM-Aries_BADGE_LeapOne_Mission.png" 
              alt="LeapOne Mission Badge" 
              className="hidden md:block h-14 w-auto object-contain cursor-pointer active:scale-95 transition-transform select-none" 
              onPointerDown={startPress}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              onContextMenu={(e) => e.preventDefault()}
            />

            <div className="hidden lg:flex flex-col items-center border-x border-primary-color/20 px-5">
              <span className="text-[8px] font-mono text-white/30 uppercase tracking-[0.2em] mb-0.5">Mission Clock</span>
              <span className="text-base font-mono text-white tabular-nums">
                {missionClock}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_4px_rgba(34,197,94,0.9)]" />
                <span className="text-[8px] font-mono text-green-500 uppercase tracking-widest">Live</span>
              </div>
            </div>

            <button
              onClick={() => setIsModeModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded border border-primary-color/30 bg-primary-color/10 hover:bg-primary-color/20 font-mono text-[10px] uppercase tracking-widest text-primary-color transition-all"
              title="Select dashboard page"
            >
              <LayoutDashboard size={12} />
              Mode
            </button>

            <QuickConnect onOpenModal={() => setIsConnectionModalOpen(true)} />

            <button
              onClick={onLogout}
              className="p-2 border border-red-500/30 text-red-500/80 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors shadow-[0_0_10px_rgba(220,38,38,0.1)] hover:shadow-[0_0_15px_rgba(220,38,38,0.3)]"
              title="Terminate Session"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-hidden">
          {renderPage()}
        </main>
      
        <ModeSelectModal
          isOpen={isModeModalOpen}
          activePage={activePage}
          onClose={() => setIsModeModalOpen(false)}
          onSelect={navigateTo}
        />

        {/* Network Modal */}
        <ConnectionModal 
          isOpen={isConnectionModalOpen} 
          onClose={() => setIsConnectionModalOpen(false)} 
        />

        {/* Easter Egg Modal */}
        <EasterEggModal
          isOpen={isEasterEggOpen}
          onClose={() => setIsEasterEggOpen(false)}
        />
        
        {/* Demo Lock Screen */}
        <LockScreenOverlay 
          isOpen={isLocked}
          onUnlock={handleUnlock}
          missionClock={missionClock}
        />
        
        {/* Unlock Transition Sequence */}
        <ResumingOverlay isResuming={isResuming} />
      </div>
    </>
  );
};

import { MissionProvider } from './context/MissionContext';
import { TelemetryProvider } from './context/TelemetryContext';
import { PlaybackProvider } from './context/PlaybackContext';

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  });

  const handleLogin = (success: boolean) => {
    if (!success) {
      setIsAuthenticated(false);
      return;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
  };

  return (
    <ROSProvider>
      <MissionProvider>
        <PlaybackProvider>
          <TelemetryProvider>
            {showSplash ? (
              <SplashScreen onComplete={() => setShowSplash(false)} />
            ) : !isAuthenticated ? (
              <LoginScreen onLogin={handleLogin} />
            ) : (
              <DashboardShell onLogout={handleLogout} />
            )}
          </TelemetryProvider>
        </PlaybackProvider>
      </MissionProvider>
    </ROSProvider>
  );
};

export default App;
