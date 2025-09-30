import { memo, useMemo } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Filler,
  Legend
} from 'chart.js'
import * as d3 from 'd3'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Filler,
  Legend,
)

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: 'rgba(7, 20, 35, 0.85)',
      borderColor: '#0ff1ff',
      borderWidth: 1,
      titleColor: '#caf6ff',
      bodyColor: '#f5fdff',
      padding: 12,
      displayColors: false,
    },
  },
  scales: {
    x: {
      ticks: {
        color: 'rgba(173, 230, 255, 0.7)',
        font: {
          family: 'JetBrains Mono',
          size: 10,
        },
      },
      grid: {
        color: 'rgba(15, 241, 255, 0.08)',
      },
    },
    y: {
      ticks: {
        color: 'rgba(173, 230, 255, 0.7)',
        font: {
          family: 'JetBrains Mono',
          size: 10,
        },
      },
      grid: {
        color: 'rgba(15, 241, 255, 0.05)',
      },
    },
  },
}

const createGradient = (ctx, area, colors) => {
  const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top)
  colors.forEach(([offset, color]) => gradient.addColorStop(offset, color))
  return gradient
}

const DataPanels = memo(function DataPanels({ dataStreams, metrics, agents, campaigns, liveIntensity }) {
  const commandRate = liveIntensity?.commandRate ?? 0
  const energy = liveIntensity?.energyLevel ?? 0.5

  const revenueData = useMemo(() => {
    if (!dataStreams?.revenueStream?.length) {
      return null
    }
    return {
      labels: dataStreams.revenueStream.map(point => point.label),
      datasets: [
        {
          label: 'Revenue Velocity',
          data: dataStreams.revenueStream.map(point => point.value ?? 0),
          fill: true,
          tension: 0.42,
          pointRadius: 0,
          borderWidth: 2,
          borderColor: '#0ff1ff',
          backgroundColor: (ctx) => {
            const { chart } = ctx
            const { ctx: canvasCtx, chartArea } = chart
            if (!chartArea) {
              return null
            }
            return createGradient(canvasCtx, chartArea, [
              [0, 'rgba(15, 241, 255, 0.35)'],
              [0.7, 'rgba(15, 241, 255, 0.18)'],
              [1, 'rgba(15, 241, 255, 0.02)'],
            ])
          },
        }
      ]
    }
  }, [dataStreams])

  const logisticsData = useMemo(() => {
    const baseStream = dataStreams?.logisticsStream ?? []
    return {
      labels: baseStream.map(point => point.label),
      datasets: [
        {
          label: 'Fulfilment throughput',
          data: baseStream.map(point => point.value ?? 0),
          backgroundColor: '#6f8cff',
          borderRadius: 8,
          borderWidth: 0,
        }
      ],
    }
  }, [dataStreams])

  const marketingMix = useMemo(() => {
    const mix = dataStreams?.marketingMix ?? []
    return {
      labels: mix.map(item => item.label),
      datasets: [
        {
          data: mix.map(item => item.value ?? 0),
          backgroundColor: ['#0ff1ff', '#6f00ff', '#2dd5c1', '#4f8bff'],
          borderWidth: 0,
        }
      ],
    }
  }, [dataStreams])

  const agentHealth = useMemo(() => {
    const groups = d3.rollup(agents ?? [], (rows) => rows.length, row => row.health)
    return [
      { label: 'Healthy', value: groups.get('good') ?? 0 },
      { label: 'Warning', value: groups.get('warning') ?? 0 },
      { label: 'Critical', value: groups.get('critical') ?? 0 }
    ]
  }, [agents])

  const autopilotStatus = useMemo(() => ({
    uptime: metrics?.system_uptime ?? 0,
    automation: metrics?.automation_level ?? 0,
    discoveries: metrics?.daily_discoveries ?? 0,
    campaignCount: campaigns?.length ?? 0,
  }), [campaigns, metrics])

  return (
    <div className="ai-core-panel">
      <div className="ai-core-panel-title">
        <span className="font-mono text-xs uppercase tracking-[0.4em] text-cyan-300">Data Intelligence</span>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="h-40 rounded-xl border border-cyan-500/30 bg-black/30 p-3">
          {revenueData ? <Line data={revenueData} options={baseOptions} /> : <div className="text-cyan-200/60">Loading revenue stream…</div>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-36 rounded-xl border border-blue-500/30 bg-black/30 p-3">
            <Bar data={logisticsData} options={{
              ...baseOptions,
              scales: {
                ...baseOptions.scales,
                y: {
                  ...baseOptions.scales.y,
                  suggestedMax: Math.max(...logisticsData.datasets[0].data, 10),
                },
              },
            }} />
          </div>
          <div className="h-36 rounded-xl border border-purple-500/40 bg-black/30 p-3">
            <Doughnut data={marketingMix} options={{
              plugins: {
                legend: {
                  display: true,
                  position: 'right',
                  labels: {
                    color: 'rgba(192, 236, 255, 0.85)',
                    boxWidth: 12,
                    boxHeight: 12,
                    font: {
                      family: 'JetBrains Mono',
                      size: 10,
                    }
                  }
                }
              }
            }} />
          </div>
        </div>

        <div className="ai-core-datapanel-grid">
          <div className="ai-core-datapanel">
            <h2>Agent Health</h2>
            <ul className="space-y-1 text-xs font-mono">
              {agentHealth.map(item => (
                <li key={item.label} className="flex justify-between">
                  <span>{item.label}</span>
                  <span className="text-cyan-300">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="ai-core-datapanel">
            <h2>Autopilot Systems</h2>
            <p className="text-sm text-cyan-200">{autopilotStatus.automation.toFixed(1)}% automation coverage</p>
            <p className="text-xs text-slate-300">Uptime {autopilotStatus.uptime.toFixed(1)} hrs • Discoveries {autopilotStatus.discoveries}</p>
          </div>
          <div className="ai-core-datapanel">
            <h2>Engagement</h2>
            <p className="text-sm text-cyan-100">{commandRate} voice commands/min</p>
            <p className="text-xs text-slate-400">Energy coherence {(energy * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>
    </div>
  )
})

export default DataPanels
