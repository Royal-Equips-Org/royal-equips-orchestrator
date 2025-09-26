import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Box, Sphere, Cylinder } from '@react-three/drei'
import * as THREE from 'three'
import type { EmpireMetrics } from '@/types/empire'

interface KPIVisualizationProps {
  metrics: EmpireMetrics | null
}

const FloatingKPI: React.FC<{ 
  position: [number, number, number]
  value: string | number
  label: string
  color: string
}> = ({ position, value, label, color }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.2
    }
  })

  return (
    <group position={position}>
      <Box ref={meshRef} args={[1.5, 1, 0.1]}>
      </Box>
      
      <Text
        position={[0, 0, 0.1]}
        fontSize={0.3}
        color={color}
        anchorX="center"
        anchorY="middle"
        font="/fonts/RobotoMono-Bold.ttf"
      >
        {String(value)}
      </Text>
      
      <Text
        position={[0, -0.6, 0.1]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  )
}

const AgentNode: React.FC<{
  position: [number, number, number]
  active: boolean
  name: string
}> = ({ position, active, name }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.5
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3
      
      if (active) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1
        meshRef.current.scale.set(scale, scale, scale)
      }
    }
  })

  return (
    <group position={position}>
      <Sphere ref={meshRef} args={[0.3, 16, 16]}>
        <meshBasicMaterial 
          color={active ? "#00FFFF" : "#666666"} 
          transparent 
        />
      </Sphere>
      
      <Text
        position={[0, -0.6, 0]}
        fontSize={0.1}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>
    </group>
  )
}

const NetworkConnection: React.FC<{
  start: [number, number, number]
  end: [number, number, number]
  active: boolean
}> = ({ start, end, active }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  const distance = Math.sqrt(
    Math.pow(end[0] - start[0], 2) + 
    Math.pow(end[1] - start[1], 2) + 
    Math.pow(end[2] - start[2], 2)
  )
  
  const midpoint: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2
  ]
  
  useFrame((state) => {
    if (meshRef.current && active) {
      const material = meshRef.current.material as any
      if (material.opacity !== undefined) {
        material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 4) * 0.2
      }
    }
  })

  return (
    <Cylinder
      ref={meshRef}
      position={midpoint}
      args={[0.01, 0.01, distance, 8]}
      rotation={[Math.PI / 2, 0, Math.atan2(end[1] - start[1], end[0] - start[0])]}
    >
      <meshBasicMaterial 
        color={active ? "#00FFFF" : "#333333"} 
        transparent 
      />
    </Cylinder>
  )
}

const KPIVisualization: React.FC<KPIVisualizationProps> = ({ metrics }) => {
  const centerRef = useRef<THREE.Group>(null)
  
  useFrame((state) => {
    if (centerRef.current) {
      centerRef.current.rotation.y = state.clock.elapsedTime * 0.1
    }
  })

  // Remove hardcoded agent positions - these will be handled by the parent 3D scene
  return (
    <group ref={centerRef}>
      {/* Central Hub */}
      <Sphere args={[0.5, 32, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial 
          color="#FFD700" 
          transparent 
          opacity={0.7}
          emissive="#FFD700"
          emissiveIntensity={0.3}
        />
      </Sphere>
      
      <Text
        position={[0, 0, 0]}
        fontSize={0.2}
        color="#000"
        anchorX="center"
        anchorY="middle"
        font="/fonts/roboto.woff"
      >
        ROYAL
      </Text>

      {/* KPI Displays - using real metrics */}
      <FloatingKPI
        position={[0, 4, 0]}
        value={metrics?.active_agents || 0}
        label="Active Agents"
        color="#00FFFF"
      />
      
      <FloatingKPI
        position={[4, 0, 0]}
        value={metrics?.total_opportunities || 0}
        label="Opportunities"
        color="#00FF00"
      />
      
      <FloatingKPI
        position={[-4, 0, 0]}
        value={metrics ? `${metrics.system_uptime}%` : '0%'}
        label="System Uptime"
        color="#FFFF00"
      />

      <FloatingKPI
        position={[0, -4, 0]}
        value={metrics ? `$${(metrics.revenue_progress / 1000000).toFixed(1)}M` : '$0M'}
        label="Revenue Progress"
        color="#FF00FF"
      />

      {/* Holographic Grid */}
      <gridHelper args={[10, 10, "#00FFFF", "#003333"]} position={[0, -3, 0]} />
    </group>
  )
}

export default KPIVisualization