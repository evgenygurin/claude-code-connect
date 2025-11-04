/**
 * Boss Agent types for delegation and orchestration
 */

import type { Issue, Comment } from "@linear/sdk";
import type {
  ClaudeSession,
  ClaudeExecutionResult,
  IntegrationConfig,
} from "../core/types.js";

/**
 * Agent types for specialized tasks
 */
export const AgentTypeValues = {
  /** Boss agent that coordinates and delegates */
  BOSS: "boss",
  /** Backend development agent */
  BACKEND: "backend",
  /** Frontend development agent */
  FRONTEND: "frontend",
  /** Testing and QA agent */
  TEST: "test",
  /** Security analysis agent */
  SECURITY: "security",
  /** Code review agent */
  REVIEW: "review",
  /** Documentation agent */
  DOCS: "docs",
  /** DevOps and infrastructure agent */
  DEVOPS: "devops",
  /** Database agent */
  DATABASE: "database",
  /** Generic worker agent */
  WORKER: "worker",
} as const;

export type AgentType = (typeof AgentTypeValues)[keyof typeof AgentTypeValues];

/**
 * Agent capability for task matching
 */
export interface AgentCapability {
  /** Agent type */
  type: AgentType;
  /** Keywords that trigger this agent */
  keywords: string[];
  /** File patterns this agent handles (glob patterns) */
  filePatterns?: string[];
  /** Technologies this agent specializes in */
  technologies?: string[];
  /** Task complexity level (1-10) */
  maxComplexity: number;
  /** Description of agent capabilities */
  description: string;
}

/**
 * Delegated task for sub-agents
 */
export interface DelegatedTask {
  /** Unique task ID */
  id: string;
  /** Parent task ID (if subtask) */
  parentTaskId?: string;
  /** Task title/summary */
  title: string;
  /** Detailed task description */
  description: string;
  /** Agent type assigned to this task */
  agentType: AgentType;
  /** Task priority (1-10) */
  priority: number;
  /** Task status */
  status: TaskStatus;
  /** Files to work on */
  files?: string[];
  /** Dependencies (other task IDs) */
  dependencies?: string[];
  /** Created timestamp */
  createdAt: Date;
  /** Started timestamp */
  startedAt?: Date;
  /** Completed timestamp */
  completedAt?: Date;
  /** Task result */
  result?: TaskResult;
  /** Associated Linear issue (if any) */
  linearIssueId?: string;
}

/**
 * Task status
 */
export const TaskStatusValues = {
  /** Task created, waiting to start */
  PENDING: "pending",
  /** Task is being executed */
  RUNNING: "running",
  /** Task completed successfully */
  COMPLETED: "completed",
  /** Task failed */
  FAILED: "failed",
  /** Task cancelled */
  CANCELLED: "cancelled",
  /** Task blocked by dependencies */
  BLOCKED: "blocked",
} as const;

export type TaskStatus =
  (typeof TaskStatusValues)[keyof typeof TaskStatusValues];

/**
 * Task execution result
 */
export interface TaskResult {
  /** Success flag */
  success: boolean;
  /** Output/summary */
  output?: string;
  /** Error message */
  error?: string;
  /** Files modified */
  filesModified?: string[];
  /** Execution duration (ms) */
  duration: number;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Boss agent analysis result
 */
export interface BossAnalysis {
  /** Original issue */
  issue: Issue;
  /** Complexity score (1-10) */
  complexity: number;
  /** Estimated tasks count */
  estimatedTasks: number;
  /** Recommended agent types */
  recommendedAgents: AgentType[];
  /** Breakdown of tasks */
  taskBreakdown: TaskBreakdown[];
  /** Analysis timestamp */
  analyzedAt: Date;
  /** Analysis confidence (0-1) */
  confidence: number;
}

/**
 * Task breakdown from analysis
 */
export interface TaskBreakdown {
  /** Task title */
  title: string;
  /** Task description */
  description: string;
  /** Recommended agent type */
  agentType: AgentType;
  /** Priority (1-10) */
  priority: number;
  /** Estimated complexity (1-10) */
  complexity: number;
  /** Files to work on */
  files?: string[];
  /** Dependencies */
  dependencies?: string[];
}

/**
 * Orchestration context
 */
export interface OrchestrationContext {
  /** Boss session */
  bossSession: ClaudeSession;
  /** Original issue */
  issue: Issue;
  /** Trigger comment */
  triggerComment?: Comment;
  /** Analysis result */
  analysis: BossAnalysis;
  /** Configuration */
  config: IntegrationConfig;
  /** All delegated tasks */
  tasks: DelegatedTask[];
  /** Active sub-agents */
  activeAgents: Map<string, AgentInstance>;
}

/**
 * Agent instance information
 */
export interface AgentInstance {
  /** Instance ID */
  id: string;
  /** Agent type */
  type: AgentType;
  /** Session ID */
  sessionId: string;
  /** Assigned task ID */
  taskId: string;
  /** Status */
  status: "starting" | "running" | "completed" | "failed";
  /** Process ID */
  processId?: number;
  /** Started at */
  startedAt: Date;
  /** Completed at */
  completedAt?: Date;
}

/**
 * Boss agent configuration
 */
export interface BossAgentConfig {
  /** Enable boss agent mode */
  enabled: boolean;
  /** Maximum concurrent sub-agents */
  maxConcurrentAgents: number;
  /** Maximum task depth (nested delegation) */
  maxDelegationDepth: number;
  /** Complexity threshold for delegation (1-10) */
  delegationThreshold: number;
  /** Available agent capabilities */
  agentCapabilities: AgentCapability[];
  /** Enable auto-delegation */
  autoDelegation: boolean;
}

/**
 * Boss agent interface
 */
export interface BossAgent {
  /**
   * Analyze issue and determine delegation strategy
   */
  analyzeIssue(issue: Issue, comment?: Comment): Promise<BossAnalysis>;

  /**
   * Create delegation plan
   */
  createDelegationPlan(analysis: BossAnalysis): Promise<DelegatedTask[]>;

  /**
   * Delegate task to appropriate agent
   */
  delegateTask(task: DelegatedTask): Promise<AgentInstance>;

  /**
   * Monitor task progress
   */
  monitorProgress(context: OrchestrationContext): Promise<void>;

  /**
   * Aggregate results from sub-agents
   */
  aggregateResults(tasks: DelegatedTask[]): Promise<ClaudeExecutionResult>;
}

/**
 * Agent orchestrator interface
 */
export interface AgentOrchestrator {
  /**
   * Start orchestration
   */
  start(context: OrchestrationContext): Promise<void>;

  /**
   * Stop orchestration
   */
  stop(): Promise<void>;

  /**
   * Get orchestration status
   */
  getStatus(): OrchestrationStatus;

  /**
   * Get active agents
   */
  getActiveAgents(): AgentInstance[];
}

/**
 * Orchestration status
 */
export interface OrchestrationStatus {
  /** Is orchestration active */
  active: boolean;
  /** Total tasks */
  totalTasks: number;
  /** Completed tasks */
  completedTasks: number;
  /** Failed tasks */
  failedTasks: number;
  /** Active agents count */
  activeAgents: number;
  /** Start time */
  startedAt?: Date;
  /** Overall progress (0-1) */
  progress: number;
}
