import { useCallback, useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react'
import { Rocket, RefreshCcw, ScrollText, Mic, Waves } from 'lucide-react'
import MobileShell from './components/layout/MobileShell'
import NavigationBar from './components/navigation/NavigationBar'
import ModuleScroller from './components/layout/ModuleScroller'
import TopBar from './components/layout/TopBar'
import CommandConsole from './components/CommandConsole'
import { ToastContainer } from './components/ui/Toast'
import { ToastProvider, useToastContext } from './contexts/ToastContext'
import { NavigationProvider, useNavigation } from './contexts/NavigationContext'
import { usePerformanceOptimization } from './hooks/usePerformanceOptimization'
import Hologram3D from './command-center/ai-core/Hologram3D'
import DataPanels from './command-center/ai-core/DataPanels'
import useVoiceInterface from './command-center/ai-core/VoiceInterface'
import { useLiveData } from './command-center/ai-core/hooks/useLiveData'
import { useEmpireStore } from './store/empire-store'
import { empireService } from './services/empire-service'
import ShopifyDashboard from './components/shopify/ShopifyDashboard'
import EmpireDashboard from './components/empire/EmpireDashboard'
import { useToastContext } from './contexts/ToastContext'
import './styles/globals.css'
import './command-center/ai-core/AiCore.css'

const AiraModule = lazy(() => import('./modules/aira/AiraModule'))
const AnalyticsModule = lazy(() => import('./modules/analytics/AnalyticsModule'))
const AgentsModule = lazy(() => import('./modules/agents/AgentsModule'))
const DashboardModule = lazy(() => import('./modules/dashboard/DashboardModule'))
const RevenueModule = lazy(() => import('./modules/revenue/RevenueModule'))
const InventoryModule = lazy(() => import('./modules/inventory/InventoryModule'))
const MarketingAutomationModule = lazy(() => import('./modules/marketing/MarketingModule'))
const CustomerSupportModule = lazy(() => import('./modules/customer-support/CustomerSupportModule'))
const SecurityModule = lazy(() => import('./modules/security/SecurityModule'))
const FinanceModule = lazy(() => import('./modules/finance/FinanceModule'))
const AIRAIntelligenceModule = lazy(() => import('./modules/aira-intelligence/AIRAIntelligenceModule'))

function AppContent() {
  const { toasts, removeToast, success, error, info } = useToastContext()
  const { state } = useNavigation()
  const { optimizePerformance, metrics: perfMetrics, recommendations } = usePerformanceOptimization()
  const { metrics, agents, opportunities, campaigns, dataStreams, liveIntensity, refreshLiveData, registerCommandEvent } = useLiveData()
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const consoleRef = useRef(null)
  const isConnected = useEmpireStore(store => store.isConnected)

  const voice = useVoiceInterface({
    onTranscript: setVoiceTranscript,
    onCommand: (command) => {
      if (command?.type === 'open-logs') {
        consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      if (command?.type === 'engine-boost') {
        success('Engine Boost Engaged', 'Quantum thrusters amplified for maximum performance')
      }
      if (command?.type === 'auto-sync') {
        success('Auto Sync Active', 'Shopify, Supabase, and BigQuery are synchronising in real time')
      }
    },
    registerCommandEvent,
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      optimizePerformance()
    }, 2000)
    return () => clearTimeout(timer)
  }, [optimizePerformance])

  useEffect(() => {
    if (perfMetrics) {
      console.log('Performance Metrics:', {
        loadTime: `${perfMetrics.loadTime}ms`,
        renderTime: `${perfMetrics.renderTime}ms`,
        memoryUsage: `${perfMetrics.memoryUsage.toFixed(1)}MB`,
        networkRequests: perfMetrics.networkRequests
      })
      if (recommendations.length > 0) {
        console.log('Performance Recommendations:', recommendations)
      }
    }
  }, [perfMetrics, recommendations])

  const commandRateLabel = useMemo(() => {
    const rate = liveIntensity?.commandRate ?? 0
    if (rate > 20) return 'critical'
    if (rate > 10) return 'high'
    if (rate > 3) return 'medium'
    return 'low'
  }, [liveIntensity])

  const handleEngineBoost = useCallback(async () => {
    try {
      await empireService.triggerEngineBoost()
      registerCommandEvent?.()
      success('Engine Boost', 'Core engines boosted. Energy lattice reinforced.')
    } catch (err) {
      error('Engine Boost Failed', err instanceof Error ? err.message : 'Unable to trigger boost')
    }
  }, [error, registerCommandEvent, success])

  const handleAutoSync = useCallback(async () => {
    try {
      await empireService.triggerAutoSync()
      registerCommandEvent?.()
      success('Auto Sync Initiated', 'Logistics, marketing, and finance streams are synchronising')
    } catch (err) {
      error('Auto Sync Failed', err instanceof Error ? err.message : 'Unable to sync data streams')
    }
  }, [error, registerCommandEvent, success])

  const handleOpenLogs = useCallback(async () => {
    registerCommandEvent?.()
    info('Command Logs', 'Bringing live logs into focus')
    consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [info, registerCommandEvent])

  const renderModule = useCallback(() => {
    const loadingFallback = (moduleName: string) => (
      <div className="h-full flex items-center justify-center text-cyan-300 font-mono text-sm">
        Loading {moduleName}…
      </div>
    )

    switch (state.currentModule) {
      case 'aira':
        return (
          <Suspense fallback={loadingFallback('AIRA')}>
            <AiraModule />
          </Suspense>
        )
      case 'analytics':
        return (
          <Suspense fallback={loadingFallback('Analytics')}>
            <AnalyticsModule />
          </Suspense>
        )
      case 'agents':
        return (
          <Suspense fallback={loadingFallback('Agents')}>
            <AgentsModule />
          </Suspense>
        )
      case 'dashboard':
        return (
          <Suspense fallback={loadingFallback('Dashboard')}>
            <DashboardModule />
          </Suspense>
        )
      case 'revenue':
        return (
          <Suspense fallback={loadingFallback('Revenue')}>
            <RevenueModule />
          </Suspense>
        )
      case 'inventory':
        return (
          <Suspense fallback={loadingFallback('Inventory')}>
            <InventoryModule />
          </Suspense>
        )
      case 'shopify':
        return <ShopifyDashboard />
      case 'marketing':
        return (
          <Suspense fallback={loadingFallback('Marketing Automation')}>
            <MarketingAutomationModule />
          </Suspense>
        )
      case 'customer-support':
        return (
          <Suspense fallback={loadingFallback('Customer Support')}>
            <CustomerSupportModule />
          </Suspense>
        )
      case 'security':
        return (
          <Suspense fallback={loadingFallback('Security Center')}>
            <SecurityModule />
          </Suspense>
        )
      case 'finance':
        return (
          <Suspense fallback={loadingFallback('Financial Intelligence')}>
            <FinanceModule />
          </Suspense>
        )
      case 'products':
        return <div className="h-full flex items-center justify-center text-cyan-300">Products Module arriving shortly</div>
      case 'orders':
        return <div className="h-full flex items-center justify-center text-cyan-300">Orders Module under orchestration</div>
      case 'customers':
        return <div className="h-full flex items-center justify-center text-cyan-300">Customers Module sequencing data</div>
      case 'monitoring':
        return <div className="h-full flex items-center justify-center text-cyan-300">System Monitoring calibrating</div>
      case 'settings':
        return <div className="h-full flex items-center justify-center text-cyan-300">Settings hub in preparation</div>
      case 'aira-intelligence':
        return (
          <Suspense fallback={loadingFallback('AIRA Intelligence')}>
            <AIRAIntelligenceModule />
          </Suspense>
        )
      default:
        return <EmpireDashboard />
    }
  }, [state.currentModule])

  const voiceWaveHeights = useMemo(() => {
    const amplitude = liveIntensity?.voiceActivity?.volume ?? 0
    return Array.from({ length: 8 }).map((_, idx) => {
      const base = Math.sin((idx / 8) * Math.PI)
      return `${Math.max(12, (base + amplitude * 1.8) * 24)}px`
    })
  }, [liveIntensity])

  const isListening = voice.listening

  return (
    <MobileShell className="ai-core-root">
      <div className="ai-core-grid-overlay" />
      <div className="ai-core-shell">
        <section className="ai-core-panels-primary">
          <DataPanels
            dataStreams={dataStreams}
            metrics={metrics}
            agents={agents}
            campaigns={campaigns}
            liveIntensity={liveIntensity}
          />
          <div className="ai-core-panel">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-cyan-200/70 uppercase tracking-[0.4em]">Empire status</p>
                <p className="text-2xl font-semibold text-white mt-1">
                  {metrics?.revenue_progress ? `€${metrics.revenue_progress.toLocaleString()}` : 'Synchronising'}
                </p>
              </div>
              <button className="ai-core-control-button" onClick={refreshLiveData} type="button">
                <RefreshCcw className="w-4 h-4" /> Refresh Data
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-mono text-cyan-200/80">
              <div>
                Active Agents
                <div className="text-lg text-white">
                  {agents?.length ?? 0} / {metrics?.total_agents ?? 0}
                </div>
              </div>
              <div>
                Opportunities
                <div className="text-lg text-white">
                  {opportunities?.length ?? 0}
                </div>
              </div>
              <div>
                Automation Level
                <div className="text-lg text-white">{metrics?.automation_level?.toFixed?.(1) ?? '—'}%</div>
              </div>
              <div>
                Voice Transcript
                <div className="text-xs text-cyan-300/80 truncate max-w-[220px]">{voiceTranscript || 'Awaiting command'}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="ai-core-hologram">
          <div className="ai-core-hologram-header">
            <h1>Royal Equips AI Core</h1>
            <div className="flex items-center gap-4">
              <div className="ai-core-voice-control">
                <div className={`ai-core-voice-indicator ${isListening ? 'active' : ''}`} />
                <div className="ai-core-voice-waveform">
                  {voiceWaveHeights.map((height, index) => (
                    <span key={index} className="ai-core-voice-bar" style={{ height }} />
                  ))}
                </div>
              </div>
              <button
                className="ai-core-control-button"
                type="button"
                onClick={isListening ? voice.stopListening : voice.startListening}
              >
                <Mic className="w-4 h-4" /> {isListening ? 'Listening…' : 'Voice Control'}
              </button>
            </div>
          </div>

          <div className="ai-core-canvas-container">
            <Hologram3D
              metrics={metrics}
              agents={agents}
              opportunities={opportunities}
              liveIntensity={liveIntensity}
              dataStreams={dataStreams}
            />
            <div className="ai-core-module-dock">
              <ModuleScroller />
              <div className="flex flex-wrap gap-3">
                <button className="ai-core-control-button" type="button" onClick={handleEngineBoost}>
                  <Rocket className="w-4 h-4" /> Engine Boost
                </button>
                <button className="ai-core-control-button" type="button" onClick={handleAutoSync}>
                  <RefreshCcw className="w-4 h-4" /> Auto Sync
                </button>
                <button className="ai-core-control-button" type="button" onClick={handleOpenLogs}>
                  <ScrollText className="w-4 h-4" /> Command Logs
                </button>
              </div>
            </div>
          </div>

          <div className="ai-core-hologram-footer">
            <div className="ai-core-status">
              <span className="ai-core-status-dot" />
              <span>{isConnected ? 'All systems synchronised' : 'Reconnecting to core services'}</span>
            </div>
            <div className="ai-core-activity">
              <div>
                <div className="label">Command Rate</div>
                <div className={`value ${commandRateLabel}`}>{liveIntensity?.commandRate ?? 0}/min</div>
              </div>
              <div>
                <div className="label">Energy</div>
                <div className="value">{Math.round((liveIntensity?.energyLevel ?? 0.5) * 100)}%</div>
              </div>
              <div>
                <div className="label">Voice</div>
                <div className="value">{((liveIntensity?.voiceActivity?.volume ?? 0) * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>
        </section>

        <section className="ai-core-panels-secondary">
          <div className="ai-core-panel" ref={consoleRef}>
            <div className="ai-core-panel-title">
              <Waves className="w-4 h-4" />
              <span>Command Console</span>
            </div>
            <CommandConsole />
          </div>
          <div className="ai-core-panel hidden xl:block">
            <NavigationBar />
          </div>
        </section>
      </div>

      <div className="ai-core-module-content px-4 sm:px-6 lg:px-16">
        <div className="lg:hidden mb-6">
          <TopBar />
        </div>
        <div className="rounded-3xl border border-cyan-500/20 bg-black/20 backdrop-blur-2xl p-6">
          {renderModule()}
        </div>
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </MobileShell>
  )
}

function App() {
  return (
    <NavigationProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </NavigationProvider>
  )
}

export default App
