var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// ts/types.ts
var AppError = class _AppError extends Error {
  constructor(message, code = "APP_ERROR" /* APP_ERROR */, details) {
    super(message);
    __publicField(this, "code");
    __publicField(this, "details");
    this.name = "AppError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, _AppError.prototype);
  }
};

// ts/utilities.ts
function filter(items, predicate) {
  const result = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item !== void 0 && predicate(item, i)) {
      result.push(item);
    }
  }
  return result;
}
function sort(items, comparator) {
  const result = [...items];
  result.sort(comparator);
  return result;
}
function unique(items, keySelector) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const item of items) {
    const key = keySelector(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}
var PRIORITY_RANK = {
  ["high" /* HIGH */]: 0,
  ["medium" /* MEDIUM */]: 1,
  ["low" /* LOW */]: 2
};
function sortTasks(tasks, sortConfig) {
  const { field, direction } = sortConfig;
  const multiplier = direction === "asc" /* ASC */ ? 1 : -1;
  return sort(tasks, (a, b) => {
    let comparison = 0;
    switch (field) {
      case "dueDate" /* DUE_DATE */:
        comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        break;
      case "priority" /* PRIORITY */:
        comparison = (PRIORITY_RANK[a.priority] ?? 99) - (PRIORITY_RANK[b.priority] ?? 99);
        break;
      case "status" /* STATUS */:
        const statusOrder = {
          ["todo" /* TODO */]: 0,
          ["in-progress" /* IN_PROGRESS */]: 1,
          ["done" /* DONE */]: 2
        };
        comparison = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
        break;
      case "title" /* TITLE */:
        comparison = a.title.localeCompare(b.title);
        break;
      case "createdAt" /* CREATED_AT */:
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      default:
        comparison = 0;
    }
    return comparison * multiplier;
  });
}
function isTaskOverdue(task) {
  if (task.status === "done" /* DONE */) {
    return false;
  }
  const now = /* @__PURE__ */ new Date();
  const dueDate = new Date(task.dueDate);
  dueDate.setHours(23, 59, 59, 999);
  return now.getTime() > dueDate.getTime();
}
function isoToDateInputValue(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function formatDueDate(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function escapeHtml(text) {
  const htmlEscapes = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return String(text).replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}
function parseTagsFromInput(text) {
  if (typeof text !== "string") {
    return [];
  }
  return text.split(",").map((tag) => tag.trim()).filter((tag) => Boolean(tag));
}
function normalizeTags(tags) {
  const seen = /* @__PURE__ */ new Map();
  const result = [];
  for (const tag of tags) {
    const normalized = tag.trim().toLowerCase();
    if (normalized && !seen.has(normalized)) {
      seen.set(normalized, tag.trim());
      result.push(tag.trim());
    }
  }
  return result;
}
function generateId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

// ts/storage.ts
var STORAGE_KEY = "vanilla_task_manager_v1";
function readRaw() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { tasks: [] };
  }
  const parsed = safeJsonParse(raw, { tasks: [] });
  if (!parsed || typeof parsed !== "object") {
    return { tasks: [] };
  }
  if (!Array.isArray(parsed.tasks)) {
    parsed.tasks = [];
  }
  return parsed;
}
function writeRaw(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
var storage = {
  /** Storage key identifier */
  key: STORAGE_KEY,
  /**
   * Retrieve all tasks from storage
   * @returns Promise resolving to array of tasks
   * @throws AppError if storage read fails
   */
  async getAllTasks() {
    await delay(0);
    try {
      const data = readRaw();
      return data.tasks.slice();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      throw new AppError(
        `Failed to read tasks from storage: ${message}`,
        "STORAGE_ERROR" /* STORAGE_ERROR */,
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
  async setAllTasks(tasks) {
    await delay(0);
    try {
      writeRaw({ tasks: tasks.slice() });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      throw new AppError(
        `Failed to save tasks to storage: ${message}`,
        "STORAGE_ERROR" /* STORAGE_ERROR */,
        err
      );
    }
  },
  /**
   * Clear all tasks from storage
   * @returns Promise resolving to true on success
   * @throws AppError if storage clear fails
   */
  async clear() {
    await delay(0);
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      throw new AppError(
        `Failed to clear storage: ${message}`,
        "STORAGE_ERROR" /* STORAGE_ERROR */,
        err
      );
    }
  }
};

// ts/taskService.ts
var ALLOWED_STATUS = [
  "todo" /* TODO */,
  "in-progress" /* IN_PROGRESS */,
  "done" /* DONE */
];
var ALLOWED_PRIORITY = [
  "low" /* LOW */,
  "medium" /* MEDIUM */,
  "high" /* HIGH */
];
var ALLOWED_RECURRENCE_FREQUENCY = [
  "daily" /* DAILY */,
  "weekly" /* WEEKLY */,
  "monthly" /* MONTHLY */,
  "custom" /* CUSTOM */
];
function isValidStatus(status) {
  return ALLOWED_STATUS.includes(status);
}
function isValidPriority(priority) {
  return ALLOWED_PRIORITY.includes(priority);
}
function isValidRecurrenceFrequency(frequency) {
  return ALLOWED_RECURRENCE_FREQUENCY.includes(frequency);
}
function isValidDueDateISO(iso) {
  if (!iso || typeof iso !== "string") return false;
  const date = new Date(iso);
  return !Number.isNaN(date.getTime());
}
function validateRecurrence(recurrence) {
  if (recurrence === null || recurrence === void 0) {
    return { success: true, data: void 0 };
  }
  if (typeof recurrence !== "object") {
    return {
      success: false,
      error: new AppError("Recurrence must be an object", "VALIDATION_ERROR" /* VALIDATION_ERROR */)
    };
  }
  const rec = recurrence;
  if (typeof rec.frequency !== "string") {
    return {
      success: false,
      error: new AppError("Recurrence frequency is required", "VALIDATION_ERROR" /* VALIDATION_ERROR */)
    };
  }
  if (!isValidRecurrenceFrequency(rec.frequency)) {
    return {
      success: false,
      error: new AppError(
        `Recurrence frequency must be one of: ${ALLOWED_RECURRENCE_FREQUENCY.join(", ")}`,
        "VALIDATION_ERROR" /* VALIDATION_ERROR */
      )
    };
  }
  if (rec.frequency === "custom" /* CUSTOM */) {
    if (typeof rec.daysInterval !== "number" || rec.daysInterval < 1) {
      return {
        success: false,
        error: new AppError(
          "Custom recurrence requires daysInterval (minimum 1)",
          "VALIDATION_ERROR" /* VALIDATION_ERROR */
        )
      };
    }
    return {
      success: true,
      data: {
        frequency: "custom" /* CUSTOM */,
        daysInterval: rec.daysInterval,
        endDate: typeof rec.endDate === "string" ? rec.endDate : void 0
      }
    };
  }
  return {
    success: true,
    data: {
      frequency: rec.frequency,
      endDate: typeof rec.endDate === "string" ? rec.endDate : void 0
    }
  };
}
function validateDependencies(dependencies) {
  if (!dependencies) {
    return { success: true, data: [] };
  }
  if (!Array.isArray(dependencies)) {
    return {
      success: false,
      error: new AppError("Dependencies must be an array", "VALIDATION_ERROR" /* VALIDATION_ERROR */)
    };
  }
  const validDeps = [];
  for (const dep of dependencies) {
    if (typeof dep !== "string" || !dep.trim()) {
      return {
        success: false,
        error: new AppError("Each dependency must be a non-empty string", "VALIDATION_ERROR" /* VALIDATION_ERROR */)
      };
    }
    validDeps.push(dep.trim());
  }
  return {
    success: true,
    data: unique(validDeps, (d) => d)
  };
}
function validateTaskInput(input, mode) {
  if (!input || typeof input !== "object") {
    return {
      success: false,
      error: new AppError("Invalid task input", "VALIDATION_ERROR" /* VALIDATION_ERROR */)
    };
  }
  const data = input;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title) {
    return {
      success: false,
      error: new AppError("Title is required", "VALIDATION_ERROR" /* VALIDATION_ERROR */)
    };
  }
  let description = "";
  if (data.description != null) {
    if (typeof data.description !== "string") {
      return {
        success: false,
        error: new AppError("Description must be a string", "VALIDATION_ERROR" /* VALIDATION_ERROR */)
      };
    }
    description = data.description.trim();
  }
  const statusInput = typeof data.status === "string" ? data.status : "todo" /* TODO */;
  if (!isValidStatus(statusInput)) {
    return {
      success: false,
      error: new AppError(
        `Status must be one of: ${ALLOWED_STATUS.join(", ")}`,
        "VALIDATION_ERROR" /* VALIDATION_ERROR */
      )
    };
  }
  const priorityInput = typeof data.priority === "string" ? data.priority : "medium" /* MEDIUM */;
  if (!isValidPriority(priorityInput)) {
    return {
      success: false,
      error: new AppError(
        `Priority must be one of: ${ALLOWED_PRIORITY.join(", ")}`,
        "VALIDATION_ERROR" /* VALIDATION_ERROR */
      )
    };
  }
  const dueDate = typeof data.dueDate === "string" ? data.dueDate : "";
  if (!dueDate) {
    return {
      success: false,
      error: new AppError("Due date is required", "VALIDATION_ERROR" /* VALIDATION_ERROR */)
    };
  }
  if (!isValidDueDateISO(dueDate)) {
    return {
      success: false,
      error: new AppError("Due date is invalid", "VALIDATION_ERROR" /* VALIDATION_ERROR */)
    };
  }
  let tags = [];
  if (data.tags != null) {
    if (!Array.isArray(data.tags)) {
      return {
        success: false,
        error: new AppError("Tags must be an array", "VALIDATION_ERROR" /* VALIDATION_ERROR */)
      };
    }
    const tagResult = validateTags(data.tags);
    if (!tagResult.success) {
      return tagResult;
    }
    tags = tagResult.data;
  }
  const recurrenceResult = validateRecurrence(data.recurrence);
  if (!recurrenceResult.success) {
    return recurrenceResult;
  }
  const depsResult = validateDependencies(data.dependencies);
  if (!depsResult.success) {
    return depsResult;
  }
  const base = {
    title,
    description,
    status: statusInput,
    priority: priorityInput,
    dueDate,
    tags,
    recurrence: recurrenceResult.data,
    dependencies: depsResult.data
  };
  if (mode === "update") {
    const id = typeof data.id === "string" || typeof data.id === "number" ? String(data.id) : "";
    if (!id) {
      return {
        success: false,
        error: new AppError("Task id is required for update", "VALIDATION_ERROR" /* VALIDATION_ERROR */)
      };
    }
    return { success: true, data: { ...base, id } };
  }
  return { success: true, data: base };
}
function validateTags(tags) {
  if (!Array.isArray(tags)) {
    return {
      success: false,
      error: new AppError("Tags must be an array", "VALIDATION_ERROR" /* VALIDATION_ERROR */)
    };
  }
  const validTags = [];
  for (const tag of tags) {
    if (typeof tag !== "string") {
      return {
        success: false,
        error: new AppError("Tags must be strings", "VALIDATION_ERROR" /* VALIDATION_ERROR */)
      };
    }
    const trimmed = tag.trim();
    if (!trimmed) {
      return {
        success: false,
        error: new AppError("Tags cannot be empty", "VALIDATION_ERROR" /* VALIDATION_ERROR */)
      };
    }
    validTags.push(trimmed);
  }
  return { success: true, data: normalizeTags(validTags) };
}
function calculateNextOccurrence(task) {
  if (!task.recurrence) {
    return null;
  }
  const rec = task.recurrence;
  const lastDue = new Date(task.dueDate);
  if (rec.endDate) {
    const endDate = new Date(rec.endDate);
    if (lastDue >= endDate) {
      return null;
    }
  }
  let nextDue;
  switch (rec.frequency) {
    case "daily" /* DAILY */:
      nextDue = new Date(lastDue);
      nextDue.setDate(nextDue.getDate() + 1);
      break;
    case "weekly" /* WEEKLY */:
      nextDue = new Date(lastDue);
      nextDue.setDate(nextDue.getDate() + 7);
      break;
    case "monthly" /* MONTHLY */:
      nextDue = new Date(lastDue);
      nextDue.setMonth(nextDue.getMonth() + 1);
      break;
    case "custom" /* CUSTOM */:
      nextDue = new Date(lastDue);
      nextDue.setDate(nextDue.getDate() + rec.daysInterval);
      break;
    default:
      return null;
  }
  return nextDue.toISOString();
}
async function areDependenciesSatisfied(taskId, tasks) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task || task.dependencies.length === 0) {
    return true;
  }
  const completedIds = new Set(
    tasks.filter((t) => t.status === "done" /* DONE */).map((t) => t.id)
  );
  for (const depId of task.dependencies) {
    if (!completedIds.has(depId)) {
      return false;
    }
  }
  return true;
}
function getDependentTasks(taskId, tasks) {
  return tasks.filter((t) => t.dependencies.includes(taskId)).map((t) => t.id);
}
var taskService = {
  /** Allowed status values */
  allowedStatus: [...ALLOWED_STATUS],
  /** Allowed priority values */
  allowedPriority: [...ALLOWED_PRIORITY],
  /** Parse date input to ISO string */
  parseDateInputToISO(dateInput) {
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
  async list(sortConfig) {
    try {
      const tasks = await storage.getAllTasks();
      if (sortConfig) {
        return sortTasks(tasks, sortConfig);
      }
      return sortTasks(tasks, {
        field: "dueDate" /* DUE_DATE */,
        direction: "asc" /* ASC */
      });
    } catch (err) {
      throw new AppError(
        "Failed to load tasks",
        "STORAGE_ERROR" /* STORAGE_ERROR */,
        err
      );
    }
  },
  /**
   * Get task by ID
   */
  async getById(id) {
    const tasks = await this.list();
    return tasks.find((t) => t.id === id) ?? null;
  },
  /**
   * Create a new task
   */
  async create(input) {
    const validation = validateTaskInput(input, "create");
    if (!validation.success) {
      throw validation.error;
    }
    const validated = validation.data;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const task = {
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
      updatedAt: now
    };
    try {
      const tasks = await storage.getAllTasks();
      tasks.push(task);
      await storage.setAllTasks(tasks);
      return task;
    } catch (err) {
      throw new AppError(
        "Failed to save task",
        "STORAGE_ERROR" /* STORAGE_ERROR */,
        err
      );
    }
  },
  /**
   * Update an existing task
   */
  async update(input) {
    const validation = validateTaskInput(input, "update");
    if (!validation.success) {
      throw validation.error;
    }
    const validated = validation.data;
    try {
      const tasks = await storage.getAllTasks();
      const index = tasks.findIndex((t) => t.id === validated.id);
      if (index === -1) {
        throw new AppError("Task not found", "NOT_FOUND" /* NOT_FOUND */);
      }
      const existing = tasks[index];
      if (!existing) {
        throw new AppError("Task not found", "NOT_FOUND" /* NOT_FOUND */);
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (validated.status === "done" /* DONE */ && existing.status !== "done" /* DONE */) {
        const depsSatisfied = await areDependenciesSatisfied(validated.id, tasks);
        if (!depsSatisfied) {
          throw new AppError(
            "Cannot complete task: dependencies not satisfied",
            "DEPENDENCY_ERROR" /* DEPENDENCY_ERROR */
          );
        }
      }
      const updated = {
        id: validated.id,
        title: validated.title ?? existing.title,
        description: validated.description ?? existing.description,
        status: validated.status ?? existing.status,
        priority: validated.priority ?? existing.priority,
        dueDate: validated.dueDate ?? existing.dueDate,
        tags: validated.tags ?? existing.tags,
        recurrence: validated.recurrence !== void 0 ? validated.recurrence : existing.recurrence,
        dependencies: validated.dependencies ?? existing.dependencies,
        createdAt: existing.createdAt,
        updatedAt: now
      };
      tasks[index] = updated;
      await storage.setAllTasks(tasks);
      return updated;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        "Failed to update task",
        "STORAGE_ERROR" /* STORAGE_ERROR */,
        err
      );
    }
  },
  /**
   * Remove a task
   */
  async remove(id) {
    try {
      const tasks = await storage.getAllTasks();
      const dependents = getDependentTasks(id, tasks);
      if (dependents.length > 0) {
        throw new AppError(
          `Cannot delete: other tasks depend on this task: ${dependents.join(", ")}`,
          "DEPENDENCY_ERROR" /* DEPENDENCY_ERROR */
        );
      }
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) {
        throw new AppError("Task not found", "NOT_FOUND" /* NOT_FOUND */);
      }
      tasks.splice(index, 1);
      await storage.setAllTasks(tasks);
      return true;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        "Failed to delete task",
        "STORAGE_ERROR" /* STORAGE_ERROR */,
        err
      );
    }
  },
  /**
   * Query tasks with filters and sorting
   */
  async query(criteria, sortConfig) {
    let tasks = await this.list();
    if (!criteria) {
      return sortConfig ? sortTasks(tasks, sortConfig) : tasks;
    }
    tasks = filter(tasks, (task) => {
      if (criteria.status && task.status !== criteria.status) {
        return false;
      }
      if (criteria.priority && task.priority !== criteria.priority) {
        return false;
      }
      if (criteria.tag && criteria.tag.trim()) {
        const tagLower = criteria.tag.toLowerCase().trim();
        if (!task.tags.some((t) => t.toLowerCase() === tagLower)) {
          return false;
        }
      }
      if (criteria.dueBeforeISO) {
        const dueTime = new Date(task.dueDate).getTime();
        const beforeTime = new Date(criteria.dueBeforeISO).getTime();
        if (dueTime > beforeTime) {
          return false;
        }
      }
      if (criteria.dueAfterISO) {
        const dueTime = new Date(task.dueDate).getTime();
        const afterTime = new Date(criteria.dueAfterISO).getTime();
        if (dueTime < afterTime) {
          return false;
        }
      }
      if (criteria.search && criteria.search.trim()) {
        const searchLower = criteria.search.toLowerCase().trim();
        const haystack = (task.title + "\n" + (task.description || "")).toLowerCase();
        if (!haystack.includes(searchLower)) {
          return false;
        }
      }
      return true;
    });
    if (sortConfig) {
      tasks = sortTasks(tasks, sortConfig);
    } else {
      tasks = sortTasks(tasks, { field: "dueDate" /* DUE_DATE */, direction: "asc" /* ASC */ });
    }
    return tasks;
  },
  /**
   * Calculate task statistics
   */
  async getStatistics() {
    const tasks = await storage.getAllTasks();
    const byStatus = {
      ["todo" /* TODO */]: 0,
      ["in-progress" /* IN_PROGRESS */]: 0,
      ["done" /* DONE */]: 0
    };
    const byPriority = {
      ["low" /* LOW */]: 0,
      ["medium" /* MEDIUM */]: 0,
      ["high" /* HIGH */]: 0
    };
    let overdue = 0;
    for (const task of tasks) {
      byStatus[task.status]++;
      byPriority[task.priority]++;
      if (isTaskOverdue(task)) {
        overdue++;
      }
    }
    const total = tasks.length;
    const completedCount = byStatus["done" /* DONE */];
    const completionRate = total > 0 ? Math.round(completedCount / total * 100) : 0;
    return {
      total,
      byStatus,
      byPriority,
      overdue,
      completionRate,
      completedCount,
      pendingCount: byStatus["todo" /* TODO */],
      inProgressCount: byStatus["in-progress" /* IN_PROGRESS */]
    };
  },
  /**
   * Get upcoming recurring tasks
   */
  async getUpcomingRecurring(limit = 5) {
    const tasks = await storage.getAllTasks();
    const recurringTasks = tasks.filter((t) => t.recurrence && t.status !== "done" /* DONE */);
    const withNextOccurrence = [];
    for (const task of recurringTasks) {
      const nextOccurrence = calculateNextOccurrence(task);
      if (nextOccurrence) {
        const daysUntil = Math.ceil(
          (new Date(nextOccurrence).getTime() - (/* @__PURE__ */ new Date()).getTime()) / (1e3 * 60 * 60 * 24)
        );
        withNextOccurrence.push({
          task,
          nextOccurrence,
          daysUntilNext: daysUntil
        });
      }
    }
    withNextOccurrence.sort(
      (a, b) => new Date(a.nextOccurrence).getTime() - new Date(b.nextOccurrence).getTime()
    );
    return withNextOccurrence.slice(0, limit);
  },
  /**
   * Check if a task can be marked as done (dependencies satisfied)
   */
  async canCompleteTask(taskId) {
    const tasks = await storage.getAllTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      return { canComplete: false };
    }
    if (task.status === "done" /* DONE */) {
      return { canComplete: true };
    }
    const completedIds = new Set(
      tasks.filter((t) => t.status === "done" /* DONE */).map((t) => t.id)
    );
    const blockedBy = [];
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
      blockedBy: blockedBy.length > 0 ? blockedBy : void 0
    };
  },
  /**
   * AppError class for error handling
   */
  AppError
};

// ts/ui.ts
function $(id) {
  return document.getElementById(id);
}
function setMessage(type, text) {
  const el = $("#message");
  if (!el) return;
  el.classList.remove("message--ok", "message--error");
  if (type === "ok") el.classList.add("message--ok");
  if (type === "error") el.classList.add("message--error");
  el.textContent = text;
  el.hidden = false;
}
function clearMessage() {
  const el = $("#message");
  if (!el) return;
  el.hidden = true;
  el.textContent = "";
  el.classList.remove("message--ok", "message--error");
}
function renderTask(task) {
  const statusClass = `pill--${task.status}`;
  const prioClass = `pill--${task.priority}`;
  const isOverdue = isTaskOverdue(task);
  const overdueClass = isOverdue ? " task--overdue" : "";
  let tagsHtml = "";
  if (task.tags && task.tags.length > 0) {
    tagsHtml = task.tags.map((tag) => `<span class="pill">#${escapeHtml(tag)}</span>`).join("");
  }
  const descHtml = task.description ? `<p class="task__desc">${escapeHtml(task.description)}</p>` : "";
  let recurrenceHtml = "";
  if (task.recurrence) {
    const freqLabel = task.recurrence.frequency === "custom" ? `every ${task.recurrence.daysInterval} days` : task.recurrence.frequency;
    recurrenceHtml = `<span class="pill pill--recurring">\u{1F504} ${freqLabel}</span>`;
  }
  let depsHtml = "";
  if (task.dependencies && task.dependencies.length > 0) {
    depsHtml = `<span class="pill pill--deps">\u{1F4CB} ${task.dependencies.length} dep${task.dependencies.length > 1 ? "s" : ""}</span>`;
  }
  const dueDateDisplay = isOverdue ? `<span class="task__due-date--overdue">\u26A0\uFE0F ${formatDueDate(task.dueDate)}</span>` : formatDueDate(task.dueDate);
  return `<article class="task${overdueClass}" data-task-id="${escapeHtml(task.id)}"><div class="task__top"><div><h3 class="task__title">${escapeHtml(task.title)}</h3><div class="task__meta"><span class="pill ${statusClass}">${escapeHtml(task.status)}</span><span class="pill ${prioClass}">${escapeHtml(task.priority)}</span><span class="pill">Due: ${dueDateDisplay}</span>` + recurrenceHtml + depsHtml + '</div></div><div class="task__actions"><button class="btn btn--secondary" type="button" data-action="edit">Edit</button><button class="btn btn--danger" type="button" data-action="delete">Delete</button></div></div>' + descHtml + (tagsHtml ? `<div class="task__tags">${tagsHtml}</div>` : "") + "</article>";
}
function renderTaskList(tasks) {
  const list = $("#taskList");
  const count = $("#taskCount");
  if (count) count.textContent = String(tasks.length);
  if (!list) return;
  if (tasks.length === 0) {
    list.innerHTML = '<div class="task" role="note">No tasks match your current search/filters.</div>';
    return;
  }
  list.innerHTML = tasks.map(renderTask).join("");
}
function renderStatistics(stats) {
  const statsPanel = $("#statsPanel");
  if (!statsPanel) return;
  statsPanel.innerHTML = '<div class="stats-grid"><div class="stat-card"><span class="stat-value">' + stats.total + '</span><span class="stat-label">Total</span></div><div class="stat-card"><span class="stat-value">' + stats.completedCount + '</span><span class="stat-label">Done</span></div><div class="stat-card"><span class="stat-value">' + stats.inProgressCount + '</span><span class="stat-label">In Progress</span></div><div class="stat-card"><span class="stat-value">' + stats.pendingCount + '</span><span class="stat-label">To Do</span></div><div class="stat-card"><span class="stat-value">' + stats.overdue + '</span><span class="stat-label">Overdue</span></div><div class="stat-card"><span class="stat-value">' + stats.completionRate + '%</span><span class="stat-label">Complete</span></div></div>';
}
function renderRecurringTasks(recurring) {
  const recurringPanel = $("#recurringPanel");
  if (!recurringPanel) return;
  if (recurring.length === 0) {
    recurringPanel.innerHTML = "<p>No upcoming recurring tasks</p>";
    return;
  }
  const items = recurring.map((item) => {
    const daysText = item.daysUntilNext === 0 ? "Today" : item.daysUntilNext === 1 ? "Tomorrow" : `In ${item.daysUntilNext} days`;
    return `<div class="recurring-item"><span class="recurring-title">${escapeHtml(item.task.title)}</span><span class="recurring-next">${daysText}</span></div>`;
  }).join("");
  recurringPanel.innerHTML = items;
}
function setFormMode(mode) {
  const cancel = $("#btnCancelEdit");
  if (cancel) cancel.hidden = mode !== "edit";
}
function resetForm() {
  const form = $("taskForm");
  if (!form) return;
  form.reset();
  const taskIdEl = $("taskId");
  if (taskIdEl) taskIdEl.value = "";
  setFormMode("create");
}
function fillFormForEdit(task) {
  const taskIdEl = $("#taskId");
  const titleEl = $("#title");
  const descEl = $("#description");
  const statusEl = $("#status");
  const priorityEl = $("#priority");
  const dueDateEl = $("#dueDate");
  const tagsEl = $("#tags");
  if (taskIdEl) taskIdEl.value = task.id;
  if (titleEl) titleEl.value = task.title;
  if (descEl) descEl.value = task.description || "";
  if (statusEl) statusEl.value = task.status;
  if (priorityEl) priorityEl.value = task.priority;
  if (dueDateEl) dueDateEl.value = isoToDateInputValue(task.dueDate);
  if (tagsEl) tagsEl.value = (task.tags || []).join(", ");
  const recurrenceEl = $("recurrence");
  const recurrenceIntervalDiv = $("recurrenceIntervalDiv");
  const recurrenceIntervalEl = $("recurrenceInterval");
  if (recurrenceEl && task.recurrence) {
    if (task.recurrence.frequency === "custom" /* CUSTOM */) {
      recurrenceEl.value = "custom";
      if (recurrenceIntervalDiv) recurrenceIntervalDiv.hidden = false;
      if (recurrenceIntervalEl) recurrenceIntervalEl.value = String(task.recurrence.daysInterval);
    } else {
      recurrenceEl.value = task.recurrence.frequency;
      if (recurrenceIntervalDiv) recurrenceIntervalDiv.hidden = true;
    }
  } else if (recurrenceEl) {
    recurrenceEl.value = "none";
    if (recurrenceIntervalDiv) recurrenceIntervalDiv.hidden = true;
  }
  const depsEl = $("dependencies");
  if (depsEl && task.dependencies && task.dependencies.length > 0) {
    depsEl.value = task.dependencies.join(", ");
  } else if (depsEl) {
    depsEl.value = "";
  }
  setFormMode("edit");
}
function getTaskInputFromForm() {
  const taskIdEl = $("#taskId");
  const titleEl = $("#title");
  const descEl = $("#description");
  const statusEl = $("#status");
  const priorityEl = $("#priority");
  const dueDateEl = $("#dueDate");
  const tagsEl = $("#tags");
  const recurrenceEl = $("#recurrence");
  const recurrenceIntervalEl = $("#recurrenceInterval");
  const depsEl = $("#dependencies");
  const id = taskIdEl?.value;
  const title = titleEl?.value ?? "";
  const description = descEl?.value ?? "";
  const status = statusEl?.value ?? "todo" /* TODO */;
  const priority = priorityEl?.value ?? "medium" /* MEDIUM */;
  const dueDateInput = dueDateEl?.value ?? "";
  const tagsInput = tagsEl?.value ?? "";
  const recurrenceType = recurrenceEl?.value ?? "none";
  const recurrenceInterval = recurrenceIntervalEl?.value;
  const dependenciesInput = depsEl?.value ?? "";
  const dueDateISO = taskService.parseDateInputToISO(dueDateInput);
  let recurrence;
  if (recurrenceType !== "none") {
    if (recurrenceType === "custom" && recurrenceInterval) {
      recurrence = {
        frequency: "custom" /* CUSTOM */,
        daysInterval: parseInt(recurrenceInterval, 10) || 1
      };
    } else {
      recurrence = {
        frequency: recurrenceType
      };
    }
  }
  const dependencies = dependenciesInput.split(",").map((d) => d.trim()).filter((d) => d);
  return {
    id: id || void 0,
    title,
    description,
    status,
    priority,
    dueDate: dueDateISO,
    tags: parseTagsFromInput(tagsInput),
    recurrence,
    dependencies
  };
}
function getCriteriaFromControls() {
  const search = $("search")?.value ?? "";
  const status = $("filterStatus")?.value ?? "";
  const priority = $("filterPriority")?.value ?? "";
  const tag = $("filterTag")?.value ?? "";
  const dueBefore = $("filterDueBefore")?.value ?? "";
  const criteria = {
    search,
    status,
    priority,
    tag,
    dueBeforeISO: dueBefore ? taskService.parseDateInputToISO(dueBefore) ?? void 0 : void 0
  };
  return criteria;
}
function getSortConfig() {
  const sortFieldEl = $("#sortField");
  const sortDirectionEl = $("#sortDirection");
  if (!sortFieldEl || !sortDirectionEl) return void 0;
  const field = sortFieldEl.value;
  const direction = sortDirectionEl.value;
  return { field, direction };
}
async function refreshList() {
  clearMessage();
  const criteria = getCriteriaFromControls();
  const sortConfig = getSortConfig();
  const tasks = await taskService.query(criteria, sortConfig);
  renderTaskList(tasks);
  const stats = await taskService.getStatistics();
  renderStatistics(stats);
  const recurring = await taskService.getUpcomingRecurring(5);
  renderRecurringTasks(recurring);
}
function friendlyError(err) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  return "Unexpected error";
}
function bindEvents() {
  const form = $("#taskForm");
  const list = $("#taskList");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage();
    try {
      const input = getTaskInputFromForm();
      const isEdit = Boolean(input.id);
      if (isEdit) {
        await taskService.update(input);
        setMessage("ok", "Task updated");
      } else {
        await taskService.create(input);
        setMessage("ok", "Task created");
      }
      resetForm();
      await refreshList();
    } catch (err) {
      setMessage("error", friendlyError(err));
    }
  });
  const resetBtn = $("#btnResetForm");
  resetBtn?.addEventListener("click", () => {
    clearMessage();
    resetForm();
  });
  const cancelBtn = $("#btnCancelEdit");
  cancelBtn?.addEventListener("click", () => {
    clearMessage();
    resetForm();
  });
  list?.addEventListener("click", async (e) => {
    const target = e.target;
    const btn = target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const card = btn.closest("article[data-task-id]");
    if (!card) return;
    const id = card.getAttribute("data-task-id");
    if (!id) return;
    try {
      clearMessage();
      if (action === "edit") {
        const task = await taskService.getById(id);
        if (!task) {
          throw new Error("Task not found");
        }
        fillFormForEdit(task);
        setMessage("ok", `Editing task: ${task.title}`);
        return;
      }
      if (action === "delete") {
        const ok = confirm("Delete this task? This cannot be undone.");
        if (!ok) return;
        await taskService.remove(id);
        setMessage("ok", "Task deleted");
        await refreshList();
        return;
      }
    } catch (err) {
      setMessage("error", friendlyError(err));
    }
  });
  function onControlsChanged() {
    refreshList().catch((err) => {
      setMessage("error", friendlyError(err));
    });
  }
  const searchEl = $("#search");
  const filterStatusEl = $("#filterStatus");
  const filterPriorityEl = $("#filterPriority");
  const filterTagEl = $("#filterTag");
  const filterDueBeforeEl = $("#filterDueBefore");
  const sortFieldEl = $("#sortField");
  const sortDirectionEl = $("#sortDirection");
  searchEl?.addEventListener("input", onControlsChanged);
  filterStatusEl?.addEventListener("change", onControlsChanged);
  filterPriorityEl?.addEventListener("change", onControlsChanged);
  filterTagEl?.addEventListener("input", onControlsChanged);
  filterDueBeforeEl?.addEventListener("change", onControlsChanged);
  sortFieldEl?.addEventListener("change", onControlsChanged);
  sortDirectionEl?.addEventListener("change", onControlsChanged);
  const clearFiltersBtn = $("#btnClearFilters");
  clearFiltersBtn?.addEventListener("click", () => {
    const searchEl2 = $("#search");
    const filterStatusEl2 = $("#filterStatus");
    const filterPriorityEl2 = $("#filterPriority");
    const filterTagEl2 = $("#filterTag");
    const filterDueBeforeEl2 = $("#filterDueBefore");
    const sortFieldEl2 = $("#sortField");
    const sortDirectionEl2 = $("#sortDirection");
    if (searchEl2) searchEl2.value = "";
    if (filterStatusEl2) filterStatusEl2.value = "";
    if (filterPriorityEl2) filterPriorityEl2.value = "";
    if (filterTagEl2) filterTagEl2.value = "";
    if (filterDueBeforeEl2) filterDueBeforeEl2.value = "";
    if (sortFieldEl2) sortFieldEl2.value = "dueDate";
    if (sortDirectionEl2) sortDirectionEl2.value = "asc";
    onControlsChanged();
  });
  const recurrenceEl = $("#recurrence");
  const recurrenceIntervalDiv = $("#recurrenceIntervalDiv");
  recurrenceEl?.addEventListener("change", () => {
    if (recurrenceEl?.value === "custom" && recurrenceIntervalDiv) {
      recurrenceIntervalDiv.hidden = false;
    } else if (recurrenceIntervalDiv) {
      recurrenceIntervalDiv.hidden = true;
    }
  });
}
var ui = {
  /**
   * Initialize the UI
   */
  async init() {
    const today = /* @__PURE__ */ new Date();
    const dueDateEl = $("#dueDate");
    if (dueDateEl) {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      dueDateEl.value = `${year}-${month}-${day}`;
    }
    const recurrenceIntervalDiv = $("#recurrenceIntervalDiv");
    if (recurrenceIntervalDiv) {
      recurrenceIntervalDiv.hidden = true;
    }
    bindEvents();
    await refreshList();
  }
};

// ts/main.ts
async function start() {
  try {
    await ui.init();
  } catch (err) {
    console.error(err);
    const el = document.getElementById("message");
    if (el) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      el.textContent = `Failed to start app: ${errorMessage}`;
      el.classList.add("message--error");
      el.hidden = false;
    }
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
export {
  start
};
