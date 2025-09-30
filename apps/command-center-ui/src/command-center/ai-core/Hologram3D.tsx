import { memo, useMemo, useRef } from 'react'
import { Canvas, extend, useFrame } from '@react-three/fiber'
import { Float, OrbitControls, Stars, Line, Text, Html, shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

// Types for component props
interface HologramCoreProps {
  intensity: number
  colorTone: string
  voiceLevel: number
}

interface EnergyRingProps {
  radius: number
  rotation: [number, number, number]
  color: string
  speed?: number
}

interface DataPulseProps {
  position: [number, number, number]
  color: string
  size: number
  speed: number
}

interface DataOrbitProps {
  points: number[][]
  color: string
}

interface NeonGridProps {
  size?: number
  divisions?: number
  color?: string
}

interface Hologram3DProps {
  metrics?: {
    revenue_progress?: number
    profit_margin_avg?: number
    total_agents?: number
  }
  agents?: Array<any>
  opportunities?: Array<any>
  liveIntensity?: {
    energyLevel?: number
    colorTone?: string
    voiceActivity?: {
      volume?: number
    }
    commandRate?: number
    wsStatus?: {
      connected?: boolean
    }
    supabaseStatus?: string
  }
  dataStreams?: any
}

const CoreMaterial = shaderMaterial(
  {
    uTime: 0,
    uIntensity: 0.6,
    uColor: new THREE.Color('#0ff1ff'),
  },
  `
  varying vec3 vPosition;
  void main() {
    vPosition = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
  `,
  `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;
  varying vec3 vPosition;
  void main() {
    float pulse = sin(uTime * 3.5 + length(vPosition) * 6.0);
    float intensity = clamp((pulse * 0.25 + 0.65) * uIntensity, 0.2, 1.0);
    vec3 color = mix(uColor * 0.45, uColor, intensity);
    float alpha = clamp(0.45 + pulse * 0.25 + uIntensity * 0.3, 0.2, 0.95);
    gl_FragColor = vec4(color, alpha);
  }
  `
)
extend({ CoreMaterial })

function HologramCore({ intensity, colorTone, voiceLevel }: HologramCoreProps) {
  const material = useRef<any>()
  useFrame((state) => {
    const { clock } = state
    const hueColor = new THREE.Color(colorTone)
    if (material.current) {
      material.current.uTime = clock.getElapsedTime()
      material.current.uIntensity = intensity + voiceLevel * 0.2
      material.current.uColor = hueColor
    }
  })

  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.6, 96, 96]} />
        {/* @ts-expect-error - Three.js extended material */}
        <coreMaterial ref={material} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.4, 32, 32]} />
        <meshStandardMaterial
          color={colorTone}
          transparent
          opacity={0.12 + intensity * 0.2}
          emissive={colorTone}
          emissiveIntensity={1.6 + voiceLevel * 1.2}
        />
      </mesh>
    </group>
  )
}

function EnergyRing({ radius, rotation, color, speed = 1 }: EnergyRingProps) {
  const ring = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (ring.current) {
      ring.current.rotation.y += 0.0015 * speed
      ring.current.rotation.x = rotation[0]
      ring.current.rotation.z = rotation[2]
      ring.current.position.y = Math.sin(state.clock.elapsedTime * 0.8 * speed) * 0.12
    }
  })
  return (
    <group ref={ring}>
      <mesh rotation={rotation}>
        <torusGeometry args={[radius, 0.045, 32, 256]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.1}
          transparent
          opacity={0.6}
        />
      </mesh>
      <mesh rotation={[rotation[0], rotation[1], rotation[2] + Math.PI / 4]}>
        <torusGeometry args={[radius * 0.96, 0.02, 32, 256]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  )
}

function DataPulse({ position, color, size, speed }: DataPulseProps) {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (mesh.current) {
      mesh.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed) * 0.35
      mesh.current.rotation.y += 0.01 * speed
    }
  })
  return (
    <Float speed={speed * 0.6} rotationIntensity={0.6} floatIntensity={0.8}>
      <mesh ref={mesh} position={position}>
        <icosahedronGeometry args={[size, 2]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.45}
          transparent
          opacity={0.72}
          wireframe
        />
      </mesh>
    </Float>
  )
}

function DataOrbit({ points, color }: DataOrbitProps) {
  const positions = useMemo(() => points.map(point => new THREE.Vector3(...point)), [points])
  return (
    <Line
      points={positions}
      color={color}
      linewidth={1.5}
      dashed
      dashSize={0.45}
      gapSize={0.25}
      transparent
      opacity={0.55}
    />
  )
}

function NeonGrid({ size = 18, divisions = 40, color = '#0ff1ff' }: NeonGridProps) {
  const lines: number[][][] = []
  const halfSize = size / 2
  for (let i = 0; i <= divisions; i += 1) {
    const offset = (i / divisions) * size - halfSize
    lines.push([[offset, 0, -halfSize], [offset, 0, halfSize]])
    lines.push([[-halfSize, 0, offset], [halfSize, 0, offset]])
  }
  return (
    <group position={[0, -2.5, 0]}>
      {lines.map((pts, index) => (
        <Line
          key={`grid-${index}`}
          points={pts.map(point => new THREE.Vector3(...point))}
          color={color}
          transparent
          opacity={index % 5 === 0 ? 0.4 : 0.18}
        />
      ))}
    </group>
  )
}

const Hologram3D = memo(function Hologram3D({ metrics, agents, opportunities, liveIntensity, dataStreams: _dataStreams }: Hologram3DProps) {
  const energy = liveIntensity?.energyLevel ?? 0.5
  const colorTone = liveIntensity?.colorTone ?? '#0ff1ff'
  const voiceLevel = liveIntensity?.voiceActivity?.volume ?? 0
  const commandRate = liveIntensity?.commandRate ?? 0
  const connected = liveIntensity?.wsStatus?.connected ?? false
  const supabaseStatus = liveIntensity?.supabaseStatus ?? 'disabled'

  const orbitPoints = useMemo(() => {
    const base: number[][] = []
    const radius = 4.5
    const steps = 180
    for (let i = 0; i < steps; i += 1) {
      const angle = (i / steps) * Math.PI * 2
      const y = Math.sin(angle * 2) * 0.8
      base.push([Math.cos(angle) * radius, y, Math.sin(angle) * radius])
    }
    return base
  }, [])

  const analyticsPanels = useMemo(() => (
    [
      {
        label: 'Revenue velocity',
        value: metrics?.revenue_progress ? `€${metrics.revenue_progress.toLocaleString()}` : 'Loading…',
        delta: metrics?.profit_margin_avg ? `${metrics.profit_margin_avg.toFixed(1)}% margin` : 'Calibrating',
        position: [-5.8, 2.4, -1.8] as [number, number, number],
        color: '#0ff1ff',
      },
      {
        label: 'Active agents',
        value: agents ? `${agents.length}/${metrics?.total_agents ?? 0}` : '0',
        delta: commandRate ? `${commandRate} cmds/min` : 'Tracking',
        position: [5.6, 2.0, 1.6] as [number, number, number],
        color: '#6f8cff',
      },
      {
        label: 'Opportunities pipeline',
        value: opportunities ? `${opportunities.length}` : '0',
        delta: `${Math.round(energy * 100)}% orchestration`,
        position: [-4.2, -1.8, 3.4] as [number, number, number],
        color: '#31ffc5',
      }
    ]
  ), [agents, commandRate, energy, metrics, opportunities])

  const pulses = useMemo(() => (
    [
      { position: [3.6, 1.6, -2.8] as [number, number, number], color: '#63f6ff', size: 0.45, speed: 1.4 },
      { position: [-3.2, -1.2, 3.2] as [number, number, number], color: '#2bd1ff', size: 0.38, speed: 1.1 },
      { position: [0.2, 2.8, 2.6] as [number, number, number], color: '#00f4ff', size: 0.3, speed: 1.8 },
      { position: [-2.4, 2.2, -3.6] as [number, number, number], color: '#24ffb8', size: 0.42, speed: 1.3 },
    ]
  ), [])

  return (
    <div className="h-full w-full">
      <Canvas camera={{ position: [0, 3.8, 11], fov: 52 }}>
        <ambientLight intensity={0.45} color={colorTone} />
        <pointLight position={[10, 12, 15]} intensity={0.8} color="#5be4ff" />
        <pointLight position={[-12, -6, -8]} intensity={0.6} color="#2d8fff" />
        <Stars radius={240} depth={50} count={8000} factor={6} fade speed={1.2} saturation={0} />

        <Float speed={1.1} rotationIntensity={0.6} floatIntensity={0.6}>
          <HologramCore intensity={energy} colorTone={colorTone} voiceLevel={voiceLevel} />
        </Float>

        <EnergyRing radius={2.5} rotation={[Math.PI / 2, 0, 0]} color="#0ff1ff" speed={1.2} />
        <EnergyRing radius={3.3} rotation={[Math.PI / 3.2, 0, Math.PI / 4]} color="#6f00ff" speed={0.9} />
        <EnergyRing radius={4.1} rotation={[Math.PI / 2.6, 0, Math.PI / 2]} color="#32ffd2" speed={1.4} />

        <DataOrbit points={orbitPoints} color="#1741ff" />
        {pulses.map(pulse => (
          <DataPulse key={`${pulse.position.join('-')}`} {...pulse} />
        ))}

        <NeonGrid />

        <Float speed={1.4} rotationIntensity={0.8} floatIntensity={0.6}>
          <Text
            position={[0, 3.1, 0]}
            fontSize={0.6}
            color={colorTone}
            letterSpacing={0.08}
          >
            AIRA CORE
          </Text>
        </Float>

        {analyticsPanels.map(panel => (
          <Html
            key={panel.label}
            position={panel.position}
            center
            distanceFactor={8}
            transform
          >
            <div className="ai-core-datapanel">
              <h2>{panel.label}</h2>
              <div>
                <strong>{panel.value}</strong>
              </div>
              <p>{panel.delta}</p>
            </div>
          </Html>
        ))}

        <Html position={[0, -3.2, 0]} center distanceFactor={14}>
          <div className="ai-core-datapanel">
            <h2>Live Stream Status</h2>
            <div className="flex gap-4 text-xs font-mono">
              <span className={connected ? 'text-emerald-300' : 'text-amber-300'}>
                WS: {connected ? 'Connected' : 'Reconnecting'}
              </span>
              <span className={supabaseStatus === 'connected' ? 'text-cyan-300' : 'text-slate-300'}>
                Supabase: {supabaseStatus}
              </span>
              <span className={voiceLevel > 0.15 ? 'text-sky-300' : 'text-slate-400'}>
                Voice: {(voiceLevel * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </Html>

        <OrbitControls
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.45 + energy * 0.6}
          enableZoom
          minDistance={7}
          maxDistance={15}
        />
      </Canvas>
    </div>
  )
})

export default Hologram3D