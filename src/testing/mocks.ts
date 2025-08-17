/**
 * Mock data structures for testing Linear + Claude Code integration
 */

import type {
  LinearWebhookEvent,
  ClaudeSession,
  ProcessedEvent,
  ClaudeExecutionResult,
  ClaudeExecutionContext,
  IntegrationConfig,
  Logger,
} from "../core/types.js";
import type { Issue, Comment, User, Team, WorkflowState } from "@linear/sdk";
import { SessionStatusValues } from "../core/types.js";
import { vi } from "vitest";

/**
 * Mock Linear user data
 */
export const mockUser: User = {
  id: "user-123",
  name: "Test User",
  email: "test@example.com",
  displayName: "Test User",
  avatarUrl: "https://example.com/avatar.png",
  isMe: false,
  isGuest: false,
  isAdmin: false,
  url: "https://linear.app/user/test-user",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
  archivedAt: null,
} as unknown as User;

/**
 * Mock Linear agent user (Claude)
 */
export const mockAgentUser: User = {
  id: "test-agent-id",
  name: "Claude Agent",
  email: "claude@example.com",
  displayName: "Claude AI Assistant",
  avatarUrl: "https://example.com/claude-avatar.png",
  isMe: false,
  isGuest: false,
  isAdmin: false,
  url: "https://linear.app/user/claude-agent",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
  archivedAt: null,
} as unknown as User;

/**
 * Mock Linear team
 */
export const mockTeam: Team = {
  id: "team-789",
  name: "Development Team",
  key: "DEV",
  description: "Main development team",
  color: "#3b82f6",
  private: false,
  url: "https://linear.app/team/dev",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
  archivedAt: null,
} as unknown as Team;

/**
 * Mock Linear workflow state
 */
export const mockWorkflowState: WorkflowState = {
  id: "state-todo",
  name: "Todo",
  color: "#94a3b8",
  description: "Work that needs to be done",
  position: 1,
  type: "unstarted",
  url: "https://linear.app/state/todo",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
  archivedAt: null,
} as unknown as WorkflowState;

/**
 * Mock Linear issue
 */
export const mockIssue: Issue = {
  id: "issue-abc123",
  identifier: "DEV-123",
  title: "Fix authentication bug",
  description:
    "The login flow is broken for users with special characters in their email",
  url: "https://linear.app/team/issue/dev-123",
  number: 123,
  priority: 2,
  estimate: 3,
  state: mockWorkflowState,
  assignee: mockUser,
  creator: mockUser,
  team: mockTeam,
  createdAt: new Date("2024-01-01T10:00:00Z"),
  updatedAt: new Date("2024-01-01T12:00:00Z"),
  archivedAt: null,
  dueDate: new Date("2024-01-05T00:00:00Z"),
  startedAt: null,
  completedAt: null,
  canceledAt: null,
  autoArchivedAt: null,
  autoClosedAt: null,
  snoozedUntilAt: null,
  triagedAt: null,
} as unknown as Issue;

/**
 * Mock Linear issue assigned to agent
 */
export const mockIssueAssignedToAgent: Issue = {
  ...mockIssue,
  id: "issue-agent-assigned",
  identifier: "DEV-124",
  title: "Implement new API endpoint",
  description:
    "Create a new endpoint for user profile updates. @claude please implement this with proper validation",
  assignee: mockAgentUser,
} as unknown as Issue;

/**
 * Mock Linear comment
 */
export const mockComment: Comment = {
  id: "comment-def456",
  body: "@claude please help fix this authentication issue. The users are unable to login with email addresses containing '+' symbols.",
  user: mockUser,
  issue: mockIssue,
  url: "https://linear.app/comment/def456",
  createdAt: new Date("2024-01-01T14:00:00Z"),
  updatedAt: new Date("2024-01-01T14:00:00Z"),
  archivedAt: null,
  editedAt: null,
} as unknown as Comment;

/**
 * Mock Linear comment without agent mention
 */
export const mockCommentNoMention: Comment = {
  ...mockComment,
  id: "comment-no-mention",
  body: "This is a regular comment without any agent mention. Just discussing the issue with the team.",
} as unknown as Comment;

/**
 * Mock Linear webhook event - Issue created
 */
export const mockWebhookEventIssueCreated: LinearWebhookEvent = {
  action: "create",
  actor: mockUser,
  type: "Issue",
  data: mockIssue,
  url: "https://linear.app/team/issue/dev-123",
  organizationId: "test-org-id",
  webhookId: "webhook-789",
  createdAt: "2024-01-01T10:00:00Z",
};

/**
 * Mock Linear webhook event - Issue assigned to agent
 */
export const mockWebhookEventIssueAssigned: LinearWebhookEvent = {
  action: "update",
  actor: mockUser,
  type: "Issue",
  data: mockIssueAssignedToAgent,
  url: "https://linear.app/team/issue/dev-124",
  organizationId: "test-org-id",
  webhookId: "webhook-789",
  createdAt: "2024-01-01T11:00:00Z",
};

/**
 * Mock Linear webhook event - Comment with agent mention
 */
export const mockWebhookEventCommentMention: LinearWebhookEvent = {
  action: "create",
  actor: mockUser,
  type: "Comment",
  data: mockComment,
  url: "https://linear.app/comment/def456",
  organizationId: "test-org-id",
  webhookId: "webhook-789",
  createdAt: "2024-01-01T14:00:00Z",
};

/**
 * Mock Linear webhook event - Comment without mention
 */
export const mockWebhookEventCommentNoMention: LinearWebhookEvent = {
  action: "create",
  actor: mockUser,
  type: "Comment",
  data: mockCommentNoMention,
  url: "https://linear.app/comment/no-mention",
  organizationId: "test-org-id",
  webhookId: "webhook-789",
  createdAt: "2024-01-01T15:00:00Z",
};

/**
 * Mock processed event that should trigger
 */
export const mockProcessedEventTrigger: ProcessedEvent = {
  type: "Issue",
  action: "update",
  issue: mockIssueAssignedToAgent,
  actor: mockUser,
  shouldTrigger: true,
  triggerReason: "Issue assigned to agent",
  timestamp: new Date("2024-01-01T11:00:00Z"),
};

/**
 * Mock processed event that should not trigger
 */
export const mockProcessedEventNoTrigger: ProcessedEvent = {
  type: "Comment",
  action: "create",
  issue: mockIssue,
  comment: mockCommentNoMention,
  actor: mockUser,
  shouldTrigger: false,
  triggerReason: "No agent mention found",
  timestamp: new Date("2024-01-01T15:00:00Z"),
};

/**
 * Mock Claude session - Created
 */
export const mockSessionCreated: ClaudeSession = {
  id: "session-test-123",
  issueId: mockIssue.id,
  issueIdentifier: mockIssue.identifier,
  status: SessionStatusValues.CREATED,
  branchName: "claude/dev-123-fix-authentication-bug",
  workingDir: "/tmp/claude-sessions/session-test-123",
  startedAt: new Date("2024-01-01T12:00:00Z"),
  lastActivityAt: new Date("2024-01-01T12:00:00Z"),
  metadata: {
    createdBy: mockUser.id,
    organizationId: "test-org-123",
    projectScope: ["/test/project"],
    permissions: {
      canRead: true,
      canWrite: true,
      canExecute: true,
      canNetwork: false,
      canModifyFileSystem: true
    },
    triggerCommentId: mockComment.id,
    issueTitle: mockIssue.title,
    triggerEventType: "comment"
  },
  securityContext: {
    allowedPaths: ["/tmp/claude-sessions/session-test-123", "/test/project"],
    maxMemoryMB: 512,
    maxExecutionTimeMs: 600000,
    isolatedEnvironment: true,
    allowedEndpoints: ["api.linear.app", "claude.ai"],
    allowedEnvVars: ["PATH", "NODE_ENV", "LINEAR_API_TOKEN"]
  },
};

/**
 * Mock Claude session - Running
 */
export const mockSessionRunning: ClaudeSession = {
  ...mockSessionCreated,
  status: SessionStatusValues.RUNNING,
  processId: 12345,
  lastActivityAt: new Date("2024-01-01T12:30:00Z"),
};

/**
 * Mock Claude session - Completed
 */
export const mockSessionCompleted: ClaudeSession = {
  ...mockSessionCreated,
  status: SessionStatusValues.COMPLETED,
  processId: 12345,
  completedAt: new Date("2024-01-01T13:00:00Z"),
  lastActivityAt: new Date("2024-01-01T13:00:00Z"),
  metadata: {
    ...mockSessionCreated.metadata,
  },
};

/**
 * Mock Claude session - Failed
 */
export const mockSessionFailed: ClaudeSession = {
  ...mockSessionCreated,
  status: SessionStatusValues.FAILED,
  processId: 12345,
  error: "Failed to execute: git repository not found",
  lastActivityAt: new Date("2024-01-01T12:15:00Z"),
};

/**
 * Mock Claude execution result - Success
 */
export const mockExecutionResultSuccess: ClaudeExecutionResult = {
  success: true,
  output: "Successfully implemented the requested changes",
  filesModified: [
    "src/auth/login.ts",
    "src/auth/validation.ts",
    "tests/auth.test.ts",
  ],
  commits: [
    {
      hash: "abc123def456",
      message:
        "fix(auth): handle special characters in email validation\n\nFixed issue where emails with '+' symbols couldn't log in.",
      author: "Claude Agent <claude@example.com>",
      timestamp: new Date("2024-01-01T12:45:00Z"),
      files: ["src/auth/login.ts", "src/auth/validation.ts"],
    },
    {
      hash: "def456ghi789",
      message: "test(auth): add tests for special character email validation",
      author: "Claude Agent <claude@example.com>",
      timestamp: new Date("2024-01-01T12:50:00Z"),
      files: ["tests/auth.test.ts"],
    },
  ],
  duration: 1800000, // 30 minutes in milliseconds
  exitCode: 0,
};

/**
 * Mock Claude execution result - Failure
 */
export const mockExecutionResultFailure: ClaudeExecutionResult = {
  success: false,
  error:
    "Compilation failed: Type 'string | undefined' is not assignable to type 'string'",
  output: "Error occurred during execution",
  filesModified: [],
  commits: [],
  duration: 300000, // 5 minutes
  exitCode: 1,
};

/**
 * Mock Claude execution context
 */
export const mockExecutionContext: ClaudeExecutionContext = {
  session: mockSessionRunning,
  issue: mockIssue,
  triggerComment: mockComment,
  workingDir: mockSessionRunning.workingDir,
  branchName: mockSessionRunning.branchName,
  config: {
    linearApiToken: "test-token",
    linearOrganizationId: "test-org-id",
    claudeExecutablePath: "claude",
    webhookPort: 3000,
    projectRootDir: "/test/project",
    defaultBranch: "main",
    createBranches: true,
    timeoutMinutes: 30,
    agentUserId: mockAgentUser.id,
    debug: true,
  },
  context: {
    sessionId: mockSessionRunning.id,
    issueIdentifier: mockIssue.identifier,
    triggerType: "comment_mention",
  },
};

/**
 * Mock integration config
 */
export const mockIntegrationConfig: IntegrationConfig = {
  linearApiToken: "lin_api_test_token_123456789",
  linearOrganizationId: "test-org-id",
  claudeExecutablePath: "claude",
  webhookPort: 3000,
  webhookSecret: "webhook-secret-test-123",
  projectRootDir: "/test/project",
  defaultBranch: "main",
  createBranches: true,
  timeoutMinutes: 30,
  agentUserId: mockAgentUser.id,
  debug: false,
};

/**
 * Mock logger implementation
 */
export const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

/**
 * Mock logger with spy tracking
 */
export function createMockLogger(): Logger & {
  debugCalls: any[];
  infoCalls: any[];
  warnCalls: any[];
  errorCalls: any[];
} {
  const debugCalls: any[] = [];
  const infoCalls: any[] = [];
  const warnCalls: any[] = [];
  const errorCalls: any[] = [];

  return {
    debug: vi.fn((message: string, meta?: Record<string, unknown>) => {
      debugCalls.push({ message, meta });
    }),
    info: vi.fn((message: string, meta?: Record<string, unknown>) => {
      infoCalls.push({ message, meta });
    }),
    warn: vi.fn((message: string, meta?: Record<string, unknown>) => {
      warnCalls.push({ message, meta });
    }),
    error: vi.fn(
      (message: string, error?: Error, meta?: Record<string, unknown>) => {
        errorCalls.push({ message, error, meta });
      },
    ),
    debugCalls,
    infoCalls,
    warnCalls,
    errorCalls,
  };
}

/**
 * Mock webhook signature for testing
 */
export const mockWebhookSignature =
  "sha256=a8b7c6d5e4f3g2h1i0j9k8l7m6n5o4p3q2r1s0t9u8v7w6x5y4z3";

/**
 * Mock webhook payload as string (for signature verification)
 */
export const mockWebhookPayloadString = JSON.stringify(
  mockWebhookEventIssueAssigned,
);

/**
 * Helper function to create mock session with custom status
 */
export function createMockSession(
  overrides: Partial<ClaudeSession> = {},
): ClaudeSession {
  return {
    ...mockSessionCreated,
    ...overrides,
  };
}

/**
 * Helper function to create mock webhook event
 */
export function createMockWebhookEvent(
  overrides: Partial<LinearWebhookEvent> = {},
): LinearWebhookEvent {
  return {
    ...mockWebhookEventIssueCreated,
    ...overrides,
  };
}

/**
 * Helper function to create mock issue
 */
export function createMockIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    ...mockIssue,
    ...overrides,
  } as unknown as Issue;
}

/**
 * Helper function to create mock comment
 */
export function createMockComment(overrides: Partial<Comment> = {}): Comment {
  return {
    ...mockComment,
    ...overrides,
  } as unknown as Comment;
}
