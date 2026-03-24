import React from 'react';
import ArmVisualizer3D from '../components/telemetry/ArmVisualizer3D';

/**
 * ArmCalibrationPage - Now renamed 'Arm Studio' UI
 * Optimized as a dedicated, full-screen monitoring and interaction environment
 * for the igus ReBel 6 Digital Twin.
 */
const ArmCalibrationPage: React.FC = () => {
  return (
    <div className="w-full h-full bg-[#050505] relative overflow-hidden group">
      {/* Full Screen Digital Twin Viewport */}
      <div className="absolute inset-0 z-0">
        <ArmVisualizer3D />
      </div>
      
      {/* Immersive Cinematic Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.4)_100%)]" />
      
      {/* Visual Identity Label */}
      <div className="absolute bottom-8 left-8 z-20 font-mono flex flex-col gap-1 transition-opacity duration-500 group-hover:opacity-100 opacity-40">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
          <span className="text-[10px] uppercase tracking-[0.4em] text-white/80 font-bold">Arm Studio 6-DOF</span>
        </div>
        <div className="text-[8px] uppercase tracking-[0.2em] text-white/30 ml-4">
          Kinematic Engine: IGUS_REBEL_6_V2 // Status: NOMINAL
        </div>
      </div>

      {/* Dynamic Floor Gradient */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-0" />
    </div>
  );
};

export default ArmCalibrationPage;
