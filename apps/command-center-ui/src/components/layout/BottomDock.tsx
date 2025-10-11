import React from 'react';
import { motion } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { Home, Brain, ShoppingBag, BarChart3, Command } from 'lucide-react';
import clsx from 'clsx';

interface BottomDockProps {
  className?: string;
}

// Primary navigation items for bottom dock
const dockItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'agents', label: 'Agents', icon: Brain },
  { id: 'command', label: 'Command', icon: Command },
  { id: 'shopify', label: 'Commerce', icon: ShoppingBag },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

/**
 * BottomDock - Mobile-first bottom navigation dock
 * Features: Fixed bottom positioning, safe area support, haptic feedback
 */
export function BottomDock({ className = '' }: BottomDockProps) {
  const { state, navigateToModule } = useNavigation();
  const activeModuleId = state.currentModule;

  const handleItemClick = (moduleId: string) => {
    // Add haptic feedback if supported
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    navigateToModule(moduleId);
  };

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`
        fixed bottom-0 left-0 right-0 z-30
        bg-bg/95 backdrop-blur-xl
        border-t border-quantum-primary/20
        pb-safe-bottom
        ${className}
      `}
      role="tablist"
      aria-label="Primary navigation"
    >
      <div className="flex items-center justify-around px-4 py-2">
        {dockItems.map((item, index) => {
          const isActive = item.id === activeModuleId;
          const Icon = item.icon;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`module-panel-${item.id}`}
              tabIndex={isActive ? 0 : -1}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={clsx(
                // Base styles
                'relative flex flex-col items-center justify-center',
                'min-w-[60px] h-16 rounded-xl',
                'transition-all duration-200 ease-quantum',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-quantum-primary',
                
                // Active state
                isActive && [
                  'bg-quantum-primary/20 text-quantum-primary',
                  'shadow-lg shadow-quantum-primary/25'
                ],
                
                // Inactive state
                !isActive && [
                  'text-text-secondary hover:text-quantum-primary',
                  'hover:bg-quantum-primary/10'
                ]
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="dock-indicator"
                  className="
                    absolute -top-1 left-1/2 transform -translate-x-1/2
                    w-8 h-1 rounded-full bg-quantum-primary
                  "
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              
              {/* Icon */}
              <motion.div
                animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Icon className={clsx(
                  'w-5 h-5 mb-1',
                  isActive ? 'text-quantum-primary' : 'text-current'
                )} />
              </motion.div>
              
              {/* Label */}
              <span className={clsx(
                'text-xs font-medium font-mono uppercase tracking-wider',
                'transition-colors duration-200',
                isActive ? 'text-quantum-primary' : 'text-current'
              )}>
                {item.label}
              </span>
              
              {/* Glow effect for active item */}
              {isActive && (
                <motion.div
                  className="
                    absolute inset-0 rounded-xl
                    bg-gradient-to-t from-quantum-primary/10 to-transparent
                    pointer-events-none
                  "
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
      
      {/* Quantum background effect */}
      <div className="
        absolute inset-0 pointer-events-none
        bg-gradient-to-t from-quantum-primary/5 via-transparent to-transparent
      " />
    </motion.nav>
  );
}

export default BottomDock;