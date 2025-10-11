/**
 * Object Utilities with Modern JS Patterns
 * Provides safe alternatives to Object.prototype.hasOwnProperty
 */

/**
 * Safe hasOwnProperty check using Object.prototype.hasOwnProperty.call
 * @param obj - Object to check
 * @param key - Property key to check
 */
export function hasOwnProperty<T>(obj: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Modern hasOwn check (requires Node 16.9+ / modern browsers)
 * Falls back to hasOwnProperty.call for compatibility
 * @param obj - Object to check
 * @param key - Property key to check
 */
export function hasOwn<T extends object>(obj: T, key: PropertyKey): key is keyof T {
  // Use Object.hasOwn if available (Node 16.9+, modern browsers)
  if (typeof Object.hasOwn === 'function') {
    return Object.hasOwn(obj, key);
  }
  // Fallback to safe hasOwnProperty check
  return hasOwnProperty(obj, key);
}

/**
 * Get object keys with proper typing
 */
export function getObjectKeys<T extends Record<string, unknown>>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * Safe object property access with default value
 */
export function safeObjectAccess<T, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  defaultValue: T[K]
): T[K] {
  return obj && hasOwn(obj, key) ? obj[key] : defaultValue;
}

/**
 * Type-safe object entries
 */
export function getObjectEntries<T extends Record<string, unknown>>(
  obj: T
): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}

// Usage examples:
// if (hasOwn(obj, 'property')) {
//   // TypeScript knows obj.property exists
// }
//
// const value = safeObjectAccess(maybeUndefinedObj, 'key', 'defaultValue');