import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, Cylinder, Torus, Text } from '@react-three/drei'
import * as THREE from 'three'

interface HolographicFemaleAIProps {
  systemStatus?: 'idle' | 'active' | 'alert' | 'processing'
  scale?: number
}

export default function HolographicFemaleAI({ systemStatus = 'active', scale = 1 }: HolographicFemaleAIProps) {
  const groupRef = useRef<THREE.Group>(null)
  const avatarRef = useRef<THREE.Group>(null)
  const ringsRef = useRef<THREE.Group>(null)
  const particlesRef = useRef<THREE.Points>(null)
  
  // Helper to determine optimal particle count based on device capabilities
  function getOptimalParticleCount() {
    // Use deviceMemory (GB) and hardwareConcurrency (CPU cores) if available
    const memory = (navigator as any).deviceMemory || 4; // default to 4GB if unavailable
    const cores = navigator.hardwareConcurrency || 4; // default to 4 cores if unavailable
    // Heuristic: scale particle count between 1000 and 5000
    if (memory < 2 || cores < 4) return 1000;
    if (memory < 4 || cores < 6) return 2500;
    if (memory < 8 || cores < 8) return 4000;
    return 5000;
  }

  // Enhanced particle system for full holographic effect
  const particles = useMemo(() => {
    const count = getOptimalParticleCount();
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    
    for (let i = 0; i < count; i++) {
      const radius = 1 + Math.random() * 4
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi) + 1
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      
      // Bright cyan-blue holographic colors
      colors[i * 3] = 0.02 + Math.random() * 0.2 // R
      colors[i * 3 + 1] = 0.7 + Math.random() * 0.3 // G
      colors[i * 3 + 2] = 0.9 + Math.random() * 0.1 // B
    }
    
    return { positions, colors, count }
  }, [])
  
  // Animation loop for holographic movement
  useFrame((state) => {
    const time = state.clock.elapsedTime
    
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.05
    }
    
    if (avatarRef.current) {
      // Gentle floating
      avatarRef.current.position.y = Math.sin(time * 0.8) * 0.1
      
      // Status-based pulsing
      const pulse = systemStatus === 'processing' ? 1.05 + Math.sin(time * 6) * 0.05 :
                   systemStatus === 'alert' ? 1.03 + Math.sin(time * 12) * 0.03 :
                   1.0 + Math.sin(time * 3) * 0.02
      
      avatarRef.current.scale.setScalar(pulse)
    }
    
    if (ringsRef.current) {
      ringsRef.current.rotation.y = time * 0.1
      ringsRef.current.rotation.x = Math.sin(time * 0.2) * 0.1
    }
    
    if (particlesRef.current) {
      particlesRef.current.rotation.y = time * 0.02
      particlesRef.current.rotation.x = Math.sin(time * 0.15) * 0.05
    }
  })
  
  const statusColor = useMemo(() => {
    switch (systemStatus) {
      case 'alert': return '#ff4444'
      case 'processing': return '#00aaff'
      case 'idle': return '#004466'
      default: return '#00ccff'
    }
  }, [systemStatus])
  
  return (
    <group ref={groupRef} scale={[scale, scale, scale]} position={[0, -1, 0]}>
      {/* Enhanced particle system */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particles.count}
            array={particles.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particles.count}
            array={particles.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.015}
          vertexColors
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      {/* Detailed female holographic avatar */}
      <group ref={avatarRef}>
        {/* Head - more detailed */}
        <Sphere args={[0.35, 32, 32]} position={[0, 2.1, 0]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.9}
          />
        </Sphere>
        
        {/* Face details */}
        {/* Eyes */}
        <Sphere args={[0.05, 16, 16]} position={[-0.12, 2.15, 0.25]}>
          <meshBasicMaterial color={statusColor} transparent opacity={1} />
        </Sphere>
        <Sphere args={[0.05, 16, 16]} position={[0.12, 2.15, 0.25]}>
          <meshBasicMaterial color={statusColor} transparent opacity={1} />
        </Sphere>
        
        {/* Neck */}
        <Cylinder args={[0.15, 0.18, 0.3, 16]} position={[0, 1.75, 0]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.8}
          />
        </Cylinder>
        
        {/* Torso - feminine shape */}
        <Sphere args={[0.45, 16, 16]} position={[0, 1.2, 0]} scale={[1, 1.2, 0.8]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.7}
          />
        </Sphere>
        
        {/* Chest details */}
        <Sphere args={[0.15, 12, 12]} position={[-0.2, 1.35, 0.15]} scale={[1, 0.8, 1]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.6}
          />
        </Sphere>
        <Sphere args={[0.15, 12, 12]} position={[0.2, 1.35, 0.15]} scale={[1, 0.8, 1]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.6}
          />
        </Sphere>
        
        {/* Waist */}
        <Cylinder args={[0.25, 0.35, 0.4, 16]} position={[0, 0.65, 0]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.6}
          />
        </Cylinder>
        
        {/* Arms */}
        <Cylinder args={[0.08, 0.12, 0.8, 12]} position={[-0.6, 1.2, 0]} rotation={[0, 0, -0.3]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.7}
          />
        </Cylinder>
        <Cylinder args={[0.08, 0.12, 0.8, 12]} position={[0.6, 1.2, 0]} rotation={[0, 0, 0.3]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.7}
          />
        </Cylinder>
        
        {/* Forearms */}
        <Cylinder args={[0.06, 0.08, 0.7, 12]} position={[-0.9, 0.7, 0]} rotation={[0, 0, -0.5]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.6}
          />
        </Cylinder>
        <Cylinder args={[0.06, 0.08, 0.7, 12]} position={[0.9, 0.7, 0]} rotation={[0, 0, 0.5]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.6}
          />
        </Cylinder>
        
        {/* Hands */}
        <Sphere args={[0.08, 12, 12]} position={[-1.1, 0.3, 0]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.8}
          />
        </Sphere>
        <Sphere args={[0.08, 12, 12]} position={[1.1, 0.3, 0]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.8}
          />
        </Sphere>
        
        {/* Hips */}
        <Sphere args={[0.4, 16, 16]} position={[0, 0.2, 0]} scale={[1.2, 0.6, 1]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.6}
          />
        </Sphere>
        
        {/* Thighs */}
        <Cylinder args={[0.12, 0.18, 0.9, 16]} position={[-0.15, -0.5, 0]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.7}
          />
        </Cylinder>
        <Cylinder args={[0.12, 0.18, 0.9, 16]} position={[0.15, -0.5, 0]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.7}
          />
        </Cylinder>
        
        {/* Lower legs */}
        <Cylinder args={[0.08, 0.12, 0.8, 16]} position={[-0.15, -1.3, 0]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.6}
          />
        </Cylinder>
        <Cylinder args={[0.08, 0.12, 0.8, 16]} position={[0.15, -1.3, 0]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.6}
          />
        </Cylinder>
        
        {/* Feet */}
        <Sphere args={[0.1, 12, 8]} position={[-0.15, -1.7, 0.1]} scale={[1, 0.5, 1.5]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.7}
          />
        </Sphere>
        <Sphere args={[0.1, 12, 8]} position={[0.15, -1.7, 0.1]} scale={[1, 0.5, 1.5]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.7}
          />
        </Sphere>
      </group>
      
      {/* Multiple orbital rings like in reference */}
      <group ref={ringsRef}>
        {/* Large overhead ring */}
        <Torus args={[3.5, 0.05, 8, 64]} position={[0, 3.5, 0]} rotation={[0, 0, 0]}>
          <meshBasicMaterial
            color={statusColor}
            transparent
            opacity={0.6}
          />
        </Torus>
        
        {/* Medium ring */}
        <Torus args={[2.8, 0.04, 8, 64]} position={[0, 3.2, 0]} rotation={[0.2, 0, 0]}>
          <meshBasicMaterial
            color={statusColor}
            transparent
            opacity={0.5}
          />
        </Torus>
        
        {/* Small ring */}
        <Torus args={[2.2, 0.03, 8, 64]} position={[0, 2.9, 0]} rotation={[0.4, 0, 0]}>
          <meshBasicMaterial
            color={statusColor}
            transparent
            opacity={0.4}
          />
        </Torus>
        
        {/* Base platform ring */}
        <Torus args={[2.5, 0.08, 16, 100]} position={[0, -1.8, 0]}>
          <meshBasicMaterial
            color={statusColor}
            transparent
            opacity={0.8}
          />
        </Torus>
      </group>
      
      {/* Grid lines on avatar */}
      <group>
        {/* Vertical grid lines */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2
          const x = Math.sin(angle) * 0.4
          const z = Math.cos(angle) * 0.4
          return (
            <Cylinder
              key={`v-${i}`}
              args={[0.002, 0.002, 3.8, 4]}
              position={[x, 0.1, z]}
            >
              <meshBasicMaterial
                color={statusColor}
                transparent
                opacity={0.3}
              />
            </Cylinder>
          )
        })}
        
        {/* Horizontal grid lines */}
        {Array.from({ length: 6 }).map((_, i) => {
          const y = -1.5 + i * 0.7
          return (
            <Torus
              key={`h-${i}`}
              args={[0.4 + i * 0.1, 0.002, 4, 32]}
              position={[0, y, 0]}
            >
              <meshBasicMaterial
                color={statusColor}
                transparent
                opacity={0.2}
              />
            </Torus>
          )
        })}
      </group>
    </group>
  )
}