import { Task } from '../models/task.js';
import { taskService } from '../services/taskService.js';
import { statisticsService } from '../services/statistics.js';
import {
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
} from './dom.js';

async function refreshList(): Promise<void> {
  clearMessage();
  const criteria = getCriteriaFromControls();
  const sortOptions = getSortOptionsFromControls();
  const tasks = await taskService.query(criteria, sortOptions);
  renderTaskList(tasks);

  // Also refresh statistics
  const stats = await statisticsService.getStatistics();
  renderStatistics(stats);

  // Also refresh upcoming recurring tasks
  const allTasks = await taskService.list(sortOptions);
  renderUpcomingRecurringTasks(allTasks);
}

function friendlyError(err: any): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.name === 'AppError' && err.message) return err.message;
  if (err.message) return err.message;
  return 'Unexpected error';
}

function bindEvents(): void {
  const form = $('taskForm') as HTMLFormElement;
  const list = $('taskList') as HTMLElement;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage();

    try {
      const input = getTaskInputFromForm();
      const isEdit = Boolean(input.id);

      if (isEdit) {
        await taskService.update(input);
        setMessage('ok', 'Task updated');
      } else {
        await taskService.create(input);
        setMessage('ok', 'Task created');
      }

      resetForm();
      await refreshList();
    } catch (err) {
      setMessage('error', friendlyError(err));
    }
  });

  ($('btnResetForm') as HTMLElement)?.addEventListener('click', () => {
    clearMessage();
    resetForm();
  });

  ($('btnCancelEdit') as HTMLElement)?.addEventListener('click', () => {
    clearMessage();
    resetForm();
  });

  list?.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement)?.closest('button[data-action]') as HTMLButtonElement;
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    const card = btn.closest('article[data-task-id]');
    if (!card) return;
    const id = card.getAttribute('data-task-id');

    try {
      clearMessage();
      if (action === 'edit') {
        const task = await taskService.getById(id!);
        if (!task) throw new taskService.AppError('Task not found', 'NOT_FOUND');
        fillFormForEdit(task);
        setMessage('ok', `Editing task: ${task.title}`);
        return;
      }

      if (action === 'delete') {
        const ok = confirm('Delete this task? This cannot be undone.');
        if (!ok) return;
        await taskService.remove(id!);
        setMessage('ok', 'Task deleted');
        await refreshList();
        return;
      }
    } catch (err) {
      setMessage('error', friendlyError(err));
    }
  });

  function onControlsChanged(): void {
    refreshList().catch((err) => {
      setMessage('error', friendlyError(err));
    });
  }

  ($('search') as HTMLInputElement)?.addEventListener('input', onControlsChanged);
  ($('filterStatus') as HTMLSelectElement)?.addEventListener('change', onControlsChanged);
  ($('filterPriority') as HTMLSelectElement)?.addEventListener('change', onControlsChanged);
  ($('filterTag') as HTMLInputElement)?.addEventListener('input', onControlsChanged);
  ($('filterDueBefore') as HTMLInputElement)?.addEventListener('change', onControlsChanged);
  ($('sortField') as HTMLSelectElement)?.addEventListener('change', onControlsChanged);
  ($('sortDirection') as HTMLSelectElement)?.addEventListener('change', onControlsChanged);

  // Handle recurrence type change to show/hide interval
  ($('recurrence') as HTMLSelectElement)?.addEventListener('change', (e) => {
    const recurrenceEl = e.target as HTMLSelectElement;
    const intervalDiv = $('recurrenceIntervalDiv');
    if (intervalDiv) {
      intervalDiv.hidden = recurrenceEl.value !== 'custom';
    }
  });

  ($('btnClearFilters') as HTMLElement)?.addEventListener('click', () => {
    const searchEl = $('search') as HTMLInputElement;
    if (searchEl) searchEl.value = '';
    const statusEl = $('filterStatus') as HTMLSelectElement;
    if (statusEl) statusEl.value = '';
    const priorityEl = $('filterPriority') as HTMLSelectElement;
    if (priorityEl) priorityEl.value = '';
    const tagEl = $('filterTag') as HTMLInputElement;
    if (tagEl) tagEl.value = '';
    const dueBeforeEl = $('filterDueBefore') as HTMLInputElement;
    if (dueBeforeEl) dueBeforeEl.value = '';
    const sortFieldEl = $('sortField') as HTMLSelectElement;
    if (sortFieldEl) sortFieldEl.value = 'dueDate';
    const sortDirectionEl = $('sortDirection') as HTMLSelectElement;
    if (sortDirectionEl) sortDirectionEl.value = 'asc';
    onControlsChanged();
  });
}

export async function initUI(): Promise<void> {
  // Set default due date to today
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const dueDateEl = $('dueDate') as HTMLInputElement;
  if (dueDateEl) dueDateEl.value = `${y}-${m}-${d}`;

  bindEvents();
  await refreshList();
}