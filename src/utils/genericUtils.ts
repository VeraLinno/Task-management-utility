/**
 * Generic utility functions for reusable operations
 */

/**
 * Generic filter function
 * @param array - The array to filter
 * @param predicate - Function to test each element
 * @returns Filtered array
 */
export function genericFilter<T>(array: T[], predicate: (item: T) => boolean): T[] {
  return array.filter(predicate);
}

/**
 * Generic sort function
 * @param array - The array to sort
 * @param keyFn - Function to extract sort key
 * @param ascending - Sort direction, default true
 * @returns Sorted array
 */
export function genericSort<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K,
  ascending: boolean = true
): T[] {
  return array.slice().sort((a, b) => {
    const keyA = keyFn(a);
    const keyB = keyFn(b);
    if (keyA < keyB) return ascending ? -1 : 1;
    if (keyA > keyB) return ascending ? 1 : -1;
    return 0;
  });
}

/**
 * Generic merge function for objects
 * @param target - Target object
 * @param source - Source object
 * @returns Merged object
 */
export function genericMerge<T extends Record<string, any>, U extends Record<string, any>>(
  target: T,
  source: U
): T & U {
  return { ...target, ...source };
}

/**
 * Generic group by function
 * @param array - The array to group
 * @param keyFn - Function to extract group key
 * @returns Object with keys as group names and values as arrays
 */
export function genericGroupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}