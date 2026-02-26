import { z } from 'zod';
import { Task } from '../models/task.js';
import { Status, Priority, Tag, TaskInput, TaskUpdateInput, QueryCriteria, SortOptions } from '../models/types.js';
import { storage } from './storage.js';

const ALLOWED_STATUS: Status[] = ['todo', 'in-progress', 'done'];
const ALLOWED_PRIORITY: Priority[] = ['low', 'medium', 'high'];

export class AppError extends Error {
  name = 'AppError';
  code: string;
  details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

// Zod schemas for validation
const tagSchema = z.string().trim().min(1, 'Tags cannot be empty');

const recurrenceSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly', 'custom']),
  interval: z.number().min(1).optional(),
});

const taskInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().optional(),
  status: z.enum(ALLOWED_STATUS).default('todo'),
  priority: z.enum(ALLOWED_PRIORITY).default('medium'),
  dueDate: z.string().refine(isValidDueDateISO, 'Due date must be today or future'),
  tags: z.array(tagSchema).default([]),
  dependencies: z.array(z.string()).default([]),
  recurrence: recurrenceSchema.optional(),
});

const taskUpdateSchema = taskInputSchema.extend({
  id: z.string(),
});

function nowStartOfDayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDateInputToISO(dateInputValue: string): string | null {
  if (typeof dateInputValue !== 'string' || !dateInputValue) return null;
  const parts = dateInputValue.split('-');
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt.toISOString();
}

function isValidDueDateISO(iso: string): boolean {
  if (typeof iso !== 'string' || !iso) return false;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return false;
  const dueLocal = new Date(dt.getTime());
  dueLocal.setHours(0, 0, 0, 0);
  return dueLocal.getTime() >= nowStartOfDayLocal().getTime();
}

function normalizeTags(tags: Tag[]): Tag[] {
  const seen = new Set<string>();
  const deduped: Tag[] = [];
  for (const t of tags) {
    const key = t.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(t);
    }
  }
  return deduped;
}

function generateId(): string {
  return String(Date.now()) + '_' + Math.random().toString(16).slice(2);
}

function sortTasks(tasks: Task[], options?: SortOptions): Task[] {
  const prioRank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  const statusRank: Record<Status, number> = { 'todo': 0, 'in-progress': 1, 'done': 2 };

  return tasks.slice().sort((a, b) => {
    if (options?.field === 'dueDate') {
      const ad = new Date(a.dueDate).getTime();
      const bd = new Date(b.dueDate).getTime();
      if (ad !== bd) return options.ascending ? ad - bd : bd - ad;
    } else if (options?.field === 'priority') {
      const ap = prioRank[a.priority];
      const bp = prioRank[b.priority];
      if (ap !== bp) return options.ascending ? ap - bp : bp - ap;
    } else if (options?.field === 'status') {
      const as = statusRank[a.status];
      const bs = statusRank[b.status];
      if (as !== bs) return options.ascending ? as - bs : bs - as;
    }

    // Default sort: due date asc, then priority, then title
    const ad = new Date(a.dueDate).getTime();
    const bd = new Date(b.dueDate).getTime();
    if (ad !== bd) return ad - bd;
    const ap = prioRank[a.priority];
    const bp = prioRank[b.priority];
    if (ap !== bp) return ap - bp;
    return a.title.localeCompare(b.title);
  });
}

function checkDependencies(task: Task, allTasks: Task[]): boolean {
  if (!task.dependencies || task.dependencies.length === 0) return true;
  for (const depId of task.dependencies) {
    const depTask = allTasks.find(t => t.id === depId);
    if (!depTask || depTask.status !== 'done') return false;
  }
  return true;
}

function generateNextRecurringTask(task: Task): Task | null {
  if (!task.recurrence) return null;
  const dueDate = new Date(task.dueDate);
  let nextDueDate: Date;

  switch (task.recurrence.type) {
    case 'daily':
      nextDueDate = new Date(dueDate.getTime() + 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      nextDueDate = new Date(dueDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      nextDueDate = new Date(dueDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      break;
    case 'custom':
      const interval = task.recurrence.interval || 1;
      nextDueDate = new Date(dueDate.getTime() + interval * 24 * 60 * 60 * 1000);
      break;
    default:
      return null;
  }

  return {
    ...task,
    id: generateId(),
    status: 'todo' as Status,
    dueDate: nextDueDate.toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const taskService = {
  allowedStatus: ALLOWED_STATUS.slice(),
  allowedPriority: ALLOWED_PRIORITY.slice(),
  parseDateInputToISO,

  async list(sortOptions?: SortOptions): Promise<Task[]> {
    try {
      const tasks = await storage.getAllTasks();
      return sortTasks(tasks, sortOptions);
    } catch (err) {
      throw new AppError('Failed to load tasks', 'STORAGE_ERROR', err);
    }
  },

  async getById(id: string): Promise<Task | null> {
    const tasks = await this.list();
    return tasks.find(t => t.id === id) || null;
  },

  async create(input: TaskInput): Promise<Task> {
    const validated = taskInputSchema.parse(input);
    validated.tags = normalizeTags(validated.tags);

    const task: Task = {
      id: generateId(),
      title: validated.title,
      description: validated.description,
      status: validated.status,
      priority: validated.priority,
      dueDate: validated.dueDate,
      tags: validated.tags,
      dependencies: validated.dependencies,
      recurrence: validated.recurrence,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const tasks = await storage.getAllTasks();
      tasks.push(task);
      await storage.setAllTasks(tasks);
      return task;
    } catch (err) {
      throw new AppError('Failed to save task', 'STORAGE_ERROR', err);
    }
  },

  async update(input: TaskUpdateInput): Promise<Task> {
    const validated = taskUpdateSchema.parse(input);
    validated.tags = normalizeTags(validated.tags);

    try {
      const tasks = await storage.getAllTasks();
      const idx = tasks.findIndex(t => t.id === validated.id);
      if (idx === -1) throw new AppError('Task not found', 'NOT_FOUND');

      // Check dependencies if trying to mark as done
      if (validated.status === 'done' && !checkDependencies(tasks[idx], tasks)) {
        throw new AppError('Cannot complete task: dependencies not satisfied', 'DEPENDENCY_ERROR');
      }

      const updated: Task = {
        ...tasks[idx],
        title: validated.title,
        description: validated.description,
        status: validated.status,
        priority: validated.priority,
        dueDate: validated.dueDate,
        tags: validated.tags,
        dependencies: validated.dependencies,
        recurrence: validated.recurrence,
        updatedAt: new Date().toISOString(),
      };

      tasks[idx] = updated;

      // If completed and has recurrence, create next task
      if (updated.status === 'done' && updated.recurrence) {
        const nextTask = generateNextRecurringTask(updated);
        if (nextTask) tasks.push(nextTask);
      }

      await storage.setAllTasks(tasks);
      return updated;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError('Failed to update task', 'STORAGE_ERROR', err);
    }
  },

  async remove(id: string): Promise<void> {
    try {
      const tasks = await storage.getAllTasks();
      const filtered = tasks.filter(t => t.id !== id);
      if (filtered.length === tasks.length) throw new AppError('Task not found', 'NOT_FOUND');
      await storage.setAllTasks(filtered);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError('Failed to delete task', 'STORAGE_ERROR', err);
    }
  },

  async query(criteria: QueryCriteria, sortOptions?: SortOptions): Promise<Task[]> {
    const c = criteria || {};
    const tasks = await this.list();

    const search = c.search?.trim().toLowerCase() || '';
    const status = c.status;
    const priority = c.priority;
    const tag = c.tag?.trim().toLowerCase() || '';
    const dueBeforeISO = c.dueBeforeISO;

    if (status && !ALLOWED_STATUS.includes(status)) {
      throw new AppError('Invalid status filter', 'VALIDATION_ERROR');
    }
    if (priority && !ALLOWED_PRIORITY.includes(priority)) {
      throw new AppError('Invalid priority filter', 'VALIDATION_ERROR');
    }
    if (dueBeforeISO) {
      const dt = new Date(dueBeforeISO);
      if (Number.isNaN(dt.getTime())) throw new AppError('Invalid due date filter', 'VALIDATION_ERROR');
    }

    const dueBeforeTime = dueBeforeISO ? new Date(dueBeforeISO).getTime() : null;

    const filtered = tasks.filter(t => {
      if (status && t.status !== status) return false;
      if (priority && t.priority !== priority) return false;
      if (tag && !t.tags.some(tg => tg.toLowerCase() === tag)) return false;
      if (dueBeforeTime && new Date(t.dueDate).getTime() > dueBeforeTime) return false;
      if (search) {
        const hay = (t.title + '\n' + (t.description || '')).toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    return sortTasks(filtered, sortOptions);
  },

  AppError,
};