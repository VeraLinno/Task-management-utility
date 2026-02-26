import { Task } from '../models/task.js';

const STORAGE_KEY = 'vanilla_task_manager_v1';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function safeJsonParse(text: string, fallback: { tasks: Task[] }): { tasks: Task[] } {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') return fallback;
    if (!Array.isArray(parsed.tasks)) parsed.tasks = [];
    return parsed;
  } catch {
    return fallback;
  }
}

function readRaw(): { tasks: Task[] } {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { tasks: [] };
  return safeJsonParse(raw, { tasks: [] });
}

function writeRaw(data: { tasks: Task[] }): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const storage = {
  key: STORAGE_KEY,

  async getAllTasks(): Promise<Task[]> {
    await delay(0);
    return readRaw().tasks.slice();
  },

  async setAllTasks(tasks: Task[]): Promise<void> {
    await delay(0);
    writeRaw({ tasks: tasks.slice() });
  },

  async clear(): Promise<void> {
    await delay(0);
    localStorage.removeItem(STORAGE_KEY);
  },
};