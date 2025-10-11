// Emergency Controls Component
import { motion } from 'framer-motion';
import { Power, Pause, Play, AlertTriangle, Shield } from 'lucide-react';
import { useEmpireStore } from '@/store/empire-store';
import { cn } from '@/lib/utils';

export default function EmergencyControls() {
  const { 
    isFullAutopilot, 
    isEmergencyMode,
    toggleAutopilot,
    triggerEmergencyStop 
  } = useEmpireStore();

  return (
    <div className="space-y-4">
      {/* Emergency Stop Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={triggerEmergencyStop}
        disabled={isEmergencyMode}
        className={cn(
          "w-full p-4 rounded-lg font-bold text-lg transition-all",
          "border-2 border-red-500 bg-red-500/10 text-red-400",
          "hover:bg-red-500/20 hover:border-red-400",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "flex items-center justify-center space-x-3"
        )}
      >
        <Power className="w-6 h-6" />
        <span>EMERGENCY STOP</span>
      </motion.button>

      {/* Autopilot Toggle */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={toggleAutopilot}
        disabled={isEmergencyMode}
        className={cn(
          "w-full p-4 rounded-lg font-bold transition-all",
          "border-2 flex items-center justify-center space-x-3",
          isFullAutopilot
            ? "border-green-500 bg-green-500/10 text-green-400 hover:bg-green-500/20"
            : "border-yellow-500 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {isFullAutopilot ? (
          <>
            <Pause className="w-5 h-5" />
            <span>DISABLE AUTO-PILOT</span>
          </>
        ) : (
          <>
            <Play className="w-5 h-5" />
            <span>ENABLE AUTO-PILOT</span>
          </>
        )}
      </motion.button>

      {/* Status Indicators */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
          <span className="text-sm">Automation Level</span>
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isFullAutopilot ? "bg-green-400" : "bg-yellow-400"
            )} />
            <span className="text-sm font-medium">
              {isFullAutopilot ? "100%" : "Manual"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
          <span className="text-sm">System Status</span>
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isEmergencyMode ? "bg-red-400" : "bg-green-400"
            )} />
            <span className="text-sm font-medium">
              {isEmergencyMode ? "EMERGENCY" : "OPERATIONAL"}
            </span>
          </div>
        </div>
      </div>

      {/* Emergency Mode Alert */}
      {isEmergencyMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg"
        >
          <div className="flex items-center space-x-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="font-semibold text-red-200">EMERGENCY MODE ACTIVE</span>
          </div>
          <p className="text-sm text-red-300">
            All agents have been stopped. Manual intervention required to resume operations.
          </p>
        </motion.div>
      )}

      {/* Autopilot Info */}
      {isFullAutopilot && !isEmergencyMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg"
        >
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="w-5 h-5 text-green-400" />
            <span className="font-semibold text-green-200">AUTO-PILOT ENGAGED</span>
          </div>
          <p className="text-sm text-green-300">
            Empire is running autonomously. All decisions are being made automatically.
          </p>
        </motion.div>
      )}
    </div>
  );
}