/**
 * ui.ts
 * 
 * DOM rendering and event handling for the Task Manager UI.
 * Provides user interface functionality with TypeScript type safety.
 */

import type { Task, TaskQuery, Status, Priority, Recurrence, TaskStatistics, RecurringTaskInfo, RecurrenceFrequency } from "./types";
import { Status as StatusEnum, Priority as PriorityEnum, SortField, SortDirection, RecurrenceFrequency as RecurrenceFrequencyEnum } from "./types";
import { taskService } from "./taskService";
import {
  escapeHtml,
  formatDueDate,
  isoToDateInputValue,
  parseTagsFromInput,
  isTaskOverdue,
} from "./utilities";

// ============================================
// DOM HELPERS
// ============================================

/**
 * Get element by ID with type safety
 */
function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

/**
 * Set a message to the user
 */
function setMessage(type: "ok" | "error", text: string): void {
  const el = $("#message");
  if (!el) return;
  
  el.classList.remove("message--ok", "message--error");
  if (type === "ok") el.classList.add("message--ok");
  if (type === "error") el.classList.add("message--error");
  el.textContent = text;
  el.hidden = false;
}

/**
 * Clear the message
 */
function clearMessage(): void {
  const el = $("#message");
  if (!el) return;
  
  el.hidden = true;
  el.textContent = "";
  el.classList.remove("message--ok", "message--error");
}

// ============================================
// RENDERING
// ============================================

/**
 * Render a single task card
 */
function renderTask(task: Task): string {
  const statusClass = `pill--${task.status}`;
  const prioClass = `pill--${task.priority}`;
  const isOverdue = isTaskOverdue(task);
  const overdueClass = isOverdue ? " task--overdue" : "";
  
  // Render tags
  let tagsHtml = "";
  if (task.tags && task.tags.length > 0) {
    tagsHtml = task.tags
      .map((tag) => `<span class="pill">#${escapeHtml(tag)}</span>`)
      .join("");
  }
  
  // Render description
  const descHtml = task.description
    ? `<p class="task__desc">${escapeHtml(task.description)}</p>`
    : "";
  
  // Render recurrence badge
  let recurrenceHtml = "";
  if (task.recurrence) {
    const freqLabel = task.recurrence.frequency === "custom" 
      ? `every ${task.recurrence.daysInterval} days`
      : task.recurrence.frequency;
    recurrenceHtml = `<span class="pill pill--recurring">🔄 ${freqLabel}</span>`;
  }
  
  // Render dependencies badge
  let depsHtml = "";
  if (task.dependencies && task.dependencies.length > 0) {
    depsHtml = `<span class="pill pill--deps">📋 ${task.dependencies.length} dep${task.dependencies.length > 1 ? "s" : ""}</span>`;
  }
  
  // Render due date with overdue indicator
  const dueDateDisplay = isOverdue 
    ? `<span class="task__due-date--overdue">⚠️ ${formatDueDate(task.dueDate)}</span>`
    : formatDueDate(task.dueDate);
  
  return (
    `<article class="task${overdueClass}" data-task-id="${escapeHtml(task.id)}">` +
    '<div class="task__top">' +
    "<div>" +
    `<h3 class="task__title">${escapeHtml(task.title)}</h3>` +
    '<div class="task__meta">' +
    `<span class="pill ${statusClass}">${escapeHtml(task.status)}</span>` +
    `<span class="pill ${prioClass}">${escapeHtml(task.priority)}</span>` +
    `<span class="pill">Due: ${dueDateDisplay}</span>` +
    recurrenceHtml +
    depsHtml +
    "</div>" +
    "</div>" +
    '<div class="task__actions">' +
    '<button class="btn btn--secondary" type="button" data-action="edit">Edit</button>' +
    '<button class="btn btn--danger" type="button" data-action="delete">Delete</button>' +
    "</div>" +
    "</div>" +
    descHtml +
    (tagsHtml ? `<div class="task__tags">${tagsHtml}</div>` : "") +
    "</article>"
  );
}

/**
 * Render the task list
 */
function renderTaskList(tasks: Task[]): void {
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

/**
 * Render statistics panel
 */
function renderStatistics(stats: TaskStatistics): void {
  const statsPanel = $("#statsPanel");
  if (!statsPanel) return;
  
  statsPanel.innerHTML = (
    '<div class="stats-grid">' +
    '<div class="stat-card">' +
    '<span class="stat-value">' + stats.total + '</span>' +
    '<span class="stat-label">Total</span>' +
    "</div>" +
    '<div class="stat-card">' +
    '<span class="stat-value">' + stats.completedCount + '</span>' +
    '<span class="stat-label">Done</span>' +
    "</div>" +
    '<div class="stat-card">' +
    '<span class="stat-value">' + stats.inProgressCount + '</span>' +
    '<span class="stat-label">In Progress</span>' +
    "</div>" +
    '<div class="stat-card">' +
    '<span class="stat-value">' + stats.pendingCount + '</span>' +
    '<span class="stat-label">To Do</span>' +
    "</div>" +
    '<div class="stat-card">' +
    '<span class="stat-value">' + stats.overdue + '</span>' +
    '<span class="stat-label">Overdue</span>' +
    "</div>" +
    '<div class="stat-card">' +
    '<span class="stat-value">' + stats.completionRate + '%</span>' +
    '<span class="stat-label">Complete</span>' +
    "</div>" +
    "</div>"
  );
}

/**
 * Render recurring tasks
 */
function renderRecurringTasks(recurring: RecurringTaskInfo[]): void {
  const recurringPanel = $("#recurringPanel");
  if (!recurringPanel) return;
  
  if (recurring.length === 0) {
    recurringPanel.innerHTML = '<p>No upcoming recurring tasks</p>';
    return;
  }
  
  const items = recurring
    .map((item) => {
      const daysText = item.daysUntilNext === 0 
        ? "Today" 
        : item.daysUntilNext === 1 
          ? "Tomorrow" 
          : `In ${item.daysUntilNext} days`;
      return (
        `<div class="recurring-item">` +
        `<span class="recurring-title">${escapeHtml(item.task.title)}</span>` +
        `<span class="recurring-next">${daysText}</span>` +
        "</div>"
      );
    })
    .join("");
  
  recurringPanel.innerHTML = items;
}

// ============================================
// FORM HANDLING
// ============================================

/**
 * Set form mode (create or edit)
 */
function setFormMode(mode: "create" | "edit"): void {
  const cancel = $("#btnCancelEdit");
  if (cancel) cancel.hidden = mode !== "edit";
}

/**
 * Reset the form to initial state
 */
function resetForm(): void {
  const form = $("taskForm") as HTMLFormElement | null;
  if (!form) return;
  
  form.reset();
  const taskIdEl = $("taskId") as HTMLInputElement | null;
  if (taskIdEl) taskIdEl.value = "";
  
  setFormMode("create");
}

/**
 * Fill form with task data for editing
 */
function fillFormForEdit(task: Task): void {
  const taskIdEl = $("#taskId") as HTMLInputElement | null;
  const titleEl = $("#title") as HTMLInputElement | null;
  const descEl = $("#description") as HTMLTextAreaElement | null;
  const statusEl = $("#status") as HTMLSelectElement | null;
  const priorityEl = $("#priority") as HTMLSelectElement | null;
  const dueDateEl = $("#dueDate") as HTMLInputElement | null;
  const tagsEl = $("#tags") as HTMLInputElement | null;
  
  if (taskIdEl) taskIdEl.value = task.id;
  if (titleEl) titleEl.value = task.title;
  if (descEl) descEl.value = task.description || "";
  if (statusEl) statusEl.value = task.status;
  if (priorityEl) priorityEl.value = task.priority;
  if (dueDateEl) dueDateEl.value = isoToDateInputValue(task.dueDate);
  if (tagsEl) tagsEl.value = (task.tags || []).join(", ");
  
  // Populate recurrence fields
  const recurrenceEl = $("recurrence") as HTMLSelectElement | null;
  const recurrenceIntervalDiv = $("recurrenceIntervalDiv");
  const recurrenceIntervalEl = $("recurrenceInterval") as HTMLInputElement | null;
  if (recurrenceEl && task.recurrence) {
    if (task.recurrence.frequency === RecurrenceFrequencyEnum.CUSTOM) {
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
  
  // Populate dependencies field
  const depsEl = $("dependencies") as HTMLInputElement | null;
  if (depsEl && task.dependencies && task.dependencies.length > 0) {
    depsEl.value = task.dependencies.join(", ");
  } else if (depsEl) {
    depsEl.value = "";
  }
  
  setFormMode("edit");
}

/**
 * Get task input from form
 */
function getTaskInputFromForm(): Record<string, unknown> {
  const taskIdEl = $("#taskId") as HTMLInputElement | null;
  const titleEl = $("#title") as HTMLInputElement | null;
  const descEl = $("#description") as HTMLTextAreaElement | null;
  const statusEl = $("#status") as HTMLSelectElement | null;
  const priorityEl = $("#priority") as HTMLSelectElement | null;
  const dueDateEl = $("#dueDate") as HTMLInputElement | null;
  const tagsEl = $("#tags") as HTMLInputElement | null;
  const recurrenceEl = $("#recurrence") as HTMLSelectElement | null;
  const recurrenceIntervalEl = $("#recurrenceInterval") as HTMLInputElement | null;
  const depsEl = $("#dependencies") as HTMLInputElement | null;
  
  const id = taskIdEl?.value;
  const title = titleEl?.value ?? "";
  const description = descEl?.value ?? "";
  const status = statusEl?.value ?? StatusEnum.TODO;
  const priority = priorityEl?.value ?? PriorityEnum.MEDIUM;
  const dueDateInput = dueDateEl?.value ?? "";
  const tagsInput = tagsEl?.value ?? "";
  const recurrenceType = recurrenceEl?.value ?? "none";
  const recurrenceInterval = recurrenceIntervalEl?.value;
  const dependenciesInput = depsEl?.value ?? "";
  
  const dueDateISO = taskService.parseDateInputToISO(dueDateInput);
  
  // Parse recurrence
  let recurrence: Recurrence | undefined;
  if (recurrenceType !== "none") {
    if (recurrenceType === "custom" && recurrenceInterval) {
      recurrence = {
        frequency: RecurrenceFrequencyEnum.CUSTOM,
        daysInterval: parseInt(recurrenceInterval, 10) || 1,
      };
    } else {
      recurrence = {
        frequency: recurrenceType as Exclude<RecurrenceFrequency, RecurrenceFrequencyEnum.CUSTOM>,
      };
    }
  }
  
  // Parse dependencies (comma-separated task IDs)
  const dependencies = dependenciesInput
    .split(",")
    .map((d) => d.trim())
    .filter((d) => d);
  
  return {
    id: id || undefined,
    title,
    description,
    status,
    priority,
    dueDate: dueDateISO,
    tags: parseTagsFromInput(tagsInput),
    recurrence,
    dependencies,
  };
}

// ============================================
// FILTERING & REFRESHING
// ============================================

/**
 * Get current filter criteria from UI controls
 */
function getCriteriaFromControls(): TaskQuery {
  const search = ($("search") as HTMLInputElement)?.value ?? "";
  const status = ($("filterStatus") as HTMLSelectElement)?.value ?? "";
  const priority = ($("filterPriority") as HTMLSelectElement)?.value ?? "";
  const tag = ($("filterTag") as HTMLInputElement)?.value ?? "";
  const dueBefore = ($("filterDueBefore") as HTMLInputElement)?.value ?? "";
  
  const criteria: TaskQuery = {
    search,
    status: status as Status | "",
    priority: priority as Priority | "",
    tag,
    dueBeforeISO: dueBefore ? (taskService.parseDateInputToISO(dueBefore) ?? undefined) : undefined,
  };
  
  return criteria;
}

/**
 * Get sort configuration from UI controls
 */
function getSortConfig(): { field: SortField; direction: SortDirection } | undefined {
  const sortFieldEl = $("#sortField") as HTMLSelectElement | null;
  const sortDirectionEl = $("#sortDirection") as HTMLSelectElement | null;
  
  if (!sortFieldEl || !sortDirectionEl) return undefined;
  
  const field = sortFieldEl.value as SortField;
  const direction = sortDirectionEl.value as SortDirection;
  
  return { field, direction };
}

/**
 * Refresh the task list from the server
 */
async function refreshList(): Promise<void> {
  clearMessage();
  
  const criteria = getCriteriaFromControls();
  const sortConfig = getSortConfig();
  
  const tasks = await taskService.query(criteria, sortConfig);
  renderTaskList(tasks);
  
  // Also refresh statistics
  const stats = await taskService.getStatistics();
  renderStatistics(stats);
  
  const recurring = await taskService.getUpcomingRecurring(5);
  renderRecurringTasks(recurring);
}

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Convert error to user-friendly message
 */
function friendlyError(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  return "Unexpected error";
}

// ============================================
// EVENT BINDING
// ============================================

/**
 * Bind all event listeners
 */
function bindEvents(): void {
  const form = $("#taskForm") as HTMLFormElement | null;
  const list = $("#taskList");
  
  if (!form) return;
  
  // Form submission
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
  
  // Reset form button
  const resetBtn = $("#btnResetForm");
  resetBtn?.addEventListener("click", () => {
    clearMessage();
    resetForm();
  });
  
  // Cancel edit button
  const cancelBtn = $("#btnCancelEdit");
  cancelBtn?.addEventListener("click", () => {
    clearMessage();
    resetForm();
  });
  
  // Task list click handling (edit/delete)
  list?.addEventListener("click", async (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest("button[data-action]") as HTMLButtonElement | null;
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
  
  // Filter/sort change handlers
  function onControlsChanged(): void {
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
  
  // Clear filters button
  const clearFiltersBtn = $("#btnClearFilters");
  clearFiltersBtn?.addEventListener("click", () => {
    const searchEl2 = $("#search") as HTMLInputElement | null;
    const filterStatusEl2 = $("#filterStatus") as HTMLSelectElement | null;
    const filterPriorityEl2 = $("#filterPriority") as HTMLSelectElement | null;
    const filterTagEl2 = $("#filterTag") as HTMLInputElement | null;
    const filterDueBeforeEl2 = $("#filterDueBefore") as HTMLInputElement | null;
    const sortFieldEl2 = $("#sortField") as HTMLSelectElement | null;
    const sortDirectionEl2 = $("#sortDirection") as HTMLSelectElement | null;
    
    if (searchEl2) searchEl2.value = "";
    if (filterStatusEl2) filterStatusEl2.value = "";
    if (filterPriorityEl2) filterPriorityEl2.value = "";
    if (filterTagEl2) filterTagEl2.value = "";
    if (filterDueBeforeEl2) filterDueBeforeEl2.value = "";
    if (sortFieldEl2) sortFieldEl2.value = "dueDate";
    if (sortDirectionEl2) sortDirectionEl2.value = "asc";
    
    onControlsChanged();
  });
  
  // Show/hide recurrence interval input based on recurrence type
  const recurrenceEl = $("#recurrence") as HTMLSelectElement | null;
  const recurrenceIntervalDiv = $("#recurrenceIntervalDiv");
  
  recurrenceEl?.addEventListener("change", () => {
    if (recurrenceEl?.value === "custom" && recurrenceIntervalDiv) {
      recurrenceIntervalDiv.hidden = false;
    } else if (recurrenceIntervalDiv) {
      recurrenceIntervalDiv.hidden = true;
    }
  });
}

// ============================================
// UI MODULE
// ============================================

export const ui = {
  /**
   * Initialize the UI
   */
  async init(): Promise<void> {
    // Set default due date to today
    const today = new Date();
    const dueDateEl = $("#dueDate") as HTMLInputElement | null;
    if (dueDateEl) {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      dueDateEl.value = `${year}-${month}-${day}`;
    }
    
    // Hide recurrence interval by default
    const recurrenceIntervalDiv = $("#recurrenceIntervalDiv");
    if (recurrenceIntervalDiv) {
      recurrenceIntervalDiv.hidden = true;
    }
    
    // Bind events and load initial data
    bindEvents();
    await refreshList();
  },
};

// Export for use in other modules
export default ui;
