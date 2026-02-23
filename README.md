# Task Manager - TypeScript Migration

A fully-typed Task Manager application migrated from JavaScript to TypeScript with enhanced features including recurring tasks, task dependencies, statistics, and improved search/sort capabilities.

## Features

### Core Features (from original)
- ✅ Create, Read, Update, Delete (CRUD) tasks
- ✅ Filter by status, priority, and tags
- ✅ Search in title and description (case-insensitive)
- ✅ LocalStorage persistence
- ✅ Input validation with error messages

### New TypeScript Features
- ✅ **Strict TypeScript** - Full type safety with strict mode enabled
- ✅ **Recurring Tasks** - Tasks can repeat daily, weekly, monthly, or custom intervals
- ✅ **Task Dependencies** - Tasks can depend on other tasks; completion blocked until dependencies are done
- ✅ **Statistics Dashboard** - View task counts by status/priority, completion rate, overdue count
- ✅ **Enhanced Sorting** - Sort by due date, priority, status, or title
- ✅ **Generic Utilities** - Reusable typed functions for filtering, sorting, and merging

## Type Definitions

### Task Entity
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;        // 'todo' | 'in-progress' | 'done'
  priority: Priority;    // 'low' | 'medium' | 'high'
  dueDate: string;       // ISO 8601
  tags: readonly string[];
  recurrence?: Recurrence;
  dependencies: TaskDependencies;
  createdAt: string;
  updatedAt: string;
}
```

### Recurrence Types
```typescript
// Standard recurrence
type StandardRecurrence = {
  frequency: 'daily' | 'weekly' | 'monthly';
  endDate?: string;
};

// Custom recurrence
type CustomRecurrence = {
  frequency: 'custom';
  daysInterval: number;
  endDate?: string;
};

type Recurrence = StandardRecurrence | CustomRecurrence;
```

## Usage Examples

### Creating a Task with Recurrence
```typescript
const task = await taskService.create({
  title: "Weekly team meeting",
  description: "Review project progress",
  status: "todo",
  priority: "medium",
  dueDate: "2026-02-24T00:00:00.000Z",
  tags: ["work", "meeting"],
  recurrence: {
    frequency: "weekly",
    endDate: "2026-12-31T00:00:00.000Z" // Optional end date
  }
});
```

### Creating a Task with Dependencies
```typescript
// First, create the dependency task
const prerequisite = await taskService.create({
  title: "Research phase",
  status: "todo",
  priority: "high",
  dueDate: "2026-02-20T00:00:00.000Z"
});

// Then create dependent task
const dependent = await taskService.create({
  title: "Development phase",
  status: "todo",
  priority: "high",
  dueDate: "2026-02-25T00:00:00.000Z",
  dependencies: [prerequisite.id] // Blocked until prerequisite is done
});

// Attempting to mark dependent as done will fail:
await taskService.update({ id: dependent.id, status: "done" });
// throws: "Cannot complete task: dependencies not satisfied"
```

### Querying with Filters and Sorting
```typescript
// Get high-priority tasks sorted by due date
const tasks = await taskService.query(
  { priority: "high" },
  { field: "dueDate", direction: "asc" }
);
```

### Getting Statistics
```typescript
const stats = await taskService.getStatistics();
console.log(stats);
// {
//   total: 10,
//   byStatus: { todo: 3, 'in-progress': 2, done: 5 },
//   byPriority: { low: 2, medium: 5, high: 3 },
//   overdue: 1,
//   completionRate: 50,
//   completedCount: 5,
//   pendingCount: 3,
//   inProgressCount: 2
// }
```

### Getting Upcoming Recurring Tasks
```typescript
const recurring = await taskService.getUpcomingRecurring(5);
console.log(recurring);
// [
//   { task: {...}, nextOccurrence: "...", daysUntilNext: 2 },
//   ...
// ]
```

## Project Structure

```
├── ts/
│   ├── types.ts         # Type definitions & interfaces
│   ├── utilities.ts     # Generic utility functions
│   ├── storage.ts       # Storage layer with error handling
│   ├── taskService.ts   # Business logic & CRUD
│   ├── ui.ts            # UI rendering & events
│   └── main.ts         # Application entry point
├── index.html           # Main HTML with form inputs
├── style.css            # Styling (including new features)
└── tsconfig.json       # TypeScript configuration
```

## Building the Project

Since this uses ES modules, you'll need a bundler or a development server:

### Using Vite (recommended)
```bash
npm create vite@latest . -- --template vanilla-ts
npm install
npm run dev
```

### Using esbuild
```bash
npm install esbuild
npx esbuild ts/main.ts --bundle --outfile=dist/main.js --format=esm
```

### Using TypeScript Compiler
```bash
# Compile but doesn't bundle (won't work in browser directly)
npx tsc --project tsconfig.json
```

## Generic Utility Functions

The `utilities.ts` provides these reusable typed functions:

- `filter<T>(items, predicate)` - Filter array by predicate
- `sort<T>(items, comparator)` - Sort with custom comparator
- `merge<T>(target, source)` - Deep merge objects
- `search<T>(items, query, fields)` - Case-insensitive search
- `groupBy<T>(items, keySelector)` - Group by key
- `unique<T>(items, keySelector)` - Deduplicate by key
- `paginate<T>(items, page, pageSize)` - Pagination
- `sortTasks(tasks, config)` - Task-specific sorting
- `isTaskOverdue(task)` - Check if task is overdue

## Error Handling

All storage operations are wrapped in try-catch with typed `AppError`:

```typescript
try {
  await taskService.update({ id: "123", status: "done" });
} catch (error) {
  if (error instanceof AppError) {
    console.log(error.code);    // ErrorCode
    console.log(error.message); // User-friendly message
    console.log(error.details); // Original error
  }
}
```

## Browser Support

- Chrome/Edge 89+ (ES Modules)
- Firefox 89+
- Safari 15+

## License

MIT
