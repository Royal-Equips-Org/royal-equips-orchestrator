import { 
  Zap, Brain, Cpu, Activity, Shield, Layers, 
  Command, Network, Database, Rocket, Eye, 
  Gauge, Target, TrendingUp, Orbit, Atom,
  ShoppingCart, Package, Users, BarChart3,
  Home, Settings, Search, Bell, DollarSign,
  PenTool
} from 'lucide-react';
import { NavigationModule } from '../types/navigation';

export const navigationModules: NavigationModule[] = [
  // Core Command Modules
  {
    id: 'command',
    label: 'COMMAND',
    icon: Command,
    description: 'Central Command Operations',
    color: '#FF0080',
    path: '/',
    category: 'core'
  },
  {
    id: 'dashboard',
    label: 'DASHBOARD',
    icon: Home,
    description: 'Main Overview Dashboard',
    color: '#00FFFF',
    path: '/dashboard',
    category: 'core'
  },
  
  // Intelligence & Analytics
  {
    id: 'aira',
    label: 'AIRA',
    icon: Brain,
    description: 'AI Empire Agent',
    color: '#00FFFF',
    path: '/aira',
    category: 'intelligence',
    isNew: true
  },
  {
    id: 'neural',
    label: 'NEURAL',
    icon: Brain,
    description: 'AI Neural Networks',
    color: '#00FFFF',
    path: '/neural',
    category: 'intelligence'
  },
  {
    id: 'quantum',
    label: 'QUANTUM',
    icon: Atom,
    description: 'Quantum Processing Core',
    color: '#8A2BE2',
    path: '/quantum',
    category: 'intelligence'
  },
  {
    id: 'intelligence',
    label: 'INTELLIGENCE',
    icon: Eye,
    description: 'Business Intelligence Matrix',
    color: '#00FF00',
    path: '/intelligence',
    category: 'intelligence'
  },
  {
    id: 'analytics',
    label: 'ANALYTICS',
    icon: Activity,
    description: 'Advanced Analytics Engine',
    color: '#FFD700',
    path: '/analytics',
    category: 'analytics'
  },
  {
    id: 'agents',
    label: 'AGENTS',
    icon: Users,
    description: 'AI Agent Management',
    color: '#FF69B4',
    path: '/agents',
    category: 'intelligence'
  },
  
  // Operational Modules
  {
    id: 'matrix',
    label: 'MATRIX',
    icon: Network,
    description: 'Product Reality Matrix',
    color: '#FF4500',
    path: '/matrix',
    category: 'operations'
  },
  {
    id: 'holographic',
    label: 'HOLO',
    icon: Layers,
    description: 'Holographic Interface',
    color: '#FF1493',
    path: '/holographic',
    category: 'operations'
  },
  
  // Shopify & E-commerce
  {
    id: 'shopify',
    label: 'SHOPIFY',
    icon: ShoppingCart,
    description: 'Shopify Store Management',
    color: '#96BF00',
    path: '/shopify',
    category: 'operations',
    isNew: true
  },
  {
    id: 'marketing',
    label: 'MARKETING',
    icon: PenTool,
    description: 'AI Marketing Studio & Campaign Management',
    color: '#FF6B9D',
    path: '/marketing',
    category: 'operations',
    isNew: true
  },
  {
    id: 'products',
    label: 'PRODUCTS',
    icon: Package,
    description: 'Product Catalog & Inventory',
    color: '#FF6347',
    path: '/products',
    category: 'operations'
  },
  {
    id: 'orders',
    label: 'ORDERS',
    icon: BarChart3,
    description: 'Order Management & Fulfillment',
    color: '#4169E1',
    path: '/orders',
    category: 'operations'
  },
  {
    id: 'customers',
    label: 'CUSTOMERS',
    icon: Users,
    description: 'Customer Relationship Management',
    color: '#FF69B4',
    path: '/customers',
    category: 'operations'
  },
  {
    id: 'customer-support',
    label: 'SUPPORT',
    icon: Users,
    description: 'AI-Powered Customer Support & Service Automation',
    color: '#00BFFF',
    path: '/customer-support',
    category: 'operations',
    isNew: true
  },
  {
    id: 'revenue',
    label: 'REVENUE',
    icon: DollarSign,
    description: 'Revenue Intelligence & Forecasting',
    color: '#00FF7F',
    path: '/revenue',
    category: 'analytics',
    isNew: true
  },
  {
    id: 'inventory',
    label: 'INVENTORY',
    icon: Package,
    description: 'AI-Powered Inventory Intelligence & ML Forecasting',
    color: '#FF8C00',
    path: '/inventory',
    category: 'operations',
    isNew: true
  },
  
  // System & Utilities
  {
    id: 'monitoring',
    label: 'MONITORING',
    icon: Gauge,
    description: 'System Health & Performance',
    color: '#32CD32',
    path: '/monitoring',
    category: 'core'
  },
  {
    id: 'settings',
    label: 'SETTINGS',
    icon: Settings,
    description: 'System Configuration',
    color: '#808080',
    path: '/settings',
    category: 'core'
  }
];

// Module categories for organized navigation
export const moduleCategories = {
  core: {
    label: 'Core Systems',
    color: '#FF0080',
    description: 'Essential command and control modules'
  },
  intelligence: {
    label: 'Intelligence',
    color: '#00FFFF',
    description: 'AI and analytical intelligence systems'
  },
  operations: {
    label: 'Operations',
    color: '#FF4500',
    description: 'Business operations and e-commerce'
  },
  analytics: {
    label: 'Analytics',
    color: '#FFD700',
    description: 'Data analysis and reporting'
  }
};

// Quick access shortcuts
export const quickAccessModules = [
  'command',
  'dashboard', 
  'aira',
  'shopify',
  'products',
  'analytics'
];

// Navigation keyboard shortcuts
export const keyboardShortcuts = {
  'Ctrl+1': 'command',
  'Ctrl+2': 'dashboard',
  'Ctrl+3': 'shopify',
  'Ctrl+4': 'products',
  'Ctrl+5': 'analytics',
  'Ctrl+B': 'goBack',
  'Ctrl+F': 'goForward',
  'Ctrl+H': 'home',
  'Ctrl+/': 'help'
};

// Get module by ID
export function getModuleById(id: string): NavigationModule | undefined {
  return navigationModules.find(module => module.id === id);
}

// Get modules by category
export function getModulesByCategory(category: string): NavigationModule[] {
  return navigationModules.filter(module => module.category === category);
}

// Get enabled modules only
export function getEnabledModules(): NavigationModule[] {
  return navigationModules.filter(module => !module.disabled);
}