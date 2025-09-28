// Navigation types for Royal Equips Command Center
export interface NavigationModule {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  color: string;
  path: string;
  category: 'core' | 'intelligence' | 'operations' | 'analytics';
  requiresAuth?: boolean;
  isNew?: boolean;
  disabled?: boolean;
  status?: 'active' | 'coming-soon' | 'disabled';
}

export interface NavigationState {
  currentModule: string;
  history: string[];
  favorites: string[];
  recentlyUsed: string[];
  breadcrumbs: BreadcrumbItem[];
}

export interface BreadcrumbItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ComponentType<any>;
}

export interface NavigationContextType {
  state: NavigationState;
  navigateToModule: (moduleId: string) => void;
  addToFavorites: (moduleId: string) => void;
  removeFromFavorites: (moduleId: string) => void;
  clearHistory: () => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

export type NavigationView = 'command' | 'neural' | 'quantum' | 'intelligence' | 'matrix' | 'analytics' | 'holographic' | 'shopify' | 'products' | 'orders' | 'customers' | 'dashboard';