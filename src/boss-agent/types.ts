/**
 * TypeScript types for Boss Agent
 *
 * Boss Agent is a coordinator that analyzes tasks, makes decisions,
 * and delegates work to Codegen agents.
 */

import type { Issue, Comment } from '@linear/sdk';
import type {
  TaskType,
  Complexity,
  Priority,
  CodegenTask,
  CodegenTaskResult,
} from '../codegen/types.js';

/**
 * Task analysis result from Boss Agent
 */
export interface TaskAnalysis {
  taskType: TaskType;
  complexity: Complexity;
  priority: Priority;
  estimatedTime: string;
  keywords: string[];
  scope: {
    filesAffected?: number;
    linesOfCode?: number;
    dependencies?: string[];
  };
  context: TaskContext;
  metadata: Record<string, unknown>;
}

/**
 * Task context gathered by Boss Agent
 */
export interface TaskContext {
  issue?: Issue;
  comment?: Comment;
  repository?: string;
  branch?: string;
  files?: string[];
  relatedIssues?: string[];
  stack?: string;
  architecture?: string;
  [key: string]: unknown;
}

/**
 * Decision made by Boss Agent
 */
export interface BossAgentDecision {
  shouldDelegate: boolean;
  delegateTo: 'codegen' | 'claude' | 'manual';
  taskType: TaskType;
  complexity: Complexity;
  priority: Priority;
  strategy: DelegationStrategy;
  estimatedTime: string;
  estimatedCost?: number;
  reason?: string;
  options?: DelegationOptions;
}

/**
 * Delegation strategy options
 */
export enum DelegationStrategy {
  DIRECT = 'direct',
  SPLIT = 'split',
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  REVIEW_FIRST = 'review_first',
}

/**
 * Options for task delegation
 */
export interface DelegationOptions {
  createBranch?: boolean;
  branchName?: string;
  createPR?: boolean;
  autoMerge?: boolean;
  requireReview?: boolean;
  reviewers?: string[];
  labels?: string[];
  assignees?: string[];
  linkedIssues?: string[];
  timeout?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

/**
 * Delegation result from Boss Agent
 */
export interface DelegationResult {
  taskId: string;
  delegatedTo: 'codegen' | 'claude';
  codegenTask?: CodegenTask;
  status: 'delegated' | 'failed';
  timestamp: Date;
  error?: string;
}

/**
 * Execution result tracked by Boss Agent
 */
export interface ExecutionResult {
  taskId: string;
  issueId: string;
  issueIdentifier: string;
  issueTitle: string;
  status: 'success' | 'failed' | 'cancelled';
  delegatedTo: 'codegen' | 'claude';
  codegenTaskId?: string;
  result?: CodegenTaskResult;
  duration: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  originalIssue?: Issue;
  originalComment?: Comment;
}

/**
 * Boss Agent session
 */
export interface BossAgentSession {
  id: string;
  issueId: string;
  issueIdentifier: string;
  issueTitle: string;
  status: 'analyzing' | 'delegated' | 'monitoring' | 'completed' | 'failed';
  analysis?: TaskAnalysis;
  decision?: BossAgentDecision;
  delegation?: DelegationResult;
  result?: ExecutionResult;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/**
 * Boss Agent metrics
 */
export interface BossAgentMetrics {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  failedSessions: number;

  // Delegation metrics
  totalDelegations: number;
  successfulDelegations: number;
  failedDelegations: number;
  averageDelegationTime: number;

  // Task type breakdown
  tasksByType: Record<TaskType, number>;
  tasksByComplexity: Record<Complexity, number>;
  tasksByPriority: Record<Priority, number>;

  // Quality metrics
  averageCompletionTime: number;
  successRate: number;

  // Cost metrics
  totalCost: number;
  costPerTask: number;
  costByTaskType: Record<TaskType, number>;
}

/**
 * Trigger event that starts Boss Agent workflow
 */
export interface BossAgentTrigger {
  source: 'linear' | 'github' | 'sentry' | 'circleci' | 'manual';
  type: 'issue' | 'comment' | 'pr' | 'error' | 'build_failure';
  event: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Workflow result from Boss Agent orchestrator
 */
export interface WorkflowResult {
  workflowId: string;
  status: 'completed' | 'failed' | 'skipped';
  result?: ExecutionResult;
  reason?: string;
  error?: string;
  duration?: number;
}
