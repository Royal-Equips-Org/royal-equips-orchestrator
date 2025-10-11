import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useAgents, useEmpireMetrics } from '@/store/empire-store';
import EmpireVisualization3D from '../empire/EmpireVisualization3D';
import KPIVisualization from '../KPIVisualization';

interface CommandCenter3DSceneProps {
  className?: string;
}

export default function CommandCenter3DScene({ className }: CommandCenter3DSceneProps) {
  const agents = useAgents();
  const metrics = useEmpireMetrics();

  return (
    <div className={className} style={{ height: '400px', width: '100%' }}>
      <Canvas
        camera={{ position: [8, 8, 8], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={0.8} />
          <pointLight position={[-10, -10, -10]} intensity={0.3} color="#00FFFF" />
          
          {/* 3D Scene Content */}
          <EmpireVisualization3D agents={agents} />
          <KPIVisualization metrics={metrics} />
          
          {/* Camera Controls */}
          <OrbitControls
            enableZoom={true}
            enablePan={true}
            enableRotate={true}
            maxDistance={20}
            minDistance={3}
          />
          
          {/* Simple background color instead of Environment */}
          <color attach="background" args={['#000011']} />
        </Suspense>
      </Canvas>
    </div>
  );
}
