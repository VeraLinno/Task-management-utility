/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  genericFilter,
  genericSort,
  genericMerge,
  genericGroupBy,
  getNextRecurringDate,
} from '../src/utils/genericUtils.ts';
import type { Task } from '../src/models/task.ts';

function baseTask(overrides: Partial<Task> = {}): Task {
  const now = new Date('2026-04-08T10:00:00.000Z');
  return {
    id: 'task-1',
    title: 'Task',
    description: 'desc',
    status: 'todo',
    priority: 'medium',
    dueDate: now.toISOString(),
    tags: [],
    dependencies: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides,
  };
}

describe('generic utilities', () => {
  it('filters values with genericFilter', () => {
    const values = [1, 2, 3, 4, 5];
    assert.deepEqual(genericFilter(values, n => n % 2 === 0), [2, 4]);
  });

  it('sorts values ascending and descending with genericSort', () => {
    const values = [{ n: 4 }, { n: 1 }, { n: 3 }];
    assert.deepEqual(genericSort(values, item => item.n, true), [{ n: 1 }, { n: 3 }, { n: 4 }]);
    assert.deepEqual(genericSort(values, item => item.n, false), [{ n: 4 }, { n: 3 }, { n: 1 }]);
  });

  it('merges objects with genericMerge', () => {
    const merged = genericMerge({ a: 1, b: 2 }, { c: 3 });
    assert.deepEqual(merged, { a: 1, b: 2, c: 3 });
  });

  it('groups values with genericGroupBy', () => {
    const tasks = [
      { id: '1', status: 'todo' },
      { id: '2', status: 'done' },
      { id: '3', status: 'todo' },
    ];

    const grouped = genericGroupBy(tasks, t => t.status);

    assert.equal(grouped.todo.length, 2);
    assert.equal(grouped.done.length, 1);
  });
});

describe('getNextRecurringDate', () => {
  it('returns null when task has no recurrence', () => {
    const task = baseTask({ recurrence: undefined });
    assert.equal(getNextRecurringDate(task, new Date('2026-04-08T00:00:00.000Z')), null);
  });

  it('returns next daily date after base date', () => {
    const task = baseTask({
      dueDate: '2026-04-01T00:00:00.000Z',
      recurrence: { type: 'daily' },
    });

    const next = getNextRecurringDate(task, new Date('2026-04-08T00:00:00.000Z'));
    assert.ok(next);
    if (!next) throw new Error('Expected next recurring date to exist');
    assert.equal(next.toISOString(), '2026-04-09T00:00:00.000Z');
  });

  it('returns next custom interval date after base date', () => {
    const task = baseTask({
      dueDate: '2026-04-01T00:00:00.000Z',
      recurrence: { type: 'custom', interval: 3 },
    });

    const next = getNextRecurringDate(task, new Date('2026-04-08T00:00:00.000Z'));
    assert.ok(next);
    if (!next) throw new Error('Expected next recurring date to exist');
    assert.equal(next.toISOString(), '2026-04-10T00:00:00.000Z');
  });
});
