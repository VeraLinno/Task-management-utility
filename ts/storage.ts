/**
 * storage.ts
 * 
 * Async localStorage wrapper with TypeScript types and error handling.
 * Provides CRUD operations for task persistence.
 */

import type { Task, StorageData, IStorage } from "./types";
import { AppError as AppErrorClass, ErrorCode } from "./types";
import { delay, safeJsonParse } from "./utilities";

/** Local key for tasksStorage */
const STORAGE_KEY = "vanilla_task_manager_v1";

/**
 * Read raw data from localStorage
 * @returns Parsed storage data or default empty data
 */
function readRaw(): StorageData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { tasks: [] };
  }
  
  const parsed = safeJsonParse<StorageData>(raw, { tasks: [] });
  if (!parsed || typeof parsed !== "object") {
    return { tasks: [] };
  }
  
  if (!Array.isArray(parsed.tasks)) {
    parsed.tasks = [];
  }
  
  return parsed;
}

/**
 * Write raw data to localStorage
 * @param data - Storage data to write
 */
function writeRaw(data: StorageData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Storage service implementing IStorage interface
 * Provides async CRUD operations for tasks with error handling
 */
export const storage: IStorage = {
  /** Storage key identifier */
  key: STORAGE_KEY,

  /**
   * Retrieve all tasks from storage
   * @returns Promise resolving to array of tasks
   * @throws AppError if storage read fails
   */
  async getAllTasks(): Promise<Task[]> {
    await delay(0);
    
    try {
      const data = readRaw();
      return data.tasks.slice();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      throw new AppErrorClass(
        `Failed to read tasks from storage: ${message}`,
        ErrorCode.STORAGE_ERROR,
        err
      );
    }
  },

  /**
   * Save all tasks to storage
   * @param tasks - Array of tasks to save
   * @returns Promise resolving to true on success
   * @throws AppError if storage write fails
   */
  async setAllTasks(tasks: Task[]): Promise<boolean> {
    await delay(0);
    
    try {
      writeRaw({ tasks: tasks.slice() });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      throw new AppErrorClass(
        `Failed to save tasks to storage: ${message}`,
        ErrorCode.STORAGE_ERROR,
        err
      );
    }
  },

  /**
   * Clear all tasks from storage
   * @returns Promise resolving to true on success
   * @throws AppError if storage clear fails
   */
  async clear(): Promise<boolean> {
    await delay(0);
    
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      throw new AppErrorClass(
        `Failed to clear storage: ${message}`,
        ErrorCode.STORAGE_ERROR,
        err
      );
    }
  },
};

// Export for use in other modules
export default storage;
