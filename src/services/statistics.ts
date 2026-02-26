import { Task } from '../models/task.js';
import { Status, Priority, Statistics } from '../models/types.js';
import { storage } from './storage.js';

export class StatisticsService {
  async getStatistics(): Promise<Statistics> {
    const tasks = await storage.getAllTasks();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const totalTasks = tasks.length;

    const tasksByStatus: Record<Status, number> = {
      todo: 0,
      'in-progress': 0,
      done: 0,
    };

    const tasksByPriority: Record<Priority, number> = {
      low: 0,
      medium: 0,
      high: 0,
    };

    let overdueTasks = 0;
    let completedTasks = 0;
    let upcomingRecurringTasks = 0;

    for (const task of tasks) {
      tasksByStatus[task.status]++;
      tasksByPriority[task.priority]++;

      if (task.status === 'done') {
        completedTasks++;
      } else {
        const dueDate = new Date(task.dueDate);
        if (dueDate < today) {
          overdueTasks++;
        }
      }

      if (task.recurrence && task.status !== 'done') {
        // Count as upcoming if due soon (within 7 days)
        const dueDate = new Date(task.dueDate);
        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7 && diffDays >= 0) {
          upcomingRecurringTasks++;
        }
      }
    }

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      overdueTasks,
      completionRate,
      upcomingRecurringTasks,
    };
  }
}

export const statisticsService = new StatisticsService();