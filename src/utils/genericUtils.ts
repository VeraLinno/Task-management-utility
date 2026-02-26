/**
 * Generic utility functions for reusable operations
 */

import { Task } from '../models/task.js';
import { Recurrence } from '../models/types.js';

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

/**
 * Calculate the next occurrence date for a recurring task
 * @param task - The recurring task
 * @param fromDate - The date to calculate from (defaults to now)
 * @returns The next occurrence date, or null if no recurrence
 */
export function getNextRecurringDate(task: Task, fromDate?: Date): Date | null {
  if (!task.recurrence) return null;

  const baseDate = fromDate || new Date();
  let currentDate = new Date(task.dueDate);

  // If the task's due date is in the future, that's the next occurrence
  if (currentDate > baseDate) {
    return currentDate;
  }

  // Calculate next occurrence based on recurrence type
  switch (task.recurrence.type) {
    case 'daily':
      // Find the next daily occurrence
      while (currentDate <= baseDate) {
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      }
      return currentDate;

    case 'weekly':
      // Find the next weekly occurrence (same day of week)
      const targetDayOfWeek = currentDate.getDay();
      while (currentDate <= baseDate || currentDate.getDay() !== targetDayOfWeek) {
        if (currentDate <= baseDate) {
          currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else {
          // We're past the base date, find next occurrence of the same day
          currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
      }
      return currentDate;

    case 'monthly':
      // Find the next monthly occurrence (same day of month)
      const targetDayOfMonth = currentDate.getDate();
      while (currentDate <= baseDate) {
        currentDate = new Date(currentDate);
        currentDate.setMonth(currentDate.getMonth() + 1);
        // JavaScript automatically adjusts invalid dates to the last day of the month
      }
      return currentDate;

    case 'custom':
      // Custom interval in days
      const interval = task.recurrence.interval || 1;
      while (currentDate <= baseDate) {
        currentDate = new Date(currentDate.getTime() + interval * 24 * 60 * 60 * 1000);
      }
      return currentDate;

    default:
      return null;
  }
}