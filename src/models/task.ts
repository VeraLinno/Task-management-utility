import { Status, Priority, Tag, Recurrence } from './types.js';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  dueDate: string; // ISO string
  tags: Tag[];
  dependencies?: string[]; // Task IDs that this task depends on
  recurrence?: Recurrence;
  createdAt?: string; // ISO string
  updatedAt?: string; // ISO string
}