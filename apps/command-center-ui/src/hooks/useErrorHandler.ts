/**
 * Custom hook for handling errors with toast notifications
 * 
 * This hook provides a convenient way to handle errors throughout the app
 * with automatic toast notifications and logging.
 */

import { useCallback } from 'react';
import { useToastContext } from '../contexts/ToastContext';
import { handleError as handleErrorUtil } from '../utils/error-handler';

export function useErrorHandler() {
  const { error: toastError, warning: toastWarning, info: toastInfo } = useToastContext();

  /**
   * Handle an error and display appropriate toast notification
   */
  const handleError = useCallback((error: unknown, context?: string) => {
    handleErrorUtil(error, toastError, context);
  }, [toastError]);

  /**
   * Handle a warning (non-critical issue)
   */
  const handleWarning = useCallback((title: string, message?: string) => {
    toastWarning(title, message);
  }, [toastWarning]);

  /**
   * Show an info message
   */
  const handleInfo = useCallback((title: string, message?: string) => {
    toastInfo(title, message);
  }, [toastInfo]);

  /**
   * Wrap an async function with automatic error handling
   */
  const withErrorHandling = useCallback(
    <T>(
      asyncFn: () => Promise<T>,
      context?: string,
      options?: {
        onError?: (error: unknown) => void;
        suppressToast?: boolean;
      }
    ) => {
      return async (): Promise<T | undefined> => {
        try {
          return await asyncFn();
        } catch (error) {
          // Call custom error handler if provided
          if (options?.onError) {
            options.onError(error);
          }
          
          // Show toast unless suppressed
          if (!options?.suppressToast) {
            handleError(error, context);
          }
          
          return undefined;
        }
      };
    },
    [handleError]
  );

  return {
    handleError,
    handleWarning,
    handleInfo,
    withErrorHandling
  };
}
