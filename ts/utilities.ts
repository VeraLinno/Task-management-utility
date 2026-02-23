/**
 * Generic utility functions
 * 
 * Provides reusable, strongly-typed utility functions for:
 * - Filtering
 * - Sorting
 * - Merging objects
 * - Date handling
 */

import type { Task, TaskSortConfig, Priority, Status } from "./types.js";
import { Priority as PriorityEnum, Status as StatusEnum, SortField as SortFieldEnum, SortDirection as SortDirectionEnum } from "./types.js";

/**
 * Generic filter function
 * Filters an array based on predicate function
 * 
 * @param items - Array to filter
 * @param predicate - Filter predicate function
 * @returns Filtered array
 * 
 * @example
 * const highPriorityTasks = filter(tasks, t => t.priority === Priority.HIGH);
 */
export function filter<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): T[] {
  const result: T[] = [];
  for (let i = 0; i < items.length; i++) {
    const item: T = items[i] as T;
    if (item !== undefined && predicate(item, i)) {
      result.push(item);
    }
  }
  return result;
}

/**
 * Generic sort function
 * Sorts an array based on comparator function
 * 
 * @param items - Array to sort
 * @param comparator - Compare function returning negative, zero, or positive
 * @returns New sorted array (does not mutate original)
 * 
 * @example
 * const sortedByTitle = sort(tasks, (a, b) => a.title.localeCompare(b.title));
 */
export function sort<T>(items: readonly T[], comparator: (a: T, b: T) => number): T[] {
  const result = [...items];
  result.sort(comparator);
  return result;
}

/**
 * Generic merge function
 * Deep merges two objects, with source values taking precedence
 * 
 * @param target - Target object to merge into
 * @param source - Source object to merge from
 * @returns New merged object (does not mutate originals)
 * 
 * @example
 * const merged = merge(defaults, overrides);
 */
export function merge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];
      
      if (
        sourceValue !== null &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        // Deep merge for nested objects
        result[key] = merge(targetValue as Record<string, unknown>, sourceValue as Partial<Record<string, unknown>>) as T[Extract<keyof T, string>];
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }
  return result;
}

/**
 * Generic paginate function
 * 
 * @param items - Array to paginate
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Paginated slice of items
 */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): T[] {
  const validPage = Math.max(1, Math.floor(page) || 1);
  const validPageSize = Math.max(1, Math.floor(pageSize) || 10);
  const startIndex = (validPage - 1) * validPageSize;
  const endIndex = startIndex + validPageSize;
  return items.slice(startIndex, endIndex);
}

/**
 * Generic group by function
 * Groups array items by a key selector
 * 
 * @param items - Array to group
 * @param keySelector - Function to extract group key
 * @returns Record of grouped items
 * 
 * @example
 * const groupedByStatus = groupBy(tasks, t => t.status);
 */
export function groupBy<T, K extends string | number>(
  items: readonly T[], 
  keySelector: (item: T) => K
): Record<K, T[]> {
  const result = {} as Record<K, T[]>;
  for (const item of items) {
    const key = keySelector(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }
  return result;
}

/**
 * Generic unique function
 * Returns unique items based on key selector
 * 
 * @param items - Array to deduplicate
 * @param keySelector - Function to extract unique key
 * @returns Array with duplicates removed
 */
export function unique<T, K>(items: readonly T[], keySelector: (item: T) => K): T[] {
  const seen = new Set<K>();
  const result: T[] = [];
  for (const item of items) {
    const key = keySelector(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

/**
 * Case-insensitive search filter
 * Searches for query in specified fields
 * 
 * @param items - Array to search
 * @param query - Search query string
 * @param fields - Fields to search in
 * @returns Filtered array matching query
 * 
 * @example
 * const results = search(tasks, "meeting", ["title", "description"]);
 */
export function search<T>(
  items: readonly T[], 
  query: string, 
  fields: (keyof T)[]
): T[] {
  if (!query || !query.trim()) {
    return [...items];
  }
  
  const normalizedQuery = query.toLowerCase().trim();
  
  return filter(items, (item) => {
    for (const field of fields) {
      const value = item[field];
      if (value && typeof value === "string") {
        if (value.toLowerCase().includes(normalizedQuery)) {
          return true;
        }
      }
    }
    return false;
  });
}

// ============================================
// TASK-SPECIFIC UTILITIES
// ============================================

const PRIORITY_RANK: Record<Priority, number> = {
  [PriorityEnum.HIGH]: 0,
  [PriorityEnum.MEDIUM]: 1,
  [PriorityEnum.LOW]: 2,
};

/**
 * Sort tasks by various fields
 * 
 * @param tasks - Array of tasks to sort
 * @param sortConfig - Sort configuration
 * @returns New sorted array
 */
export function sortTasks(tasks: readonly Task[], sortConfig: TaskSortConfig): Task[] {
  const { field, direction } = sortConfig;
  const multiplier = direction === SortDirectionEnum.ASC ? 1 : -1;
  
  return sort(tasks, (a, b) => {
    let comparison = 0;
    
    switch (field) {
      case SortFieldEnum.DUE_DATE:
        comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        break;
        
      case SortFieldEnum.PRIORITY:
        comparison = (PRIORITY_RANK[a.priority] ?? 99) - (PRIORITY_RANK[b.priority] ?? 99);
        break;
        
      case SortFieldEnum.STATUS:
        // Order: todo -> in-progress -> done
        const statusOrder: Record<Status, number> = {
          [StatusEnum.TODO]: 0,
          [StatusEnum.IN_PROGRESS]: 1,
          [StatusEnum.DONE]: 2,
        };
        comparison = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
        break;
        
      case SortFieldEnum.TITLE:
        comparison = a.title.localeCompare(b.title);
        break;
        
      case SortFieldEnum.CREATED_AT:
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
        
      default:
        comparison = 0;
    }
    
    return comparison * multiplier;
  });
}

/**
 * Check if a task is overdue
 * 
 * @param task - Task to check
 * @returns True if task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
  if (task.status === StatusEnum.DONE) {
    return false;
  }
  
  const now = new Date();
  const dueDate = new Date(task.dueDate);
  dueDate.setHours(23, 59, 59, 999); // End of due date
  
  return now.getTime() > dueDate.getTime();
}

/**
 * Calculate days until due date
 * 
 * @param task - Task to check
 * @returns Number of days until due (negative if overdue)
 */
export function daysUntilDue(task: Task): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Get current date as ISO string (local date at midnight)
 */
export function getTodayISO(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

/**
 * Parse date input (YYYY-MM-DD) to ISO string
 * 
 * @param dateInput - Date string in YYYY-MM-DD format
 * @returns ISO string or null if invalid
 */
export function parseDateInputToISO(dateInput: string): string | null {
  if (!dateInput || typeof dateInput !== "string") {
    return null;
  }
  
  const parts = dateInput.split("-");
  if (parts.length !== 3) {
    return null;
  }
  
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  
  // Verify round-trip (guards invalid dates like 2026-02-31)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  
  return date.toISOString();
}

/**
 * Convert ISO date to YYYY-MM-DD for date input
 * 
 * @param isoDate - ISO date string
 * @returns Formatted date string or empty if invalid
 */
export function isoToDateInputValue(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  
  return `${year}-${month}-${day}`;
}

/**
 * Format ISO date for display
 * 
 * @param isoDate - ISO date string
 * @returns Formatted date string
 */
export function formatDueDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  
  return `${year}-${month}-${day}`;
}

// ============================================
// STRING UTILITIES
// ============================================

/**
 * Escape HTML special characters
 * 
 * @param text - Text to escape
 * @returns HTML-escaped text
 */
export function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return String(text).replace(/[&<>"']/g, (char: string) => htmlEscapes[char] || char);
}

/**
 * Parse comma-separated tags from input
 * 
 * @param text - Input text containing comma-separated tags
 * @returns Array of trimmed, non-empty tags
 */
export function parseTagsFromInput(text: string): string[] {
  if (typeof text !== "string") {
    return [];
  }
  
  return text
    .split(",")
    .map(tag => tag.trim())
    .filter(tag => Boolean(tag));
}

/**
 * Normalize and deduplicate tags
 * 
 * @param tags - Array of tags
 * @returns Normalized array with duplicates removed (case-insensitive)
 */
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Map<string, string>();
  const result: string[] = [];
  
  for (const tag of tags) {
    const normalized = tag.trim().toLowerCase();
    if (normalized && !seen.has(normalized)) {
      seen.set(normalized, tag.trim());
      result.push(tag.trim());
    }
  }
  
  return result;
}

// ============================================
// ID GENERATION
// ============================================

/**
 * Generate unique task ID
 * Uses timestamp + random hex string
 */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Wrap async function with error handling
 * 
 * @param fn - Async function to wrap
 * @param errorMessage - Custom error message
 * @returns Wrapped function
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  errorMessage: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(errorMessage);
    }
  };
}

/**
 * Delay function for simulating async operations
 * 
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safe JSON parse with fallback
 * 
 * @param text - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed value or fallback
 */
export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}
