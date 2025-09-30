import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { BreadcrumbItem } from '../../types/navigation'; 

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      <a 
        href="/" 
        className="text-text-dim hover:text-text-primary transition-colors"
        aria-label="Home"
      >
        <Home className="w-4 h-4" />
      </a>
      
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <ChevronRight className="w-4 h-4 text-text-dim" />
          {index === items.length - 1 ? (
            <span className="text-text-primary font-medium">
              {item.label}
            </span>
          ) : (
            <a 
              href={item.path}
              className="text-text-dim hover:text-text-primary transition-colors"
            >
              {item.label}
            </a>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;