/**
 * SSR/Node Guards for Client Code
 * Prevents false positives when using web APIs in SSR environments
 */

export const hasWindow = typeof window !== "undefined";
export const hasDocument = typeof document !== "undefined";
export const hasLocalStorage = hasWindow && typeof window.localStorage !== "undefined";
export const hasSessionStorage = hasWindow && typeof window.sessionStorage !== "undefined";
export const hasNavigator = typeof navigator !== "undefined";

/**
 * Safe wrapper for window-dependent operations
 * @param operation - Function to execute if window is available
 * @param fallback - Value to return if window is not available
 */
export function safeWindowOperation<T>(
  operation: () => T,
  fallback: T
): T {
  return hasWindow ? operation() : fallback;
}

/**
 * Safe wrapper for localStorage operations
 * @param operation - Function to execute if localStorage is available
 * @param fallback - Value to return if localStorage is not available
 */
export function safeLocalStorageOperation<T>(
  operation: () => T,
  fallback: T
): T {
  return hasLocalStorage ? operation() : fallback;
}

/**
 * Safe wrapper for document operations
 * @param operation - Function to execute if document is available
 * @param fallback - Value to return if document is not available
 */
export function safeDocumentOperation<T>(
  operation: () => T,
  fallback: T
): T {
  return hasDocument ? operation() : fallback;
}

// Usage examples:
// if (hasWindow) {
//   // safe to use window/document/localStorage
// }
//
// const screenWidth = safeWindowOperation(() => window.innerWidth, 1920);
// const storedValue = safeLocalStorageOperation(() => localStorage.getItem('key'), null);