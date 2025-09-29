import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Plane, Line } from '@react-three/drei'
import * as THREE from 'three'

interface DataPanelsProps {
  liveData?: any
  shopifyMetrics?: any
  systemHealth?: any
  marketingData?: any
}

export default function DataPanels({ 
  liveData, 
  shopifyMetrics, 
  systemHealth, 
  marketingData 
}: DataPanelsProps) {
  const panelsRef = useRef<THREE.Group>(null)
  const chartsRef = useRef<THREE.Group>(null)

  // Create holographic data panels positioned around the AI like in the reference image
  const panels = useMemo(() => {
    const panelConfigs = [
      // Top panels
      { position: [-4, 3, 0], rotation: [0, Math.PI/6, 0], type: 'world-map' },
      { position: [0, 3.5, 0], rotation: [0, 0, 0], type: 'system-status' },
      { position: [4, 3, 0], rotation: [0, -Math.PI/6, 0], type: 'analytics' },
      
      // Left side panels
      { position: [-5, 1, -2], rotation: [0, Math.PI/3, 0], type: 'revenue' },
      { position: [-5, 0, 0], rotation: [0, Math.PI/3, 0], type: 'orders' },
      { position: [-5, -1, 2], rotation: [0, Math.PI/3, 0], type: 'inventory' },
      
      // Right side panels
      { position: [5, 1, -2], rotation: [0, -Math.PI/3, 0], type: 'customers' },
      { position: [5, 0, 0], rotation: [0, -Math.PI/3, 0], type: 'marketing' },
      { position: [5, -1, 2], rotation: [0, -Math.PI/3, 0], type: 'performance' },
      
      // Bottom panels
      { position: [-3, -2, 3], rotation: [-Math.PI/6, Math.PI/4, 0], type: 'logs' },
      { position: [0, -2.5, 4], rotation: [-Math.PI/6, 0, 0], type: 'network' },
      { position: [3, -2, 3], rotation: [-Math.PI/6, -Math.PI/4, 0], type: 'security' }
    ]
    
    return panelConfigs
  }, [])

  // Create holographic chart data visualizations
  const createChartVisualization = (type: string, data: any) => {
    const points = []
    const colors = []
    
    switch (type) {
      case 'world-map':
        // Create world map points
        for (let i = 0; i < 100; i++) {
          const x = (Math.random() - 0.5) * 3
          const y = (Math.random() - 0.5) * 2
          points.push(x, y, 0.01)
          colors.push(0, 0.8, 1) // Cyan
        }
        break
        
      case 'analytics':
        // Create line chart
        for (let i = 0; i < 50; i++) {
          const x = (i / 50 - 0.5) * 3
          const y = Math.sin(i * 0.3) * 0.5 + Math.random() * 0.2
          points.push(x, y, 0.01)
          colors.push(0, 1, 0.8) // Cyan-green
        }
        break
        
      case 'revenue':
        // Create bar chart
        for (let i = 0; i < 12; i++) {
          const x = (i / 12 - 0.5) * 3
          const height = Math.random() * 1.5 + 0.2
          for (let j = 0; j < 5; j++) {
            const y = (j / 5) * height - 0.5
            points.push(x, y, 0.01)
            colors.push(0.2, 0.9, 1)
          }
        }
        break
        
      default:
        // Generic data points
        for (let i = 0; i < 30; i++) {
          points.push(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 2,
            0.01
          )
          colors.push(0, 0.7, 1)
        }
    }
    
    return { points: new Float32Array(points), colors: new Float32Array(colors) }
  }

  // Get panel content based on type and live data
  const getPanelContent = (type: string) => {
    switch (type) {
      case 'world-map':
        return {
          title: 'GLOBAL SALES',
          data: shopifyMetrics?.globalSales || '$45,230',
          subtitle: 'Real-time Revenue'
        }
      case 'system-status':
        return {
          title: 'SYSTEM STATUS',
          data: systemHealth?.status || 'OPERATIONAL',
          subtitle: 'All Systems Online'
        }
      case 'analytics':
        return {
          title: 'ANALYTICS',
          data: liveData?.conversionRate || '3.2%',
          subtitle: 'Conversion Rate'
        }
      case 'revenue':
        return {
          title: 'REVENUE',
          data: liveData?.revenue || '$127,543',
          subtitle: 'Today +12.5%'
        }
      case 'orders':
        return {
          title: 'ORDERS',
          data: liveData?.orders || '342',
          subtitle: 'Active Orders'
        }
      case 'inventory':
        return {
          title: 'INVENTORY',
          data: liveData?.products || '1,847',
          subtitle: 'Products'
        }
      case 'customers':
        return {
          title: 'CUSTOMERS',
          data: liveData?.customers || '5,239',
          subtitle: 'Active Users'
        }
      case 'marketing':
        return {
          title: 'CAMPAIGNS',
          data: marketingData?.active || '8',
          subtitle: 'Running'
        }
      case 'performance':
        return {
          title: 'PERFORMANCE',
          data: systemHealth?.uptime || '99.7%',
          subtitle: 'Uptime'
        }
      case 'logs':
        return {
          title: 'LOGS',
          data: 'LIVE',
          subtitle: 'System Events'
        }
      case 'network':
        return {
          title: 'NETWORK',
          data: '2.4 GB/s',
          subtitle: 'Bandwidth'
        }
      case 'security':
        return {
          title: 'SECURITY',
          data: 'SECURE',
          subtitle: 'No Threats'
        }
      default:
        return {
          title: 'DATA',
          data: 'LIVE',
          subtitle: 'Monitoring'
        }
    }
  }

  // Animation for data panels
  useFrame((state, delta) => {
    if (panelsRef.current) {
      // Gentle floating animation
      panelsRef.current.children.forEach((panel, index) => {
        const offset = index * 0.5
        panel.position.y += Math.sin(state.clock.elapsedTime * 2 + offset) * 0.01
      })
    }

    if (chartsRef.current) {
      // Animate chart data
      chartsRef.current.children.forEach((chart, index) => {
        if (chart.material && chart.material.opacity) {
          chart.material.opacity = 0.7 + Math.sin(state.clock.elapsedTime * 3 + index) * 0.3
        }
      })
    }
  })

  return (
    <group>
      {/* Data panels */}
      <group ref={panelsRef}>
        {panels.map((panel, index) => {
          const content = getPanelContent(panel.type)
          const chartData = createChartVisualization(panel.type, liveData)
          
          return (
            <group 
              key={index} 
              position={panel.position} 
              rotation={panel.rotation}
            >
              {/* Panel background */}
              <Plane args={[3.5, 2.5]} position={[0, 0, -0.05]}>
                <meshBasicMaterial 
                  color={0x001122} 
                  transparent 
                  opacity={0.6}
                  side={THREE.DoubleSide}
                />
              </Plane>
              
              {/* Panel border */}
              <Line
                points={[
                  [-1.75, -1.25, 0], [1.75, -1.25, 0], 
                  [1.75, 1.25, 0], [-1.75, 1.25, 0], 
                  [-1.75, -1.25, 0]
                ]}
                color={0x00AAFF}
                lineWidth={2}
              />
              
              {/* Panel title */}
              <Text
                position={[0, 1, 0.01]}
                fontSize={0.15}
                color={0x00FFFF}
                anchorX="center"
                anchorY="middle"
                font="/fonts/orbitron-black.woff"
              >
                {content.title}
              </Text>
              
              {/* Main data display */}
              <Text
                position={[0, 0.2, 0.01]}
                fontSize={0.25}
                color={0x00DDFF}
                anchorX="center"
                anchorY="middle"
                font="/fonts/orbitron-bold.woff"
              >
                {content.data}
              </Text>
              
              {/* Subtitle */}
              <Text
                position={[0, -0.3, 0.01]}
                fontSize={0.1}
                color={0x0088CC}
                anchorX="center"
                anchorY="middle"
              >
                {content.subtitle}
              </Text>
              
              {/* Data visualization */}
              <points position={[0, -0.8, 0.02]}>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={chartData.points.length / 3}
                    array={chartData.points}
                    itemSize={3}
                  />
                  <bufferAttribute
                    attach="attributes-color"
                    count={chartData.colors.length / 3}
                    array={chartData.colors}
                    itemSize={3}
                  />
                </bufferGeometry>
                <pointsMaterial
                  size={0.03}
                  vertexColors
                  transparent
                  opacity={0.8}
                  blending={THREE.AdditiveBlending}
                />
              </points>
            </group>
          )
        })}
      </group>

      {/* Additional holographic grid lines connecting panels */}
      <group ref={chartsRef}>
        {panels.map((panel, index) => (
          <Line
            key={`connection-${index}`}
            points={[[0, 0, 0], panel.position]}
            color={0x003366}
            lineWidth={1}
            transparent
            opacity={0.3}
          />
        ))}
      </group>

      {/* Holographic floor grid */}
      <group position={[0, -3, 0]}>
        {Array.from({ length: 21 }, (_, i) => (
          <Line
            key={`grid-x-${i}`}
            points={[[-10, 0, -10 + i], [10, 0, -10 + i]]}
            color={0x003366}
            lineWidth={1}
            transparent
            opacity={0.2}
          />
        ))}
        {Array.from({ length: 21 }, (_, i) => (
          <Line
            key={`grid-z-${i}`}
            points={[[-10 + i, 0, -10], [-10 + i, 0, 10]]}
            color={0x003366}
            lineWidth={1}
            transparent
            opacity={0.2}
          />
        ))}
      </group>
    </group>
  )
}