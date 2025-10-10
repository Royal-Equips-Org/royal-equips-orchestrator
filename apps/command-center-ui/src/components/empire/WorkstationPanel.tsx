import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Monitor, 
  Globe, 
  BarChart3, 
  Activity, 
  Zap, 
  Shield, 
  Database,
  Network,
  TrendingUp,
  MapPin,
  Users,
  DollarSign,
  Package,
  AlertTriangle
} from 'lucide-react';
import { ArrayUtils } from '../../utils/array-utils';

interface WorkstationData {
  id: string;
  title: string;
  type: 'map' | 'chart' | 'network' | 'metrics';
  status: 'active' | 'warning' | 'critical';
  data: any;
}

interface WorkstationPanelProps {
  workstation: WorkstationData;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  onExpand?: (id: string) => void;
}

// Mock data generators for different workstation types
const generateMapData = () => ({
  regions: [
    { name: 'North America', sales: 45000, status: 'active', lat: 40, lng: -100 },
    { name: 'Europe', sales: 38000, status: 'active', lat: 50, lng: 10 },
    { name: 'Asia Pacific', sales: 52000, status: 'warning', lat: 35, lng: 120 },
    { name: 'South America', sales: 15000, status: 'active', lat: -15, lng: -60 },
  ],
  totalSales: 150000,
  activeRegions: 4
});

const generateChartData = () => ({
  revenue: Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    value: Math.floor(Math.random() * 10000) + 5000
  })),
  trend: '+12.5%',
  total: 67450
});

const generateNetworkData = () => ({
  nodes: 24,
  connections: 156,
  bandwidth: '2.4 GB/s',
  latency: '12ms',
  status: 'optimal'
});

const generateMetricsData = () => ({
  users: 1247,
  orders: 89,
  revenue: 34567,
  conversion: 3.2,
  alerts: 2
});

// Individual screen components for each workstation type
const MapScreen = ({ data }: { data: any }) => (
  <div className="relative w-full h-full bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-2">
        <Globe className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-mono text-cyan-400">GLOBAL SALES</span>
      </div>
      <div className="text-xs text-green-400">${data.totalSales.toLocaleString()}</div>
    </div>
    
    <div className="relative h-24 bg-black/40 rounded border border-cyan-500/20 mb-2">
      {/* Simplified world map visualization */}
      <svg className="w-full h-full" viewBox="0 0 200 100">
        {ArrayUtils.map(data?.regions, (region: any, index: number) => (
          <g key={region?.name || index}>
            <circle
              cx={(region?.lng || 0) + 100}
              cy={(region?.lat || 0) + 50}
              r="3"
              fill={region?.status === 'warning' ? '#f59e0b' : '#06d6a0'}
              className="animate-pulse"
            />
            <text
              x={(region?.lng || 0) + 100}
              y={(region?.lat || 0) + 45}
              className="text-xs fill-white"
              textAnchor="middle"
              fontSize="6"
            >
              ${((region?.sales || 0) / 1000).toFixed(0)}k
            </text>
          </g>
        ))}
      </svg>
    </div>
    
    <div className="space-y-1">
      {ArrayUtils.map(data?.regions, (region: any) => (
        <div key={region?.name || 'unknown'} className="flex justify-between text-xs">
          <span className="text-gray-300">{region?.name || 'Unknown Region'}</span>
          <span className="text-cyan-400">${((region?.sales || 0) / 1000).toFixed(0)}k</span>
        </div>
      ))}
    </div>
  </div>
);

const ChartScreen = ({ data }: { data: any }) => (
  <div className="relative w-full h-full bg-gradient-to-br from-green-900/20 to-teal-900/20 rounded-lg p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-2">
        <BarChart3 className="w-4 h-4 text-green-400" />
        <span className="text-xs font-mono text-green-400">REVENUE</span>
      </div>
      <div className="text-xs text-green-400">{data.trend}</div>
    </div>
    
    <div className="h-20 flex items-end justify-between space-x-1 mb-2">
      {ArrayUtils.map(data?.revenue, (item: any, index: number) => (
        <div key={index} className="flex flex-col items-center">
          <div 
            className="w-4 bg-gradient-to-t from-green-600 to-green-400 rounded-t"
            style={{ height: `${((item?.value || 0) / 15000) * 60}px` }}
          />
          <span className="text-xs text-gray-400 mt-1">{item?.day?.[0] || ''}</span>
        </div>
      ))}
    </div>
    
    <div className="text-center">
      <div className="text-lg font-bold text-white">${(data?.total || 0).toLocaleString()}</div>
      <div className="text-xs text-gray-400">Total Revenue</div>
    </div>
  </div>
);

const NetworkScreen = ({ data }: { data: any }) => (
  <div className="relative w-full h-full bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-lg p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-2">
        <Network className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-mono text-purple-400">NETWORK</span>
      </div>
      <div className="text-xs text-green-400">{data.status.toUpperCase()}</div>
    </div>
    
    <div className="relative h-24 bg-black/40 rounded border border-purple-500/20 mb-2 flex items-center justify-center">
      {/* Network visualization */}
      <svg className="w-full h-full" viewBox="0 0 100 60">
        {/* Central node */}
        <circle cx="50" cy="30" r="4" fill="#a855f7" className="animate-pulse" />
        
        {/* Connected nodes */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * Math.PI * 2) / 8;
          const x = 50 + Math.cos(angle) * 20;
          const y = 30 + Math.sin(angle) * 15;
          return (
            <g key={i}>
              <line x1="50" y1="30" x2={x} y2={y} stroke="#a855f7" strokeWidth="0.5" opacity="0.6" />
              <circle cx={x} cy={y} r="2" fill="#c084fc" />
            </g>
          );
        })}
      </svg>
    </div>
    
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div>
        <div className="text-gray-400">Nodes</div>
        <div className="text-purple-400">{data.nodes}</div>
      </div>
      <div>
        <div className="text-gray-400">Connections</div>
        <div className="text-purple-400">{data.connections}</div>
      </div>
      <div>
        <div className="text-gray-400">Bandwidth</div>
        <div className="text-purple-400">{data.bandwidth}</div>
      </div>
      <div>
        <div className="text-gray-400">Latency</div>
        <div className="text-purple-400">{data.latency}</div>
      </div>
    </div>
  </div>
);

const MetricsScreen = ({ data }: { data: any }) => (
  <div className="relative w-full h-full bg-gradient-to-br from-orange-900/20 to-red-900/20 rounded-lg p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-2">
        <Activity className="w-4 h-4 text-orange-400" />
        <span className="text-xs font-mono text-orange-400">METRICS</span>
      </div>
      {data.alerts > 0 && (
        <div className="flex items-center space-x-1">
          <AlertTriangle className="w-3 h-3 text-red-400" />
          <span className="text-xs text-red-400">{data.alerts}</span>
        </div>
      )}
    </div>
    
    <div className="grid grid-cols-2 gap-3">
      <div className="text-center">
        <Users className="w-6 h-6 text-cyan-400 mx-auto mb-1" />
        <div className="text-lg font-bold text-white">{data.users}</div>
        <div className="text-xs text-gray-400">Active Users</div>
      </div>
      
      <div className="text-center">
        <Package className="w-6 h-6 text-green-400 mx-auto mb-1" />
        <div className="text-lg font-bold text-white">{data.orders}</div>
        <div className="text-xs text-gray-400">Orders</div>
      </div>
      
      <div className="text-center">
        <DollarSign className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
        <div className="text-lg font-bold text-white">${(data.revenue/1000).toFixed(0)}k</div>
        <div className="text-xs text-gray-400">Revenue</div>
      </div>
      
      <div className="text-center">
        <TrendingUp className="w-6 h-6 text-purple-400 mx-auto mb-1" />
        <div className="text-lg font-bold text-white">{data.conversion}%</div>
        <div className="text-xs text-gray-400">Conversion</div>
      </div>
    </div>
  </div>
);

const WorkstationPanel: React.FC<WorkstationPanelProps> = ({ 
  workstation, 
  position, 
  onExpand 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const statusColors = {
    active: 'border-green-500/30 bg-green-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    critical: 'border-red-500/30 bg-red-500/5'
  };

  const renderScreen = () => {
    switch (workstation.type) {
      case 'map':
        return <MapScreen data={workstation.data} />;
      case 'chart':
        return <ChartScreen data={workstation.data} />;
      case 'network':
        return <NetworkScreen data={workstation.data} />;
      case 'metrics':
        return <MetricsScreen data={workstation.data} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      className={`
        absolute ${positionClasses[position]} z-20
        w-72 h-64 cursor-pointer
      `}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => {
        setExpanded(!expanded);
        onExpand?.(workstation.id);
      }}
    >
      <motion.div
        className={`
          w-full h-full rounded-xl border-2 backdrop-blur-md
          ${statusColors[workstation.status]}
          transition-all duration-300
          ${isHovered ? 'scale-105 shadow-2xl shadow-cyan-500/20' : ''}
        `}
        animate={{
          boxShadow: isHovered 
            ? '0 0 30px rgba(6, 182, 212, 0.3)' 
            : '0 0 10px rgba(6, 182, 212, 0.1)'
        }}
      >
        {/* Status indicator */}
        <div className="absolute -top-2 -right-2 z-10">
          <div className={`
            w-4 h-4 rounded-full border-2 border-gray-900
            ${workstation.status === 'active' ? 'bg-green-400' : 
              workstation.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'}
            ${workstation.status === 'active' ? 'animate-pulse' : ''}
          `} />
        </div>

        {/* Workstation content */}
        <div className="p-4 h-full">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-white font-mono">
              {workstation.title}
            </h3>
          </div>
          
          <div className="flex-1">
            {renderScreen()}
          </div>
        </div>

        {/* Hover overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

// Main component that creates all four workstations
export default function WorkstationArray() {
  const [workstations, setWorkstations] = useState<WorkstationData[]>([]);

  useEffect(() => {
    // Initialize workstations with mock data
    const initWorkstations = [
      {
        id: 'global-sales',
        title: 'GLOBAL SALES MAP',
        type: 'map' as const,
        status: 'active' as const,
        data: generateMapData()
      },
      {
        id: 'revenue-charts',
        title: 'REVENUE ANALYTICS',
        type: 'chart' as const,
        status: 'active' as const,
        data: generateChartData()
      },
      {
        id: 'network-status',
        title: 'NETWORK STATUS',
        type: 'network' as const,
        status: 'active' as const,
        data: generateNetworkData()
      },
      {
        id: 'system-metrics',
        title: 'SYSTEM METRICS',
        type: 'metrics' as const,
        status: 'warning' as const,
        data: generateMetricsData()
      }
    ];
    
    setWorkstations(initWorkstations);

    // Update data periodically
    const interval = setInterval(() => {
      setWorkstations(prev => prev.map(ws => ({
        ...ws,
        data: ws.type === 'map' ? generateMapData() :
              ws.type === 'chart' ? generateChartData() :
              ws.type === 'network' ? generateNetworkData() :
              generateMetricsData()
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleExpand = (id: string) => {
    // Could implement modal expansion here
  };

  return (
    <>
      {workstations.map((workstation, index) => (
        <WorkstationPanel
          key={workstation.id}
          workstation={workstation}
          position={['top-left', 'top-right', 'bottom-left', 'bottom-right'][index] as any}
          onExpand={handleExpand}
        />
      ))}
    </>
  );
}