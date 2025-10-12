// DELETED - Consolidated into NavigationBar.tsx

import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { 
  Settings,
  Shield,
  BarChart3,
  Brain,
  Users,
  Package,
  DollarSign,
  Zap,
  Eye,
  Database,
  FileText,
  Lock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Activity,
  Globe,
  Server,
  MessageSquare,
  Bell,
  Calendar,
  Filter,
  Search,
  Menu,
  X,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface EnterpriseModule {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  path: string;
  category: 'core' | 'analytics' | 'management' | 'security';
  status: 'active' | 'maintenance' | 'new' | 'beta';
  permissions: string[];
  metrics?: {
    users: number;
    uptime: number;
    lastUpdate: string;
  };
}

interface NavigationProps {
  currentModule?: string;
  onModuleSelect: (moduleId: string) => void;
  onNavigate: (path: string) => void;
}

const enterpriseModules: EnterpriseModule[] = [
  // Core Business Intelligence
  {
    id: 'enhanced-analytics',
    name: 'Enhanced Analytics',
    description: 'Advanced BI with AI-powered insights and predictive forecasting',
    icon: BarChart3,
    path: '/modules/analytics/enhanced',
    category: 'analytics',
    status: 'new',
    permissions: ['analytics.read', 'analytics.export'],
    metrics: {
      users: 45,
      uptime: 99.97,
      lastUpdate: '2024-01-10T08:30:00Z'
    }
  },
  {
    id: 'aira-intelligence',
    name: 'AIRA Intelligence',
    description: 'AI-driven autonomous business intelligence and decision making',
    icon: Brain,
    path: '/modules/aira',
    category: 'core',
    status: 'active',
    permissions: ['ai.read', 'ai.configure'],
    metrics: {
      users: 32,
      uptime: 99.95,
      lastUpdate: '2024-01-10T07:45:00Z'
    }
  },

  // Management & Configuration
  {
    id: 'enterprise-settings',
    name: 'Enterprise Settings',
    description: 'Comprehensive system configuration and integration management',
    icon: Settings,
    path: '/modules/settings',
    category: 'management',
    status: 'new',
    permissions: ['settings.read', 'settings.write', 'system.admin'],
    metrics: {
      users: 8,
      uptime: 100,
      lastUpdate: '2024-01-10T09:15:00Z'
    }
  },
  {
    id: 'audit-compliance',
    name: 'Audit & Compliance',
    description: 'Enterprise audit logging, compliance monitoring, and regulatory reporting',
    icon: Shield,
    path: '/modules/audit-compliance',
    category: 'security',
    status: 'new',
    permissions: ['audit.read', 'compliance.read', 'audit.export'],
    metrics: {
      users: 12,
      uptime: 99.98,
      lastUpdate: '2024-01-10T08:45:00Z'
    }
  },

  // Existing Core Modules
  {
    id: 'agents',
    name: 'Agent Management',
    description: 'Multi-agent system orchestration and performance monitoring',
    icon: Users,
    path: '/modules/agents',
    category: 'core',
    status: 'active',
    permissions: ['agents.read', 'agents.control'],
    metrics: {
      users: 28,
      uptime: 99.92,
      lastUpdate: '2024-01-10T08:00:00Z'
    }
  },
  {
    id: 'revenue',
    name: 'Revenue Operations',
    description: 'Revenue tracking, optimization, and financial analytics',
    icon: DollarSign,
    path: '/modules/revenue',
    category: 'analytics',
    status: 'active',
    permissions: ['revenue.read', 'financial.read'],
    metrics: {
      users: 35,
      uptime: 99.99,
      lastUpdate: '2024-01-10T08:20:00Z'
    }
  },
  {
    id: 'inventory',
    name: 'Inventory Intelligence',
    description: 'Smart inventory management with demand forecasting',
    icon: Package,
    path: '/modules/inventory',
    category: 'analytics',
    status: 'active',
    permissions: ['inventory.read', 'inventory.forecast'],
    metrics: {
      users: 22,
      uptime: 99.94,
      lastUpdate: '2024-01-10T07:30:00Z'
    }
  },
  {
    id: 'marketing',
    name: 'Marketing Automation',
    description: 'AI-driven marketing campaigns and customer engagement',
    icon: Zap,
    path: '/modules/marketing',
    category: 'core',
    status: 'active',
    permissions: ['marketing.read', 'campaigns.manage'],
    metrics: {
      users: 18,
      uptime: 99.91,
      lastUpdate: '2024-01-10T08:10:00Z'
    }
  }
];

export default function EnterpriseNavigation({ currentModule, onModuleSelect, onNavigate }: NavigationProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);

  const categories = [
    { id: 'all', name: 'All Modules', icon: Globe },
    { id: 'core', name: 'Core Systems', icon: Server },
    { id: 'analytics', name: 'Analytics & BI', icon: BarChart3 },
    { id: 'management', name: 'Management', icon: Settings },
    { id: 'security', name: 'Security & Compliance', icon: Shield }
  ];

  const filteredModules = enterpriseModules.filter(module => {
    const matchesSearch = module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         module.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || module.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'new': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
      case 'beta': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'maintenance': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99.9) return 'text-green-400';
    if (uptime >= 99.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={`h-full bg-black text-white transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-80'
    } border-r border-gray-800`}>
      
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-400 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-black" />
              </div>
              <div>
                <h2 className="font-semibold">Enterprise Suite</h2>
                <p className="text-xs text-gray-400">Royal Equips Command Center</p>
              </div>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2"
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </Button>
        </div>

        {/* Search & Filters */}
        {!isCollapsed && (
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-cyan-400"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMetrics(!showMetrics)}
                className="text-xs"
              >
                <Eye className="w-3 h-3 mr-1" />
                Metrics
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Module List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isCollapsed ? (
          // Collapsed view - icons only
          <div className="space-y-2">
            {filteredModules.map((module) => {
              const IconComponent = module.icon;
              return (
                <div key={module.id} className="relative group">
                  <Button
                    variant={currentModule === module.id ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      onModuleSelect(module.id);
                      onNavigate(module.path);
                    }}
                    className="w-full p-3 justify-center"
                    title={module.name}
                  >
                    <IconComponent className="w-5 h-5" />
                  </Button>
                  
                  {/* Tooltip */}
                  <div className="absolute left-full ml-2 top-0 bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 min-w-64">
                    <div className="flex items-start space-x-3">
                      <IconComponent className="w-5 h-5 text-cyan-400 mt-0.5" />
                      <div>
                        <h4 className="font-semibold">{module.name}</h4>
                        <p className="text-sm text-gray-400 mt-1">{module.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge className={getStatusColor(module.status)}>
                            {module.status}
                          </Badge>
                          {module.metrics && (
                            <div className="text-xs text-gray-400">
                              {module.metrics.uptime}% uptime
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Expanded view
          <div className="space-y-2">
            {filteredModules.map((module) => {
              const IconComponent = module.icon;
              const isActive = currentModule === module.id;
              
              return (
                <Card 
                  key={module.id}
                  className={`p-4 cursor-pointer transition-all duration-200 hover:bg-gray-800/50 ${
                    isActive ? 'bg-gray-800 border-cyan-400/30' : 'border-gray-700/50'
                  }`}
                  onClick={() => {
                    onModuleSelect(module.id);
                    onNavigate(module.path);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        isActive ? 'bg-cyan-400/20' : 'bg-gray-700/50'
                      }`}>
                        <IconComponent className={`w-5 h-5 ${
                          isActive ? 'text-cyan-400' : 'text-gray-400'
                        }`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className={`font-medium ${
                            isActive ? 'text-cyan-400' : 'text-white'
                          }`}>
                            {module.name}
                          </h3>
                          <Badge 
                            variant="outline"
                            className={getStatusColor(module.status)}
                          >
                            {module.status}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-400 mb-2">
                          {module.description}
                        </p>

                        {showMetrics && module.metrics && (
                          <div className="flex items-center space-x-4 text-xs">
                            <div className="flex items-center space-x-1">
                              <Users className="w-3 h-3 text-gray-500" />
                              <span>{module.metrics.users} users</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Activity className="w-3 h-3 text-gray-500" />
                              <span className={getUptimeColor(module.metrics.uptime)}>
                                {module.metrics.uptime}%
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3 text-gray-500" />
                              <span>{new Date(module.metrics.lastUpdate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                      isActive ? 'rotate-90' : ''
                    }`} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {filteredModules.length === 0 && (
          <div className="flex items-center justify-center h-32 text-center">
            <div>
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm text-gray-400">No modules found</p>
              <p className="text-xs text-gray-500">Try adjusting your search or filters</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-800">
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => onNavigate('/system-health')}
            >
              <Activity className="w-3 h-3 mr-2" />
              System Health
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => onNavigate('/notifications')}
            >
              <Bell className="w-3 h-3 mr-2" />
              Notifications
              <Badge variant="destructive" className="ml-auto text-xs">3</Badge>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => onNavigate('/admin')}
            >
              <Lock className="w-3 h-3 mr-2" />
              Admin Panel
              <ExternalLink className="w-3 h-3 ml-auto" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}