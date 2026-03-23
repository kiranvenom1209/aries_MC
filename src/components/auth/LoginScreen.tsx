import React, { useState } from 'react';
import { Lock, User, SquareTerminal, AlertTriangle } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (success: boolean) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError(false);

    // Simulate network delay for effect
    setTimeout(() => {
      if (username === 'admin' && password === 'leap1aries') {
        onLogin(true);
      } else {
        setError(true);
        setIsAuthenticating(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black overflow-hidden relative">
      {/* Animated grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(254,156,61,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(254,156,61,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_50%_50%,transparent_40%,rgba(0,0,0,0.75)_100%)] pointer-events-none" />
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-color/60 to-transparent" />

      <div className="w-full max-w-sm bg-black/80 border border-white/10 rounded-xl relative z-10 shadow-2xl overflow-hidden flex flex-col animate-fadeInUp backdrop-blur-sm">
        {/* Corner brackets */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-primary-color/40 pointer-events-none" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-primary-color/40 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-primary-color/40 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-primary-color/40 pointer-events-none" />



        {/* Header Ribbon */}
        <div className="px-6 py-4 border-b border-primary-color/20 flex items-center gap-3 bg-primary-color/[0.04] panel-header-accent">
            <SquareTerminal size={18} className="text-primary-color" />
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-primary-color">
            LeapOne Uplink Terminal
            </span>
        </div>

        <div className="p-8 pb-10">
            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {error && (
                <div className="border border-red-500/50 bg-red-500/10 rounded p-3 flex items-center gap-3 text-red-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                <AlertTriangle size={14} />
                <span>ACCESS ERROR</span>
                </div>
            )}

            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-mono text-gray-400 tracking-widest uppercase">Operator ID</label>
                <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={14} className="text-white/30" />
                </div>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black border border-white/20 rounded-md py-2.5 pl-9 pr-4 text-white font-mono placeholder-white/20 focus:outline-none focus:border-primary-color focus:ring-1 focus:ring-primary-color transition-colors"
                    placeholder="Enter ID"
                    required
                />
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-mono text-gray-400 tracking-widest uppercase">Passcode</label>
                <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={14} className="text-white/30" />
                </div>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black border border-white/20 rounded-md py-2.5 pl-9 pr-4 text-white font-mono placeholder-white/20 focus:outline-none focus:border-primary-color focus:ring-1 focus:ring-primary-color transition-colors"
                    placeholder="••••••••"
                    required
                />
                </div>
            </div>

            <button
                type="submit"
                disabled={isAuthenticating}
                className={`mt-4 py-3 rounded-md font-mono text-sm tracking-[0.15em] uppercase transition-all duration-300 border ${
                isAuthenticating 
                    ? 'border-white/20 text-white/40 cursor-wait'
                    : 'border-primary-color text-primary-color hover:bg-primary-color hover:text-black hover:shadow-[0_0_15px_rgba(254,156,61,0.4)]'
                }`}
            >
                {isAuthenticating ? 'Authorizing...' : 'Initialize'}
            </button>
            </form>
            
            {/* Footer info */}
            <div className="mt-8 flex justify-between items-center text-[9px] font-mono text-white/20 tracking-widest border-t border-white/5 pt-4">
            <span>SEC-LVL: 1</span>
            <span>SYS: STANDBY</span>
            </div>
        </div>

      </div>
    </div>
  );
};

export default LoginScreen;
