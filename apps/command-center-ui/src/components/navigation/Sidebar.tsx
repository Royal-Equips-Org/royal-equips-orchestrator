import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bot, 
  BarChart3, 
  Users, 
  DollarSign, 
  Package, 
  Megaphone, 
  Shield, 
  Building,
  Zap
} from 'lucide-react';
import clsx from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'AIRA Core', href: '/aira', icon: Bot },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Agents', href: '/agents', icon: Users },
  { name: 'Revenue', href: '/revenue', icon: DollarSign },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Marketing', href: '/marketing', icon: Megaphone },
  { name: 'Security', href: '/security', icon: Shield },
  { name: 'Finance', href: '/finance', icon: Building },
];

const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <div className="w-64 bg-bg-alt border-r border-surface/30 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-surface/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-accent-cyan to-accent-magenta rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">Royal Equips</h1>
            <p className="text-xs text-text-dim">Command Center</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20'
                      : 'text-text-dim hover:text-text-primary hover:bg-surface/50'
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {item.name}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Status */}
      <div className="p-4 border-t border-surface/30">
        <div className="flex items-center gap-2 text-xs text-text-dim">
          <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
          <span>All systems operational</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;