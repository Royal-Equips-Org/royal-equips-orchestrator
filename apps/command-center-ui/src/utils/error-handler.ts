/**
 * Error handling utilities for displaying user-friendly error messages
 * 
 * This module handles all API and system errors by converting them into
 * actionable, user-friendly messages with specific guidance.
 */

import { ServiceError } from '../types/empire';

export interface ErrorDetails {
  title: string;
  message: string;
  actionable: boolean;
  setupRequired?: boolean;
  documentation?: string;
  retryAvailable?: boolean;
}

/**
 * Parse ServiceError and convert to user-friendly error details
 */
export function parseServiceError(error: ServiceError): ErrorDetails {
  // Circuit breaker open
  if (error.kind === 'circuit_open') {
    return {
      title: '🔌 Service Temporarily Unavailable',
      message: 'The backend service is experiencing issues and has been temporarily disabled to prevent cascading failures. The system will automatically retry in a moment. If this persists, please contact support.',
      actionable: true,
      retryAvailable: true
    };
  }

  // Timeout errors
  if (error.kind === 'timeout') {
    return {
      title: '⏱️ Request Timeout',
      message: 'The request took too long to complete. This usually indicates a slow network connection or the backend service is overloaded. Please try again in a moment.',
      actionable: true,
      retryAvailable: true
    };
  }

  // Network errors
  if (error.kind === 'network') {
    return {
      title: '🌐 Network Connection Error',
      message: 'Unable to reach the backend service. Please check your internet connection and verify that the backend is running. If you are a developer, ensure the Flask backend is running on port 10000.',
      actionable: true,
      retryAvailable: true
    };
  }

  // HTTP errors - parse based on status code
  if (error.kind === 'http' && error.status) {
    return parseHTTPError(error.status, error.message);
  }

  // Generic error
  return {
    title: '❌ Unexpected Error',
    message: error.message || 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    actionable: false,
    retryAvailable: true
  };
}

/**
 * Parse HTTP status code errors with specific guidance
 */
function parseHTTPError(status: number, message: string): ErrorDetails {
  switch (status) {
    case 401:
      return {
        title: '🔐 Authentication Required',
        message: 'Your session has expired or you are not authenticated. Please log in again to continue.',
        actionable: true,
        retryAvailable: false
      };

    case 403:
      return {
        title: '🚫 Access Denied',
        message: 'You do not have permission to access this resource. Please contact an administrator if you believe this is an error.',
        actionable: true,
        retryAvailable: false
      };

    case 404:
      return {
        title: '🔍 Not Found',
        message: 'The requested resource could not be found. It may have been moved or deleted.',
        actionable: false,
        retryAvailable: false
      };

    case 429:
      return {
        title: '🚦 Rate Limit Exceeded',
        message: 'Too many requests have been sent to the service. Please wait a moment before trying again.',
        actionable: true,
        retryAvailable: true
      };

    case 500:
      return {
        title: '⚙️ Server Error',
        message: 'The backend server encountered an internal error. This has been logged and will be investigated. Please try again later.',
        actionable: true,
        retryAvailable: true
      };

    case 503:
      return {
        title: '🛠️ Service Configuration Required',
        message: message || 'The requested service is not configured. Please configure the required API keys and credentials in the backend environment variables.',
        actionable: true,
        setupRequired: true,
        retryAvailable: false
      };

    case 501:
      return {
        title: '🚧 Feature Not Implemented',
        message: message || 'This feature is currently under development. Please check back later or use alternative endpoints.',
        actionable: false,
        retryAvailable: false
      };

    default:
      return {
        title: `❌ Error ${status}`,
        message: message || 'An error occurred while processing your request.',
        actionable: false,
        retryAvailable: true
      };
  }
}

/**
 * Parse API response errors with enhanced details from backend
 */
export function parseAPIError(responseData: any): ErrorDetails {
  // Check if response has structured error information from our backend
  if (responseData && typeof responseData === 'object') {
    const { error, message, setup_required, documentation, retry_available, source } = responseData;

    // Configuration error (503)
    if (setup_required) {
      return {
        title: '⚙️ Configuration Required',
        message: message || error || 'This service requires configuration. Please set up the necessary API keys and environment variables.',
        actionable: true,
        setupRequired: true,
        documentation: documentation,
        retryAvailable: false
      };
    }

    // Authentication error
    if (source === 'auth_error') {
      return {
        title: '🔐 Authentication Failed',
        message: message || 'API authentication failed. Please verify your API credentials are valid and not expired.',
        actionable: true,
        documentation: documentation,
        retryAvailable: false
      };
    }

    // Permission error
    if (source === 'permission_error') {
      return {
        title: '🚫 Insufficient Permissions',
        message: message || 'The API credentials do not have the required permissions. Please update the API token scopes.',
        actionable: true,
        documentation: documentation,
        retryAvailable: false
      };
    }

    // Rate limit error
    if (source === 'rate_limit_error') {
      return {
        title: '🚦 Rate Limit Exceeded',
        message: message || 'API rate limit exceeded. Please wait before trying again.',
        actionable: true,
        retryAvailable: true
      };
    }

    // Connection error
    if (source === 'connection_error' || source === 'api_error') {
      return {
        title: '🌐 Connection Failed',
        message: message || 'Unable to connect to the external API. Please check your configuration and network connectivity.',
        actionable: true,
        documentation: documentation,
        retryAvailable: retry_available !== false
      };
    }

    // Not implemented
    if (source === 'not_implemented') {
      return {
        title: '🚧 Feature Under Development',
        message: message || 'This feature is currently being implemented. Please check back later.',
        actionable: false,
        retryAvailable: false
      };
    }

    // Generic error with message
    if (error || message) {
      return {
        title: '❌ Service Error',
        message: message || error,
        actionable: true,
        documentation: documentation,
        retryAvailable: retry_available !== false
      };
    }
  }

  // Fallback for unstructured errors
  return {
    title: '❌ Request Failed',
    message: 'An error occurred while communicating with the backend. Please try again.',
    actionable: true,
    retryAvailable: true
  };
}

/**
 * Format error for display with additional context
 */
export function formatErrorForDisplay(details: ErrorDetails): string {
  let displayMessage = details.message;

  if (details.setupRequired) {
    displayMessage += '\n\n💡 Action Required: Please configure the necessary API credentials.';
  }

  if (details.documentation) {
    displayMessage += `\n\n📖 Documentation: ${details.documentation}`;
  }

  if (details.retryAvailable) {
    displayMessage += '\n\n🔄 You can try again once the issue is resolved.';
  }

  return displayMessage;
}

/**
 * Handle error and display appropriate notification
 * This is the main function to use throughout the app
 */
export function handleError(
  error: unknown,
  toastError: (title: string, message?: string) => void,
  context?: string
): void {
  let details: ErrorDetails;

  // Check if it's a ServiceError
  if (error && typeof error === 'object' && 'kind' in error) {
    details = parseServiceError(error as ServiceError);
  }
  // Check if it's an API response with error data
  else if (error && typeof error === 'object' && ('error' in error || 'message' in error)) {
    details = parseAPIError(error);
  }
  // Check if it's a standard Error
  else if (error instanceof Error) {
    details = {
      title: '❌ Error',
      message: error.message,
      actionable: false,
      retryAvailable: true
    };
  }
  // Unknown error type
  else {
    details = {
      title: '❌ Unknown Error',
      message: 'An unexpected error occurred. Please try again.',
      actionable: false,
      retryAvailable: true
    };
  }

  // Add context if provided
  const title = context ? `${details.title} (${context})` : details.title;
  const message = formatErrorForDisplay(details);

  // Display error notification
  toastError(title, message);

  // Log to console for debugging
  console.error('Error handled:', {
    context,
    details,
    originalError: error
  });
}
