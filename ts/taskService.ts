/**
 * taskService.ts
 * 
 * Task CRUD service with validation, recurring tasks, dependencies, 
 * statistics, and enhanced search/sort capabilities.
 */

import type {
  Task,
  TaskQuery,
  TaskSortConfig,
  CreateTaskInput,
  UpdateTaskInput,
  Status,
  Priority,
  Recurrence,
  RecurrenceFrequency,
  TaskStatistics,
  RecurringTaskInfo,
  TaskDependencies,
  ValidationResult,
} from "./types";
import {
  Status as StatusEnum,
  Priority as PriorityEnum,
  RecurrenceFrequency as RecurrenceFrequencyEnum,
  AppError as AppErrorClass,
  ErrorCode,
  SortField as SortFieldEnum,
  SortDirection as SortDirectionEnum,
} from "./types";
import { storage } from "./storage";
import {
  generateId,
  normalizeTags,
  sortTasks,
  isTaskOverdue,
  filter,
  unique,
} from "./utilities";

// Allowed values (as readonly arrays for runtime validation)
const ALLOWED_STATUS: readonly Status[] = [
  StatusEnum.TODO,
  StatusEnum.IN_PROGRESS,
  StatusEnum.DONE,
];
const ALLOWED_PRIORITY: readonly Priority[] = [
  PriorityEnum.LOW,
  PriorityEnum.MEDIUM,
  PriorityEnum.HIGH,
];
const ALLOWED_RECURRENCE_FREQUENCY: readonly RecurrenceFrequency[] = [
  RecurrenceFrequencyEnum.DAILY,
  RecurrenceFrequencyEnum.WEEKLY,
  RecurrenceFrequencyEnum.MONTHLY,
  RecurrenceFrequencyEnum.CUSTOM,
];

/**
 * Validate status value
 */
function isValidStatus(status: string): status is Status {
  return ALLOWED_STATUS.includes(status as Status);
}

/**
 * Validate priority value
 */
function isValidPriority(priority: string): priority is Priority {
  return ALLOWED_PRIORITY.includes(priority as Priority);
}

/**
 * Validate recurrence frequency
 */
function isValidRecurrenceFrequency(frequency: string): frequency is RecurrenceFrequency {
  return ALLOWED_RECURRENCE_FREQUENCY.includes(frequency as RecurrenceFrequency);
}

/**
 * Validate due date is a valid ISO date string
 */
function isValidDueDateISO(iso: string): boolean {
  if (!iso || typeof iso !== "string") return false;
  
  const date = new Date(iso);
  return !Number.isNaN(date.getTime());
}

/**
 * Validate recurrence configuration
 */
function validateRecurrence(recurrence: unknown): ValidationResult<Recurrence | undefined> {
  if (recurrence === null || recurrence === undefined) {
    return { success: true, data: undefined };
  }
  
  if (typeof recurrence !== "object") {
    return {
      success: false,
      error: new AppErrorClass("Recurrence must be an object", ErrorCode.VALIDATION_ERROR),
    };
  }
  
  const rec = recurrence as Record<string, unknown>;
  
  if (typeof rec.frequency !== "string") {
    return {
      success: false,
      error: new AppErrorClass("Recurrence frequency is required", ErrorCode.VALIDATION_ERROR),
    };
  }
  
  if (!isValidRecurrenceFrequency(rec.frequency)) {
    return {
      success: false,
      error: new AppErrorClass(
        `Recurrence frequency must be one of: ${ALLOWED_RECURRENCE_FREQUENCY.join(", ")}`,
        ErrorCode.VALIDATION_ERROR
      ),
    };
  }
  
  // Validate custom recurrence
  if (rec.frequency === RecurrenceFrequencyEnum.CUSTOM) {
    if (typeof rec.daysInterval !== "number" || rec.daysInterval < 1) {
      return {
        success: false,
        error: new AppErrorClass(
          "Custom recurrence requires daysInterval (minimum 1)",
          ErrorCode.VALIDATION_ERROR
        ),
      };
    }
    
    return {
      success: true,
      data: {
        frequency: RecurrenceFrequencyEnum.CUSTOM,
        daysInterval: rec.daysInterval,
        endDate: typeof rec.endDate === "string" ? rec.endDate : undefined,
      },
    };
  }
  
  // Standard recurrence
  return {
    success: true,
    data: {
      frequency: rec.frequency as Exclude<RecurrenceFrequency, RecurrenceFrequencyEnum.CUSTOM>,
      endDate: typeof rec.endDate === "string" ? rec.endDate : undefined,
    },
  };
}

/**
 * Validate task dependencies
 */
function validateDependencies(dependencies: unknown): ValidationResult<TaskDependencies> {
  if (!dependencies) {
    return { success: true, data: [] };
  }
  
  if (!Array.isArray(dependencies)) {
    return {
      success: false,
      error: new AppErrorClass("Dependencies must be an array", ErrorCode.VALIDATION_ERROR),
    };
  }
  
  const validDeps: string[] = [];
  for (const dep of dependencies) {
    if (typeof dep !== "string" || !dep.trim()) {
      return {
        success: false,
        error: new AppErrorClass("Each dependency must be a non-empty string", ErrorCode.VALIDATION_ERROR),
      };
    }
    validDeps.push(dep.trim());
  }
  
  return {
    success: true,
    data: unique(validDeps, (d) => d),
  };
}

/**
 * Validate task input
 */
function validateTaskInput(input: unknown, mode: "create" | "update"): ValidationResult<CreateTaskInput | UpdateTaskInput> {
  if (!input || typeof input !== "object") {
    return {
      success: false,
      error: new AppErrorClass("Invalid task input", ErrorCode.VALIDATION_ERROR),
    };
  }
  
  const data = input as Record<string, unknown>;
  
  // Title validation (required for create)
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title) {
    return {
      success: false,
      error: new AppErrorClass("Title is required", ErrorCode.VALIDATION_ERROR),
    };
  }
  
  // Description (optional)
  let description = "";
  if (data.description != null) {
    if (typeof data.description !== "string") {
      return {
        success: false,
        error: new AppErrorClass("Description must be a string", ErrorCode.VALIDATION_ERROR),
      };
    }
    description = data.description.trim();
  }
  
  // Status validation
  const statusInput = typeof data.status === "string" ? data.status : StatusEnum.TODO;
  if (!isValidStatus(statusInput)) {
    return {
      success: false,
      error: new AppErrorClass(
        `Status must be one of: ${ALLOWED_STATUS.join(", ")}`,
        ErrorCode.VALIDATION_ERROR
      ),
    };
  }
  
  // Priority validation
  const priorityInput = typeof data.priority === "string" ? data.priority : PriorityEnum.MEDIUM;
  if (!isValidPriority(priorityInput)) {
    return {
      success: false,
      error: new AppErrorClass(
        `Priority must be one of: ${ALLOWED_PRIORITY.join(", ")}`,
        ErrorCode.VALIDATION_ERROR
      ),
    };
  }
  
  // Due date validation
  const dueDate = typeof data.dueDate === "string" ? data.dueDate : "";
  if (!dueDate) {
    return {
      success: false,
      error: new AppErrorClass("Due date is required", ErrorCode.VALIDATION_ERROR),
    };
  }
  if (!isValidDueDateISO(dueDate)) {
    return {
      success: false,
      error: new AppErrorClass("Due date is invalid", ErrorCode.VALIDATION_ERROR),
    };
  }
  
  // Tags validation
  let tags: string[] = [];
  if (data.tags != null) {
    if (!Array.isArray(data.tags)) {
      return {
        success: false,
        error: new AppErrorClass("Tags must be an array", ErrorCode.VALIDATION_ERROR),
      };
    }
    const tagResult = validateTags(data.tags);
    if (!tagResult.success) {
      return tagResult as ValidationResult<CreateTaskInput>;
    }
    tags = tagResult.data;
  }
  
  // Recurrence validation
  const recurrenceResult = validateRecurrence(data.recurrence);
  if (!recurrenceResult.success) {
    return recurrenceResult as ValidationResult<CreateTaskInput>;
  }
  
  // Dependencies validation
  const depsResult = validateDependencies(data.dependencies);
  if (!depsResult.success) {
    return depsResult as ValidationResult<CreateTaskInput>;
  }
  
  const base = {
    title,
    description,
    status: statusInput,
    priority: priorityInput,
    dueDate,
    tags,
    recurrence: recurrenceResult.data,
    dependencies: depsResult.data,
  };
  
  if (mode === "update") {
    const id = typeof data.id === "string" || typeof data.id === "number" 
      ? String(data.id) 
      : "";
    if (!id) {
      return {
        success: false,
        error: new AppErrorClass("Task id is required for update", ErrorCode.VALIDATION_ERROR),
      };
    }
    return { success: true, data: { ...base, id } };
  }
  
  return { success: true, data: base };
}

/**
 * Validate tags array
 */
function validateTags(tags: unknown): ValidationResult<string[]> {
  if (!Array.isArray(tags)) {
    return {
      success: false,
      error: new AppErrorClass("Tags must be an array", ErrorCode.VALIDATION_ERROR),
    };
  }
  
  const validTags: string[] = [];
  for (const tag of tags) {
    if (typeof tag !== "string") {
      return {
        success: false,
        error: new AppErrorClass("Tags must be strings", ErrorCode.VALIDATION_ERROR),
      };
    }
    const trimmed = tag.trim();
    if (!trimmed) {
      return {
        success: false,
        error: new AppErrorClass("Tags cannot be empty", ErrorCode.VALIDATION_ERROR),
      };
    }
    validTags.push(trimmed);
  }
  
  return { success: true, data: normalizeTags(validTags) };
}

/**
 * Calculate next occurrence for recurring task
 */
function calculateNextOccurrence(task: Task): string | null {
  if (!task.recurrence) {
    return null;
  }
  
  const rec = task.recurrence;
  const lastDue = new Date(task.dueDate);
  
  // Check if recurrence has ended
  if (rec.endDate) {
    const endDate = new Date(rec.endDate);
    if (lastDue >= endDate) {
      return null;
    }
  }
  
  let nextDue: Date;
  
  switch (rec.frequency) {
    case RecurrenceFrequencyEnum.DAILY:
      nextDue = new Date(lastDue);
      nextDue.setDate(nextDue.getDate() + 1);
      break;
    case RecurrenceFrequencyEnum.WEEKLY:
      nextDue = new Date(lastDue);
      nextDue.setDate(nextDue.getDate() + 7);
      break;
    case RecurrenceFrequencyEnum.MONTHLY:
      nextDue = new Date(lastDue);
      nextDue.setMonth(nextDue.getMonth() + 1);
      break;
    case RecurrenceFrequencyEnum.CUSTOM:
      nextDue = new Date(lastDue);
      nextDue.setDate(nextDue.getDate() + rec.daysInterval);
      break;
    default:
      return null;
  }
  
  return nextDue.toISOString();
}

/**
 * Check if task dependencies are satisfied
 */
async function areDependenciesSatisfied(taskId: string, tasks: Task[]): Promise<boolean> {
  const task = tasks.find((t) => t.id === taskId);
  if (!task || task.dependencies.length === 0) {
    return true;
  }
  
  const completedIds = new Set(
    tasks.filter((t) => t.status === StatusEnum.DONE).map((t) => t.id)
  );
  
  for (const depId of task.dependencies) {
    if (!completedIds.has(depId)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get all dependent task IDs for a task
 */
function getDependentTasks(taskId: string, tasks: Task[]): string[] {
  return tasks
    .filter((t) => t.dependencies.includes(taskId))
    .map((t) => t.id);
}

// ============================================
// TASK SERVICE
// ============================================

export const taskService = {
  /** Allowed status values */
  allowedStatus: [...ALLOWED_STATUS],
  
  /** Allowed priority values */
  allowedPriority: [...ALLOWED_PRIORITY],
  
  /** Parse date input to ISO string */
  parseDateInputToISO(dateInput: string): string | null {
    if (!dateInput || typeof dateInput !== "string") {
      return null;
    }
    
    const parts = dateInput.split("-");
    if (parts.length !== 3) return null;
    
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }
    
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (Number.isNaN(date.getTime())) return null;
    
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    
    return date.toISOString();
  },

  /**
   * List all tasks (sorted by default)
   */
  async list(sortConfig?: TaskSortConfig): Promise<Task[]> {
    try {
      const tasks = await storage.getAllTasks();
      
      if (sortConfig) {
        return sortTasks(tasks, sortConfig);
      }
      
      // Default sort: due date asc, then priority, then title
      return sortTasks(tasks, {
        field: SortFieldEnum.DUE_DATE,
        direction: SortDirectionEnum.ASC,
      });
    } catch (err) {
      throw new AppErrorClass(
        "Failed to load tasks",
        ErrorCode.STORAGE_ERROR,
        err
      );
    }
  },

  /**
   * Get task by ID
   */
  async getById(id: string): Promise<Task | null> {
    const tasks = await this.list();
    return tasks.find((t) => t.id === id) ?? null;
  },

  /**
   * Create a new task
   */
  async create(input: unknown): Promise<Task> {
    const validation = validateTaskInput(input, "create");
    
    if (!validation.success) {
      throw validation.error;
    }
    
    const validated = validation.data as CreateTaskInput;
    const now = new Date().toISOString();
    
    const task: Task = {
      id: generateId(),
      title: validated.title,
      description: validated.description,
      status: validated.status,
      priority: validated.priority,
      dueDate: validated.dueDate,
      tags: validated.tags,
      recurrence: validated.recurrence,
      dependencies: validated.dependencies ?? [],
      createdAt: now,
      updatedAt: now,
    };
    
    try {
      const tasks = await storage.getAllTasks();
      tasks.push(task);
      await storage.setAllTasks(tasks);
      return task;
    } catch (err) {
      throw new AppErrorClass(
        "Failed to save task",
        ErrorCode.STORAGE_ERROR,
        err
      );
    }
  },

  /**
   * Update an existing task
   */
  async update(input: unknown): Promise<Task> {
    const validation = validateTaskInput(input, "update");
    
    if (!validation.success) {
      throw validation.error;
    }
    
    const validated = validation.data as UpdateTaskInput;
    
    try {
      const tasks = await storage.getAllTasks();
      const index = tasks.findIndex((t) => t.id === validated.id);
      
      if (index === -1) {
        throw new AppErrorClass("Task not found", ErrorCode.NOT_FOUND);
      }
      
      const existing = tasks[index];
      if (!existing) {
        throw new AppErrorClass("Task not found", ErrorCode.NOT_FOUND);
      }
      
      const now = new Date().toISOString();
      
      // Check dependencies if status is changing to done
      if (validated.status === StatusEnum.DONE && existing.status !== StatusEnum.DONE) {
        const depsSatisfied = await areDependenciesSatisfied(validated.id, tasks);
        if (!depsSatisfied) {
          throw new AppErrorClass(
            "Cannot complete task: dependencies not satisfied",
            ErrorCode.DEPENDENCY_ERROR
          );
        }
      }
      
      const updated: Task = {
        id: validated.id!,
        title: validated.title ?? existing.title,
        description: validated.description ?? existing.description,
        status: validated.status ?? existing.status,
        priority: validated.priority ?? existing.priority,
        dueDate: validated.dueDate ?? existing.dueDate,
        tags: validated.tags ?? existing.tags,
        recurrence: validated.recurrence !== undefined ? validated.recurrence : existing.recurrence,
        dependencies: validated.dependencies ?? existing.dependencies,
        createdAt: existing.createdAt,
        updatedAt: now,
      };
      
      tasks[index] = updated;
      await storage.setAllTasks(tasks);
      return updated;
    } catch (err) {
      if (err instanceof AppErrorClass) throw err;
      throw new AppErrorClass(
        "Failed to update task",
        ErrorCode.STORAGE_ERROR,
        err
      );
    }
  },

  /**
   * Remove a task
   */
  async remove(id: string): Promise<boolean> {
    try {
      const tasks = await storage.getAllTasks();
      
      // Check if any other task depends on this one
      const dependents = getDependentTasks(id, tasks);
      if (dependents.length > 0) {
        throw new AppErrorClass(
          `Cannot delete: other tasks depend on this task: ${dependents.join(", ")}`,
          ErrorCode.DEPENDENCY_ERROR
        );
      }
      
      const index = tasks.findIndex((t) => t.id === id);
      
      if (index === -1) {
        throw new AppErrorClass("Task not found", ErrorCode.NOT_FOUND);
      }
      
      tasks.splice(index, 1);
      await storage.setAllTasks(tasks);
      return true;
    } catch (err) {
      if (err instanceof AppErrorClass) throw err;
      throw new AppErrorClass(
        "Failed to delete task",
        ErrorCode.STORAGE_ERROR,
        err
      );
    }
  },

  /**
   * Query tasks with filters and sorting
   */
  async query(criteria?: TaskQuery, sortConfig?: TaskSortConfig): Promise<Task[]> {
    let tasks = await this.list();
    
    if (!criteria) {
      return sortConfig ? sortTasks(tasks, sortConfig) : tasks;
    }
    
    // Apply filters
    tasks = filter(tasks, (task) => {
      // Status filter
      if (criteria.status && task.status !== criteria.status) {
        return false;
      }
      
      // Priority filter
      if (criteria.priority && task.priority !== criteria.priority) {
        return false;
      }
      
      // Tag filter (case-insensitive)
      if (criteria.tag && criteria.tag.trim()) {
        const tagLower = criteria.tag.toLowerCase().trim();
        if (!task.tags.some((t) => t.toLowerCase() === tagLower)) {
          return false;
        }
      }
      
      // Due before filter
      if (criteria.dueBeforeISO) {
        const dueTime = new Date(task.dueDate).getTime();
        const beforeTime = new Date(criteria.dueBeforeISO).getTime();
        if (dueTime > beforeTime) {
          return false;
        }
      }
      
      // Due after filter
      if (criteria.dueAfterISO) {
        const dueTime = new Date(task.dueDate).getTime();
        const afterTime = new Date(criteria.dueAfterISO).getTime();
        if (dueTime < afterTime) {
          return false;
        }
      }
      
      // Search filter (case-insensitive in title and description)
      if (criteria.search && criteria.search.trim()) {
        const searchLower = criteria.search.toLowerCase().trim();
        const haystack = (task.title + "\n" + (task.description || "")).toLowerCase();
        if (!haystack.includes(searchLower)) {
          return false;
        }
      }
      
      return true;
    });
    
    // Apply sorting
    if (sortConfig) {
      tasks = sortTasks(tasks, sortConfig);
    } else {
      // Default sort
      tasks = sortTasks(tasks, { field: SortFieldEnum.DUE_DATE, direction: SortDirectionEnum.ASC });
    }
    
    return tasks;
  },

  /**
   * Calculate task statistics
   */
  async getStatistics(): Promise<TaskStatistics> {
    const tasks = await storage.getAllTasks();
    
    const byStatus: TaskStatistics["byStatus"] = {
      [StatusEnum.TODO]: 0,
      [StatusEnum.IN_PROGRESS]: 0,
      [StatusEnum.DONE]: 0,
    };
    
    const byPriority: TaskStatistics["byPriority"] = {
      [PriorityEnum.LOW]: 0,
      [PriorityEnum.MEDIUM]: 0,
      [PriorityEnum.HIGH]: 0,
    };
    
    let overdue = 0;
    
    for (const task of tasks) {
      // Count by status
      byStatus[task.status]++;
      
      // Count by priority
      byPriority[task.priority]++;
      
      // Count overdue
      if (isTaskOverdue(task)) {
        overdue++;
      }
    }
    
    const total = tasks.length;
    const completedCount = byStatus[StatusEnum.DONE];
    const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    
    return {
      total,
      byStatus,
      byPriority,
      overdue,
      completionRate,
      completedCount,
      pendingCount: byStatus[StatusEnum.TODO],
      inProgressCount: byStatus[StatusEnum.IN_PROGRESS],
    };
  },

  /**
   * Get upcoming recurring tasks
   */
  async getUpcomingRecurring(limit: number = 5): Promise<RecurringTaskInfo[]> {
    const tasks = await storage.getAllTasks();
    const recurringTasks = tasks.filter((t) => t.recurrence && t.status !== StatusEnum.DONE);
    
    const withNextOccurrence: RecurringTaskInfo[] = [];
    
    for (const task of recurringTasks) {
      const nextOccurrence = calculateNextOccurrence(task);
      if (nextOccurrence) {
        const daysUntil = Math.ceil(
          (new Date(nextOccurrence).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        
        withNextOccurrence.push({
          task,
          nextOccurrence,
          daysUntilNext: daysUntil,
        });
      }
    }
    
    // Sort by next occurrence
    withNextOccurrence.sort((a, b) => 
      new Date(a.nextOccurrence).getTime() - new Date(b.nextOccurrence).getTime()
    );
    
    return withNextOccurrence.slice(0, limit);
  },

  /**
   * Check if a task can be marked as done (dependencies satisfied)
   */
  async canCompleteTask(taskId: string): Promise<{ canComplete: boolean; blockedBy?: string[] }> {
    const tasks = await storage.getAllTasks();
    const task = tasks.find((t) => t.id === taskId);
    
    if (!task) {
      return { canComplete: false };
    }
    
    if (task.status === StatusEnum.DONE) {
      return { canComplete: true };
    }
    
    const completedIds = new Set(
      tasks.filter((t) => t.status === StatusEnum.DONE).map((t) => t.id)
    );
    
    const blockedBy: string[] = [];
    
    for (const depId of task.dependencies) {
      if (!completedIds.has(depId)) {
        const depTask = tasks.find((t) => t.id === depId);
        if (depTask) {
          blockedBy.push(depTask.title);
        } else {
          blockedBy.push(depId);
        }
      }
    }
    
    return {
      canComplete: blockedBy.length === 0,
      blockedBy: blockedBy.length > 0 ? blockedBy : undefined,
    };
  },

  /**
   * AppError class for error handling
   */
  AppError: AppErrorClass,
};

// Export for use in other modules
export default taskService;
