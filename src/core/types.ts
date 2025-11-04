/**
 * Core types for Claude Code + Linear native integration
 */

import type { Issue, Comment, User } from "@linear/sdk";

/**
 * Integration configuration
 */
export interface IntegrationConfig {
  /** Linear API token */
  linearApiToken: string;
  /** Linear workspace/organization ID */
  linearOrganizationId: string;
  /** Linear client ID for OAuth */
  linearClientId?: string;
  /** Linear client secret for OAuth */
  linearClientSecret?: string;
  /** OAuth redirect URI */
  oauthRedirectUri?: string;
  /** GitHub personal access token */
  githubToken?: string;
  /** GitHub webhook secret for signature validation */
  githubWebhookSecret?: string;
  /** GitHub repository owner/org */
  githubOwner?: string;
  /** GitHub repository name */
  githubRepo?: string;
  /** Claude Code CLI path (optional, defaults to 'claude-code') */
  claudeCodePath?: string;
  /** Claude executable path (optional, defaults to 'claude') */
  claudeExecutablePath: string;
  /** Port for webhook server */
  webhookPort: number;
  /** Host for webhook server (defaults to 0.0.0.0) */
  webhookHost?: string;
  /** Webhook secret for validation */
  webhookSecret?: string;
  /** Skip Linear API connection test on startup (for development/testing) */
  skipLinearCheck?: boolean;
  /** Project root directory for code operations */
  projectRootDir: string;
  /** Default branch for git operations */
  defaultBranch: string;
  /** Auto-create branches for issues */
  createBranches: boolean;
  /** Session timeout in minutes */
  timeoutMinutes: number;
  /** Agent username/ID that triggers the integration */
  agentUserId?: string;
  /** Debug mode */
  debug?: boolean;
  /** Enable OAuth flow */
  enableOAuth?: boolean;
  /** Enable Boss Agent mode for delegation */
  enableBossAgent?: boolean;
  /** Boss Agent complexity threshold for delegation (1-10) */
  bossAgentThreshold?: number;
  /** Maximum concurrent sub-agents */
  maxConcurrentAgents?: number;
  /** Mem0 API key for persistent memory */
  mem0ApiKey?: string;
  /** Enable Mem0 integration */
  mem0Enabled?: boolean;
  /** Enable verbose Mem0 logging */
  mem0VerboseLogging?: boolean;
}

/**
 * Session permissions for security control
 */
export interface SessionPermissions {
  /** Can read files */
  canRead: boolean;
  /** Can write files */
  canWrite: boolean;
  /** Can execute commands */
  canExecute: boolean;
  /** Can access network */
  canNetwork: boolean;
  /** Can create/delete files */
  canModifyFileSystem: boolean;
}

/**
 * Validated session metadata
 */
export interface SessionMetadata {
  /** User/actor who created the session */
  createdBy: string;
  /** Organization ID */
  organizationId: string;
  /** Project scope restrictions */
  projectScope: string[];
  /** Session permissions */
  permissions: SessionPermissions;
  /** Trigger comment ID (if applicable) */
  triggerCommentId?: string;
  /** Issue title for reference */
  issueTitle?: string;
  /** Original event type that triggered session */
  triggerEventType?: string;
}

/**
 * Security context for session isolation
 */
export interface SessionSecurityContext {
  /** Allowed file paths for operations */
  allowedPaths: string[];
  /** Maximum memory usage in MB */
  maxMemoryMB: number;
  /** Maximum execution time in milliseconds */
  maxExecutionTimeMs: number;
  /** Enable isolated environment */
  isolatedEnvironment: boolean;
  /** Allowed network endpoints (if any) */
  allowedEndpoints?: string[];
  /** Environment variables allowlist */
  allowedEnvVars?: string[];
}

/**
 * Claude session information with enhanced security
 */
export interface ClaudeSession {
  /** Unique session ID */
  id: string;
  /** Associated Linear issue ID */
  issueId: string;
  /** Issue identifier (e.g., DEV-123) */
  issueIdentifier: string;
  /** Session status */
  status: SessionStatus;
  /** Git branch name for this session (if created) */
  branchName?: string;
  /** Isolated working directory - /tmp/claude-sessions/{sessionId} */
  workingDir: string;
  /** Claude process ID (if running) */
  processId?: number;
  /** Session start time */
  startedAt: Date;
  /** Session end time */
  completedAt?: Date;
  /** Last activity time */
  lastActivityAt: Date;
  /** Error message if session failed */
  error?: string;
  /** Validated session metadata */
  metadata: SessionMetadata;
  /** Security context for isolation */
  securityContext: SessionSecurityContext;
}

/**
 * Session status enum
 */
export const SessionStatusValues = {
  /** Session created but not started */
  CREATED: "created",
  /** Session running */
  RUNNING: "running",
  /** Session completed successfully */
  COMPLETED: "completed",
  /** Session failed with error */
  FAILED: "failed",
  /** Session cancelled */
  CANCELLED: "cancelled",
} as const;

export type SessionStatus =
  (typeof SessionStatusValues)[keyof typeof SessionStatusValues];

/**
 * Linear webhook event types we handle
 */
export const LinearEventTypeValues = {
  /** Issue created */
  ISSUE_CREATE: "Issue",
  /** Issue updated (status, assignment, etc.) */
  ISSUE_UPDATE: "Issue",
  /** Comment created on issue */
  COMMENT_CREATE: "Comment",
  /** Comment updated */
  COMMENT_UPDATE: "Comment",
} as const;

export type LinearEventType =
  (typeof LinearEventTypeValues)[keyof typeof LinearEventTypeValues];

/**
 * Linear webhook event payload
 */
export interface LinearWebhookEvent {
  /** Event action (create, update, remove) */
  action: "create" | "update" | "remove";
  /** Event actor (user who triggered) */
  actor:
    | User
    | {
        id: string;
        name?: string;
        service?: string;
        type?: string;
      };
  /** Event type */
  type: string;
  /** Event data */
  data: Issue | Comment | Record<string, any>;
  /** Event URL */
  url?: string;
  /** Organization ID */
  organizationId: string;
  /** Webhook ID */
  webhookId: string;
  /** Event timestamp */
  createdAt: string;
}

/**
 * Processed event for internal handling
 */
export interface ProcessedEvent {
  /** Event type */
  type: LinearEventType;
  /** Event action */
  action: "create" | "update" | "remove";
  /** Issue data */
  issue: Issue;
  /** Comment data (if comment event) */
  comment?: Comment;
  /** Event actor */
  actor: User;
  /** Should trigger Claude action */
  shouldTrigger: boolean;
  /** Trigger reason */
  triggerReason?: string;
  /** Event timestamp */
  timestamp: Date;
}

/**
 * Claude execution context
 */
export interface ClaudeExecutionContext {
  /** Session information */
  session: ClaudeSession;
  /** Issue information */
  issue: Issue;
  /** Trigger comment (if any) */
  triggerComment?: Comment;
  /** Working directory */
  workingDir: string;
  /** Git branch (if created) */
  branchName?: string;
  /** Integration config */
  config: IntegrationConfig;
  /** Additional context data */
  context: Record<string, unknown>;
}

/**
 * Claude execution result
 */
export interface ClaudeExecutionResult {
  /** Execution was successful */
  success: boolean;
  /** Output from Claude */
  output?: string;
  /** Error message if failed */
  error?: string;
  /** Files modified */
  filesModified: string[];
  /** Git commits made */
  commits: GitCommit[];
  /** Execution duration in ms */
  duration: number;
  /** Exit code */
  exitCode: number;
}

/**
 * Git commit information
 */
export interface GitCommit {
  /** Commit hash */
  hash: string;
  /** Commit message */
  message: string;
  /** Author */
  author: string;
  /** Timestamp */
  timestamp: Date;
  /** Files changed */
  files: string[];
}

/**
 * Integration event handlers
 */
export interface EventHandlers {
  /** Handle issue assignment */
  onIssueAssigned(event: ProcessedEvent): Promise<void>;
  /** Handle issue comment mention */
  onCommentMention(event: ProcessedEvent): Promise<void>;
  /** Handle issue status change */
  onIssueStatusChange(event: ProcessedEvent): Promise<void>;
  /** Handle session completion */
  onSessionComplete(
    session: ClaudeSession,
    result: ClaudeExecutionResult,
  ): Promise<void>;
  /** Handle session error */
  onSessionError(session: ClaudeSession, error: Error): Promise<void>;
}

/**
 * Integration logger interface
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
}

/**
 * Session storage interface
 */
export interface SessionStorage {
  /** Save session */
  save(session: ClaudeSession): Promise<void>;
  /** Load session by ID */
  load(sessionId: string): Promise<ClaudeSession | null>;
  /** Load session by issue ID */
  loadByIssue(issueId: string): Promise<ClaudeSession | null>;
  /** List all sessions */
  list(): Promise<ClaudeSession[]>;
  /** List active sessions */
  listActive(): Promise<ClaudeSession[]>;
  /** Delete session */
  delete(sessionId: string): Promise<void>;
  /** Update session status */
  updateStatus(sessionId: string, status: SessionStatus): Promise<void>;
  /** Clean up old sessions */
  cleanupOldSessions(maxAgeDays: number): Promise<number>;
}

/**
 * GitHub webhook event types
 */
export interface GitHubUser {
  id: number;
  login: string;
  name?: string;
  email?: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubUser;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: "open" | "closed";
  user: GitHubUser;
  html_url: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
}

export interface GitHubComment {
  id: number;
  body: string;
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GitHubWebhookEvent {
  action: string;
  comment?: GitHubComment;
  pull_request?: GitHubPullRequest;
  issue?: {
    id: number;
    number: number;
    title: string;
    body?: string;
    user: GitHubUser;
  };
  repository: GitHubRepository;
  sender: GitHubUser;
}

/**
 * Processed GitHub event
 */
export interface ProcessedGitHubEvent {
  type: "pr_comment" | "issue_comment";
  action: string;
  comment: GitHubComment;
  pullRequest?: GitHubPullRequest;
  repository: GitHubRepository;
  sender: GitHubUser;
  shouldTrigger: boolean;
  triggerReason?: string;
  timestamp: Date;
}

/**
 * Boss Agent - Delegation System Types
 */

/**
 * Agent specialization types
 */
export const AgentTypeValues = {
  /** Code implementation agent */
  CODE_WRITER: "code_writer",
  /** Test writing agent */
  TEST_WRITER: "test_writer",
  /** Code review agent */
  REVIEWER: "reviewer",
  /** Documentation agent */
  DOCUMENTATION: "documentation",
  /** Debugging agent */
  DEBUGGER: "debugger",
  /** Refactoring agent */
  REFACTORER: "refactorer",
  /** General purpose agent */
  GENERAL: "general",
} as const;

export type AgentType = (typeof AgentTypeValues)[keyof typeof AgentTypeValues];

/**
 * Task complexity levels
 */
export const TaskComplexityValues = {
  /** Simple task (1-3) */
  SIMPLE: "simple",
  /** Medium task (4-6) */
  MEDIUM: "medium",
  /** Complex task (7-10) */
  COMPLEX: "complex",
} as const;

export type TaskComplexity =
  (typeof TaskComplexityValues)[keyof typeof TaskComplexityValues];

/**
 * Task analysis result
 */
export interface TaskAnalysis {
  /** Complexity score (1-10) */
  complexityScore: number;
  /** Complexity level */
  complexity: TaskComplexity;
  /** Should delegate to sub-agents */
  shouldDelegate: boolean;
  /** Estimated subtask count */
  estimatedSubtasks: number;
  /** Task type classification */
  taskType: "feature" | "bug" | "refactor" | "test" | "docs" | "mixed";
  /** Analysis reasoning */
  reasoning: string;
}

/**
 * Subtask definition
 */
export interface Subtask {
  /** Unique subtask ID */
  id: string;
  /** Subtask title */
  title: string;
  /** Subtask description */
  description: string;
  /** Required agent type */
  agentType: AgentType;
  /** Dependencies (subtask IDs that must complete first) */
  dependencies: string[];
  /** Priority (1-10, higher = more important) */
  priority: number;
  /** Estimated complexity (1-10) */
  complexity: number;
  /** Status */
  status: "pending" | "running" | "completed" | "failed";
  /** Associated session ID when running */
  sessionId?: string;
  /** Result when completed */
  result?: SubtaskResult;
}

/**
 * Subtask execution result
 */
export interface SubtaskResult {
  /** Success status */
  success: boolean;
  /** Output summary */
  output?: string;
  /** Error message */
  error?: string;
  /** Files modified */
  filesModified: string[];
  /** Commits made */
  commits: GitCommit[];
  /** Execution duration */
  duration: number;
}

/**
 * Task decomposition result
 */
export interface TaskDecomposition {
  /** Original task description */
  originalTask: string;
  /** List of subtasks */
  subtasks: Subtask[];
  /** Execution strategy */
  strategy: "sequential" | "parallel" | "hybrid";
  /** Estimated total time (minutes) */
  estimatedTime: number;
}

/**
 * Delegation session
 */
export interface DelegationSession {
  /** Unique delegation session ID */
  id: string;
  /** Parent issue ID */
  issueId: string;
  /** Task analysis */
  analysis: TaskAnalysis;
  /** Task decomposition */
  decomposition: TaskDecomposition;
  /** Status */
  status: "planning" | "executing" | "aggregating" | "completed" | "failed";
  /** Created at */
  createdAt: Date;
  /** Started at */
  startedAt?: Date;
  /** Completed at */
  completedAt?: Date;
  /** Active sub-agent sessions */
  activeSessions: Map<string, ClaudeSession>;
  /** Aggregated result */
  result?: DelegationResult;
}

/**
 * Delegation result
 */
export interface DelegationResult {
  /** Overall success */
  success: boolean;
  /** Summary */
  summary: string;
  /** All files modified */
  filesModified: string[];
  /** All commits */
  commits: GitCommit[];
  /** Total duration */
  duration: number;
  /** Subtask results */
  subtaskResults: SubtaskResult[];
  /** Failed subtasks */
  failedSubtasks: string[];
}
