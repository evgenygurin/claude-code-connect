/**
 * TypeScript types for Codegen integration
 *
 * These types define the interface between Boss Agent and Codegen agents.
 */

/**
 * Task type classification
 */
export enum TaskType {
  BUG_FIX = 'bug_fix',
  FEATURE = 'feature_implementation',
  REFACTOR = 'refactoring',
  TEST = 'testing',
  DOCS = 'documentation',
  CI_FIX = 'ci_fix',
  SENTRY_ERROR = 'sentry_error',
  CODE_REVIEW = 'code_review',
  OPTIMIZATION = 'optimization',
}

/**
 * Task complexity assessment
 */
export enum Complexity {
  SIMPLE = 'simple',
  MEDIUM = 'medium',
  COMPLEX = 'complex',
}

/**
 * Task priority level
 */
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Codegen task status
 */
export enum CodegenTaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Codegen agent configuration
 */
export interface CodegenConfig {
  apiToken: string;
  orgId: string;
  baseUrl?: string;
}

/**
 * Options for running a Codegen task
 */
export interface CodegenRunOptions {
  branch?: string;
  labels?: string[];
  autoMerge?: boolean;
  priority?: Priority;
  timeout?: number;
  createPR?: boolean;
  assignReviewers?: boolean;
  reviewers?: string[];
}

/**
 * Codegen task definition
 */
export interface CodegenTask {
  id: string;
  prompt: string;
  status: CodegenTaskStatus;
  type?: TaskType;
  options?: CodegenRunOptions;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  result?: CodegenTaskResult;
}

/**
 * Result from a completed Codegen task
 */
export interface CodegenTaskResult {
  success: boolean;
  prUrl?: string;
  prNumber?: number;
  branchName?: string;
  filesChanged?: string[];
  linesChanged?: number;
  testsAdded?: number;
  commits?: string[];
  duration: number;
  cost?: number;
  summary?: string;
  error?: string;
}

/**
 * Codegen webhook event types
 */
export enum CodegenWebhookEventType {
  TASK_STARTED = 'task.started',
  TASK_PROGRESS = 'task.progress',
  TASK_COMPLETED = 'task.completed',
  TASK_FAILED = 'task.failed',
}

/**
 * Codegen webhook event payload
 */
export interface CodegenWebhookEvent {
  type: CodegenWebhookEventType;
  taskId: string;
  status: CodegenTaskStatus;
  timestamp: Date;
  data?: {
    progress?: number;
    phase?: string;
    message?: string;
    result?: CodegenTaskResult;
    error?: string;
  };
}

/**
 * Codegen API response wrapper
 */
export interface CodegenApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Codegen metrics
 */
export interface CodegenMetrics {
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  averageDuration: number;
  totalCost: number;
  costPerTask: number;
  successRate: number;
}

/**
 * Codegen task query parameters
 */
export interface CodegenTaskQuery {
  status?: CodegenTaskStatus;
  type?: TaskType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}
