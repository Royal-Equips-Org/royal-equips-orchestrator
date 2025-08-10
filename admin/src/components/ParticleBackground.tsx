import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleSystemProps {
  particleCount?: number;
  speed?: number;
  color?: string;
}

function ParticleField({ particleCount = 2000, speed = 0.5, color = '#00ffff' }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  
  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      // Random positions in a large cube
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      
      // Random velocities
      velocities[i * 3] = (Math.random() - 0.5) * speed;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * speed;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * speed;
    }
    
    return { positions, velocities };
  }, [particleCount, speed]);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Update positions based on velocities
        positions[i3] += velocities[i3] * delta * 10;
        positions[i3 + 1] += velocities[i3 + 1] * delta * 10;
        positions[i3 + 2] += velocities[i3 + 2] * delta * 10;
        
        // Wrap around boundaries
        if (positions[i3] > 50) positions[i3] = -50;
        if (positions[i3] < -50) positions[i3] = 50;
        if (positions[i3 + 1] > 50) positions[i3 + 1] = -50;
        if (positions[i3 + 1] < -50) positions[i3 + 1] = 50;
        if (positions[i3 + 2] > 50) positions[i3 + 2] = -50;
        if (positions[i3 + 2] < -50) positions[i3 + 2] = 50;
      }
      
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.8}
        transparent
        opacity={0.6}
        sizeAttenuation={true}
      />
    </points>
  );
}

function ConnectionLines({ particleCount = 100 }: { particleCount: number }) {
  const linesRef = useRef<THREE.LineSegments>(null);
  
  const { positions } = useMemo(() => {
    const positions = new Float32Array(particleCount * 6); // 2 points per line, 3 coords per point
    
    for (let i = 0; i < particleCount; i++) {
      const i6 = i * 6;
      
      // Random line endpoints
      positions[i6] = (Math.random() - 0.5) * 80;
      positions[i6 + 1] = (Math.random() - 0.5) * 80;
      positions[i6 + 2] = (Math.random() - 0.5) * 80;
      
      positions[i6 + 3] = (Math.random() - 0.5) * 80;
      positions[i6 + 4] = (Math.random() - 0.5) * 80;
      positions[i6 + 5] = (Math.random() - 0.5) * 80;
    }
    
    return { positions };
  }, [particleCount]);

  useFrame((state) => {
    if (linesRef.current) {
      linesRef.current.rotation.x = state.clock.elapsedTime * 0.1;
      linesRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount * 2}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#ff00ff" transparent opacity={0.2} />
    </lineSegments>
  );
}

export const ParticleBackground: React.FC<ParticleSystemProps> = ({ 
  particleCount = 2000, 
  speed = 0.5, 
  color = '#00ffff' 
}) => {
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', 
      zIndex: -1,
      pointerEvents: 'none'
    }}>
      <Canvas
        camera={{ position: [0, 0, 30], fov: 75 }}
        style={{ background: 'transparent' }}
      >
        <ParticleField particleCount={particleCount} speed={speed} color={color} />
        <ConnectionLines particleCount={50} />
      </Canvas>
    </div>
  );
};