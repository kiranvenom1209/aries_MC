import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 120);

    // Complete after timer
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2800);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black overflow-hidden relative">
      {/* Animated grid background */}
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

      {/* Content card */}
      <div className="max-w-[300px] w-full flex flex-col items-center justify-center relative border border-white/5 rounded-2xl p-8 backdrop-blur-sm bg-white/[0.02]">
        {/* Corner brackets */}
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-primary-color/50" />
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-primary-color/50" />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-primary-color/50" />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-primary-color/50" />

        <img
          src="/HSM-Aries_BADGE_LeapOne_Mission.png"
          alt="LeapOne Mission Badge"
          className="h-28 w-auto object-contain mb-8 opacity-90 drop-shadow-[0_0_20px_rgba(254,156,61,0.35)] animate-fadeIn"
          style={{ animationDelay: '0ms' }}
        />

        <img
          src="/HSM-Aries-logo-white.png"
          alt="HSM Aries Team Logo"
          className="h-10 w-auto object-contain mb-10 opacity-0 animate-fadeInUp"
          style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
        />

        <div className="w-full flex flex-col items-center gap-3 opacity-0 animate-fadeInUp" style={{ animationDelay: '550ms', animationFillMode: 'forwards' }}>
          <div className="w-full bg-white/10 border border-white/20 h-[2px] overflow-hidden rounded-full">
            <div
              className="bg-primary-color h-full transition-all duration-150 ease-out shadow-[0_0_12px_rgba(254,156,61,1)] rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="w-full flex justify-between">
            <div className="text-[9px] font-mono text-white/60 uppercase tracking-widest">
              Uplink Sync
            </div>
            <div className="text-[9px] font-mono text-white/40 tabular-nums">
              {progress}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
