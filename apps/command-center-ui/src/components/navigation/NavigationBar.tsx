import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, Search, Star, 
  Menu, Zap, Wifi, WifiOff, Grid3X3,
  LayoutDashboard, Brain, BarChart3, Bot, DollarSign,
  Package, Megaphone, HeadphonesIcon, Shield, CreditCard,
  ShoppingBag
} from 'lucide-react';
import { useEmpireStore } from '../../store/empire-store';

interface NavigationModule {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  category: string;
  description: string;
}

const navigationModules: NavigationModule[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, category: 'core', description: 'Main dashboard overview' },
  { id: 'aira', label: 'AIRA', path: '/aira', icon: Brain, category: 'ai', description: 'AI assistant and automation' },
  { id: 'analytics', label: 'Analytics', path: '/analytics', icon: BarChart3, category: 'insights', description: 'Data analytics and reports' },
  { id: 'agents', label: 'Agents', path: '/agents', icon: Bot, category: 'automation', description: 'Agent management' },
  { id: 'revenue', label: 'Revenue', path: '/revenue', icon: DollarSign, category: 'finance', description: 'Revenue tracking' },
  { id: 'inventory', label: 'Inventory', path: '/inventory', icon: Package, category: 'operations', description: 'Inventory management' },
  { id: 'marketing', label: 'Marketing', path: '/marketing', icon: Megaphone, category: 'growth', description: 'Marketing automation' },
  { id: 'customer-support', label: 'Support', path: '/customer-support', icon: HeadphonesIcon, category: 'service', description: 'Customer support' },
  { id: 'security', label: 'Security', path: '/security', icon: Shield, category: 'security', description: 'Security monitoring' },
  { id: 'finance', label: 'Finance', path: '/finance', icon: CreditCard, category: 'finance', description: 'Financial management' },
  { id: 'shopify', label: 'Shopify', path: '/shopify', icon: ShoppingBag, category: 'ecommerce', description: 'Shopify integration' },
];

interface NavigationBarProps {
  className?: string;
}

export default function NavigationBar({ className = '' }: NavigationBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected } = useEmpireStore();

  const currentPath = location.pathname;
  const currentModule = navigationModules.find(m => m.path === currentPath);

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('royal-equips-favorites') || '[]';
      setFavorites(JSON.parse(saved));
    } catch (error) {
      console.warn('Failed to load favorites:', error);
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: string[]) => {
    setFavorites(newFavorites);
    try {
      localStorage.setItem('royal-equips-favorites', JSON.stringify(newFavorites));
    } catch (error) {
      console.warn('Failed to save favorites:', error);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const toggleFavorite = (moduleId: string) => {
    const newFavorites = favorites.includes(moduleId)
      ? favorites.filter(id => id !== moduleId)
      : [...favorites, moduleId];
    saveFavorites(newFavorites);
  };

  // Filter modules based on search
  const filteredModules = navigationModules.filter(module =>
    module.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favoriteModules = navigationModules.filter(m => favorites.includes(m.id));

  return (
    <motion.nav
      className={`h-full bg-black/20 backdrop-blur-sm border-r border-cyan-400/20 ${className}`}
      initial={{ width: 64 }}
      animate={{ width: isExpanded ? 280 : 64 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-cyan-400/20">
          <div className="flex items-center justify-between">
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Zap className="w-6 h-6 text-cyan-400" />
                <span className="text-cyan-300 font-semibold">Royal Equips</span>
              </motion.div>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-lg hover:bg-cyan-400/20 transition-colors"
            >
              {isExpanded ? <ChevronLeft className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5 text-cyan-400" />}
            </button>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-2 mt-3">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            {isExpanded && (
              <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? 'Connected' : 'Offline'}
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        {isExpanded && (
          <div className="p-4 border-b border-cyan-400/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400/60" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/40 border border-cyan-400/30 rounded-lg text-cyan-300 placeholder-cyan-400/60 focus:outline-none focus:border-cyan-400/60"
              />
            </div>
          </div>
        )}

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Favorites */}
          {isExpanded && favoriteModules.length > 0 && (
            <div className="p-4 border-b border-cyan-400/20">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-cyan-400 font-medium">Favorites</span>
              </div>
              <div className="space-y-1">
                {favoriteModules.map((module) => (
                  <NavigationItem
                    key={module.id}
                    module={module}
                    isActive={currentPath === module.path}
                    isFavorite={true}
                    onNavigate={handleNavigate}
                    onToggleFavorite={toggleFavorite}
                    isExpanded={isExpanded}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Main Navigation */}
          <div className="p-4">
            {isExpanded && (
              <div className="flex items-center gap-2 mb-3">
                <Grid3X3 className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-cyan-400 font-medium">Modules</span>
              </div>
            )}
            <div className="space-y-1">
              {filteredModules.map((module) => (
                <NavigationItem
                  key={module.id}
                  module={module}
                  isActive={currentPath === module.path}
                  isFavorite={favorites.includes(module.id)}
                  onNavigate={handleNavigate}
                  onToggleFavorite={toggleFavorite}
                  isExpanded={isExpanded}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyan-400/20">
          {currentModule && isExpanded && (
            <div className="text-xs text-cyan-400/60 mb-2">
              Current: {currentModule.label}
            </div>
          )}
          <div className="flex justify-center">
            <div className="w-8 h-1 bg-cyan-400/20 rounded-full">
              <div 
                className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${(navigationModules.findIndex(m => m.path === currentPath) + 1) / navigationModules.length * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

interface NavigationItemProps {
  module: NavigationModule;
  isActive: boolean;
  isFavorite: boolean;
  onNavigate: (path: string) => void;
  onToggleFavorite: (moduleId: string) => void;
  isExpanded: boolean;
}

function NavigationItem({ 
  module, 
  isActive, 
  isFavorite, 
  onNavigate, 
  onToggleFavorite, 
  isExpanded 
}: NavigationItemProps) {
  const Icon = module.icon;

  return (
    <motion.div
      className={`relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
        isActive 
          ? 'bg-cyan-400/20 border border-cyan-400/30 text-cyan-300' 
          : 'text-cyan-400/80 hover:bg-cyan-400/10 hover:text-cyan-300'
      }`}
      onClick={() => onNavigate(module.path)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      
      {isExpanded && (
        <>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{module.label}</div>
            <div className="text-xs text-cyan-400/60 truncate">{module.description}</div>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(module.id);
            }}
            className="p-1 rounded hover:bg-cyan-400/20 transition-colors"
          >
            <Star 
              className={`w-4 h-4 ${
                isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-cyan-400/40'
              }`} 
            />
          </button>
        </>
      )}
      
      {isActive && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 rounded-r"
          layoutId="activeIndicator"
        />
      )}
    </motion.div>
  );
}