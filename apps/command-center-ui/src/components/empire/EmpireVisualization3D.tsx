// 3D Empire Visualization Component
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Sphere, Line } from '@react-three/drei';
import { Vector3 } from 'three';
import * as THREE from 'three';
import type { Agent } from '@/types/empire';

function AgentNode({ position, status, label, type }: {
  position: [number, number, number];
  status: 'active' | 'inactive' | 'deploying' | 'error';
  label: string;
  type: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      
      // Pulsing effect for active agents
      if (status === 'active') {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
        meshRef.current.scale.setScalar(scale);
      }
    }
  });

  const getColor = () => {
    switch (status) {
      case 'active':
        return '#00FF00';
      case 'deploying':
        return '#FFFF00';
      case 'error':
        return '#FF0000';
      default:
        return '#666666';
    }
  };

  const getSize = () => {
    switch (type) {
      case 'automation':
        return 0.3; // Master coordinator - larger
      case 'research':
        return 0.25;
      case 'supplier':
        return 0.22;
      default:
        return 0.2;
    }
  };

  return (
    <group position={position}>
      <Sphere ref={meshRef} args={[getSize(), 16, 16]}>
        <meshStandardMaterial 
          color={getColor()} 
          transparent 
          opacity={status === 'active' ? 0.8 : 0.4}
          emissive={getColor()}
          emissiveIntensity={status === 'active' ? 0.2 : 0.1}
        />
      </Sphere>
      
      {/* Agent label */}
      <Text
        position={[0, -0.5, 0]}
        fontSize={0.12}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {label.split(' ')[0]}
      </Text>
    </group>
  );
}

function ConnectionLine({ start, end, active }: {
  start: [number, number, number];
  end: [number, number, number];
  active: boolean;
}) {
  const points = useMemo(() => [
    new Vector3(...start),
    new Vector3(...end)
  ], [start, end]);

  return (
    <Line
      points={points}
      color={active ? "#00FFFF" : "#333333"}
      lineWidth={active ? 2 : 1}
      transparent
      opacity={active ? 0.5 : 0.2}
    />
  );
}

function CentralHub() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <Sphere ref={meshRef} args={[0.4, 20, 20]}>
        <meshStandardMaterial 
          color="#FFD700" 
          transparent 
          opacity={0.7}
          emissive="#FFD700"
          emissiveIntensity={0.3}
        />
      </Sphere>
      
      {/* Crown symbol */}
      <Text
        position={[0, 0, 0.41]}
        fontSize={0.3}
        color="#FFD700"
        anchorX="center"
        anchorY="middle"
      >
        👑
      </Text>
      
      <Text
        position={[0, -0.7, 0]}
        fontSize={0.15}
        color="#FFD700"
        anchorX="center"
        anchorY="middle"
      >
        EMPIRE HQ
      </Text>
    </group>
  );
}

interface EmpireVisualization3DProps {
  agents?: Agent[];
}

export default function EmpireVisualization3D({ agents = [] }: EmpireVisualization3DProps) {
  // Generate agent positions algorithmically from live data
  const agentPositions = useMemo(() => {
    if (agents.length === 0) {
      return [];
    }
    
    return agents.map((agent, index) => {
      const angle = (index * Math.PI * 2) / agents.length;
      const radius = 2.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (Math.random() - 0.5) * 1; // Add some vertical variation
      
      return {
        id: agent.id,
        position: [x, y, z] as [number, number, number],
        label: agent.name,
        type: agent.type,
        status: agent.status,
      };
    });
  }, [agents]);

  // Connection lines between agents and hub
  const connections = useMemo(() => 
    agentPositions.map(agent => ({
      start: [0, 0, 0] as [number, number, number],
      end: agent.position,
      active: agent.status === 'active'
    })), [agentPositions]
  );

  return (
    <group>
      {/* Central Hub */}
      <CentralHub />

      {/* Agent Nodes */}
      {agentPositions.map((agent) => (
        <AgentNode
          key={agent.id}
          position={agent.position}
          status={agent.status}
          label={agent.label}
          type={agent.type}
        />
      ))}

      {/* Connection Lines */}
      {connections.map((connection, index) => (
        <ConnectionLine
          key={index}
          start={connection.start}
          end={connection.end}
          active={connection.active}
        />
      ))}

      {/* Orbital Rings */}
      <group>
        {[1.5, 2.5, 3.5].map((radius, index) => (
          <mesh key={index} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius, 0.01, 8, 64]} />
            <meshBasicMaterial 
              color="#00FFFF" 
              transparent 
              opacity={0.1 - index * 0.03} 
            />
          </mesh>
        ))}
      </group>

      {/* Particle Field */}
      <group>
        {Array.from({ length: 50 }, (_, i) => {
          const x = (Math.random() - 0.5) * 10;
          const y = (Math.random() - 0.5) * 10;
          const z = (Math.random() - 0.5) * 10;
          
          return (
            <mesh key={i} position={[x, y, z]}>
              <sphereGeometry args={[0.02]} />
              <meshBasicMaterial 
                color="#00FFFF" 
                transparent 
                opacity={0.3}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}