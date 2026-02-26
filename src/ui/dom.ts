import { Task } from '../models/task.js';
import { Status, Priority, QueryCriteria, Statistics, SortOptions, SortField } from '../models/types.js';
import { taskService } from '../services/taskService.js';
import { getNextRecurringDate } from '../utils/genericUtils.js';

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

function formatDueDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Invalid date';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isoToDateInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseTagsFromInput(text: string): string[] {
  if (typeof text !== 'string') return [];
  return text
    .split(',')
    .map(t => t.trim())
    .filter(t => Boolean(t));
}

function setMessage(type: 'ok' | 'error', text: string): void {
  const el = $('message');
  if (!el) return;
  el.classList.remove('message--ok', 'message--error');
  if (type === 'ok') el.classList.add('message--ok');
  if (type === 'error') el.classList.add('message--error');
  el.textContent = text;
  el.hidden = false;
}

function clearMessage(): void {
  const el = $('message');
  if (!el) return;
  el.hidden = true;
  el.textContent = '';
  el.classList.remove('message--ok', 'message--error');
}

function renderTask(task: Task): string {
  const statusClass = `pill--${task.status}`;
  const prioClass = `pill--${task.priority}`;

  let tagsHtml = '';
  if (task.tags && task.tags.length) {
    tagsHtml = task.tags
      .map(t => `<span class="pill">#${escapeHtml(t)}</span>`)
      .join('');
  }

  const descHtml = task.description
    ? `<p class="task__desc">${escapeHtml(task.description)}</p>`
    : '';

  let dependenciesHtml = '';
  if (task.dependencies && task.dependencies.length) {
    dependenciesHtml = `<div class="task__deps">Dependencies: ${task.dependencies.join(', ')}</div>`;
  }

  let recurrenceHtml = '';
  if (task.recurrence) {
    recurrenceHtml = `<div class="task__recurrence">Recurs: ${task.recurrence.type}${task.recurrence.interval ? ` (${task.recurrence.interval} days)` : ''}</div>`;
  }

  return `
    <article class="task" data-task-id="${escapeHtml(task.id)}">
      <div class="task__top">
        <div>
          <h3 class="task__title">${escapeHtml(task.title)}</h3>
          <div class="task__meta">
            <span class="pill ${statusClass}">${escapeHtml(task.status)}</span>
            <span class="pill ${prioClass}">${escapeHtml(task.priority)}</span>
            <span class="pill">Due: ${escapeHtml(formatDueDate(task.dueDate))}</span>
          </div>
        </div>
        <div class="task__actions">
          <button class="btn btn--secondary" type="button" data-action="edit">Edit</button>
          <button class="btn btn--danger" type="button" data-action="delete">Delete</button>
        </div>
      </div>
      ${descHtml}
      ${tagsHtml ? `<div class="task__tags">${tagsHtml}</div>` : ''}
      ${dependenciesHtml}
      ${recurrenceHtml}
    </article>
  `;
}

function renderTaskList(tasks: Task[]): void {
  const list = $('taskList');
  const count = $('taskCount');
  if (count) count.textContent = String(tasks.length);

  if (!list) return;
  if (!tasks.length) {
    list.innerHTML = '<div class="task" role="note">No tasks match your current search/filters.</div>';
    return;
  }

  list.innerHTML = tasks.map(renderTask).join('');
}

function renderStatistics(stats: Statistics): void {
  const panel = $('statsPanel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.totalTasks}</div>
        <div class="stat-label">Total Tasks</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.tasksByStatus.todo}</div>
        <div class="stat-label">To Do</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.tasksByStatus['in-progress']}</div>
        <div class="stat-label">In Progress</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.tasksByStatus.done}</div>
        <div class="stat-label">Done</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.tasksByPriority.low}</div>
        <div class="stat-label">Low Priority</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.tasksByPriority.medium}</div>
        <div class="stat-label">Medium Priority</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.tasksByPriority.high}</div>
        <div class="stat-label">High Priority</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.overdueTasks}</div>
        <div class="stat-label">Overdue</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.completionRate.toFixed(1)}%</div>
        <div class="stat-label">Completion Rate</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.upcomingRecurringTasks}</div>
        <div class="stat-label">Upcoming Recurring</div>
      </div>
    </div>
  `;
}

function renderUpcomingRecurringTasks(tasks: Task[]): void {
  const panel = $('recurringPanel');
  if (!panel) return;

  const now = new Date();
  const upcomingTasks = tasks.filter(task => {
    if (!task.recurrence) return false;
    const nextDate = getNextRecurringDate(task, now);
    if (!nextDate) return false;
    const diffTime = nextDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  });

  if (!upcomingTasks.length) {
    panel.innerHTML = '<div class="recurring-item">No upcoming recurring tasks in the next 7 days.</div>';
    return;
  }

  panel.innerHTML = upcomingTasks.map(task => {
    const nextDate = getNextRecurringDate(task, now);
    return `
    <div class="recurring-item">
      <div class="recurring-title">${escapeHtml(task.title)}</div>
      <div class="recurring-next">Due: ${nextDate ? escapeHtml(formatDueDate(nextDate.toISOString())) : 'Unknown'} | Recurs: ${task.recurrence?.type}${task.recurrence?.interval ? ` (${task.recurrence.interval} days)` : ''}</div>
    </div>
  `}).join('');
}

function getCriteriaFromControls(): QueryCriteria {
  const search = ($('search') as HTMLInputElement)?.value || '';
  const statusStr = ($('filterStatus') as HTMLSelectElement)?.value || '';
  const priorityStr = ($('filterPriority') as HTMLSelectElement)?.value || '';
  const tag = ($('filterTag') as HTMLInputElement)?.value || '';
  const dueBefore = ($('filterDueBefore') as HTMLInputElement)?.value || '';

  return {
    search: search || undefined,
    status: statusStr as Status || undefined,
    priority: priorityStr as Priority || undefined,
    tag: tag || undefined,
    dueBeforeISO: dueBefore ? taskService.parseDateInputToISO(dueBefore) || undefined : undefined,
  };
}

function getSortOptionsFromControls(): SortOptions | undefined {
  const fieldStr = ($('sortField') as HTMLSelectElement)?.value || '';
  const directionStr = ($('sortDirection') as HTMLSelectElement)?.value || '';

  if (!fieldStr) return undefined;

  return {
    field: fieldStr as SortField,
    ascending: directionStr !== 'desc',
  };
}

function setFormMode(mode: 'create' | 'edit'): void {
  const cancel = $('btnCancelEdit');
  if (cancel) cancel.hidden = mode !== 'edit';
}

function resetForm(): void {
  const form = $('taskForm') as HTMLFormElement;
  form.reset();
  const idEl = $('taskId') as HTMLInputElement;
  if (idEl) idEl.value = '';
  setFormMode('create');
}

function fillFormForEdit(task: Task): void {
  const idEl = $('taskId') as HTMLInputElement;
  if (idEl) idEl.value = String(task.id);
  const titleEl = $('title') as HTMLInputElement;
  if (titleEl) titleEl.value = task.title;
  const descEl = $('description') as HTMLTextAreaElement;
  if (descEl) descEl.value = task.description || '';
  const statusEl = $('status') as HTMLSelectElement;
  if (statusEl) statusEl.value = task.status;
  const priorityEl = $('priority') as HTMLSelectElement;
  if (priorityEl) priorityEl.value = task.priority;
  const dueDateEl = $('dueDate') as HTMLInputElement;
  if (dueDateEl) dueDateEl.value = isoToDateInputValue(task.dueDate);
  const tagsEl = $('tags') as HTMLInputElement;
  if (tagsEl) tagsEl.value = (task.tags || []).join(', ');
  setFormMode('edit');
}

function getTaskInputFromForm(): any {
  const id = ($('taskId') as HTMLInputElement)?.value || '';
  const title = ($('title') as HTMLInputElement)?.value || '';
  const description = ($('description') as HTMLTextAreaElement)?.value || '';
  const status = ($('status') as HTMLSelectElement)?.value || '';
  const priority = ($('priority') as HTMLSelectElement)?.value || '';
  const dueDateInput = ($('dueDate') as HTMLInputElement)?.value || '';
  const tagsInput = ($('tags') as HTMLInputElement)?.value || '';

  const dueDateISO = taskService.parseDateInputToISO(dueDateInput);

  return {
    id: id ? String(id) : undefined,
    title,
    description,
    status,
    priority,
    dueDate: dueDateISO,
    tags: parseTagsFromInput(tagsInput),
  };
}

export {
  $,
  setMessage,
  clearMessage,
  renderTaskList,
  renderStatistics,
  renderUpcomingRecurringTasks,
  getCriteriaFromControls,
  getSortOptionsFromControls,
  resetForm,
  fillFormForEdit,
  getTaskInputFromForm,
};