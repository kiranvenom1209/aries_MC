import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useTelemetryState } from '../../context/TelemetryContext';
import { STOW_PRESETS, setStowPreset, updateJointAngle } from '../../utils/mockTelemetry';
import { Settings, Check, Sliders, Box } from 'lucide-react';
import type { ArmData } from '../../types/telemetry';

interface ArmVisualizer3DProps {
  playbackArm?: ArmData;
  compact?: boolean;
}


const KINEMATICS = [
  { type: 'turning',  length: 0.10, diam: 0.16, color: 0x888888, offset: 0,      axis: 'y' }, // J1: Turning (Base Twist)
  { type: 'pivoting', length: 0.3136, diam: 0.14, color: 0x888888, offset: 0.08,   axis: 'x' }, // J2: Pivoting (Upper Arm - Longest)
  { type: 'pivoting', length: 0.25, diam: 0.12, color: 0x888888, offset: 0.08, axis: 'x' }, // J3: Pivoting (Forearm)
  { type: 'turning',  length: 0.05, diam: 0.10, color: 0x888888, offset: 0,      axis: 'y' }, // J4: Turning (Wrist Roll)
  { type: 'pivoting', length: 0.03, diam: 0.08, color: 0x888888, offset: 0.04,  axis: 'x' }, // J5: Pivoting (Wrist Pitch)
  { type: 'turning',  length: 0.02, diam: 0.06, color: 0x888888, offset: 0,      axis: 'y' }, // J6: Turning (Tool Spin)
];

const ArmVisualizer3D: React.FC<ArmVisualizer3DProps> = ({ playbackArm, compact }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { state } = useTelemetryState();
  const arm = playbackArm || state.arm;

  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [selectedPreset, setSelectedPreset] = React.useState<keyof typeof STOW_PRESETS>('OFFICIAL');

  const isPlayback = !!playbackArm;

  const jointsRef = useRef<THREE.Group[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const width = containerRef.current.clientWidth || 400;
    const height = containerRef.current.clientHeight || 300;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505); 

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 100);
    if (compact) {
      camera.position.set(0.6, 0.5, 0.8);
    } else {
      camera.position.set(0.8, 0.7, 1.0);
    }
    camera.lookAt(0, 0.3, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.2, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    // 1. Key Light (Softer for subtle highlights)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // 2. Rim Light (Very subtle silhouette)
    const rimLight = new THREE.PointLight(0xfe9c3d, 0.4, 10);
    rimLight.position.set(-3, 4, -3);
    scene.add(rimLight);

    // 4. Fill Light (Underneath)
    const fillLight = new THREE.PointLight(0xffffff, 0.3, 5);
    fillLight.position.set(2, -2, 2);
    scene.add(fillLight);

    const grid = new THREE.GridHelper(2, 20, 0xfe9c3d, 0x222222);
    grid.material.transparent = true;
    grid.material.opacity = 0.15; // Increased for better grounding
    scene.add(grid);

    // --- Stationary Base Mount (Flared Bell/Volcano) ---
    const basePoints = [];
    for (let i = 0; i < 10; i++) {
        const x = 0.22 - Math.pow(i/10, 2) * 0.08;
        const y = (i/10) * 0.08;
        basePoints.push(new THREE.Vector2(x, y));
    }
    const baseMountGeom = new THREE.LatheGeometry(basePoints, 32);
    const baseMountMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });
    const baseMount = new THREE.Mesh(baseMountGeom, baseMountMat);
    scene.add(baseMount);

    // Interface Panel (Recessed rectangular panel on back)
    const panelGeom = new THREE.BoxGeometry(0.08, 0.05, 0.01);
    const panel = new THREE.Mesh(panelGeom, new THREE.MeshStandardMaterial({ color: 0x050505 }));
    panel.position.set(0, 0.04, -0.16);
    baseMount.add(panel);

    const group = new THREE.Group();
    group.position.y = 0.08; // Sit on J1 pod
    scene.add(group);

    const createRebelJoint = (index: number): THREE.Group => {
        const jointGroup = new THREE.Group();
        const config = KINEMATICS[index];
        
        // --- High-Fidelity PBR Materials ---
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: config.color, 
            roughness: 0.85,  // Matte/Rough surface as requested
            metalness: 0.1 
        });
        const accentMat = new THREE.MeshStandardMaterial({ 
            color: 0xfe9c3d, 
            roughness: 0.15,  // Smooth/Glossy surface as requested
            metalness: 0.4,
            emissive: 0xfe9c3d,
            emissiveIntensity: 0.1
        }); 
        const sleeveMat = new THREE.MeshStandardMaterial({ 
            color: 0x111111, 
            roughness: 0.8, 
            metalness: 0.1 
        });

        // 1. Actuator Housing (The "Pod")
        const pod = new THREE.Group();
        
        if (config.type === 'turning') {
            const hubGeom = new THREE.CylinderGeometry(config.diam * 0.5, config.diam * 0.5, 0.05, 32);
            const hub = new THREE.Mesh(hubGeom, bodyMat);
            pod.add(hub);
            
            const ringGeom = new THREE.TorusGeometry(config.diam * 0.45, 0.005, 16, 48);
            const ring = new THREE.Mesh(ringGeom, accentMat);
            ring.rotation.x = Math.PI / 2;
            pod.add(ring);
        } else {
            const diskGeom = new THREE.CylinderGeometry(config.diam * 0.5, config.diam * 0.5, 0.06, 32);
            const disk = new THREE.Mesh(diskGeom, bodyMat);
            disk.rotation.z = Math.PI / 2;
            pod.add(disk);

            const accentGeom = new THREE.CircleGeometry(config.diam * 0.35, 32);
            const accent = new THREE.Mesh(accentGeom, accentMat);
            accent.position.x = 0.031;
            accent.rotation.y = Math.PI / 2;
            pod.add(accent);
            
            const accentBack = accent.clone();
            accentBack.position.x = -0.031;
            accentBack.rotation.y = -Math.PI / 2;
            pod.add(accentBack);
        }

        jointGroup.add(pod);

        // 2. Link Structure (The "Bone" / Sculpted Polymer)
        const linkLength = config.length;
        if (linkLength > 0) {
            const linkGroup = new THREE.Group();
            
            // Stylized "Bone" Link (Organic tapered cylindrical shell)
            const segments = 12;
            const bonePoints = [];
            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                // Wider at ends, narrower in middle for "organic" look
                const radiusX = (config.diam * 0.35) * (1 + Math.pow(t - 0.5, 2) * 0.6);
                bonePoints.push(new THREE.Vector2(radiusX, t * linkLength));
            }
            const boneGeom = new THREE.LatheGeometry(bonePoints, 16);
            const bone = new THREE.Mesh(boneGeom, bodyMat);
            linkGroup.add(bone);

            // Lateral Offset (The stagger)
            linkGroup.position.x = config.offset;
            
            // Connection Bracket (Curved transition / U-bracket)
            // Bridge from (0,0) to (offset, 0)
            const bracketWidth = Math.abs(config.offset) + 0.02;
            let bracketGeom;
            if (index === 0) {
                // J1-J2 Shoulder Bracket: Curves from horiz to vert
                bracketGeom = new THREE.BoxGeometry(bracketWidth + 0.04, 0.08, config.diam * 0.8);
            } else if (index === 4) {
                bracketGeom = new THREE.TorusGeometry(config.offset/2, 0.02, 12, 24, Math.PI); // U-Bracket
            } else {
                bracketGeom = new THREE.BoxGeometry(bracketWidth, 0.06, config.diam * 0.6);
            }
            
            const bracket = new THREE.Mesh(bracketGeom, sleeveMat);
            if (index === 4) {
               bracket.rotation.z = Math.PI/2;
               bracket.position.x = -config.offset/4;
            } else {
               bracket.position.x = -config.offset / 2;
               // Adjust height slightly to ensure it meets the center of the pod
               bracket.position.y = 0;
            }
            linkGroup.add(bracket);

            // Final Tool Flange (J6 end)
            if (index === 5) {
                const flangeGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.005, 32);
                const flangeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 });
                const flange = new THREE.Mesh(flangeGeom, flangeMat);
                flange.position.y = linkLength;
                linkGroup.add(flange);
                
                // Simulated holes
                for (let a = 0; a < 6; a++) {
                    const holeGeom = new THREE.CircleGeometry(0.003, 8);
                    const hole = new THREE.Mesh(holeGeom, new THREE.MeshBasicMaterial({ color: 0x000000 }));
                    const angle = (a / 6) * Math.PI * 2;
                    hole.position.set(Math.cos(angle) * 0.03, linkLength + 0.0026, Math.sin(angle) * 0.03);
                    hole.rotation.x = -Math.PI/2;
                    linkGroup.add(hole);
                }
            }

            jointGroup.add(linkGroup);
        }

        return jointGroup;
    };

    // Assemble Precision Hierarchy
    const js: THREE.Group[] = [];
    let currentParent = group;
    
    KINEMATICS.forEach((config, i) => {
        const joint = createRebelJoint(i);
        currentParent.add(joint);
        js.push(joint);
        
        const anchor = new THREE.Group();
        anchor.position.y = config.length;
        anchor.position.x = config.offset;
        joint.add(anchor);
        currentParent = anchor;
    });

    jointsRef.current = js;

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update Rotations accurately per Axis
  useEffect(() => {
    if (!arm || jointsRef.current.length < 6) return;
    
    KINEMATICS.forEach((config, i) => {
        const joint = jointsRef.current[i];
        if (!joint) return;
        const angle = THREE.MathUtils.degToRad(arm.joints[i].angle);
        
        // Reset rotation before applying basis
        joint.rotation.set(0, 0, 0);

        if (config.axis === 'x') joint.rotation.x = angle;
        else if (config.axis === 'y') joint.rotation.y = angle;
        else if (config.axis === 'z') joint.rotation.z = angle;
    });
  }, [arm]);

  return (
    <div className="relative w-full h-full min-h-[400px] group/viz">
      <div 
        ref={containerRef} 
        className="w-full h-full bg-[#050505] rounded-xl overflow-hidden shadow-2xl flex items-center justify-center cursor-move"
      />
      
      {/* Cinematic Overlays - Hide in compact/playback mode if requested */}
      {!compact && (
        <>
          <div className="absolute top-6 left-6 z-20 pointer-events-none">
            <div className="flex flex-col gap-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-color animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/90">Apex Mount // OOB-01</span>
              </div>
              <span className="text-[8px] uppercase tracking-widest text-white/40 ml-4 font-mono">IGUS_REBEL_6_V2 // KIN_NOMINAL</span>
            </div>
          </div>
          <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono text-orange-400 font-bold tracking-widest uppercase">igus ReBel 6DOF — Digital Twin</span>
            </div>
            <div className="text-[9px] text-gray-500 font-mono tracking-tighter">PROCEDURAL_GEN: ACTIVE (LINK_STAGGER: YES)</div>
          </div>
        </>
      )}

      {/* Playback Indicator */}
      {isPlayback && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-2 py-1 bg-primary-color/10 border border-primary-color/20 rounded-md backdrop-blur-sm">
           <Box size={12} className="text-primary-color" />
           <span className="text-[8px] font-mono font-bold uppercase tracking-tighter text-primary-color">Historical Replay</span>
        </div>
      )}

      {/* Interactive Settings Button - Only in Live Mode (not playback) */}
      {!isPlayback && (
        <div className="absolute top-4 right-4 z-20">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-2 rounded-lg transition-all duration-300 ${isSettingsOpen ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'bg-gray-900/80 text-gray-400 hover:text-white border border-gray-800'}`}
          >
            <Settings size={18} className={isSettingsOpen ? 'animate-spin-slow' : ''} />
          </button>

          {isSettingsOpen && (
            <div className="absolute top-12 right-0 w-48 bg-gray-900/95 backdrop-blur-md border border-gray-800 rounded-xl shadow-2xl p-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3 px-1">Nominal Positions</div>
            <div className="space-y-1">
              {(Object.keys(STOW_PRESETS) as Array<keyof typeof STOW_PRESETS>).map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setStowPreset(preset);
                    setSelectedPreset(preset);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-colors ${selectedPreset === preset ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}`}
                >
                  {preset}
                  {selectedPreset === preset && <Check size={12} />}
                </button>
              ))}
            </div>

            <div className="mt-4 mb-2 pt-3 border-t border-gray-800/50">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3 px-1">
                <Sliders size={12} /> Joint Override (Manual)
              </div>
              <div className="space-y-3 px-1">
                {arm?.joints.map((j, idx) => (
                  <div key={j.id} className="group/slider">
                    <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1 group-hover/slider:text-gray-300">
                      <span>{j.id}</span>
                      <span className="text-orange-500/80">{Math.round(j.angle)}°</span>
                    </div>
                    <input 
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={j.angle}
                      onChange={(e) => {
                        updateJointAngle(idx, parseFloat(e.target.value));
                        setSelectedPreset('OFFICIAL'); // Reset preset highlight
                      }}
                      className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-800/50">
              <div className="text-[8px] text-gray-600 leading-tight uppercase px-1">
                Articulate joints to validate custom 'Box' configurations.
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default ArmVisualizer3D;
