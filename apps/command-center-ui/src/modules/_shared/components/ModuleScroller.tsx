import React, { useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';

export interface ModuleDef {
  id: string;
  label: string;
  path: string;
  status?: 'active' | 'coming-soon' | 'disabled';
  icon?: React.ReactNode;
  description?: string;
}

export interface ModuleScrollerProps {
  modules: ModuleDef[];
  activeId?: string;
  onNavigate: (path: string, moduleId: string) => void;
  className?: string;
  ariaLabel?: string;
}

export const ModuleScroller: React.FC<ModuleScrollerProps> = ({
  modules,
  activeId,
  onNavigate,
  className = '',
  ariaLabel = 'Primary Modules'
}) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const activeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Scroll active item into view
  useEffect(() => {
    if (!scrollerRef.current || !activeId) return;
    
    const activeButton = scrollerRef.current.querySelector<HTMLButtonElement>(
      `[data-module-id="${activeId}"]`
    );
    
    if (activeButton) {
      activeButton.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [activeId]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    
    const buttons = scrollerRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]:not([disabled])'
    );
    
    if (!buttons || buttons.length === 0) return;

    const currentIndex = Array.from(buttons).findIndex(
      button => button === event.target
    );

    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
        break;
      case 'ArrowRight':
        nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = buttons.length - 1;
        break;
    }

    buttons[nextIndex]?.focus();
  }, []);

  // Handle module navigation
  const handleModuleClick = useCallback((module: ModuleDef) => {
    if (module.status === 'disabled' || module.status === 'coming-soon') {
      return;
    }
    onNavigate(module.path, module.id);
  }, [onNavigate]);

  // Mouse wheel horizontal scrolling
  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (!scrollerRef.current) return;
    
    // Convert vertical scroll to horizontal
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      event.preventDefault();
      scrollerRef.current.scrollLeft += event.deltaY;
    }
  }, []);

  return (
    <div
      ref={scrollerRef}
      className={clsx(
        // Base styles
        'flex gap-2 overflow-x-auto overflow-y-hidden',
        'px-3 py-2 scroll-smooth',
        // Scroll snap
        'snap-x snap-mandatory',
        // Hide scrollbar but keep functionality
        'scrollbar-none',
        // Focus management
        'focus-within:outline-none',
        className
      )}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
    >
      {modules.map((module) => {
        const isActive = module.id === activeId;
        const isDisabled = module.status === 'disabled' || module.status === 'coming-soon';
        
        return (
          <button
            key={module.id}
            ref={isActive ? activeButtonRef : undefined}
            data-module-id={module.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            tabIndex={isActive ? 0 : -1}
            disabled={isDisabled}
            onClick={() => handleModuleClick(module)}
            title={module.description || module.label}
            className={clsx(
              // Base styles
              'snap-center whitespace-nowrap rounded-full',
              'px-4 py-2 text-sm font-medium',
              'transition-all duration-200 ease-out',
              'flex items-center gap-2',
              'min-w-max',
              // Focus styles
              'focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:ring-offset-2 focus:ring-offset-black',
              // Active state
              isActive && [
                'bg-cyan-500/20 text-cyan-300',
                'ring-1 ring-cyan-400/60',
                'shadow-lg shadow-cyan-500/20'
              ],
              // Inactive state
              !isActive && !isDisabled && [
                'bg-surface/40 text-text-dim',
                'hover:text-cyan-200 hover:bg-cyan-500/10',
                'hover:shadow-md hover:shadow-cyan-500/10',
                'border border-transparent hover:border-cyan-500/30'
              ],
              // Disabled state
              isDisabled && [
                'opacity-50 cursor-not-allowed',
                'bg-surface/20 text-text-muted'
              ]
            )}
          >
            {/* Icon */}
            {module.icon && (
              <span className="flex-shrink-0 w-4 h-4">
                {module.icon}
              </span>
            )}
            
            {/* Label */}
            <span>{module.label}</span>
            
            {/* Status badge */}
            {module.status === 'coming-soon' && (
              <span className="ml-2 text-[11px] uppercase tracking-wide text-yellow-400/80 font-semibold">
                Soon
              </span>
            )}
            
            {/* Active indicator */}
            {isActive && (
              <span 
                className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

// CSS for hiding scrollbar while maintaining functionality
const scrollbarStyles = `
  .scrollbar-none {
    -ms-overflow-style: none;  /* Internet Explorer 10+ */
    scrollbar-width: none;  /* Firefox */
  }
  .scrollbar-none::-webkit-scrollbar { 
    display: none;  /* Safari and Chrome */
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('module-scroller-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'module-scroller-styles';
  styleSheet.textContent = scrollbarStyles;
  document.head.appendChild(styleSheet);
}

export default ModuleScroller;