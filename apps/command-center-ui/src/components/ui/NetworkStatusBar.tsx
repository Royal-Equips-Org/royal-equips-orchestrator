import { motion } from 'framer-motion';
import { Wifi, WifiOff, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useEmpireStore } from '@/store/empire-store';

export default function NetworkStatusBar() {
  const { 
    isConnected, 
    connectionError,
    metricsLoading, metricsError,
    agentsLoading, agentsError,
    oppsLoading, oppsError,
    campaignsLoading, campaignsError,
    lastUpdate
  } = useEmpireStore();

  const services = [
    { name: 'Metrics', loading: metricsLoading, error: metricsError },
    { name: 'Agents', loading: agentsLoading, error: agentsError },
    { name: 'Opportunities', loading: oppsLoading, error: oppsError },
    { name: 'Campaigns', loading: campaignsLoading, error: campaignsError },
  ];

  const getServiceStatus = (service: { loading: boolean; error: string | null }) => {
    if (service.loading) return 'loading';
    if (service.error) return 'error';
    return 'ok';
  };

  const getOverallStatus = () => {
    if (!isConnected) return 'disconnected';
    if (services.some(s => getServiceStatus(s) === 'error')) return 'degraded';
    if (services.some(s => getServiceStatus(s) === 'loading')) return 'loading';
    return 'operational';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'loading':
        return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />;
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-orange-400" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4 text-red-400" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'border-green-500/30 bg-green-500/10';
      case 'loading':
        return 'border-yellow-500/30 bg-yellow-500/10';
      case 'degraded':
        return 'border-orange-500/30 bg-orange-500/10';
      case 'disconnected':
        return 'border-red-500/30 bg-red-500/10';
      default:
        return 'border-gray-500/30 bg-gray-500/10';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational':
        return 'All Systems Operational';
      case 'loading':
        return 'Systems Loading';
      case 'degraded':
        return 'Service Degradation Detected';
      case 'disconnected':
        return 'Connection Lost';
      default:
        return 'Unknown Status';
    }
  };

  const overallStatus = getOverallStatus();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed top-0 left-0 right-0 z-40 backdrop-blur-md border-b p-2 ${getStatusColor(overallStatus)}`}
    >
      <div className="container mx-auto flex items-center justify-between">
        {/* Overall Status */}
        <div className="flex items-center space-x-3">
          {getStatusIcon(overallStatus)}
          <span className="text-sm font-medium text-white">
            {getStatusText(overallStatus)}
          </span>
          {connectionError && (
            <span className="text-xs text-red-300">
              {connectionError}
            </span>
          )}
        </div>

        {/* Service Status Details */}
        <div className="flex items-center space-x-4">
          {services.map((service) => {
            const status = getServiceStatus(service);
            return (
              <div key={service.name} className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${
                  status === 'ok' ? 'bg-green-400' :
                  status === 'loading' ? 'bg-yellow-400 animate-pulse' :
                  'bg-red-400'
                }`} />
                <span className="text-xs text-gray-300">{service.name}</span>
                {service.error && (
                  <span className="text-xs text-red-300" title={service.error}>⚠</span>
                )}
              </div>
            );
          })}
          
          {/* Last Update */}
          {lastUpdate && (
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>
                {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}