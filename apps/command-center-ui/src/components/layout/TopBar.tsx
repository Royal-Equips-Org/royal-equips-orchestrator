import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Zap, Wifi, WifiOff, Shield } from 'lucide-react';
import { useEmpireStore } from '../../store/empire-store';

interface TopBarProps {
  onMenuToggle?: (isOpen: boolean) => void;
  className?: string;
}

/**
 * TopBar - Collapsible mobile-first navigation header
 * Features: hamburger menu, connection status, responsive layout
 */
export function TopBar({ onMenuToggle, className = '' }: TopBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { isConnected, metrics } = useEmpireStore();

  // Handle scroll state for collapsible behavior
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMenuToggle = () => {
    const newState = !isMenuOpen;
    setIsMenuOpen(newState);
    onMenuToggle?.(newState);
  };

  const formatTime = () => {
    return new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`
        fixed top-0 left-0 right-0 z-40
        transition-all duration-300 ease-quantum
        ${isScrolled 
          ? 'bg-bg/95 backdrop-blur-xl border-b border-quantum-primary/20 h-14' 
          : 'bg-bg/80 backdrop-blur-md h-16'
        }
        ${className}
      `}
    >
      <div className="
        max-w-screen-2xl mx-auto
        flex items-center justify-between
        px-4 sm:px-6 h-full
      ">
        {/* Left Section - Logo & Brand */}
        <div className="flex items-center space-x-3">
          <motion.div 
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-quantum-primary" />
            <h1 className="
              font-bold text-quantum-primary
              text-sm sm:text-base lg:text-lg
              font-mono tracking-wide
            ">
              ROYAL EQUIPS
            </h1>
          </motion.div>
        </div>

        {/* Center Section - Status (Hidden on mobile) */}
        <div className="hidden md:flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <motion.div
              animate={isConnected ? { rotate: 0 } : { rotate: 180 }}
              transition={{ duration: 0.5 }}
            >
              {isConnected ? (
                <Wifi className="w-4 h-4 text-quantum-accent" />
              ) : (
                <WifiOff className="w-4 h-4 text-quantum-danger" />
              )}
            </motion.div>
            <span className={`
              text-xs font-mono uppercase tracking-wider
              ${isConnected ? 'text-quantum-accent' : 'text-quantum-danger'}
            `}>
              {isConnected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          {/* System Status */}
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-quantum-primary" />
            <span className="text-xs font-mono text-quantum-primary">SECURE</span>
          </div>

          {/* Power Level */}
          {metrics && (
            <div className="flex items-center space-x-2">
              <div className="
                w-8 h-2 bg-bg-surface rounded-full overflow-hidden
                border border-quantum-primary/30
              ">
                <motion.div
                  className="h-full bg-gradient-to-r from-quantum-primary to-quantum-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.powerLevel || 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <span className="
                text-xs font-mono text-quantum-primary
                min-w-[4rem] text-right
              ">
                {(metrics.powerLevel || 100).toFixed(1)}% POWER
              </span>
            </div>
          )}
        </div>

        {/* Right Section - Time & Menu */}
        <div className="flex items-center space-x-3">
          {/* Time Display (Hidden on small mobile) */}
          <div className="hidden sm:block">
            <time className="
              text-xs sm:text-sm font-mono text-text-secondary
              min-w-[6rem] text-right
            ">
              {formatTime()}
            </time>
          </div>

          {/* Mobile Menu Toggle */}
          <motion.button
            onClick={handleMenuToggle}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="
              p-2 rounded-lg
              bg-quantum-primary/10 hover:bg-quantum-primary/20
              border border-quantum-primary/30 hover:border-quantum-primary/50
              transition-colors duration-200
              md:hidden
            "
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            <AnimatePresence mode="wait">
              {isMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="w-5 h-5 text-quantum-primary" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="w-5 h-5 text-quantum-primary" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Mobile Status Bar (Visible only on mobile when needed) */}
      <AnimatePresence>
        {isScrolled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="
              md:hidden px-4 py-2
              border-t border-quantum-primary/10
              bg-bg/50 backdrop-blur-sm
            "
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  {isConnected ? (
                    <Wifi className="w-3 h-3 text-quantum-accent" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-quantum-danger" />
                  )}
                  <span className={`
                    font-mono uppercase
                    ${isConnected ? 'text-quantum-accent' : 'text-quantum-danger'}
                  `}>
                    {isConnected ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Shield className="w-3 h-3 text-quantum-primary" />
                  <span className="font-mono text-quantum-primary">SECURE</span>
                </div>
              </div>
              {metrics && (
                <span className="font-mono text-text-secondary">
                  {(metrics.powerLevel || 100).toFixed(0)}% PWR
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

export default TopBar;