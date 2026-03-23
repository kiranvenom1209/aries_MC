import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useTelemetryState } from '../../context/TelemetryContext';

const ArmVisualizer3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { state } = useTelemetryState();
  const arm = state.arm;

  // Refs for the 6 joints
  const jointsRef = useRef<THREE.Group[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(2, 2, 4);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    // Grid and Lights
    const grid = new THREE.GridHelper(10, 10, 0x333333, 0x111111);
    scene.add(grid);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Materials
    const jointMaterial = new THREE.MeshPhongMaterial({ color: 0xfe9c3d }); // Aries Orange
    const linkMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });

    // Build the arm hierarchy
    const root = new THREE.Group();
    scene.add(root);

    // Helper functions for building segments
    const createJoint = (radius: number, height: number) => {
        const group = new THREE.Group();
        const geo = new THREE.CylinderGeometry(radius, radius, height, 32);
        geo.rotateX(Math.PI / 2); // default vertical, rotate to side
        const mesh = new THREE.Mesh(geo, jointMaterial);
        group.add(mesh);
        return group;
    };

    const createLink = (w: number, h: number, d: number, offset: number) => {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, linkMaterial);
        mesh.position.y = offset; // Offset so it starts from previous joint
        return mesh;
    };

    // J1: Base Rotation (Yaw) - rotates around Y
    const j1 = new THREE.Group();
    const j1Base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 32), jointMaterial);
    j1.add(j1Base);
    root.add(j1);
    
    // L1: Vertical base link
    const l1 = createLink(0.12, 0.4, 0.12, 0.2);
    j1.add(l1);

    // J2: Shoulder (Pitch) - rotates around Z
    const j2 = createJoint(0.1, 0.15);
    j2.position.y = 0.4;
    l1.add(j2);

    // L2: Main upper arm link
    const l2 = createLink(0.1, 0.8, 0.1, 0.4);
    j2.add(l2);

    // J3: Elbow (Pitch) - rotates around Z
    const j3 = createJoint(0.08, 0.12);
    j3.position.y = 0.8;
    l2.add(j3);

    // L3: Forearm link
    const l3 = createLink(0.08, 0.6, 0.08, 0.3);
    j3.add(l3);

    // J4: Wrist 1 (Roll) - rotates around Y (arm axis)
    const j4 = new THREE.Group();
    const j4Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 32), jointMaterial);
    j4.add(j4Mesh);
    j4.position.y = 0.6;
    l3.add(j4);

    // L4: Wrist 1 link
    const l4 = createLink(0.06, 0.15, 0.06, 0.075);
    j4.add(l4);

    // J5: Wrist 2 (Pitch) - rotates around Z
    const j5 = createJoint(0.05, 0.1);
    j5.position.y = 0.15;
    l4.add(j5);

    // L5: Wrist 2 link
    const l5 = createLink(0.05, 0.1, 0.05, 0.05);
    j5.add(l5);

    // J6: Wrist 3 (Roll) - rotates around Y
    const j6 = new THREE.Group();
    const j6Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.05, 32), jointMaterial);
    j6.add(j6Mesh);
    j6.position.y = 0.1;
    l5.add(j6);

    // End Effector (Gripper base)
    const gripper = createLink(0.1, 0.05, 0.02, 0.025);
    j6.add(gripper);

    jointsRef.current = [j1, j2, j3, j4, j5, j6];

    // Animation Loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Handle Resize
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
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Joint Angles from Telemetry
  useEffect(() => {
    if (!arm || jointsRef.current.length < 6) return;

    // Mapping angles (degrees to radians)
    // J1: base_rotation (Yaw Y)
    jointsRef.current[0].rotation.y = THREE.MathUtils.degToRad(arm.joints[0].angle);
    
    // J2: shoulder (Pitch Z)
    jointsRef.current[1].rotation.z = THREE.MathUtils.degToRad(arm.joints[1].angle);
    
    // J3: elbow (Pitch Z)
    jointsRef.current[2].rotation.z = THREE.MathUtils.degToRad(arm.joints[2].angle);
    
    // J4: wrist_1 (Roll Y/X axis)
    jointsRef.current[3].rotation.y = THREE.MathUtils.degToRad(arm.joints[3].angle);
    
    // J5: wrist_2 (Pitch Z)
    jointsRef.current[4].rotation.z = THREE.MathUtils.degToRad(arm.joints[4].angle);
    
    // J6: wrist_3 (Roll Y/X axis)
    jointsRef.current[5].rotation.y = THREE.MathUtils.degToRad(arm.joints[5].angle);

  }, [arm]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[250px] bg-black/40 rounded-xl overflow-hidden border border-white/5 shadow-inner"
    />
  );
};

export default ArmVisualizer3D;
