import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, Text, Ring, Torus } from '@react-three/drei'
import * as THREE from 'three'

interface HolographicAIProps {
  systemStatus?: 'idle' | 'active' | 'alert' | 'processing'
  scale?: number
}

export default function HolographicAI({ systemStatus = 'active', scale = 1 }: HolographicAIProps) {
  const groupRef = useRef<THREE.Group>(null)
  const avatarGroupRef = useRef<THREE.Group>(null)
  const ringsRef = useRef<THREE.Group>(null)
  const particlesRef = useRef<THREE.Points>(null)
  
  // Generate particle system for holographic effect
  const particles = useMemo(() => {
    const count = 2000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    
    for (let i = 0; i < count; i++) {
      // Create sphere distribution
      const radius = 2 + Math.random() * 3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi)
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      
      // Cyan-blue color scheme
      colors[i * 3] = 0.02 + Math.random() * 0.3 // R
      colors[i * 3 + 1] = 0.6 + Math.random() * 0.4 // G
      colors[i * 3 + 2] = 0.8 + Math.random() * 0.2 // B
    }
    
    return { positions, colors, count }
  }, [])
  
  // Animation loop
  useFrame((state) => {
    const time = state.clock.elapsedTime
    
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.1
    }
    
    if (avatarGroupRef.current) {
      // Gentle floating animation
      avatarGroupRef.current.position.y = Math.sin(time * 0.5) * 0.1
      
      // Pulse effect based on system status
      const pulse = systemStatus === 'processing' ? 1.1 + Math.sin(time * 4) * 0.1 :
                   systemStatus === 'alert' ? 1.05 + Math.sin(time * 8) * 0.05 :
                   1.0 + Math.sin(time * 2) * 0.02
      
      avatarGroupRef.current.scale.setScalar(pulse)
    }
    
    if (ringsRef.current) {
      ringsRef.current.rotation.x = time * 0.3
      ringsRef.current.rotation.z = time * 0.2
    }
    
    if (particlesRef.current) {
      particlesRef.current.rotation.y = time * 0.05
      particlesRef.current.rotation.x = Math.sin(time * 0.1) * 0.1
    }
  })
  
  const statusColor = useMemo(() => {
    switch (systemStatus) {
      case 'alert': return '#ff4444'
      case 'processing': return '#ffaa00'
      case 'idle': return '#444444'
      default: return '#05f4ff'
    }
  }, [systemStatus])
  
  return (
    <group ref={groupRef} scale={[scale, scale, scale]} position={[0, 0, 0]}>
      {/* Particle system for holographic effect */}
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
          size={0.02}
          vertexColors
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      {/* Main holographic avatar */}
      <group ref={avatarGroupRef}>
        {/* Head */}
        <Sphere args={[0.4, 32, 32]} position={[0, 1.6, 0]}>
          <meshBasicMaterial
            color={statusColor}
            wireframe
            transparent
            opacity={0.8}
          />
        </Sphere>
        
        {/* Body structure - simplified humanoid wireframe */}
        <group>
          {/* Torso */}
          <Sphere args={[0.6, 16, 16]} position={[0, 0.5, 0]} scale={[1, 1.5, 0.7]}>
            <meshBasicMaterial
              color={statusColor}
              wireframe
              transparent
              opacity={0.6}
            />
          </Sphere>
          
          {/* Arms */}
          <Sphere args={[0.15, 8, 8]} position={[-0.8, 0.8, 0]} scale={[1, 3, 1]}>
            <meshBasicMaterial
              color={statusColor}
              wireframe
              transparent
              opacity={0.5}
            />
          </Sphere>
          <Sphere args={[0.15, 8, 8]} position={[0.8, 0.8, 0]} scale={[1, 3, 1]}>
            <meshBasicMaterial
              color={statusColor}
              wireframe
              transparent
              opacity={0.5}
            />
          </Sphere>
          
          {/* Legs */}
          <Sphere args={[0.2, 8, 8]} position={[-0.3, -0.8, 0]} scale={[1, 2.5, 1]}>
            <meshBasicMaterial
              color={statusColor}
              wireframe
              transparent
              opacity={0.5}
            />
          </Sphere>
          <Sphere args={[0.2, 8, 8]} position={[0.3, -0.8, 0]} scale={[1, 2.5, 1]}>
            <meshBasicMaterial
              color={statusColor}
              wireframe
              transparent
              opacity={0.5}
            />
          </Sphere>
        </group>
      </group>
      
      {/* Orbital rings */}
      <group ref={ringsRef}>
        <Ring args={[2.5, 2.7, 64]} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial
            color={statusColor}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </Ring>
        <Ring args={[3.2, 3.4, 64]} rotation={[Math.PI / 3, 0, Math.PI / 4]}>
          <meshBasicMaterial
            color={statusColor}
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
          />
        </Ring>
        <Ring args={[3.8, 4.0, 64]} rotation={[Math.PI / 4, Math.PI / 6, 0]}>
          <meshBasicMaterial
            color={statusColor}
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
          />
        </Ring>
      </group>
      
      {/* Base platform */}
      <Torus args={[1.8, 0.1, 16, 100]} position={[0, -2.5, 0]}>
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={0.4}
        />
      </Torus>
      
      {/* Status indicator */}
      <Text
        position={[0, -3.2, 0]}
        fontSize={0.3}
        color={statusColor}
        anchorX="center"
        anchorY="middle"
      >
        AIRA AI SYSTEM - {systemStatus.toUpperCase()}
      </Text>
    </group>
  )
}