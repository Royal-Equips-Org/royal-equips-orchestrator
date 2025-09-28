import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  timestamp: Date;
  read: boolean;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationOptions {
  type?: NotificationType;
  persistent?: boolean;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Add a new notification
  const addNotification = useCallback((
    title: string,
    message?: string,
    options: NotificationOptions = {}
  ) => {
    const {
      type = 'info',
      persistent = false,
      duration = 4000,
      action
    } = options;

    const notification: Notification = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
      persistent,
      action
    };

    // Add to notifications list
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show toast notification
    const toastOptions = {
      duration: persistent ? Infinity : duration,
      position: 'top-right' as const,
    };

    switch (type) {
      case 'success':
        toast.success(`${title}${message ? `: ${message}` : ''}`, toastOptions);
        break;
      case 'error':
        toast.error(`${title}${message ? `: ${message}` : ''}`, toastOptions);
        break;
      case 'warning':
        toast(`⚠️ ${title}${message ? `: ${message}` : ''}`, toastOptions);
        break;
      default:
        toast(`ℹ️ ${title}${message ? `: ${message}` : ''}`, toastOptions);
    }

    return notification.id;
  }, []);

  // Convenience methods for different notification types
  const success = useCallback((title: string, message?: string, options?: Omit<NotificationOptions, 'type'>) => {
    return addNotification(title, message, { ...options, type: 'success' });
  }, [addNotification]);

  const error = useCallback((title: string, message?: string, options?: Omit<NotificationOptions, 'type'>) => {
    return addNotification(title, message, { ...options, type: 'error' });
  }, [addNotification]);

  const warning = useCallback((title: string, message?: string, options?: Omit<NotificationOptions, 'type'>) => {
    return addNotification(title, message, { ...options, type: 'warning' });
  }, [addNotification]);

  const info = useCallback((title: string, message?: string, options?: Omit<NotificationOptions, 'type'>) => {
    return addNotification(title, message, { ...options, type: 'info' });
  }, [addNotification]);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
  }, []);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(notif => notif.id === id);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(notif => notif.id !== id);
    });
    
    // Dismiss toast if it exists
    toast.dismiss(id);
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    toast.dismiss();
  }, []);

  // Get notifications by type
  const getByType = useCallback((type: NotificationType) => {
    return notifications.filter(notif => notif.type === type);
  }, [notifications]);

  // Get unread notifications
  const getUnread = useCallback(() => {
    return notifications.filter(notif => !notif.read);
  }, [notifications]);

  // Auto-cleanup old notifications
  useEffect(() => {
    const cleanup = setInterval(() => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      setNotifications(prev => {
        const filtered = prev.filter(notif => 
          notif.persistent || notif.timestamp > oneDayAgo
        );
        
        // Update unread count if any notifications were removed
        const removedUnread = prev.filter(notif => 
          !notif.read && (!notif.persistent && notif.timestamp <= oneDayAgo)
        ).length;
        
        if (removedUnread > 0) {
          setUnreadCount(count => Math.max(0, count - removedUnread));
        }
        
        return filtered;
      });
    }, 60000); // Check every minute

    return () => clearInterval(cleanup);
  }, []);

  return {
    notifications,
    unreadCount,
    
    // Core methods
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    
    // Convenience methods
    success,
    error,
    warning,
    info,
    
    // Query methods
    getByType,
    getUnread
  };
}