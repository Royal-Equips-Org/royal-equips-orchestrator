import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  NavigationState, 
  NavigationContextType, 
  BreadcrumbItem 
} from '../types/navigation';
import { getModuleById } from '../config/navigation';

interface NavigationAction {
  type: 'NAVIGATE' | 'ADD_FAVORITE' | 'REMOVE_FAVORITE' | 'CLEAR_HISTORY' | 'GO_BACK' | 'GO_FORWARD' | 'SET_BREADCRUMBS';
  payload?: any;
}

const initialState: NavigationState = {
  currentModule: 'command',
  history: ['command'],
  favorites: [],
  recentlyUsed: [],
  breadcrumbs: [
    { id: 'command', label: 'Command Center', path: '/' }
  ]
};

function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'NAVIGATE': {
      const { moduleId } = action.payload;
      const newHistory = [...state.history];
      
      // Remove the current position if we're not at the end
      const currentIndex = newHistory.indexOf(state.currentModule);
      if (currentIndex !== -1 && currentIndex < newHistory.length - 1) {
        newHistory.splice(currentIndex + 1);
      }
      
      // Add new module if it's different from current
      if (moduleId !== state.currentModule) {
        newHistory.push(moduleId);
      }
      
      // Update recently used (keep last 10)
      const recentlyUsed = [
        moduleId, 
        ...state.recentlyUsed.filter(id => id !== moduleId)
      ].slice(0, 10);

      return {
        ...state,
        currentModule: moduleId,
        history: newHistory,
        recentlyUsed
      };
    }
    
    case 'ADD_FAVORITE': {
      const { moduleId } = action.payload;
      if (!state.favorites.includes(moduleId)) {
        return {
          ...state,
          favorites: [...state.favorites, moduleId]
        };
      }
      return state;
    }
    
    case 'REMOVE_FAVORITE': {
      const { moduleId } = action.payload;
      return {
        ...state,
        favorites: state.favorites.filter(id => id !== moduleId)
      };
    }
    
    case 'CLEAR_HISTORY':
      return {
        ...state,
        history: [state.currentModule],
        recentlyUsed: []
      };
    
    case 'GO_BACK': {
      const currentIndex = state.history.indexOf(state.currentModule);
      if (currentIndex > 0) {
        const previousModule = state.history[currentIndex - 1];
        return {
          ...state,
          currentModule: previousModule
        };
      }
      return state;
    }
    
    case 'GO_FORWARD': {
      const currentIndex = state.history.indexOf(state.currentModule);
      if (currentIndex < state.history.length - 1) {
        const nextModule = state.history[currentIndex + 1];
        return {
          ...state,
          currentModule: nextModule
        };
      }
      return state;
    }
    
    case 'SET_BREADCRUMBS':
      return {
        ...state,
        breadcrumbs: action.payload.breadcrumbs
      };
    
    default:
      return state;
  }
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(navigationReducer, initialState);
  const navigate = useNavigate();
  const location = useLocation();

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('royal-equips-navigation');
      if (saved) {
        const savedState = JSON.parse(saved);
        // Initialize with saved favorites and recently used
        if (savedState.favorites) {
          savedState.favorites.forEach((moduleId: string) => {
            dispatch({ type: 'ADD_FAVORITE', payload: { moduleId } });
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load navigation state from localStorage:', error);
    }
  }, []);

  // Save state to localStorage on changes
  useEffect(() => {
    try {
      const stateToSave = {
        favorites: state.favorites,
        recentlyUsed: state.recentlyUsed
      };
      localStorage.setItem('royal-equips-navigation', JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save navigation state to localStorage:', error);
    }
  }, [state.favorites, state.recentlyUsed]);

  const navigateToModule = useCallback((moduleId: string) => {
    // Get module config to get the path
    const module = getModuleById(moduleId);
    const path = module?.path || `/${moduleId}`;
    
    // Navigate using React Router
    navigate(path);
    
    // Update internal state for tracking
    dispatch({ type: 'NAVIGATE', payload: { moduleId } });
  }, [navigate]);

  const addToFavorites = useCallback((moduleId: string) => {
    dispatch({ type: 'ADD_FAVORITE', payload: { moduleId } });
  }, []);

  const removeFromFavorites = useCallback((moduleId: string) => {
    dispatch({ type: 'REMOVE_FAVORITE', payload: { moduleId } });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' });
  }, []);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  const goForward = useCallback(() => {
    window.history.forward();
  }, []);

  const currentIndex = state.history.indexOf(state.currentModule);
  const canGoBack = window.history.length > 1;
  const canGoForward = false; // Browser forward is not predictable

  const contextValue: NavigationContextType = {
    state,
    navigateToModule,
    addToFavorites,
    removeFromFavorites,
    clearHistory,
    goBack,
    goForward,
    canGoBack,
    canGoForward
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}