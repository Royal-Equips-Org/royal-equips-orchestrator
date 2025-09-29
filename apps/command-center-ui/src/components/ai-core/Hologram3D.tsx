import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, Cylinder, Torus, Text, Ring } from '@react-three/drei'
import * as THREE from 'three'

interface Hologram3DProps {
  systemStatus?: 'idle' | 'active' | 'alert' | 'processing'
  scale?: number
  liveData?: any
  voiceActivity?: boolean
}

export default function Hologram3D({ 
  systemStatus = 'active', 
  scale = 1, 
  liveData,
  voiceActivity = false 
}: Hologram3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const avatarRef = useRef<THREE.Group>(null)
  const ringsRef = useRef<THREE.Group>(null)
  const particlesRef = useRef<THREE.Points>(null)
  const energyFieldRef = useRef<THREE.Group>(null)
  
  // Enhanced holographic female AI exactly like the reference image
  const createHolographicFemaleAI = () => {
    const geometry = new THREE.Group()
    
    // Head - wireframe sphere with facial features
    const headGeometry = new THREE.SphereGeometry(0.5, 32, 32)
    const headMaterial = new THREE.MeshBasicMaterial({ 
      wireframe: true, 
      color: 0x00FFFF,
      transparent: true,
      opacity: 0.8
    })
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.y = 1.5
    geometry.add(head)
    
    // Eyes - glowing cyan points
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8)
    const eyeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00FFFF,
      emissive: 0x0088FF
    })
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.15, 1.55, 0.4)
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.15, 1.55, 0.4)
    geometry.add(leftEye, rightEye)
    
    // Torso - wireframe geometry with anatomical structure
    const torsoGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 16, 8)
    const torsoMaterial = new THREE.MeshBasicMaterial({ 
      wireframe: true, 
      color: 0x00AAFF,
      transparent: true,
      opacity: 0.6
    })
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial)
    torso.position.y = 0.3
    geometry.add(torso)
    
    // Arms - cylindrical wireframe
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.06, 0.8, 12)
    const armMaterial = new THREE.MeshBasicMaterial({ 
      wireframe: true, 
      color: 0x0099FF,
      transparent: true,
      opacity: 0.7
    })
    const leftArm = new THREE.Mesh(armGeometry, armMaterial)
    leftArm.position.set(-0.5, 0.5, 0)
    leftArm.rotation.z = Math.PI / 6
    const rightArm = new THREE.Mesh(armGeometry, armMaterial)
    rightArm.position.set(0.5, 0.5, 0)
    rightArm.rotation.z = -Math.PI / 6
    geometry.add(leftArm, rightArm)
    
    return geometry
  }

  // Enhanced particle system with holographic grid effect
  const particles = useMemo(() => {
    const count = 5000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    
    for (let i = 0; i < count; i++) {
      // Create holographic grid pattern around the AI
      const radius = 2 + Math.random() * 3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi) + 1
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      
      // Bright cyan-blue holographic colors matching the reference
      const intensity = 0.3 + Math.random() * 0.7
      colors[i * 3] = 0.02 * intensity // R
      colors[i * 3 + 1] = 0.8 * intensity // G  
      colors[i * 3 + 2] = 1.0 * intensity // B
      
      sizes[i] = Math.random() * 2 + 1
    }
    
    return { positions, colors, sizes, count }
  }, [])

  // Energy rings like in the reference image
  const energyRings = useMemo(() => {
    const rings = []
    for (let i = 0; i < 5; i++) {
      rings.push({
        radius: 1.5 + i * 0.5,
        speed: 0.001 + i * 0.0005,
        opacity: 0.8 - i * 0.1
      })
    }
    return rings
  }, [])

  // Animation based on system status and voice activity
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Gentle rotation
      groupRef.current.rotation.y += delta * 0.1
    }

    if (avatarRef.current) {
      // Breathing effect
      const breathe = Math.sin(state.clock.elapsedTime * 2) * 0.02 + 1
      avatarRef.current.scale.setScalar(breathe * scale)
      
      // Voice activity animation
      if (voiceActivity) {
        avatarRef.current.position.y = Math.sin(state.clock.elapsedTime * 8) * 0.1
      }
    }

    if (ringsRef.current) {
      // Rotate energy rings at different speeds
      ringsRef.current.children.forEach((ring, index) => {
        ring.rotation.z += delta * (0.5 + index * 0.2)
        
        // Pulse based on system status
        const pulse = systemStatus === 'processing' ? 
          Math.sin(state.clock.elapsedTime * 4) * 0.3 + 1 : 1
        ring.scale.setScalar(pulse)
      })
    }

    if (particlesRef.current) {
      // Animate particles
      particlesRef.current.rotation.y += delta * 0.2
      
      // Pulse effect for data activity
      if (liveData) {
        const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.5 + 1
        particlesRef.current.scale.setScalar(pulse)
      }
    }

    if (energyFieldRef.current) {
      // Energy field rotation
      energyFieldRef.current.rotation.x += delta * 0.3
      energyFieldRef.current.rotation.y += delta * 0.2
    }
  })

  // Status-based color scheme
  const getStatusColor = () => {
    switch (systemStatus) {
      case 'processing': return 0x00FFFF // Bright cyan
      case 'alert': return 0xFF4444     // Red
      case 'idle': return 0x4488FF      // Blue
      default: return 0x00AAFF          // Default cyan
    }
  }

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      {/* Central holographic AI avatar */}
      <group ref={avatarRef} position={[0, 0, 0]}>
        <primitive object={createHolographicFemaleAI()} />
      </group>

      {/* Energy rings around the AI */}
      <group ref={ringsRef}>
        {energyRings.map((ring, index) => (
          <Ring
            key={index}
            args={[ring.radius - 0.05, ring.radius + 0.05, 64]}
            position={[0, 0.5 + index * 0.2, 0]}
            material={
              new THREE.MeshBasicMaterial({
                color: getStatusColor(),
                transparent: true,
                opacity: ring.opacity,
                side: THREE.DoubleSide
              })
            }
          />
        ))}
      </group>

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
          <bufferAttribute
            attach="attributes-size"
            count={particles.count}
            array={particles.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          vertexColors
          transparent
          opacity={0.8}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Energy field visualization */}
      <group ref={energyFieldRef}>
        <Torus args={[2.5, 0.02, 16, 100]} position={[0, 1, 0]}>
          <meshBasicMaterial 
            color={getStatusColor()} 
            transparent 
            opacity={0.4}
            wireframe
          />
        </Torus>
        <Torus args={[3, 0.01, 16, 100]} position={[0, 1.5, 0]} rotation={[Math.PI/2, 0, 0]}>
          <meshBasicMaterial 
            color={getStatusColor()} 
            transparent 
            opacity={0.3}
            wireframe
          />
        </Torus>
      </group>

      {/* Holographic platform */}
      <Cylinder args={[3, 3, 0.05, 32]} position={[0, -0.5, 0]}>
        <meshBasicMaterial 
          color={0x003366} 
          transparent 
          opacity={0.3}
          wireframe
        />
      </Cylinder>

      {/* Status indicator text */}
      <Text
        position={[0, -1, 2]}
        fontSize={0.2}
        color={getStatusColor()}
        anchorX="center"
        anchorY="middle"
      >
        {systemStatus.toUpperCase()}
      </Text>
    </group>
  )
}