import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import NavigationBar from '../navigation/NavigationBar';
import TopBar from './TopBar';
import { ToastContainer } from '../ui/Toast';
import { useToastContext } from '../../contexts/ToastContext';
import { useEmpireStore } from '../../store/empire-store';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { toasts, removeToast } = useToastContext();
  const isConnected = useEmpireStore(store => store.isConnected);

  return (
    <div className="min-h-screen bg-black text-cyan-300 overflow-hidden">
      {/* Background grid pattern */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 204, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 204, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Connection status indicator */}
      <motion.div
        className="fixed top-4 right-4 z-50"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-cyan-400/30 rounded-lg px-3 py-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          <span className="text-xs font-mono">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </motion.div>

      {/* Main layout */}
      <div className="flex h-screen">
        {/* Sidebar Navigation */}
        <div className="hidden lg:block w-64 border-r border-cyan-400/20 bg-black/20 backdrop-blur-sm">
          <NavigationBar />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Top Bar */}
          <div className="lg:hidden border-b border-cyan-400/20 bg-black/20 backdrop-blur-sm">
            <TopBar />
          </div>

          {/* Page Content */}
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}