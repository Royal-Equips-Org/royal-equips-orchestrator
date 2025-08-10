import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Ring, Text, MeshDistortMaterial } from '@react-three/drei';
import { Mesh, Vector3 } from 'three';
import * as THREE from 'three';

interface HolographicHubProps {
  systemStatus: 'operational' | 'warning' | 'critical';
  activeAgents: number;
  systemLoad: number;
}

function RotatingCore({ systemStatus }: { systemStatus: string }) {
  const meshRef = useRef<Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.3;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  const color = systemStatus === 'operational' ? '#00ffff' : 
               systemStatus === 'warning' ? '#ffaa00' : '#ff4444';

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]} position={[0, 0, 0]}>
      <MeshDistortMaterial
        color={color}
        transparent
        opacity={0.6}
        distort={0.3}
        speed={2}
        roughness={0.1}
      />
    </Sphere>
  );
}

function OrbitingRings({ activeAgents }: { activeAgents: number }) {
  const rings = useMemo(() => {
    return Array.from({ length: Math.min(activeAgents, 6) }, (_, i) => ({
      id: i,
      radius: 2 + i * 0.5,
      speed: 0.5 + i * 0.1,
      color: `hsl(${180 + i * 60}, 70%, 50%)`,
    }));
  }, [activeAgents]);

  return (
    <group>
      {rings.map((ring) => (
        <OrbitingRing
          key={ring.id}
          radius={ring.radius}
          speed={ring.speed}
          color={ring.color}
        />
      ))}
    </group>
  );
}

function OrbitingRing({ radius, speed, color }: { radius: number; speed: number; color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.elapsedTime * speed;
    }
  });

  return (
    <group ref={groupRef}>
      <Ring args={[radius - 0.05, radius + 0.05, 64]} position={[0, 0, 0]}>
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </Ring>
      <Sphere args={[0.1, 16, 16]} position={[radius, 0, 0]}>
        <meshBasicMaterial color={color} />
      </Sphere>
    </group>
  );
}

function DataStreams({ systemLoad }: { systemLoad: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const particleCount = Math.floor(systemLoad * 1000);
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    
    return positions;
  }, [systemLoad]);

  useFrame((state) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= 0.01; // Move particles downward
        if (positions[i + 1] < -5) {
          positions[i + 1] = 5; // Reset to top
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#00ffff" size={0.02} transparent opacity={0.6} />
    </points>
  );
}

function SystemStatusText({ systemStatus, activeAgents, systemLoad }: { 
  systemStatus: string; 
  activeAgents: number; 
  systemLoad: number; 
}) {
  const color = systemStatus === 'operational' ? '#00ff41' : 
               systemStatus === 'warning' ? '#ffaa00' : '#ff4444';

  return (
    <group position={[0, -3, 0]}>
      <Text
        position={[0, 0, 0]}
        fontSize={0.3}
        color={color}
        anchorX="center"
        anchorY="middle"
      >
        {systemStatus.toUpperCase()}
      </Text>
      <Text
        position={[0, -0.5, 0]}
        fontSize={0.2}
        color="#00ffff"
        anchorX="center"
        anchorY="middle"
      >
        {activeAgents} AGENTS ACTIVE
      </Text>
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        LOAD: {(systemLoad * 100).toFixed(1)}%
      </Text>
    </group>
  );
}

export const HolographicHub: React.FC<HolographicHubProps> = ({ 
  systemStatus, 
  activeAgents, 
  systemLoad 
}) => {
  return (
    <div style={{ height: '400px', width: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        <RotatingCore systemStatus={systemStatus} />
        <OrbitingRings activeAgents={activeAgents} />
        <DataStreams systemLoad={systemLoad} />
        <SystemStatusText 
          systemStatus={systemStatus} 
          activeAgents={activeAgents} 
          systemLoad={systemLoad} 
        />
      </Canvas>
    </div>
  );
};