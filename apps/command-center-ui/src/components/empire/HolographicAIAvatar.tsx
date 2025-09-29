import React, { useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Sphere, Text, Float, Html, OrbitControls, Environment } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

// Holographic AI Avatar Component
function AIAvatarMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle rotation and floating animation
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      
      // Pulsating effect
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
      <group>
        {/* Main avatar body */}
        <mesh
          ref={meshRef}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          castShadow
        >
          <sphereGeometry args={[1.2, 32, 32]} />
          <meshStandardMaterial
            color={hovered ? "#00ffff" : "#05f4ff"}
            emissive={hovered ? "#0088ff" : "#0066cc"}
            emissiveIntensity={0.6}
            transparent
            opacity={0.8}
            wireframe={false}
            roughness={0.1}
            metalness={0.8}
          />
        </mesh>
        
        {/* Outer holographic rings */}
        {[1.8, 2.4, 3.0].map((radius, index) => (
          <mesh key={index} rotation={[Math.PI / 2 + index * 0.2, 0, 0]}>
            <torusGeometry args={[radius, 0.02, 8, 64]} />
            <meshBasicMaterial
              color="#05f4ff"
              transparent
              opacity={0.4 - index * 0.1}
            />
          </mesh>
        ))}
        
        {/* Floating data particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <Float key={i} speed={2 + i * 0.1} rotationIntensity={0.5}>
            <mesh position={[
              Math.cos(i * Math.PI / 6) * 2.5,
              Math.sin(i * Math.PI / 3) * 0.5,
              Math.sin(i * Math.PI / 6) * 2.5
            ]}>
              <boxGeometry args={[0.05, 0.05, 0.05]} />
              <meshBasicMaterial
                color="#21ff7a"
                transparent
                opacity={0.7}
              />
            </mesh>
          </Float>
        ))}
        
        {/* AI Status Display */}
        <Html distanceFactor={15} position={[0, -2, 0]}>
          <motion.div
            className="bg-black/90 backdrop-blur-md rounded-lg p-4 border border-cyan-400/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-center">
              <div className="text-cyan-400 font-mono text-sm font-semibold">
                AIRA - Advanced Intelligence
              </div>
              <div className="text-white text-xs mt-1">
                Neural Network Status: ACTIVE
              </div>
              <div className="flex items-center justify-center space-x-2 mt-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-xs font-mono">ONLINE</span>
              </div>
            </div>
          </motion.div>
        </Html>
      </group>
    </Float>
  );
}

// Main Holographic AI Avatar Component
export default function HolographicAIAvatar() {
  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={0.8} color="#05f4ff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff1fbf" />
        <spotLight
          position={[0, 10, 0]}
          angle={0.3}
          penumbra={1}
          intensity={0.8}
          color="#05f4ff"
          castShadow
        />
        
        <AIAvatarMesh />
        
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate={true}
          autoRotate={true}
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
        />
      </Canvas>
      
      {/* Holographic overlay effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-radial from-cyan-500/10 via-transparent to-transparent animate-pulse"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(5,244,255,0.1)_0%,transparent_70%)]"></div>
      </div>
    </div>
  );
}