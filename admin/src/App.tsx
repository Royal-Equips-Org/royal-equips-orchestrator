import React, { lazy, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { useAppStore } from './store';
import './App.css';

// Lazy load pages for code splitting
const Overview = lazy(() => import('./pages/Overview').then(m => ({ default: m.Overview })));
const Agents = lazy(() => import('./pages/Agents').then(m => ({ default: m.Agents })));
const Operations = lazy(() => import('./pages/index').then(m => ({ default: m.Operations })));
const Data = lazy(() => import('./pages/index').then(m => ({ default: m.Data })));
const Commerce = lazy(() => import('./pages/index').then(m => ({ default: m.Commerce })));
const Settings = lazy(() => import('./pages/index').then(m => ({ default: m.Settings })));

// Page components mapping
const pageComponents = {
  overview: Overview,
  operations: Operations,
  data: Data,
  commerce: Commerce,
  agents: Agents,
  settings: Settings,
};

const LoadingFallback: React.FC = () => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p>Loading...</p>
  </div>
);

function App() {
  const { currentPage, setCurrentPage, sidebarCollapsed, toggleSidebar } = useAppStore();
  
  const CurrentPageComponent = pageComponents[currentPage as keyof typeof pageComponents] || Overview;

  return (
    <div className="app">
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />
      
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Suspense fallback={<LoadingFallback />}>
          <CurrentPageComponent />
        </Suspense>
      </main>
    </div>
  );
}

export default App;