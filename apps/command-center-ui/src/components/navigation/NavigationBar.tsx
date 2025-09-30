import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, createElement } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, Search, Star, Clock, 
  Menu, X, Zap, Wifi, WifiOff, Grid3X3 
} from 'lucide-react';
import { 
  navigationModules, 
  moduleCategories, 
  quickAccessModules,
  getModuleById,
  getModulesByCategory 
} from '../../config/navigation';
import { useEmpireStore } from '../../store/empire-store';

interface NavigationBarProps {
  className?: string;
}

export default function NavigationBar({ className = '' }: NavigationBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const { isConnected } = useEmpireStore();

  // Navigate to module using React Router
  const navigateToModule = (moduleId: string) => {
    const module = getModuleById(moduleId);
    if (module) {
      navigate(module.path);
      // Update recently used
      setRecentlyUsed(prev => [moduleId, ...prev.filter(id => id !== moduleId)].slice(0, 10));
    }
  };

  // Add/remove favorites
  const addToFavorites = (moduleId: string) => {
    setFavorites(prev => prev.includes(moduleId) ? prev : [...prev, moduleId]);
  };

  const removeFromFavorites = (moduleId: string) => {
    setFavorites(prev => prev.filter(id => id !== moduleId));
  };

  // Get current module from location
  const currentModule = navigationModules.find(module => module.path === location.pathname)?.id || 'command';

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            navigateToModule('command');
            break;
          case '2':
            event.preventDefault();
            navigateToModule('dashboard');
            break;
          case '3':
            event.preventDefault();
            navigateToModule('shopify');
            break;
          case '4':
            event.preventDefault();
            navigateToModule('products');
            break;
          case '5':
            event.preventDefault();
            navigateToModule('analytics');
            break;
          case 'b':
            event.preventDefault();
            navigate(-1); // Go back
            break;
          case 'f':
            event.preventDefault();
            navigate(1); // Go forward
            break;
        }
      }
      
      // Toggle navigation with Escape
      if (event.key === 'Escape') {
        setIsExpanded(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateToModule, navigate]);

  const filteredModules = navigationModules.filter(module =>
    module.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentModuleInfo = getModuleById(currentModule);

  return (
    <>
      {/* Main Navigation Bar */}
      <motion.div
        className={`fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-cyan-500/30 ${className}`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center justify-between px-4 py-2 h-12">
          {/* Left Section - Logo & Navigation Controls */}
          <div className="flex items-center space-x-4">
            <motion.div 
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
            >
              <Zap className="w-6 h-6 text-hologram" />
              <span className="text-hologram font-bold text-lg">ROYAL EQUIPS</span>
            </motion.div>
            
            {/* Navigation Controls */}
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={goBack}
                disabled={!canGoBack}
                className={`p-1 rounded ${canGoBack 
                  ? 'text-white hover:text-hologram hover:bg-white/10' 
                  : 'text-gray-600 cursor-not-allowed'}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={goForward}
                disabled={!canGoForward}
                className={`p-1 rounded ${canGoForward 
                  ? 'text-white hover:text-hologram hover:bg-white/10' 
                  : 'text-gray-600 cursor-not-allowed'}`}
              >
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Center Section - Current Module & Breadcrumb */}
          <div className="flex-1 flex items-center justify-center">
            <motion.div 
              className="bg-black/40 px-4 py-1 rounded-full border border-cyan-500/30 flex items-center space-x-2"
              layoutId="current-module"
            >
              {currentModuleInfo && (
                <>
                  {createElement(currentModuleInfo.icon, { 
                    className: "w-4 h-4", 
                    style: { color: currentModuleInfo.color } 
                  })}
                  <span className="text-white font-mono text-sm">{currentModuleInfo.label}</span>
                </>
              )}
            </motion.div>
          </div>

          {/* Right Section - Actions & Status */}
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
              <span className="text-xs text-gray-400 font-mono">
                {isConnected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            {/* Navigation Menu Toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-white hover:text-hologram hover:bg-white/10 rounded-lg"
            >
              {isExpanded ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>

        {/* Quick Access Bar */}
        <div className="px-4 py-2 border-t border-gray-800">
          <div className="flex items-center justify-center space-x-2">
            {quickAccessModules.map((moduleId) => {
              const module = getModuleById(moduleId);
              if (!module) return null;
              
              const isActive = state.currentModule === moduleId;
              const isFavorite = favorites.includes(moduleId);
              
              return (
                <motion.button
                  key={moduleId}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigateToModule(moduleId)}
                  className={`relative px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                    isActive 
                      ? 'bg-white/20 text-hologram border border-hologram/50' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <module.icon className="w-3 h-3 inline-block mr-1" />
                  {module.label}
                  {isFavorite && (
                    <Star className="w-2 h-2 absolute -top-1 -right-1 text-yellow-400 fill-current" />
                  )}
                  {module.isNew && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Extended Navigation Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-0 right-0 z-40 bg-black/95 backdrop-blur-xl border-b border-cyan-500/30"
          >
            <div className="max-w-7xl mx-auto p-6">
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative max-w-md mx-auto">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search modules... (type to filter)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-black/40 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-hologram"
                    autoFocus
                  />
                </div>
              </div>

              {/* Module Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {filteredModules.map((module) => {
                  const isActive = currentModule === module.id;
                  const isFavorite = favorites.includes(module.id);
                  const isRecent = recentlyUsed.includes(module.id);
                  
                  return (
                    <motion.div
                      key={module.id}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        navigateToModule(module.id);
                        setIsExpanded(false);
                      }}
                      className={`relative p-4 rounded-xl cursor-pointer transition-all ${
                        isActive 
                          ? 'bg-gradient-to-br from-hologram/20 to-purple-500/20 border border-hologram/50' 
                          : 'bg-black/40 border border-gray-700 hover:border-gray-500 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex flex-col items-center text-center space-y-2">
                        <div className="relative">
                          <module.icon 
                            className="w-8 h-8" 
                            style={{ color: module.color }} 
                          />
                          {module.isNew && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-mono text-white">{module.label}</div>
                          <div className="text-xs text-gray-400">{module.description}</div>
                        </div>
                      </div>
                      
                      {/* Indicators */}
                      <div className="absolute top-2 right-2 flex space-x-1">
                        {isFavorite && (
                          <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        )}
                        {isRecent && (
                          <Clock className="w-3 h-3 text-blue-400" />
                        )}
                      </div>
                      
                      {/* Favorite Toggle */}
                      <motion.button
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isFavorite) {
                            removeFromFavorites(module.id);
                          } else {
                            addToFavorites(module.id);
                          }
                        }}
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Star className={`w-3 h-3 ${isFavorite ? 'text-yellow-400 fill-current' : 'text-gray-400'}`} />
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>

              {/* Recent & Favorites */}
              {(recentlyUsed.length > 0 || favorites.length > 0) && (
                <div className="mt-6 pt-6 border-t border-gray-800">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Recently Used */}
                    {recentlyUsed.length > 0 && (
                      <div>
                        <h3 className="text-sm font-mono text-gray-400 mb-3 flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          RECENTLY USED
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {recentlyUsed.slice(0, 6).map((moduleId) => {
                            const module = getModuleById(moduleId);
                            if (!module) return null;
                            return (
                              <motion.button
                                key={moduleId}
                                whileHover={{ scale: 1.05 }}
                                onClick={() => {
                                  navigateToModule(moduleId);
                                  setIsExpanded(false);
                                }}
                                className="px-3 py-1 bg-black/40 rounded-full text-xs font-mono text-gray-300 hover:text-white hover:bg-white/10 border border-gray-700"
                              >
                                <module.icon className="w-3 h-3 inline-block mr-1" />
                                {module.label}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Favorites */}
                    {favorites.length > 0 && (
                      <div>
                        <h3 className="text-sm font-mono text-gray-400 mb-3 flex items-center">
                          <Star className="w-4 h-4 mr-2" />
                          FAVORITES
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {favorites.map((moduleId) => {
                            const module = getModuleById(moduleId);
                            if (!module) return null;
                            return (
                              <motion.button
                                key={moduleId}
                                whileHover={{ scale: 1.05 }}
                                onClick={() => {
                                  navigateToModule(moduleId);
                                  setIsExpanded(false);
                                }}
                                className="px-3 py-1 bg-black/40 rounded-full text-xs font-mono text-yellow-300 hover:text-yellow-200 hover:bg-yellow-500/10 border border-yellow-500/30"
                              >
                                <module.icon className="w-3 h-3 inline-block mr-1" />
                                {module.label}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}