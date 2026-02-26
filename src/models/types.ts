export type Status = 'todo' | 'in-progress' | 'done';

export type Priority = 'low' | 'medium' | 'high';

export type Tag = string;

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface Recurrence {
  type: RecurrenceType;
  interval?: number; // For custom, e.g., every N days
}

export interface TaskInput {
  title: string;
  description?: string;
  status?: Status;
  priority?: Priority;
  dueDate: string; // ISO string
  tags?: Tag[];
  dependencies?: string[]; // Task IDs
  recurrence?: Recurrence;
}

export interface TaskUpdateInput extends TaskInput {
  id: string;
}

export interface QueryCriteria {
  search?: string;
  status?: Status;
  priority?: Priority;
  tag?: string;
  dueBeforeISO?: string;
}

export type SortField = 'dueDate' | 'priority' | 'status' | 'title' | 'createdAt';

export interface SortOptions {
  field: SortField;
  ascending?: boolean;
}

export interface Statistics {
  totalTasks: number;
  tasksByStatus: Record<Status, number>;
  tasksByPriority: Record<Priority, number>;
  overdueTasks: number;
  completionRate: number;
  upcomingRecurringTasks: number;
}