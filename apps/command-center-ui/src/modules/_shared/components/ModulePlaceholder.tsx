import React from 'react';
import clsx from 'clsx';

export interface ModulePlaceholderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  status?: 'coming-soon' | 'in-development' | 'maintenance';
  estimatedCompletion?: string;
  features?: string[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  title,
  description,
  icon,
  status = 'coming-soon',
  estimatedCompletion,
  features,
  className = '',
  size = 'md'
}) => {
  const statusConfig = {
    'coming-soon': {
      label: 'Coming Soon',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30'
    },
    'in-development': {
      label: 'In Development',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30'
    },
    'maintenance': {
      label: 'Under Maintenance',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30'
    }
  };

  const sizeConfig = {
    sm: {
      container: 'min-h-[30vh]',
      title: 'text-xl',
      description: 'text-sm',
      grid: 'grid-cols-2 gap-2',
      skeleton: 'h-8'
    },
    md: {
      container: 'min-h-[50vh]',
      title: 'text-2xl md:text-3xl',
      description: 'text-base',
      grid: 'grid-cols-3 gap-3',
      skeleton: 'h-12'
    },
    lg: {
      container: 'min-h-[60vh]',
      title: 'text-3xl md:text-4xl',
      description: 'text-lg',
      grid: 'grid-cols-4 gap-4',
      skeleton: 'h-16'
    }
  };

  const config = statusConfig[status];
  const sizing = sizeConfig[size];

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center gap-6 px-6 py-8',
        sizing.container,
        className
      )}
      role="region"
      aria-label={`${title} module placeholder`}
    >
      {/* Icon */}
      {icon && (
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-surface/50 border border-border/50">
          <div className="w-8 h-8 text-text-dim">
            {icon}
          </div>
        </div>
      )}
      
      {/* Status Badge */}
      <div
        className={clsx(
          'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide',
          config.bgColor,
          config.color,
          'border',
          config.borderColor
        )}
      >
        <span className="relative flex h-2 w-2 mr-2">
          <span
            className={clsx(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              config.bgColor.replace('/10', '/50')
            )}
          />
          <span
            className={clsx(
              'relative inline-flex rounded-full h-2 w-2',
              config.bgColor.replace('/10', '')
            )}
          />
        </span>
        {config.label}
      </div>

      {/* Title */}
      <h2
        className={clsx(
          'font-bold text-center max-w-2xl',
          sizing.title,
          'bg-gradient-to-r from-cyan-400 via-magenta-400 to-green-400',
          'bg-clip-text text-transparent',
          'animate-pulse'
        )}
      >
        {title} Module
      </h2>

      {/* Description */}
      {description && (
        <p
          className={clsx(
            'max-w-md text-text-dim leading-relaxed',
            sizing.description
          )}
        >
          {description}
        </p>
      )}

      {/* Estimated Completion */}
      {estimatedCompletion && (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Expected: {estimatedCompletion}</span>
        </div>
      )}

      {/* Feature List */}
      {features && features.length > 0 && (
        <div className="w-full max-w-md">
          <h3 className="text-sm font-semibold text-text-secondary mb-3">
            Planned Features:
          </h3>
          <ul className="space-y-2 text-left">
            {features.map((feature, index) => (
              <li
                key={index}
                className="flex items-center gap-2 text-sm text-text-dim"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Skeleton Loading Animation */}
      <div className="w-full max-w-sm">
        <div className={clsx('grid gap-3', sizing.grid)}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={clsx(
                'rounded-md bg-surface/30 border border-border/60',
                sizing.skeleton,
                'animate-pulse',
                // Staggered animation delay
                `animation-delay-${i * 100}`
              )}
              style={{
                animationDelay: `${i * 100}ms`
              }}
            />
          ))}
        </div>
      </div>

      {/* Progress Dots */}
      <div className="flex items-center gap-2" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={clsx(
              'w-2 h-2 rounded-full',
              'animate-pulse',
              i === 0 && 'bg-cyan-400/80',
              i === 1 && 'bg-magenta-400/60',
              i === 2 && 'bg-green-400/40'
            )}
            style={{
              animationDelay: `${i * 200}ms`,
              animationDuration: '1.5s'
            }}
          />
        ))}
      </div>

      {/* Call to Action */}
      <div className="text-xs text-text-muted max-w-lg">
        This capability is being provisioned in the autonomous command pipeline.
        {status === 'in-development' && (
          <span className="block mt-1 text-yellow-400/80">
            Development is currently in progress.
          </span>
        )}
      </div>
    </div>
  );
};

export default ModulePlaceholder;