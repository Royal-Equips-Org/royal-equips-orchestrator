/**
 * Safe array utilities to prevent "Cannot read properties of undefined (reading 'map')" errors
 */

/**
 * Safely map over an array, returning empty array if input is undefined/null
 */
export function safeMap<T, R>(
  array: T[] | undefined | null,
  mapFn: (item: T, index: number, array: T[]) => R
): R[] {
  if (!Array.isArray(array)) {
    return [];
  }
  return array.map(mapFn);
}

/**
 * Safely slice an array, returning empty array if input is undefined/null
 */
export function safeSlice<T>(
  array: T[] | undefined | null,
  start?: number,
  end?: number
): T[] {
  if (!Array.isArray(array)) {
    return [];
  }
  return array.slice(start, end);
}

/**
 * Safely filter an array, returning empty array if input is undefined/null
 */
export function safeFilter<T>(
  array: T[] | undefined | null,
  filterFn: (item: T, index: number, array: T[]) => boolean
): T[] {
  if (!Array.isArray(array)) {
    return [];
  }
  return array.filter(filterFn);
}

/**
 * Safely get array length, returning 0 if input is undefined/null
 */
export function safeLength<T>(array: T[] | undefined | null): number {
  if (!Array.isArray(array)) {
    return 0;
  }
  return array.length;
}

/**
 * Safely access array element by index, returning undefined if array is undefined/null or index out of bounds
 */
export function safeGet<T>(
  array: T[] | undefined | null,
  index: number
): T | undefined {
  if (!Array.isArray(array) || index < 0 || index >= array.length) {
    return undefined;
  }
  return array[index];
}

/**
 * Ensure a value is an array, returning empty array if it's not
 */
export function ensureArray<T>(value: T[] | undefined | null | T): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null) {
    return [];
  }
  return [value];
}

/**
 * Safely combine multiple arrays, filtering out undefined/null arrays
 */
export function safeConcatenate<T>(...arrays: (T[] | undefined | null)[]): T[] {
  return arrays
    .filter((arr): arr is T[] => Array.isArray(arr))
    .reduce((acc, arr) => acc.concat(arr), [] as T[]);
}

/**
 * Create a safe mapper function that handles undefined arrays
 */
export function createSafeMapper<T, R>(
  mapFn: (item: T, index: number, array: T[]) => R
) {
  return (array: T[] | undefined | null): R[] => safeMap(array, mapFn);
}

/**
 * Safe array utilities with default fallback values
 */
export const ArrayUtils = {
  /**
   * Map with fallback to empty array
   */
  map: safeMap,
  
  /**
   * Slice with fallback to empty array
   */
  slice: safeSlice,
  
  /**
   * Filter with fallback to empty array
   */
  filter: safeFilter,
  
  /**
   * Length with fallback to 0
   */
  length: safeLength,
  
  /**
   * Get element with fallback to undefined
   */
  get: safeGet,
  
  /**
   * Ensure value is array
   */
  ensure: ensureArray,
  
  /**
   * Concatenate arrays safely
   */
  concat: safeConcatenate,
  
  /**
   * Check if value is a non-empty array
   */
  isNonEmpty: <T>(value: T[] | undefined | null): value is T[] => {
    return Array.isArray(value) && value.length > 0;
  },
  
  /**
   * Get first element safely
   */
  first: <T>(array: T[] | undefined | null): T | undefined => {
    return safeGet(array, 0);
  },
  
  /**
   * Get last element safely
   */
  last: <T>(array: T[] | undefined | null): T | undefined => {
    if (!Array.isArray(array) || array.length === 0) {
      return undefined;
    }
    return array[array.length - 1];
  }
};