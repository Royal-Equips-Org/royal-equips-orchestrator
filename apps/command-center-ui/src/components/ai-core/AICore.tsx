import React, { useState, useEffect, useRef, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Stars } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import Hologram3D from './Hologram3D'
import DataPanels from './DataPanels'
import { useVoiceInterface } from './VoiceInterface'
import { useLiveData } from './hooks/useLiveData'
import { useEmpireStore } from '../../store/empire-store'
import './AiCore.css'

// Control buttons exactly like in the reference image
interface ControlButtonProps {
  position: { top?: string; left?: string; right?: string; bottom?: string };
  icon: string;
  active: boolean;
  onClick: () => void;
  tooltip: string;
}

const ControlButton: React.FC<ControlButtonProps> = ({ position, icon, active, onClick, tooltip }) => (
  <div 
    className={`control-button ${active ? 'active' : ''}`}
    style={{ 
      top: position.top, 
      left: position.left, 
      right: position.right, 
      bottom: position.bottom 
    }}
    onClick={onClick}
    title={tooltip}
  >
    {icon}
  </div>
)

// Status display panel
interface StatusDisplayProps {
  data: any;
  systemHealth: any;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ data, systemHealth }) => (
  <div className="status-display">
    <h3>ROYAL EQUIPS AI CORE</h3>
    <div className="status-item">
      <span>Status</span>
      <span className="status-value">{systemHealth?.status || 'OPERATIONAL'}</span>
    </div>
    <div className="status-item">
      <span>Revenue</span>
      <span className="status-value">{data?.revenue?.total ? `$${Math.floor(data.revenue.total).toLocaleString()}` : '$127,543'}</span>
    </div>
    <div className="status-item">
      <span>Orders</span>
      <span className="status-value">{data?.orders?.total || '342'}</span>
    </div>
    <div className="status-item">
      <span>Uptime</span>
      <span className="status-value">{systemHealth?.uptime || '99.7%'}</span>
    </div>
    <div className="status-item">
      <span>CPU</span>
      <span className="status-value">{systemHealth?.cpuUsage ? `${systemHealth.cpuUsage}%` : '65%'}</span>
    </div>
  </div>
)

// Voice interface indicator
interface VoiceIndicatorProps {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  aiResponse: string;
}

const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({ isListening, isSpeaking, transcript, aiResponse }) => {
  const getStatus = () => {
    if (isListening) return 'LISTENING'
    if (isSpeaking) return 'SPEAKING'
    return 'READY'
  }

  const getStatusClass = () => {
    if (isListening) return 'listening'
    if (isSpeaking) return 'speaking'
    return ''
  }

  return (
    <div className={`voice-indicator ${getStatusClass()}`}>
      <div style={{ 
        width: '10px', 
        height: '10px', 
        borderRadius: '50%', 
        backgroundColor: isListening ? '#00ff00' : isSpeaking ? '#ff8800' : '#00aaff' 
      }} />
      <span>{getStatus()}</span>
    </div>
  )
}

// Command overlay
interface CommandOverlayProps {
  transcript: string;
  aiResponse: string;
  isProcessing: boolean;
}

const CommandOverlay: React.FC<CommandOverlayProps> = ({ transcript, aiResponse, isProcessing }) => {
  if (!transcript && !aiResponse && !isProcessing) return null

  return (
    <div className="command-overlay">
      {isProcessing && (
        <div className="ai-processing">
          <div className="processing-spinner" />
          <div className="processing-text">Processing Command...</div>
        </div>
      )}
      {transcript && (
        <div className="command-text">
          Command: "{transcript}"
        </div>
      )}
      {aiResponse && (
        <div className="response-text">
          {aiResponse}
        </div>
      )}
    </div>
  )
}

// Main AI Core component
interface AICoreProps {
  onExit?: () => void;
  isFullscreen?: boolean;
}

export default function AICore({ onExit, isFullscreen = false }: AICoreProps) {
  const [cameraControlsEnabled, setCameraControlsEnabled] = useState(true)
  const [ambientMode, setAmbientMode] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Hooks for real-time data and voice interface
  const { 
    data: liveData, 
    isConnected, 
    systemHealth, 
    shopifyMetrics, 
    marketingData 
  } = useLiveData({ enableMockData: true })

  const {
    isListening,
    isSpeaking,
    transcript,
    aiResponse,
    isProcessing,
    hasVoiceActivity,
    startListening,
    stopListening
  } = useVoiceInterface()

  const { agents, metrics } = useEmpireStore()

  // System status based on real data
  const [systemStatus, setSystemStatus] = useState('active')

  useEffect(() => {
    if (!isConnected) {
      setSystemStatus('alert')
    } else if (hasVoiceActivity || isProcessing) {
      setSystemStatus('processing')
    } else if (agents?.some(agent => agent.status === 'active')) {
      setSystemStatus('processing')
    } else {
      setSystemStatus('active')
    }
  }, [isConnected, hasVoiceActivity, isProcessing, agents])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'f11':
          e.preventDefault()
          // Fullscreen toggle would be handled by parent
          break
        case 'v':
          if (e.ctrlKey) {
            e.preventDefault()
            if (isListening) {
              stopListening()
            } else {
              startListening()
            }
          }
          break
        case 'escape':
          if (isListening) {
            stopListening()
          } else if (onExit) {
            onExit()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isListening, startListening, stopListening, onExit])

  return (
    <div className={`ai-core-container ${isFullscreen ? 'ai-core-fullscreen' : ''}`}>
      {/* Holographic background effects */}
      <div className="holographic-grid" />
      <div className="scan-lines" />
      <div className="noise-overlay" />

      {/* 3D Canvas with AI Core */}
      <Canvas
        ref={canvasRef}
        className="ai-core-canvas"
        camera={{ position: [0, 2, 8], fov: 60 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: 'high-performance'
        }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={0.5} color="#00aaff" />
          <pointLight position={[-10, -10, -10]} intensity={0.3} color="#0066aa" />

          {/* Stars background */}
          <Stars 
            radius={300} 
            depth={50} 
            count={3000} 
            factor={7} 
            saturation={0} 
            fade 
            speed={0.5}
          />

          {/* Main holographic AI */}
          <Hologram3D 
            systemStatus={systemStatus}
            scale={1.2}
            liveData={liveData}
            voiceActivity={hasVoiceActivity}
          />

          {/* Data panels around the AI */}
          <DataPanels
            liveData={liveData}
            shopifyMetrics={shopifyMetrics}
            systemHealth={systemHealth}
            marketingData={marketingData}
          />

          {/* Environment for reflections */}
          <Environment preset="night" />

          {/* Camera controls */}
          <OrbitControls
            enabled={cameraControlsEnabled}
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            autoRotate={autoRotate}
            autoRotateSpeed={0.5}
            minDistance={5}
            maxDistance={15}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI - Math.PI / 6}
          />
        </Suspense>
      </Canvas>

      {/* UI Overlays */}
      <StatusDisplay data={liveData} systemHealth={systemHealth} />
      
      <VoiceIndicator 
        isListening={isListening}
        isSpeaking={isSpeaking}
        transcript={transcript}
        aiResponse={aiResponse}
      />

      {/* Control buttons positioned like in the reference image */}
      <ControlButton
        position={{ top: '20px', right: '200px' }}
        icon="🎤"
        active={isListening}
        onClick={() => isListening ? stopListening() : startListening()}
        tooltip="Voice Command (Ctrl+V)"
      />

      <ControlButton
        position={{ top: '90px', right: '200px' }}
        icon="🔄"
        active={autoRotate}
        onClick={() => setAutoRotate(!autoRotate)}
        tooltip="Auto Rotate"
      />

      <ControlButton
        position={{ top: '160px', right: '200px' }}
        icon="🎯"
        active={!cameraControlsEnabled}
        onClick={() => setCameraControlsEnabled(!cameraControlsEnabled)}
        tooltip="Lock Camera"
      />

      <ControlButton
        position={{ bottom: '20px', right: '20px' }}
        icon="🌙"
        active={ambientMode}
        onClick={() => setAmbientMode(!ambientMode)}
        tooltip="Ambient Mode"
      />

      <ControlButton
        position={{ bottom: '20px', right: '90px' }}
        icon="⚡"
        active={systemStatus === 'processing'}
        onClick={() => {
          // Trigger system scan
          console.log('System scan initiated')
        }}
        tooltip="System Boost"
      />

      <ControlButton
        position={{ bottom: '20px', right: '160px' }}
        icon="📊"
        active={false}
        onClick={() => {
          // Show detailed analytics
          console.log('Analytics view')
        }}
        tooltip="Analytics"
      />

      {onExit && (
        <ControlButton
          position={{ top: '20px', left: '300px' }}
          icon="❌"
          active={false}
          onClick={onExit}
          tooltip="Exit AI Core (ESC)"
        />
      )}

      {/* Command overlay */}
      <CommandOverlay
        transcript={transcript}
        aiResponse={aiResponse}
        isProcessing={isProcessing}
      />

      {/* Floating data panels for key metrics */}
      <div className="floating-panel" style={{ top: '100px', left: '20px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>LIVE METRICS</div>
        <div>Revenue: {liveData?.revenue?.today ? `$${liveData.revenue.today.toLocaleString()}` : '$2,347'}</div>
        <div>Orders: {liveData?.orders?.processing || 'Loading...'}</div>
        <div>Customers: {liveData?.customers?.active || 'Loading...'}</div>
      </div>

      <div className="floating-panel" style={{ top: '220px', left: '20px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>SYSTEM HEALTH</div>
        <div>Status: {systemHealth?.status || 'OPERATIONAL'}</div>
        <div>CPU: {systemHealth?.cpuUsage ? `${systemHealth.cpuUsage}%` : '65%'}</div>
        <div>Memory: {systemHealth?.memoryUsage ? `${systemHealth.memoryUsage}%` : '72%'}</div>
        <div>Response: {systemHealth?.responseTime ? `${systemHealth.responseTime}ms` : '45ms'}</div>
      </div>

      <div className="floating-panel" style={{ bottom: '100px', left: '20px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>ACTIVE OPERATIONS</div>
        <div>Agents: {agents?.filter(a => a.status === 'active').length || 0} Running</div>
        <div>Campaigns: {marketingData?.activeCampaigns || 8} Active</div>
        <div>Sync: {isConnected ? 'LIVE' : 'OFFLINE'}</div>
      </div>

      {/* Connection status indicator */}
      {!isConnected && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 0, 0, 0.9)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center',
          zIndex: 1000
        }}>
          <h3>Connection Lost</h3>
          <p>Attempting to reconnect to live data...</p>
        </div>
      )}
    </div>
  )
}

// Loading component for the AI Core
export const AICoreLoading: React.FC = () => (
  <div className="ai-core-container">
    <div className="ai-processing">
      <div className="processing-spinner" />
      <div className="processing-text">Initializing AI Core Systems...</div>
    </div>
  </div>
)