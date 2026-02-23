/**
 * Type definitions for the Task Management Application
 * 
 * This file contains all domain types used throughout the application.
 * Strong typing ensures runtime safety and IDE support.
 */

// ============================================
// ENUM TYPES
// ============================================

/**
 * Task status enumeration
 * Represents the possible states of a task
 */
export enum Status {
  TODO = "todo",
  IN_PROGRESS = "in-progress",
  DONE = "done"
}

/**
 * Task priority enumeration
 * Represents the urgency levels for tasks
 */
export enum Priority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high"
}

/**
 * Recurrence frequency enumeration
 * Defines how often a recurring task repeats
 */
export enum RecurrenceFrequency {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  CUSTOM = "custom"
}

// ============================================
// RECURRENCE TYPES
// ============================================

/**
 * Custom recurrence configuration
 * Used when frequency is set to "custom"
 */
export interface CustomRecurrence {
  frequency: RecurrenceFrequency.CUSTOM;
  /** Number of days between repetitions */
  daysInterval: number;
  /** Optional end date for recurrence */
  endDate?: string;
}

/**
 * Standard recurrence configuration
 * Used for daily, weekly, or monthly recurrence
 */
export interface StandardRecurrence {
  frequency: Exclude<RecurrenceFrequency, RecurrenceFrequency.CUSTOM>;
  /** Optional end date for recurrence */
  endDate?: string;
}

/**
 * Union type for all recurrence configurations
 */
export type Recurrence = StandardRecurrence | CustomRecurrence;

/**
 * Type guard to check if recurrence is custom
 */
export function isCustomRecurrence(recurrence: Recurrence): recurrence is CustomRecurrence {
  return recurrence.frequency === RecurrenceFrequency.CUSTOM;
}

// ============================================
// DEPENDENCY TYPES
// ============================================

/**
 * Task dependency representation
 * Can be a simple task ID or a tagged union with status requirement
 */
export type TaskDependency = string;

/**
 * Extended dependency with required completion status
 */
export interface TaggedDependency {
  taskId: string;
  requiredStatus: Status.DONE;
}

/**
 * Collection of task dependencies
 */
export type TaskDependencies = readonly TaskDependency[];

// ============================================
// TASK TYPES
// ============================================

/**
 * Core Task entity
 * Represents a single task in the system
 */
export interface Task {
  /** Unique identifier for the task */
  id: string;
  /** Task title (required) */
  title: string;
  /** Detailed task description (optional) */
  description: string;
  /** Current status of the task */
  status: Status;
  /** Priority level of the task */
  priority: Priority;
  /** ISO 8601 date string for due date */
  dueDate: string;
  /** Array of tags associated with the task */
  tags: readonly string[];
  /** Optional recurrence configuration */
  recurrence?: Recurrence;
  /** Array of task IDs this task depends on */
  dependencies: TaskDependencies;
  /** ISO 8601 timestamp when task was created */
  createdAt: string;
  /** ISO 8601 timestamp when task was last updated */
  updatedAt: string;
}

// ============================================
// INPUT/DTO TYPES
// ============================================

/**
 * Input type for creating a new task
 * Omits auto-generated fields like id, createdAt, updatedAt
 */
export type CreateTaskInput = Omit<Task, "id" | "createdAt" | "updatedAt">;

/**
 * Input type for updating an existing task
 * Requires id and allows partial updates
 */
export type UpdateTaskInput = Partial<CreateTaskInput> & Pick<Task, "id">;

/**
 * Raw input from form before validation
 */
export interface RawTaskInput {
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  tags?: string;
  recurrence?: Recurrence | null;
  dependencies?: TaskDependencies;
}

// ============================================
// QUERY/FILTER TYPES
// ============================================

/**
 * Query criteria for filtering tasks
 */
export interface TaskQuery {
  /** Search term (case-insensitive, searches title and description) */
  search?: string;
  /** Filter by status */
  status?: Status | "";
  /** Filter by priority */
  priority?: Priority | "";
  /** Filter by tag (case-insensitive) */
  tag?: string;
  /** Filter tasks due before this date */
  dueBeforeISO?: string;
  /** Filter tasks due after this date */
  dueAfterISO?: string;
}

/**
 * Sort field enumeration for tasks
 */
export enum SortField {
  DUE_DATE = "dueDate",
  PRIORITY = "priority",
  STATUS = "status",
  TITLE = "title",
  CREATED_AT = "createdAt"
}

/**
 * Sort direction enumeration
 */
export enum SortDirection {
  ASC = "asc",
  DESC = "desc"
}

/**
 * Sort configuration for tasks
 */
export interface TaskSortConfig {
  field: SortField;
  direction: SortDirection;
}

// ============================================
// STATISTICS TYPES
// ============================================

/**
 * Statistics breakdown by status
 */
export interface StatusStatistics {
  [Status.TODO]: number;
  [Status.IN_PROGRESS]: number;
  [Status.DONE]: number;
}

/**
 * Statistics breakdown by priority
 */
export interface PriorityStatistics {
  [Priority.LOW]: number;
  [Priority.MEDIUM]: number;
  [Priority.HIGH]: number;
}

/**
 * Overall task statistics
 */
export interface TaskStatistics {
  /** Total number of tasks */
  total: number;
  /** Breakdown by status */
  byStatus: StatusStatistics;
  /** Breakdown by priority */
  byPriority: PriorityStatistics;
  /** Number of overdue tasks */
  overdue: number;
  /** Completion rate as percentage (0-100) */
  completionRate: number;
  /** Number of completed tasks */
  completedCount: number;
  /** Number of pending tasks */
  pendingCount: number;
  /** Number of in-progress tasks */
  inProgressCount: number;
}

/**
 * Recurring task information
 */
export interface RecurringTaskInfo {
  task: Task;
  nextOccurrence: string;
  daysUntilNext: number;
}

// ============================================
// ERROR TYPES
// ============================================

/**
 * Application error codes
 */
export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  STORAGE_ERROR = "STORAGE_ERROR",
  DEPENDENCY_ERROR = "DEPENDENCY_ERROR",
  APP_ERROR = "APP_ERROR"
}

/**
 * Custom application error
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(message: string, code: ErrorCode = ErrorCode.APP_ERROR, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// ============================================
// VALIDATION RESULT TYPES
// ============================================

/**
 * Validation result wrapper - discriminated union for type-safe validation
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: AppError };

/**
 * Type guard for successful validation
 */
export function isValidationSuccess<T>(result: ValidationResult<T>): result is ValidationResult<T> & { success: true } {
  return result.success === true;
}

// ============================================
// STORAGE TYPES
// ============================================

/**
 * Storage data structure
 */
export interface StorageData {
  tasks: Task[];
}

/**
 * Storage operations interface
 */
export interface IStorage {
  /** Storage key identifier */
  key: string;
  getAllTasks(): Promise<Task[]>;
  setAllTasks(tasks: Task[]): Promise<boolean>;
  clear(): Promise<boolean>;
}

// ============================================
// UI EVENT TYPES
// ============================================

/**
 * Task action types
 */
export enum TaskAction {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  EDIT = "edit"
}

/**
 * Form mode for task editing
 */
export enum FormMode {
  CREATE = "create",
  EDIT = "edit"
}

// ============================================
// EXPORT TYPE UTILITIES
// ============================================

/**
 * Allowed status values as union type
 */
export type AllowedStatus = Status.TODO | Status.IN_PROGRESS | Status.DONE;

/**
 * Allowed priority values as union type
 */
export type AllowedPriority = Priority.LOW | Priority.MEDIUM | Priority.HIGH;

/**
 * Allowed recurrence frequency values
 */
export type AllowedRecurrenceFrequency = RecurrenceFrequency.DAILY | RecurrenceFrequency.WEEKLY | RecurrenceFrequency.MONTHLY | RecurrenceFrequency.CUSTOM;
