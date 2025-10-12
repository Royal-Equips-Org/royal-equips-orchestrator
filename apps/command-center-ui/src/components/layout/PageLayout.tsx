import React from 'react';
import { motion } from 'framer-motion';
import { BreadcrumbItem } from '../../types/navigation';
import Breadcrumbs from '../navigation/Breadcrumbs';

interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
  breadcrumbs: BreadcrumbItem[];
  className?: string;
  actions?: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  children,
  breadcrumbs,
  className = '',
  actions
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`min-h-screen bg-gradient-to-br from-bg via-bg-alt to-bg ${className}`}
    >
      {/* Header */}
      <div className="border-b border-surface/30 bg-bg-alt/50 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Breadcrumbs items={breadcrumbs} />
              <h1 className="text-2xl font-bold text-text-primary mt-2">
                {title}
              </h1>
            </div>
            {actions && (
              <div className="flex items-center gap-3">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </motion.div>
  );
};

export default PageLayout;