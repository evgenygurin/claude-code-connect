/**
 * Unit tests for BossAgent
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BossAgent } from './agent.js';
import type { Logger, IntegrationConfig } from '../core/types.js';
import type { CodegenClient } from '../codegen/client.js';
import type { Issue, Comment } from '@linear/sdk';

// Mock logger
const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock config
const mockConfig: IntegrationConfig = {
  linearApiToken: 'test-token',
  linearOrganizationId: 'test-org',
  projectRootDir: '/tmp/test',
  defaultBranch: 'main',
  createBranches: true,
  webhookPort: 3005,
  claudeExecutablePath: 'claude',
  timeoutMinutes: 30,
  enableBossAgent: true,
  codegenApiToken: 'test-codegen-token',
  codegenOrgId: 'test-codegen-org',
  codegenBaseUrl: 'https://api.codegen.com',
  codegenDefaultTimeout: 3600000,
};

// Mock Codegen client
const mockCodegenClient: CodegenClient = {
  runTask: vi.fn().mockResolvedValue({
    id: 'task-123',
    status: 'running',
    prompt: 'test prompt',
    startedAt: new Date(),
  }),
  waitForCompletion: vi.fn().mockResolvedValue({
    success: true,
    prUrl: 'https://github.com/test/repo/pull/1',
    prNumber: 1,
    branchName: 'codegen/fix',
    filesChanged: ['file1.ts', 'file2.ts'],
    duration: 120000,
  }),
  getTask: vi.fn(),
  getTaskStatus: vi.fn(),
  getTaskResult: vi.fn(),
  cancelTask: vi.fn(),
  listTasks: vi.fn(),
  getMetrics: vi.fn(),
  ping: vi.fn(),
  getInfo: vi.fn(),
} as any;

// Helper to create mock issue
function createMockIssue(
  id: string,
  identifier: string,
  title: string,
  description: string,
): Issue {
  return {
    id,
    identifier,
    title,
    description,
    priority: 0,
    labels: [],
  } as unknown as Issue;
}

// Helper to create mock comment
function createMockComment(body: string): Comment {
  return {
    id: 'comment-123',
    body,
  } as unknown as Comment;
}

describe('BossAgent', () => {
  let agent: BossAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new BossAgent(mockConfig, mockLogger, mockCodegenClient);
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(agent).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Boss Agent initialized',
        expect.objectContaining({
          mode: 'coordinator',
          codegenEnabled: true,
        }),
      );
    });

    it('should create internal components', () => {
      // Agent should have classifier, decision engine, prompt builder
      expect(agent).toHaveProperty('classifier');
      expect(agent).toHaveProperty('decisionEngine');
      expect(agent).toHaveProperty('promptBuilder');
      expect(agent).toHaveProperty('codegenClient');
    });
  });

  describe('Task Analysis', () => {
    it('should analyze task from issue', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Fix login bug', 'User cannot login');
      const analysis = await agent.analyzeTask(issue);

      expect(analysis).toBeDefined();
      expect(analysis.taskType).toBeDefined();
      expect(analysis.complexity).toBeDefined();
      expect(analysis.priority).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Boss Agent analyzing task',
        expect.objectContaining({
          issueId: 'issue-1',
          issueIdentifier: 'TEST-1',
        }),
      );
    });

    it('should include comment in analysis', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Fix bug', 'Bug description');
      const comment = createMockComment('@claude please fix this urgently');
      const analysis = await agent.analyzeTask(issue, comment);

      expect(analysis.context.comment).toBe(comment);
    });

    it('should log analysis results', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Add feature', 'Feature description');
      await agent.analyzeTask(issue);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Task analysis complete',
        expect.objectContaining({
          taskType: expect.any(String),
          complexity: expect.any(String),
          priority: expect.any(String),
        }),
      );
    });
  });

  describe('Decision Making', () => {
    it('should make decision from analysis', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Fix critical bug', 'Production error');
      const analysis = await agent.analyzeTask(issue);
      const decision = await agent.makeDecision(analysis);

      expect(decision).toBeDefined();
      expect(decision.shouldDelegate).toBeDefined();
      expect(decision.delegateTo).toBeDefined();
      expect(decision.strategy).toBeDefined();
    });

    it('should log decision', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Add feature', 'New feature');
      const analysis = await agent.analyzeTask(issue);
      await agent.makeDecision(analysis);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Decision made',
        expect.objectContaining({
          shouldDelegate: expect.any(Boolean),
          delegateTo: expect.any(String),
          strategy: expect.any(String),
        }),
      );
    });
  });

  describe('Task Delegation', () => {
    it('should delegate task to Codegen', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Fix bug', 'Bug description');
      const analysis = await agent.analyzeTask(issue);
      const decision = await agent.makeDecision(analysis);

      if (decision.shouldDelegate) {
        const delegation = await agent.delegate(decision, analysis);

        expect(delegation).toBeDefined();
        expect(delegation.status).toBe('delegated');
        expect(delegation.taskId).toBeDefined();
        expect(delegation.delegatedTo).toBe('codegen');
        expect(mockCodegenClient.runTask).toHaveBeenCalled();
      }
    });

    it('should not delegate if decision says no', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Fix bug', 'Bug description');
      const analysis = await agent.analyzeTask(issue);
      const decision = await agent.makeDecision(analysis);
      decision.shouldDelegate = false;

      await expect(agent.delegate(decision, analysis)).rejects.toThrow(
        'Cannot delegate: decision.shouldDelegate is false',
      );
    });

    it('should pass options to Codegen', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Add feature', 'Feature description');
      const analysis = await agent.analyzeTask(issue);
      const decision = await agent.makeDecision(analysis);
      decision.options = {
        branchName: 'claude/test-1',
        labels: ['feature', 'boss-agent'],
        createPR: true,
        requireReview: true,
      };

      if (decision.shouldDelegate) {
        await agent.delegate(decision, analysis);

        expect(mockCodegenClient.runTask).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            branch: 'claude/test-1',
            labels: ['feature', 'boss-agent'],
            createPR: true,
            assignReviewers: true,
          }),
        );
      }
    });

    it('should handle delegation failure', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Fix bug', 'Bug description');
      const analysis = await agent.analyzeTask(issue);
      const decision = await agent.makeDecision(analysis);

      // Mock failure
      (mockCodegenClient.runTask as any).mockRejectedValueOnce(new Error('Codegen API error'));

      if (decision.shouldDelegate) {
        const delegation = await agent.delegate(decision, analysis);

        expect(delegation.status).toBe('failed');
        expect(delegation.error).toBeDefined();
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });

    it('should log delegation', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Fix bug', 'Bug description');
      const analysis = await agent.analyzeTask(issue);
      const decision = await agent.makeDecision(analysis);

      if (decision.shouldDelegate) {
        await agent.delegate(decision, analysis);

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Boss Agent delegating task',
          expect.objectContaining({
            delegateTo: 'codegen',
          }),
        );
      }
    });
  });

  describe('Task Monitoring', () => {
    it('should monitor task execution', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Fix bug', 'Bug description');
      const analysis = await agent.analyzeTask(issue);
      const decision = await agent.makeDecision(analysis);

      if (decision.shouldDelegate) {
        const delegation = await agent.delegate(decision, analysis);
        const result = await agent.monitor(delegation, analysis);

        expect(result).toBeDefined();
        expect(result.status).toBe('success');
        expect(result.issueId).toBe('issue-1');
        expect(mockCodegenClient.waitForCompletion).toHaveBeenCalled();
      }
    });

    it('should handle failed delegation in monitoring', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Fix bug', 'Bug description');
      const analysis = await agent.analyzeTask(issue);

      const failedDelegation = {
        taskId: 'failed-task',
        delegatedTo: 'codegen' as const,
        status: 'failed' as const,
        timestamp: new Date(),
        error: 'Task failed',
      };

      const result = await agent.monitor(failedDelegation, analysis);

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    });

    it('should call progress callback', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Fix bug', 'Bug description');
      const analysis = await agent.analyzeTask(issue);
      const decision = await agent.makeDecision(analysis);

      if (decision.shouldDelegate) {
        const delegation = await agent.delegate(decision, analysis);
        const progressCallback = vi.fn();

        await agent.monitor(delegation, analysis, {
          onProgress: progressCallback,
        });

        expect(mockCodegenClient.waitForCompletion).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            onProgress: progressCallback,
          }),
        );
      }
    });

    it('should set appropriate timeout based on complexity', async () => {
      const simpleIssue = createMockIssue('issue-1', 'TEST-1', 'Fix typo', 'Simple fix');
      const complexIssue = createMockIssue('issue-2', 'TEST-2', 'Refactor system', 'Major work');

      const simpleAnalysis = await agent.analyzeTask(simpleIssue);
      simpleAnalysis.complexity = 'simple';
      const simpleDecision = await agent.makeDecision(simpleAnalysis);

      const complexAnalysis = await agent.analyzeTask(complexIssue);
      complexAnalysis.complexity = 'complex';
      const complexDecision = await agent.makeDecision(complexAnalysis);

      if (simpleDecision.shouldDelegate && complexDecision.shouldDelegate) {
        const simpleDelegation = await agent.delegate(simpleDecision, simpleAnalysis);
        const complexDelegation = await agent.delegate(complexDecision, complexAnalysis);

        await agent.monitor(simpleDelegation, simpleAnalysis);
        const simpleTimeout = (mockCodegenClient.waitForCompletion as any).mock.calls[0][1]
          .timeout;

        await agent.monitor(complexDelegation, complexAnalysis);
        const complexTimeout = (mockCodegenClient.waitForCompletion as any).mock.calls[1][1]
          .timeout;

        expect(complexTimeout).toBeGreaterThan(simpleTimeout);
      }
    });
  });

  describe('Complete Workflow', () => {
    it('should execute complete workflow successfully', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Fix bug', 'Bug description');
      const result = await agent.executeWorkflow(issue);

      expect(result).toBeDefined();
      expect(result.status).toBe('success');
      expect(result.issueId).toBe('issue-1');
      expect(result.issueIdentifier).toBe('TEST-1');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Boss Agent executing workflow',
        expect.objectContaining({
          issueId: 'issue-1',
          issueIdentifier: 'TEST-1',
        }),
      );
    });

    it('should handle workflow with comment', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Fix bug', 'Bug description');
      const comment = createMockComment('@claude please fix this');
      const result = await agent.executeWorkflow(issue, comment);

      expect(result).toBeDefined();
      expect(result.originalComment).toBe(comment);
    });

    it('should create and track session', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Fix bug', 'Bug description');
      await agent.executeWorkflow(issue);

      const sessions = agent.getActiveSessions();
      expect(sessions.length).toBeGreaterThan(0);
    });

    it('should handle workflow failure', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Fix bug', 'Bug description');

      // Mock failure
      (mockCodegenClient.runTask as any).mockRejectedValueOnce(new Error('API error'));

      const result = await agent.executeWorkflow(issue);

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should complete workflow within reasonable time', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Fix bug', 'Bug description');
      const startTime = Date.now();
      await agent.executeWorkflow(issue);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete quickly in tests
    });

    it('should not delegate if decision says no', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Unclear task', 'Very vague description');

      // Force non-delegation for testing
      const originalMakeDecision = agent.makeDecision.bind(agent);
      agent.makeDecision = async (analysis) => {
        const decision = await originalMakeDecision(analysis);
        decision.shouldDelegate = false;
        decision.reason = 'Task too vague';
        return decision;
      };

      const result = await agent.executeWorkflow(issue);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('not eligible for delegation');
    });
  });

  describe('Session Management', () => {
    it('should get active sessions', async () => {
      const issue1 = createMockIssue('issue-1', 'TEST-1', 'Fix bug 1', 'Bug 1');
      const issue2 = createMockIssue('issue-2', 'TEST-2', 'Fix bug 2', 'Bug 2');

      await agent.executeWorkflow(issue1);
      await agent.executeWorkflow(issue2);

      const sessions = agent.getActiveSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(2);
    });

    it('should get session by ID', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Fix bug', 'Bug description');
      await agent.executeWorkflow(issue);

      const sessions = agent.getActiveSessions();
      const sessionId = sessions[0].id;
      const session = agent.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session?.id).toBe(sessionId);
    });

    it('should get session count', async () => {
      const issue1 = createMockIssue('issue-1', 'TEST-1', 'Fix bug 1', 'Bug 1');
      const issue2 = createMockIssue('issue-2', 'TEST-2', 'Fix bug 2', 'Bug 2');

      await agent.executeWorkflow(issue1);
      await agent.executeWorkflow(issue2);

      const count = agent.getSessionCount();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should generate unique session IDs', async () => {
      const issue1 = createMockIssue('issue-1', 'TEST-1', 'Fix bug 1', 'Bug 1');
      const issue2 = createMockIssue('issue-2', 'TEST-2', 'Fix bug 2', 'Bug 2');

      await agent.executeWorkflow(issue1);
      await agent.executeWorkflow(issue2);

      const sessions = agent.getActiveSessions();
      const sessionIds = sessions.map((s) => s.id);

      // All IDs should be unique
      const uniqueIds = new Set(sessionIds);
      expect(uniqueIds.size).toBe(sessionIds.length);

      // IDs should have correct format
      sessionIds.forEach((id) => {
        expect(id).toMatch(/^boss-\d+-[a-z0-9]+$/);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing issue context', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Fix bug', 'Bug description');
      const analysis = await agent.analyzeTask(issue);
      analysis.context.issue = undefined;

      const decision = await agent.makeDecision(analysis);

      if (decision.shouldDelegate) {
        await expect(agent.delegate(decision, analysis)).rejects.toThrow(
          'Cannot build prompt: missing issue in context',
        );
      }
    });

    it('should handle Codegen API errors gracefully', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Fix bug', 'Bug description');

      (mockCodegenClient.runTask as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await agent.executeWorkflow(issue);

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    });

    it('should log errors appropriately', async () => {
      const issue = createMockIssue('issue-1', 'TEST-1', 'Fix bug', 'Bug description');

      (mockCodegenClient.runTask as any).mockRejectedValueOnce(new Error('Test error'));

      await agent.executeWorkflow(issue);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error),
        expect.any(Object),
      );
    });
  });
});
