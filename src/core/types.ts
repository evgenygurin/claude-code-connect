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
  /** Claude Code CLI path (optional, defaults to 'claude-code') */
  claudeCodePath?: string;
  /** Claude executable path (optional, defaults to 'claude') */
  claudeExecutablePath: string;
  /** Port for webhook server */
  webhookPort: number;
  /** Webhook secret for validation */
  webhookSecret?: string;
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
  cleanupOldSessions?(maxAgeDays: number): Promise<number>;
}
