import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="h-screen flex items-center justify-center bg-bg">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-accent-cyan to-accent-magenta rounded-lg flex items-center justify-center"
        >
          <Zap className="w-8 h-8 text-white" />
        </motion.div>
        
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Initializing Command Center
          </h2>
          <p className="text-sm text-text-dim">
            Loading autonomous systems...
          </p>
        </motion.div>

        {/* Loading bars */}
        <div className="flex justify-center gap-1 mt-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1 h-8 bg-accent-cyan/30 rounded-full"
              animate={{
                height: [8, 32, 8],
                backgroundColor: ['rgba(5, 244, 255, 0.3)', 'rgba(5, 244, 255, 0.8)', 'rgba(5, 244, 255, 0.3)']
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.1
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;