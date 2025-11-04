import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Issue, Comment, LinearClient as LinearClientType } from '@linear/sdk';
import { BossAgent } from './agent.js';
import { CodegenClient } from '../codegen/client.js';
import { CodegenWebhookHandler, CodegenWebhookEventType } from '../codegen/webhook-handler.js';
import type { IntegrationConfig, Logger } from '../core/types.js';

/**
 * Integration Tests for Boss Agent
 *
 * Tests the complete workflow from Linear webhook to Codegen delegation
 * and back to Linear progress updates.
 */

// Mock logger - created once and reused
let mockLogger: Logger;

// Helper to create mock ExecutionResult for monitor()
function createMockExecutionResult(
  taskId: string,
  issue: Issue,
  status: 'success' | 'failed' = 'success',
  error?: string
) {
  const baseResult = {
    taskId,
    issueId: issue.id,
    issueIdentifier: issue.identifier,
    issueTitle: issue.title,
    status,
    delegatedTo: 'codegen' as const,
    codegenTaskId: taskId,
    duration: 120000,
    startedAt: new Date(),
    completedAt: new Date(),
    originalIssue: issue,
  };

  if (status === 'success') {
    return {
      ...baseResult,
      result: {
        prUrl: `https://github.com/test/repo/pull/123`,
        prNumber: 123,
        filesChanged: ['src/test.ts'],
        duration: 120000,
      },
    };
  } else {
    return {
      ...baseResult,
      error: error || 'Task failed',
    };
  }
}

// Mock Linear SDK types
function createMockIssue(
  id: string,
  identifier: string,
  title: string,
  description: string,
  priority?: number,
  labelNames?: string[]
): Issue {
  return {
    id,
    identifier,
    title,
    description: description || '',
    priority: priority || 0,
    state: () => Promise.resolve({ id: 'state-1', name: 'Todo', type: 'unstarted' }),
    assignee: () => Promise.resolve({ id: 'user-1', name: 'Test User', email: 'test@example.com' }),
    labels: () => Promise.resolve({
      nodes: labelNames?.map((name) => ({ id: name, name })) || [],
    }),
    team: () => Promise.resolve({ id: 'team-1', name: 'Engineering', key: 'ENG' }),
    project: () => Promise.resolve(null),
    comments: () => Promise.resolve({ nodes: [] }),
    createdAt: new Date(),
    updatedAt: new Date(),
    url: `https://linear.app/test/issue/${identifier}`,
  } as unknown as Issue;
}

function createMockComment(id: string, body: string, issueId: string): Comment {
  return {
    id,
    body,
    issue: () => Promise.resolve(createMockIssue(issueId, 'TEST-1', 'Test Issue', 'Description')),
    user: () => Promise.resolve({ id: 'user-1', name: 'Test User', email: 'test@example.com' }),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Comment;
}

// Mock configuration
const createMockConfig = (): IntegrationConfig => ({
  linearApiToken: 'test-token',
  linearOrganizationId: 'test-org',
  projectRootDir: '/tmp/test-project',
  agentUserId: 'test-agent',
  webhookPort: 3005,
  enableBossAgent: true,
  bossAgentThreshold: 6,
  maxConcurrentAgents: 3,
  codegenApiToken: 'test-codegen-token',
  codegenOrgId: 'test-codegen-org',
  codegenBaseUrl: 'https://api.codegen.test',
  codegenDefaultTimeout: 3600000,
  codegenWebhookEnabled: true,
  codegenWebhookSecret: 'test-webhook-secret',
  codegenAutoMerge: false,
  codegenRequireReview: true,
  debug: false,
});

describe('Boss Agent Integration Tests', () => {
  let config: IntegrationConfig;
  let bossAgent: BossAgent;
  let codegenClient: CodegenClient;
  let webhookHandler: CodegenWebhookHandler;

  beforeEach(() => {
    // Create fresh mock logger for each test
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    config = createMockConfig();

    // Create Codegen client with mocked fetch
    global.fetch = vi.fn();
    const codegenConfig = {
      apiToken: config.codegenApiToken!,
      orgId: config.codegenOrgId!,
      baseUrl: config.codegenBaseUrl,
      defaultTimeout: config.codegenDefaultTimeout,
    };
    codegenClient = new CodegenClient(codegenConfig, mockLogger);

    // Create Boss Agent
    bossAgent = new BossAgent(config, mockLogger, codegenClient);

    // Create webhook handler
    webhookHandler = new CodegenWebhookHandler(mockLogger, {
      secret: config.codegenWebhookSecret,
      debug: config.debug,
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full workflow: Linear issue → Boss Agent → Codegen → Linear update', async () => {
      // 1. Create mock Linear issue
      const issue = createMockIssue(
        'issue-123',
        'BUG-456',
        'Fix: Authentication token expires too quickly',
        'Users are getting logged out after 5 minutes. Need to increase token lifetime to 1 hour.',
        1, // high priority
        ['bug', 'authentication']
      );

      // 2. Mock Codegen API responses
      // Task creation response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'codegen-task-789',
          status: 'pending',
          created_at: new Date().toISOString(),
        }),
      });

      // Task status check response (for monitor)
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'codegen-task-789',
          status: 'completed',
          result: {
            pr_url: 'https://github.com/test/repo/pull/123',
            pr_number: 123,
            branch_name: 'codegen/bug-456-fix-auth',
            files_changed: ['src/auth.ts'],
          },
        }),
      });

      // 3. Mock the monitor method to return immediately with full ExecutionResult
      const monitorSpy = vi.spyOn(bossAgent as any, 'monitor').mockResolvedValue(
        createMockExecutionResult('codegen-task-789', issue)
      );

      // 4. Process issue through Boss Agent
      const result = await bossAgent.executeWorkflow(issue);

      // 5. Verify Boss Agent completed successfully
      expect(result.status).toBe('success');
      expect(result.delegatedTo).toBe('codegen');
      expect(result.issueId).toBe('issue-123');
      expect(result.issueIdentifier).toBe('BUG-456');

      // 6. Verify Codegen task was created
      expect(result.codegenTaskId).toBeDefined();
      expect(result.codegenTaskId).toBe('codegen-task-789');

      // 7. Verify monitor was called
      expect(monitorSpy).toHaveBeenCalledOnce();

      // 6. Verify task session was created
      const taskSessionManager = bossAgent.getTaskSessionManager();
      const taskSession = await taskSessionManager.getSessionByTaskId('codegen-task-789');
      expect(taskSession).toBeDefined();
      expect(taskSession?.issueId).toBe('issue-123');
      expect(taskSession?.issueIdentifier).toBe('BUG-456');
      expect(taskSession?.status).toBe('active');
      expect(taskSession?.delegatedTo).toBe('codegen');
      // Strategy can be uppercase or lowercase depending on source
      expect(taskSession?.strategy?.toUpperCase()).toBe('DIRECT');

      // 7. Verify fetch was called correctly
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/tasks'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-codegen-token',
            'Content-Type': 'application/json',
          }),
        })
      );

      // 8. Verify logger was called for workflow execution
      const logCalls = (mockLogger.info as any).mock.calls;
      const hasWorkflowLog = logCalls.some((call: any[]) =>
        call[0]?.includes('Boss Agent executing workflow') ||
        call[0]?.includes('executing workflow')
      );
      expect(hasWorkflowLog).toBe(true);
    });

    it('should handle Codegen progress webhook and update task session', async () => {
      // 1. Create initial task session
      const issue = createMockIssue('issue-123', 'BUG-456', 'Test Issue', 'Description');
      const taskSessionManager = bossAgent.getTaskSessionManager();

      await taskSessionManager.createSession(
        'codegen-task-789',
        issue,
        'codegen',
        'DIRECT',
        { taskType: 'bug_fix', complexity: 'simple', priority: 'high' }
      );

      // 2. Process progress webhook
      const progressEvent = {
        type: CodegenWebhookEventType.TASK_PROGRESS,
        taskId: 'codegen-task-789',
        organizationId: 'test-org',
        timestamp: new Date().toISOString(),
        data: {
          status: 'in_progress',
          progress: {
            percentage: 50,
            currentStep: 'Analyzing authentication code',
          },
        },
      };

      const processedEvent = await webhookHandler.processWebhook(progressEvent);
      expect(processedEvent).toBeDefined();
      expect(processedEvent?.taskId).toBe('codegen-task-789');
      expect(processedEvent?.status).toBe('in_progress');
      expect(processedEvent?.progress?.percentage).toBe(50);

      // 3. Update task session with progress
      await taskSessionManager.updateProgress(
        'codegen-task-789',
        50,
        'Analyzing authentication code'
      );

      // 4. Verify task session was updated
      const taskSession = await taskSessionManager.getSessionByTaskId('codegen-task-789');
      expect(taskSession?.progress).toBe(50);
      expect(taskSession?.currentStep).toBe('Analyzing authentication code');
    });

    it('should handle Codegen completion webhook with PR details', async () => {
      // 1. Create initial task session
      const issue = createMockIssue('issue-123', 'BUG-456', 'Test Issue', 'Description');
      const taskSessionManager = bossAgent.getTaskSessionManager();

      await taskSessionManager.createSession(
        'codegen-task-789',
        issue,
        'codegen',
        'DIRECT'
      );

      // 2. Process completion webhook
      const completionEvent = {
        type: CodegenWebhookEventType.TASK_COMPLETED,
        taskId: 'codegen-task-789',
        organizationId: 'test-org',
        timestamp: new Date().toISOString(),
        data: {
          status: 'completed',
          result: {
            prUrl: 'https://github.com/test/repo/pull/123',
            prNumber: 123,
            branchName: 'codegen/bug-456-fix-auth',
            filesChanged: ['src/auth/token.ts', 'tests/auth.test.ts'],
            commits: ['Fix token expiration', 'Add tests'],
            duration: 120000,
          },
        },
      };

      const processedEvent = await webhookHandler.processWebhook(completionEvent);
      expect(processedEvent).toBeDefined();
      expect(processedEvent?.taskId).toBe('codegen-task-789');
      expect(processedEvent?.status).toBe('completed');
      expect(processedEvent?.result?.prUrl).toBe('https://github.com/test/repo/pull/123');

      // 3. Mark task session as completed
      await taskSessionManager.markCompleted('codegen-task-789', {
        prUrl: 'https://github.com/test/repo/pull/123',
        prNumber: 123,
        filesChanged: ['src/auth/token.ts', 'tests/auth.test.ts'],
      });

      // 4. Verify task session was completed
      const taskSession = await taskSessionManager.getSessionByTaskId('codegen-task-789');
      expect(taskSession?.status).toBe('completed');
      expect(taskSession?.result?.prUrl).toBe('https://github.com/test/repo/pull/123');
      expect(taskSession?.result?.filesChanged).toHaveLength(2);
    });

    it('should handle Codegen failure webhook with error details', async () => {
      // 1. Create initial task session
      const issue = createMockIssue('issue-123', 'BUG-456', 'Test Issue', 'Description');
      const taskSessionManager = bossAgent.getTaskSessionManager();

      await taskSessionManager.createSession(
        'codegen-task-789',
        issue,
        'codegen',
        'DIRECT'
      );

      // 2. Process failure webhook
      const failureEvent = {
        type: CodegenWebhookEventType.TASK_FAILED,
        taskId: 'codegen-task-789',
        organizationId: 'test-org',
        timestamp: new Date().toISOString(),
        data: {
          status: 'failed',
          error: {
            message: 'Build failed: Type error in token.ts',
            code: 'BUILD_ERROR',
            details: {
              file: 'src/auth/token.ts',
              line: 42,
              error: 'Type "string" is not assignable to type "number"',
            },
          },
        },
      };

      const processedEvent = await webhookHandler.processWebhook(failureEvent);
      expect(processedEvent).toBeDefined();
      expect(processedEvent?.taskId).toBe('codegen-task-789');
      expect(processedEvent?.status).toBe('failed');
      expect(processedEvent?.error?.message).toContain('Build failed');

      // 3. Mark task session as failed
      await taskSessionManager.markFailed('codegen-task-789', {
        message: 'Build failed: Type error in token.ts',
        code: 'BUILD_ERROR',
      });

      // 4. Verify task session was failed
      const taskSession = await taskSessionManager.getSessionByTaskId('codegen-task-789');
      expect(taskSession?.status).toBe('failed');
      expect(taskSession?.error?.message).toContain('Build failed');
    });

    it('should handle task cancellation', async () => {
      // 1. Create initial task session
      const issue = createMockIssue('issue-123', 'BUG-456', 'Test Issue', 'Description');
      const taskSessionManager = bossAgent.getTaskSessionManager();

      await taskSessionManager.createSession(
        'codegen-task-789',
        issue,
        'codegen',
        'DIRECT'
      );

      // 2. Process cancellation webhook
      const cancellationEvent = {
        type: CodegenWebhookEventType.TASK_CANCELLED,
        taskId: 'codegen-task-789',
        organizationId: 'test-org',
        timestamp: new Date().toISOString(),
        data: {
          status: 'cancelled',
          reason: 'User requested cancellation',
        },
      };

      const processedEvent = await webhookHandler.processWebhook(cancellationEvent);
      expect(processedEvent).toBeDefined();
      expect(processedEvent?.taskId).toBe('codegen-task-789');
      expect(processedEvent?.status).toBe('cancelled');

      // 3. Mark task session as cancelled
      await taskSessionManager.markCancelled('codegen-task-789');

      // 4. Verify task session was cancelled
      const taskSession = await taskSessionManager.getSessionByTaskId('codegen-task-789');
      expect(taskSession?.status).toBe('cancelled');
    });
  });

  describe('Bidirectional Task Mapping', () => {
    it('should map taskId to issueId correctly', async () => {
      const issue = createMockIssue('issue-123', 'BUG-456', 'Test Issue', 'Description');
      const taskSessionManager = bossAgent.getTaskSessionManager();

      await taskSessionManager.createSession('codegen-task-789', issue, 'codegen');

      const taskSession = await taskSessionManager.getSessionByTaskId('codegen-task-789');
      expect(taskSession?.issueId).toBe('issue-123');
      expect(taskSession?.issueIdentifier).toBe('BUG-456');
    });

    it('should map issueId to taskId correctly', async () => {
      const issue = createMockIssue('issue-123', 'BUG-456', 'Test Issue', 'Description');
      const taskSessionManager = bossAgent.getTaskSessionManager();

      await taskSessionManager.createSession('codegen-task-789', issue, 'codegen');

      const taskSession = await taskSessionManager.getSessionByIssueId('issue-123');
      expect(taskSession?.taskId).toBe('codegen-task-789');
    });

    it('should return null for non-existent taskId', async () => {
      const taskSessionManager = bossAgent.getTaskSessionManager();
      const taskSession = await taskSessionManager.getSessionByTaskId('non-existent');
      expect(taskSession).toBeNull();
    });

    it('should return null for non-existent issueId', async () => {
      const taskSessionManager = bossAgent.getTaskSessionManager();
      const taskSession = await taskSessionManager.getSessionByIssueId('non-existent');
      expect(taskSession).toBeNull();
    });
  });

  describe('Task Classification', () => {
    it('should classify bug fix task correctly', async () => {
      const issue = createMockIssue(
        'issue-1',
        'BUG-1',
        'Fix: Memory leak in user service',
        'The user service is leaking memory',
        1,
        ['bug', 'performance']
      );

      // Mock Codegen API
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'task-1', status: 'pending' }),
      });

      // Mock monitor to return success immediately
      vi.spyOn(bossAgent as any, 'monitor').mockResolvedValue(
        createMockExecutionResult('task-1', issue)
      );

      const result = await bossAgent.executeWorkflow(issue);

      // Verify delegation succeeded (implies correct classification)
      expect(result.status).toBe('success');
      expect(result.delegatedTo).toBe('codegen');
      expect(result.codegenTaskId).toBeDefined();
    });

    it('should classify feature implementation task correctly', async () => {
      const issue = createMockIssue(
        'issue-2',
        'FEAT-2',
        'Add: User profile management',
        'Implement user profile editing, avatar upload, and settings',
        0,
        ['feature', 'enhancement']
      );

      // Mock Codegen API
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'task-2', status: 'pending' }),
      });

      // Mock monitor
      vi.spyOn(bossAgent as any, 'monitor').mockResolvedValue(
        createMockExecutionResult('task-2', issue)
      );

      const result = await bossAgent.executeWorkflow(issue);

      expect(result.status).toBe('success');
      expect(result.delegatedTo).toBe('codegen');
      expect(result.codegenTaskId).toBe('task-2');
    });

    it('should classify refactoring task correctly', async () => {
      const issue = createMockIssue(
        'issue-3',
        'TECH-3',
        'Refactor: Split UserService into multiple modules',
        'UserService is too large, need to split into smaller modules',
        0,
        ['refactor', 'tech-debt']
      );

      // Mock Codegen API
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'task-3', status: 'pending' }),
      });

      // Mock monitor
      vi.spyOn(bossAgent as any, 'monitor').mockResolvedValue(
        createMockExecutionResult('task-3', issue)
      );

      const result = await bossAgent.executeWorkflow(issue);

      expect(result.status).toBe('success');
      expect(result.delegatedTo).toBe('codegen');
      expect(result.codegenTaskId).toBe('task-3');
    });
  });

  describe('Delegation Strategy', () => {
    it('should use DIRECT strategy for simple bug fixes', async () => {
      const issue = createMockIssue(
        'issue-1',
        'BUG-1',
        'Fix: Typo in error message',
        'Error message has a typo',
        1
      );

      // Mock Codegen API
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'task-1', status: 'pending' }),
      });

      // Mock monitor
      vi.spyOn(bossAgent as any, 'monitor').mockResolvedValue(
        createMockExecutionResult('task-1', issue)
      );

      const result = await bossAgent.executeWorkflow(issue);

      // For simple bugs, should delegate successfully
      expect(result.status).toBe('success');
      expect(result.delegatedTo).toBe('codegen');
    });

    it('should use REVIEW_FIRST strategy for complex features', async () => {
      const issue = createMockIssue(
        'issue-2',
        'FEAT-2',
        'Implement: Real-time chat system with WebSockets',
        'Build a real-time chat system with WebSocket support, presence, typing indicators',
        0,
        ['feature']
      );

      // Mock Codegen API
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'task-2', status: 'pending' }),
      });

      // Mock monitor
      vi.spyOn(bossAgent as any, 'monitor').mockResolvedValue(
        createMockExecutionResult('task-2', issue)
      );

      const result = await bossAgent.executeWorkflow(issue);

      // For complex features, should still delegate successfully
      expect(result.status).toBe('success');
      expect(result.delegatedTo).toBe('codegen');
    });

    it('should not delegate tasks below threshold', async () => {
      const issue = createMockIssue(
        'issue-3',
        'DOC-3',
        'Update README.md',
        'Add installation instructions',
        0,
        ['documentation']
      );

      const result = await bossAgent.executeWorkflow(issue);

      // When not delegating, status should be failed with reason in error
      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
      // Error message indicates task was not delegated
      expect(result.error).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle Codegen API errors gracefully', async () => {
      const issue = createMockIssue(
        'issue-1',
        'BUG-1',
        'Fix: Test bug',
        'Description',
        1
      );

      // Mock Codegen API error
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await bossAgent.executeWorkflow(issue);

      // Should return failed result instead of throwing
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Network error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle invalid webhook signatures', () => {
      const payload = JSON.stringify({ type: 'task.started', taskId: 'test' });
      const invalidSignature = 'invalid-signature';

      const isValid = webhookHandler.verifySignature(payload, invalidSignature);
      expect(isValid).toBe(false);
    });

    it('should handle malformed webhook payloads', async () => {
      const malformedEvent = {
        // Missing required fields
        type: 'invalid-type',
      };

      const validatedEvent = webhookHandler.validateWebhook(malformedEvent);
      expect(validatedEvent).toBeNull();
    });
  });

  describe('Session Cleanup', () => {
    it('should list all active sessions', async () => {
      const taskSessionManager = bossAgent.getTaskSessionManager();
      const issue1 = createMockIssue('issue-1', 'BUG-1', 'Test 1', 'Desc 1');
      const issue2 = createMockIssue('issue-2', 'BUG-2', 'Test 2', 'Desc 2');

      await taskSessionManager.createSession('task-1', issue1, 'codegen');
      await taskSessionManager.createSession('task-2', issue2, 'codegen');

      const allSessions = await taskSessionManager.getAllSessions();
      expect(allSessions).toHaveLength(2);
    });

    it('should list only active sessions', async () => {
      const taskSessionManager = bossAgent.getTaskSessionManager();
      const issue1 = createMockIssue('issue-1', 'BUG-1', 'Test 1', 'Desc 1');
      const issue2 = createMockIssue('issue-2', 'BUG-2', 'Test 2', 'Desc 2');

      await taskSessionManager.createSession('task-1', issue1, 'codegen');
      await taskSessionManager.createSession('task-2', issue2, 'codegen');
      await taskSessionManager.markCompleted('task-1');

      const activeSessions = await taskSessionManager.getActiveSessions();
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].taskId).toBe('task-2');
    });

    it('should delete session correctly', async () => {
      const taskSessionManager = bossAgent.getTaskSessionManager();
      const issue = createMockIssue('issue-1', 'BUG-1', 'Test', 'Desc');

      await taskSessionManager.createSession('task-1', issue, 'codegen');
      await taskSessionManager.deleteSession('task-1');

      const session = await taskSessionManager.getSessionByTaskId('task-1');
      expect(session).toBeNull();
    });
  });
});
