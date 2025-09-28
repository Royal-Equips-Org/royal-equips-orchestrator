import React from 'react';
import { motion } from 'framer-motion';
import { Construction, Zap, ArrowRight } from 'lucide-react';

interface ModulePlaceholderProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<any>;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'coming-soon' | 'under-construction' | 'loading';
  estimatedTime?: string;
}

/**
 * ModulePlaceholder - Responsive placeholder for modules in development
 * Features: loading states, coming soon messaging, responsive design
 */
export function ModulePlaceholder({ 
  title, 
  description, 
  icon: Icon = Construction,
  size = 'md',
  variant = 'coming-soon',
  estimatedTime
}: ModulePlaceholderProps) {
  
  const sizeClasses = {
    sm: 'min-h-[300px] px-4 py-6',
    md: 'min-h-[400px] px-6 py-8',
    lg: 'min-h-[500px] px-8 py-12'
  };

  const getVariantConfig = () => {
    switch (variant) {
      case 'under-construction':
        return {
          title: `${title} Module – Under Construction`,
          subtitle: 'Active development in progress',
          color: 'text-quantum-warning',
          bgColor: 'from-quantum-warning/5 to-quantum-warning/10',
          borderColor: 'border-quantum-warning/20',
          icon: Construction
        };
      case 'loading':
        return {
          title: `Loading ${title}...`,
          subtitle: 'Initializing quantum systems',
          color: 'text-quantum-primary',
          bgColor: 'from-quantum-primary/5 to-quantum-primary/10',
          borderColor: 'border-quantum-primary/20',
          icon: Zap
        };
      default: // coming-soon
        return {
          title: `${title} Module – Coming Soon`,
          subtitle: 'Next phase of quantum evolution',
          color: 'text-quantum-accent',
          bgColor: 'from-quantum-accent/5 to-quantum-accent/10',
          borderColor: 'border-quantum-accent/20',
          icon: Icon
        };
    }
  };

  const config = getVariantConfig();
  const DisplayIcon = config.icon;

  return (
    <div className={`
      flex flex-col items-center justify-center text-center
      ${sizeClasses[size]}
    `}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`
          relative w-full max-w-lg mx-auto
          bg-gradient-to-br ${config.bgColor}
          backdrop-blur-md border ${config.borderColor}
          rounded-2xl p-6 sm:p-8
          quantum-glass
        `}
      >
        {/* Icon */}
        <motion.div
          animate={variant === 'loading' ? { rotate: 360 } : { scale: [1, 1.1, 1] }}
          transition={
            variant === 'loading' 
              ? { duration: 2, repeat: Infinity, ease: "linear" }
              : { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }
          className={`
            mb-6 p-4 rounded-full
            bg-gradient-to-br ${config.bgColor}
            border ${config.borderColor}
            mx-auto w-fit
          `}
        >
          <DisplayIcon className={`w-8 h-8 sm:w-10 sm:h-10 ${config.color}`} />
        </motion.div>

        {/* Title */}
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`
            text-xl sm:text-2xl lg:text-3xl font-bold mb-3
            bg-gradient-to-r from-quantum-primary to-quantum-secondary
            bg-clip-text text-transparent
            font-mono tracking-wide
          `}
        >
          {config.title}
        </motion.h2>

        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-text-secondary mb-4 text-sm sm:text-base"
        >
          {config.subtitle}
        </motion.p>

        {/* Description */}
        {description && (
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-text-dim text-sm sm:text-base mb-6 max-w-md mx-auto leading-relaxed"
          >
            {description}
          </motion.p>
        )}

        {/* Estimated Time */}
        {estimatedTime && variant === 'coming-soon' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={`
              inline-flex items-center space-x-2 px-4 py-2 rounded-full
              bg-gradient-to-r ${config.bgColor}
              border ${config.borderColor}
              text-xs sm:text-sm font-mono
            `}
          >
            <span className={config.color}>ETA: {estimatedTime}</span>
            <ArrowRight className={`w-3 h-3 ${config.color}`} />
          </motion.div>
        )}

        {/* Loading Animation Grid */}
        {variant === 'loading' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-sm mx-auto mt-6"
          >
            {Array.from({ length: 9 }).map((_, i) => (
              <motion.div
                key={i}
                className={`
                  h-8 sm:h-12 rounded-md
                  bg-gradient-to-br ${config.bgColor}
                  border ${config.borderColor}
                `}
                animate={{ 
                  opacity: [0.3, 1, 0.3],
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut"
                }}
              />
            ))}
          </motion.div>
        )}

        {/* Development Status Grid */}
        {variant === 'coming-soon' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 w-full max-w-sm mx-auto mt-6"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                className={`
                  h-8 sm:h-12 rounded-md
                  bg-gradient-to-br ${config.bgColor}
                  border ${config.borderColor}
                  relative overflow-hidden
                `}
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-r ${config.bgColor}`}
                  animate={{ x: [-100, 100] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Quantum Particle Effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              className={`absolute w-1 h-1 ${config.color} rounded-full opacity-60`}
              animate={{
                x: [0, 100, 200],
                y: [0, -50, -100],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 1,
                ease: "easeOut"
              }}
              style={{
                left: `${20 + i * 30}%`,
                bottom: '10%'
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default ModulePlaceholder;