import React from 'react';
import './Sidebar.css';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const pages = [
  { id: 'overview', name: 'Overview', icon: '🌌' },
  { id: 'operations', name: 'Operations', icon: '⚡' },
  { id: 'data', name: 'Data', icon: '📊' },
  { id: 'commerce', name: 'Commerce', icon: '💎' },
  { id: 'agents', name: 'Agents', icon: '🤖' },
  { id: 'settings', name: 'Settings', icon: '⚙️' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
  collapsed,
  onToggle,
}) => {
  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button className="sidebar-toggle" onClick={onToggle}>
          {collapsed ? '▶' : '◀'}
        </button>
        {!collapsed && (
          <h1 className="sidebar-title">
            <span className="sidebar-title-main">ROYAL</span>
            <span className="sidebar-title-sub">CONTROL</span>
          </h1>
        )}
      </div>

      <nav className="sidebar-nav">
        {pages.map((page) => (
          <button
            key={page.id}
            className={`nav-item ${currentPage === page.id ? 'active' : ''}`}
            onClick={() => onPageChange(page.id)}
            title={collapsed ? page.name : ''}
          >
            <span className="nav-icon">{page.icon}</span>
            {!collapsed && <span className="nav-label">{page.name}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="status-indicator">
          <div className="status-dot active"></div>
          {!collapsed && <span>ONLINE</span>}
        </div>
      </div>
    </div>
  );
};