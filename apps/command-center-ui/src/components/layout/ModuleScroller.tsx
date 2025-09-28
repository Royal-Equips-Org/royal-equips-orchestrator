import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { navigationModules } from '../../config/navigation';
import clsx from 'clsx';

interface ModuleScrollerProps {
  className?: string;
  onModuleSelect?: (moduleId: string) => void;
}

/**
 * ModuleScroller - Horizontal scrollable module navigation with touch support
 * Features: scroll-snap, momentum scrolling, keyboard navigation, responsive
 */
export function ModuleScroller({ className = '', onModuleSelect }: ModuleScrollerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(true);
  
  const { state, navigateToModule } = useNavigation();
  const activeModuleId = state.currentModule;

  // Check scroll position to show/hide gradients
  const handleScroll = () => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftGradient(scrollLeft > 10);
    setShowRightGradient(scrollLeft < scrollWidth - clientWidth - 10);
  };

  // Auto-scroll active item into view
  useEffect(() => {
    if (!scrollRef.current || !activeModuleId) return;
    
    const activeElement = scrollRef.current.querySelector(`[data-module-id="${activeModuleId}"]`);
    if (activeElement) {
      activeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [activeModuleId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!scrollRef.current) return;
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          scrollRef.current.scrollBy({ left: -120, behavior: 'smooth' });
          break;
        case 'ArrowRight':
          event.preventDefault();
          scrollRef.current.scrollBy({ left: 120, behavior: 'smooth' });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleModuleClick = (moduleId: string) => {
    navigateToModule(moduleId);
    onModuleSelect?.(moduleId);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Left fade gradient */}
      <div className={clsx(
        'absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none',
        'bg-gradient-to-r from-bg to-transparent',
        'transition-opacity duration-300',
        showLeftGradient ? 'opacity-100' : 'opacity-0'
      )} />

      {/* Right fade gradient */}
      <div className={clsx(
        'absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none',
        'bg-gradient-to-l from-bg to-transparent',
        'transition-opacity duration-300',
        showRightGradient ? 'opacity-100' : 'opacity-0'
      )} />

      {/* Scrollable module container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="
          flex gap-2 overflow-x-auto scrollbar-none
          px-4 py-3 scroll-smooth scroll-snap-x
          touch-pan-x will-change-transform
        "
        role="tablist"
        aria-label="Navigation modules"
      >
        {navigationModules.map((module) => {
          const isActive = module.id === activeModuleId;
          const isDisabled = module.status === 'coming-soon' || module.status === 'disabled';
          
          return (
            <motion.button
              key={module.id}
              data-module-id={module.id}
              onClick={() => !isDisabled && handleModuleClick(module.id)}
              disabled={isDisabled}
              role="tab"
              aria-selected={isActive}
              aria-controls={`module-panel-${module.id}`}
              tabIndex={isActive ? 0 : -1}
              whileHover={!isDisabled ? { scale: 1.05, y: -2 } : undefined}
              whileTap={!isDisabled ? { scale: 0.95 } : undefined}
              className={clsx(
                // Base styles
                'flex-shrink-0 px-4 py-2 rounded-full',
                'text-sm font-medium transition-all duration-200',
                'scroll-snap-center border',
                'min-w-[80px] justify-center items-center',
                
                // Active state
                isActive && [
                  'bg-quantum-primary/20 text-quantum-primary',
                  'border-quantum-primary/60 shadow-lg',
                  'shadow-quantum-primary/25'
                ],
                
                // Inactive state
                !isActive && !isDisabled && [
                  'bg-bg-surface/40 text-text-secondary',
                  'border-bg-surface/60 hover:border-quantum-primary/40',
                  'hover:text-quantum-primary hover:bg-quantum-primary/10'
                ],
                
                // Disabled state
                isDisabled && [
                  'bg-bg-surface/20 text-text-dim',
                  'border-bg-surface/30 cursor-not-allowed',
                  'opacity-60'
                ]
              )}
            >
              <div className="flex items-center space-x-2">
                {/* Module icon */}
                {module.icon && (
                  <span className="text-current">
                    <module.icon className="w-4 h-4" />
                  </span>
                )}
                
                {/* Module label */}
                <span className="whitespace-nowrap font-mono uppercase tracking-wide">
                  {module.label}
                </span>
                
                {/* Status indicator */}
                {module.status === 'coming-soon' && (
                  <span className="
                    text-[10px] px-1.5 py-0.5 rounded
                    bg-quantum-warning/20 text-quantum-warning
                    border border-quantum-warning/30
                    font-mono uppercase tracking-wider
                  ">
                    SOON
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Navigation hints for accessibility */}
      <div className="sr-only" aria-live="polite">
        {activeModuleId && `Current module: ${
          navigationModules.find(m => m.id === activeModuleId)?.label || activeModuleId
        }`}
      </div>
    </div>
  );
}

export default ModuleScroller;