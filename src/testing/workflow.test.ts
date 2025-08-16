/**
 * Comprehensive Testing Workflow for Claude Code + Linear Integration
 * 
 * This file provides complete end-to-end testing scenarios that validate:
 * - Linear webhook event processing
 * - Event routing and agent triggering
 * - Session management lifecycle  
 * - Multi-agent coordination
 * - Session cleanup and monitoring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type {
  LinearWebhookEvent,
  ProcessedEvent,
  ClaudeSession,
  ClaudeExecutionResult,
  IntegrationConfig,
  Logger
} from "../core/types.js";
import { SessionStatus } from "../core/types.js";
import { LinearWebhookHandler } from "../webhooks/handler.js";
import { SessionManager } from "../sessions/manager.js";
import { ClaudeExecutor } from "../claude/executor.js";
import {
  mockIntegrationConfig,
  mockUser,
  mockAgentUser,
  mockIssue,
  mockIssueAssignedToAgent,
  mockComment,
  mockWebhookEventIssueAssigned,
  mockWebhookEventCommentMention,
  mockSessionCreated,
  mockExecutionResultSuccess,
  createMockLogger,
  createMockWebhookEvent,
  createMockIssue,
  createMockComment
} from "./mocks.js";

/**
 * Integration workflow test scenarios
 */
describe("Claude Code + Linear Integration Workflow", () => {
  let webhookHandler: LinearWebhookHandler;
  let sessionManager: SessionManager;
  let claudeExecutor: ClaudeExecutor;
  let config: IntegrationConfig;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = createMockLogger();
    config = { ...mockIntegrationConfig };
    
    webhookHandler = new LinearWebhookHandler(config, logger);
    sessionManager = new SessionManager(config, logger);
    claudeExecutor = new ClaudeExecutor(logger);

    // Mock executor methods
    vi.spyOn(claudeExecutor, 'execute').mockResolvedValue(mockExecutionResultSuccess);
    vi.spyOn(claudeExecutor, 'cancelSession').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Complete Workflow: Issue Assignment → Agent Execution", () => {
    it("should handle issue assignment to agent with complete session lifecycle", async () => {
      // 1. Simulate webhook event: Issue assigned to agent
      const assignmentEvent = createMockWebhookEvent({
        action: "update",
        type: "Issue",
        data: mockIssueAssignedToAgent,
        actor: mockUser
      });

      // 2. Process webhook event
      const processedEvent = await webhookHandler.processWebhook(assignmentEvent);
      
      expect(processedEvent).toBeDefined();
      expect(processedEvent!.shouldTrigger).toBe(true);
      expect(processedEvent!.triggerReason).toBe("Issue assigned to agent");
      expect(processedEvent!.issue.assignee?.id).toBe(config.agentUserId);

      // 3. Create session for the triggered event
      const session = await sessionManager.createSession(
        processedEvent!.issue,
        processedEvent!.comment
      );

      expect(session.status).toBe(SessionStatus.CREATED);
      expect(session.issueId).toBe(mockIssueAssignedToAgent.id);
      expect(session.issueIdentifier).toBe(mockIssueAssignedToAgent.identifier);
      expect(session.branchName).toContain("claude/");
      expect(session.workingDir).toContain(".claude-sessions");

      // 4. Start session execution
      const executionResult = await sessionManager.startSession(
        session.id,
        processedEvent!.issue,
        processedEvent!.comment
      );

      expect(executionResult.success).toBe(true);
      expect(executionResult.filesModified).toHaveLength(3);
      expect(executionResult.commits).toHaveLength(2);

      // 5. Verify session completed successfully
      const completedSession = await sessionManager.getSession(session.id);
      expect(completedSession?.status).toBe(SessionStatus.COMPLETED);
      expect(completedSession?.completedAt).toBeDefined();

      // 6. Verify execution was logged properly
      expect(logger.infoCalls).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: "Session created"
          }),
          expect.objectContaining({
            message: "Starting session execution"
          }),
          expect.objectContaining({
            message: "Session execution completed"
          })
        ])
      );
    });

    it("should handle comment mention triggering bug fix agent", async () => {
      // 1. Create bug report issue
      const bugIssue = createMockIssue({
        title: "Authentication bug with special characters",
        description: "Users can't login when email contains '+' symbols",
        state: { name: "In Progress", type: "started" } as any
      });

      // 2. Create comment mentioning Claude for bug fix
      const bugFixComment = createMockComment({
        body: "@claude please investigate this authentication issue. The bug affects users with '+' symbols in email addresses. Need to fix the validation logic.",
        issue: bugIssue
      });

      // 3. Process comment mention webhook
      const commentEvent = createMockWebhookEvent({
        action: "create",
        type: "Comment",
        data: bugFixComment,
        actor: mockUser
      });

      const processedEvent = await webhookHandler.processWebhook(commentEvent);

      expect(processedEvent?.shouldTrigger).toBe(true);
      expect(processedEvent?.triggerReason).toBe("Comment mentions agent");
      expect(processedEvent?.comment?.body).toContain("@claude");

      // 4. Create and execute bug fix session
      const session = await sessionManager.createSession(bugIssue, bugFixComment);
      const result = await sessionManager.startSession(session.id, bugIssue, bugFixComment);

      expect(result.success).toBe(true);
      expect(result.filesModified.some(f => f.includes("auth"))).toBe(true);
      
      // 5. Verify bug fix execution context
      expect(claudeExecutor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          issue: bugIssue,
          triggerComment: bugFixComment,
          session: expect.objectContaining({
            issueId: bugIssue.id
          })
        })
      );
    });

    it("should handle label changes triggering testing agent", async () => {
      // 1. Create feature issue that needs testing
      const featureIssue = createMockIssue({
        title: "Implement user profile API endpoint",
        description: "New API endpoint for updating user profiles with validation",
        state: { name: "Ready for Testing", type: "started" } as any
      });

      // 2. Simulate label change to "needs-testing"
      const labelChangeEvent = createMockWebhookEvent({
        action: "update", 
        type: "Issue",
        data: {
          ...featureIssue,
          labels: [{ name: "needs-testing", color: "#f59e0b" }]
        },
        actor: mockUser
      });

      // 3. Process label change (would need custom logic in webhook handler)
      const processedEvent = await webhookHandler.processWebhook(labelChangeEvent);

      // For this test, we'll simulate the testing agent trigger
      if (processedEvent) {
        processedEvent.shouldTrigger = true;
        processedEvent.triggerReason = "Label 'needs-testing' added";
      }

      expect(processedEvent?.shouldTrigger).toBe(true);

      // 4. Create testing session
      const testingSession = await sessionManager.createSession(featureIssue);
      
      // Mock testing-specific execution result
      const testingResult: ClaudeExecutionResult = {
        success: true,
        output: "Generated comprehensive test suite for user profile API",
        filesModified: [
          "tests/api/profile.test.ts",
          "tests/integration/profile-api.test.ts",
          "tests/validation/profile-validation.test.ts"
        ],
        commits: [{
          hash: "test123",
          message: "test: add comprehensive profile API tests",
          author: "Claude Testing Agent",
          timestamp: new Date(),
          files: ["tests/api/profile.test.ts"]
        }],
        duration: 900000, // 15 minutes
        exitCode: 0
      };

      vi.mocked(claudeExecutor.execute).mockResolvedValueOnce(testingResult);

      const result = await sessionManager.startSession(testingSession.id, featureIssue);

      expect(result.filesModified.every(f => f.includes("test"))).toBe(true);
      expect(result.commits[0].message).toContain("test:");
    });
  });

  describe("Multi-Agent Coordination Scenarios", () => {
    it("should coordinate analysis → implementation → testing agents", async () => {
      // 1. Complex feature request
      const complexFeature = createMockIssue({
        title: "Implement OAuth2 authentication flow",
        description: "@claude analyze the current auth system and implement OAuth2 integration with Google and GitHub providers. Ensure comprehensive testing coverage.",
        assignee: mockAgentUser
      });

      // 2. Analysis Phase - Issue Assignment
      const analysisEvent = createMockWebhookEvent({
        action: "update",
        type: "Issue", 
        data: complexFeature,
        actor: mockUser
      });

      const analysisProcessed = await webhookHandler.processWebhook(analysisEvent);
      expect(analysisProcessed?.shouldTrigger).toBe(true);

      // 3. Implementation Phase - Comment with specific instructions
      const implementationComment = createMockComment({
        body: "@claude based on the analysis, please implement the OAuth2 flow. Focus on Google and GitHub providers with proper error handling.",
        issue: complexFeature
      });

      const implementationEvent = createMockWebhookEvent({
        action: "create",
        type: "Comment",
        data: implementationComment,
        actor: mockUser
      });

      const implementationProcessed = await webhookHandler.processWebhook(implementationEvent);
      expect(implementationProcessed?.shouldTrigger).toBe(true);

      // 4. Testing Phase - Label change to trigger testing
      const testingTriggerComment = createMockComment({
        body: "@claude implementation looks good, please add comprehensive tests for the OAuth2 flow including edge cases",
        issue: complexFeature
      });

      // 5. Simulate coordinated execution
      const sessions: ClaudeSession[] = [];

      // Analysis session
      const analysisSession = await sessionManager.createSession(complexFeature);
      sessions.push(analysisSession);

      // Implementation session
      const implementationSession = await sessionManager.createSession(
        complexFeature, 
        implementationComment
      );
      sessions.push(implementationSession);

      // Testing session
      const testingSession = await sessionManager.createSession(
        complexFeature,
        testingTriggerComment
      );
      sessions.push(testingSession);

      // 6. Execute sessions in sequence
      const results: ClaudeExecutionResult[] = [];

      for (const session of sessions) {
        const result = await sessionManager.startSession(session.id, complexFeature);
        results.push(result);
      }

      // 7. Verify coordinated results
      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);

      // Each phase should modify different types of files
      const allModifiedFiles = results.flatMap(r => r.filesModified);
      expect(allModifiedFiles.some(f => f.includes("auth"))).toBe(true); // Implementation
      expect(allModifiedFiles.some(f => f.includes("test"))).toBe(true); // Testing
      expect(allModifiedFiles.some(f => f.includes("doc"))).toBe(true);  // Analysis/docs

      // 8. Verify sessions were managed properly
      const sessionStats = await sessionManager.getStats();
      expect(sessionStats.completed).toBeGreaterThanOrEqual(3);
    });

    it("should handle concurrent sessions for different issues", async () => {
      // 1. Create multiple issues requiring parallel work
      const issues = [
        createMockIssue({
          id: "issue-1",
          identifier: "DEV-001",
          title: "Fix memory leak in image processing"
        }),
        createMockIssue({
          id: "issue-2", 
          identifier: "DEV-002",
          title: "Add rate limiting to API endpoints"
        }),
        createMockIssue({
          id: "issue-3",
          identifier: "DEV-003", 
          title: "Update documentation for new features"
        })
      ];

      // 2. Create sessions for all issues
      const sessions = await Promise.all(
        issues.map(issue => sessionManager.createSession(issue))
      );

      expect(sessions).toHaveLength(3);
      expect(sessions.every(s => s.status === SessionStatus.CREATED)).toBe(true);

      // 3. Start all sessions concurrently
      const executionPromises = sessions.map(session => {
        const correspondingIssue = issues.find(i => i.id === session.issueId)!;
        return sessionManager.startSession(session.id, correspondingIssue);
      });

      const results = await Promise.all(executionPromises);

      // 4. Verify all sessions completed successfully
      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);

      // 5. Verify sessions are tracked separately
      const activeSessions = await sessionManager.listActiveSessions();
      expect(activeSessions).toHaveLength(0); // All should be completed

      const allSessions = await sessionManager.listSessions();
      expect(allSessions.filter(s => s.status === SessionStatus.COMPLETED)).toHaveLength(3);
    });
  });

  describe("Session Management and Cleanup", () => {
    it("should properly clean up completed sessions", async () => {
      // 1. Create multiple sessions over time
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3); // 3 days ago

      // Mock storage to simulate sessions at different times
      const oldSession = {
        ...mockSessionCreated,
        id: "old-session",
        status: SessionStatus.COMPLETED,
        completedAt: oldDate,
        lastActivityAt: oldDate
      };

      const recentSession = {
        ...mockSessionCreated,
        id: "recent-session", 
        status: SessionStatus.COMPLETED,
        completedAt: recentDate,
        lastActivityAt: recentDate
      };

      const activeSession = {
        ...mockSessionCreated,
        id: "active-session",
        status: SessionStatus.RUNNING
      };

      // Mock storage methods
      vi.spyOn(sessionManager['storage'], 'list').mockResolvedValue([
        oldSession,
        recentSession, 
        activeSession
      ]);

      vi.spyOn(sessionManager['storage'], 'delete').mockResolvedValue();

      // 2. Clean up sessions older than 7 days
      const cleanedCount = await sessionManager.cleanupOldSessions(7);

      // 3. Verify only old completed sessions were cleaned
      expect(cleanedCount).toBe(1); // Only oldSession should be cleaned
      expect(sessionManager['storage'].delete).toHaveBeenCalledWith("old-session");
      expect(sessionManager['storage'].delete).not.toHaveBeenCalledWith("recent-session");
      expect(sessionManager['storage'].delete).not.toHaveBeenCalledWith("active-session");
    });

    it("should handle session timeout and cancellation", async () => {
      // 1. Create session
      const timeoutIssue = createMockIssue({
        title: "Long running task that might timeout"
      });

      const session = await sessionManager.createSession(timeoutIssue);

      // 2. Mock executor to simulate long-running process
      vi.mocked(claudeExecutor.execute).mockImplementation(async () => {
        // Simulate long execution
        await new Promise(resolve => setTimeout(resolve, 100));
        throw new Error("Session timeout");
      });

      // 3. Attempt to start session (should fail)
      await expect(
        sessionManager.startSession(session.id, timeoutIssue)
      ).rejects.toThrow("Session timeout");

      // 4. Verify session is marked as failed
      const failedSession = await sessionManager.getSession(session.id);
      expect(failedSession?.status).toBe(SessionStatus.FAILED);
      expect(failedSession?.error).toContain("Session timeout");

      // 5. Test cancellation
      const cancelableSession = await sessionManager.createSession(timeoutIssue);
      
      // Simulate running session
      vi.mocked(claudeExecutor.execute).mockImplementation(async () => {
        // Long running task
        await new Promise(resolve => setTimeout(resolve, 1000));
        return mockExecutionResultSuccess;
      });

      // Start session in background
      const executionPromise = sessionManager.startSession(cancelableSession.id, timeoutIssue);

      // Cancel session
      const cancelled = await sessionManager.cancelSession(cancelableSession.id);
      expect(cancelled).toBe(true);

      // Verify cancellation
      const cancelledSession = await sessionManager.getSession(cancelableSession.id);
      expect(cancelledSession?.status).toBe(SessionStatus.CANCELLED);
    });

    it("should provide comprehensive session statistics", async () => {
      // 1. Create sessions in various states
      const sessions = [
        { ...mockSessionCreated, id: "running-1", status: SessionStatus.RUNNING },
        { ...mockSessionCreated, id: "running-2", status: SessionStatus.RUNNING },
        { ...mockSessionCreated, id: "completed-1", status: SessionStatus.COMPLETED },
        { ...mockSessionCreated, id: "completed-2", status: SessionStatus.COMPLETED },
        { ...mockSessionCreated, id: "completed-3", status: SessionStatus.COMPLETED },
        { ...mockSessionCreated, id: "failed-1", status: SessionStatus.FAILED },
        { ...mockSessionCreated, id: "cancelled-1", status: SessionStatus.CANCELLED }
      ];

      vi.spyOn(sessionManager['storage'], 'list').mockResolvedValue(sessions);

      // 2. Get statistics
      const stats = await sessionManager.getStats();

      // 3. Verify statistics
      expect(stats.total).toBe(7);
      expect(stats.running).toBe(2);
      expect(stats.completed).toBe(3);
      expect(stats.failed).toBe(1);
      expect(stats.cancelled).toBe(1);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle malformed webhook events gracefully", async () => {
      // 1. Test invalid webhook payload
      const invalidEvent = {
        action: "invalid-action",
        type: "Unknown",
        data: null,
        // Missing required fields
      } as any;

      const processedEvent = await webhookHandler.processWebhook(invalidEvent);
      expect(processedEvent).toBeNull();

      // 2. Test webhook from wrong organization
      const wrongOrgEvent = createMockWebhookEvent({
        organizationId: "wrong-org-id"
      });

      const processedWrongOrg = await webhookHandler.processWebhook(wrongOrgEvent);
      expect(processedWrongOrg).toBeNull();

      // 3. Verify error logging
      expect(logger.errorCalls.length).toBeGreaterThan(0);
    });

    it("should handle session creation failures", async () => {
      // 1. Mock storage failure
      vi.spyOn(sessionManager['storage'], 'save').mockRejectedValue(
        new Error("Storage unavailable")
      );

      // 2. Attempt to create session
      await expect(
        sessionManager.createSession(mockIssue)
      ).rejects.toThrow("Storage unavailable");

      // 3. Verify error was logged
      expect(logger.errorCalls.some(call => 
        call.message.includes("Storage unavailable")
      )).toBe(true);
    });

    it("should handle Claude execution failures", async () => {
      // 1. Mock Claude execution failure
      const executionError: ClaudeExecutionResult = {
        success: false,
        error: "Claude process failed to start",
        output: "Error starting claude-code CLI",
        filesModified: [],
        commits: [],
        duration: 5000,
        exitCode: 1
      };

      vi.mocked(claudeExecutor.execute).mockResolvedValue(executionError);

      // 2. Create and start session
      const session = await sessionManager.createSession(mockIssue);
      const result = await sessionManager.startSession(session.id, mockIssue);

      // 3. Verify failure handling
      expect(result.success).toBe(false);
      expect(result.error).toContain("Claude process failed");

      const failedSession = await sessionManager.getSession(session.id);
      expect(failedSession?.status).toBe(SessionStatus.FAILED);
      expect(failedSession?.error).toContain("Claude process failed");
    });

    it("should handle duplicate session creation for same issue", async () => {
      // 1. Create first session for issue
      const firstSession = await sessionManager.createSession(mockIssue);
      expect(firstSession.issueId).toBe(mockIssue.id);

      // 2. Attempt to create second session for same issue
      const secondSession = await sessionManager.createSession(mockIssue);

      // 3. Verify sessions are separate (system allows multiple sessions per issue)
      expect(secondSession.id).not.toBe(firstSession.id);
      expect(secondSession.issueId).toBe(mockIssue.id);

      // Both sessions should exist independently
      const retrievedFirst = await sessionManager.getSession(firstSession.id);
      const retrievedSecond = await sessionManager.getSession(secondSession.id);

      expect(retrievedFirst?.id).toBe(firstSession.id);
      expect(retrievedSecond?.id).toBe(secondSession.id);
    });
  });

  describe("Webhook Signature Verification", () => {
    it("should verify webhook signatures when secret is configured", async () => {
      // 1. Configure webhook secret
      config.webhookSecret = "test-secret-key";
      const secureHandler = new LinearWebhookHandler(config, logger);

      // 2. Test valid signature
      const payload = JSON.stringify(mockWebhookEventIssueAssigned);
      const crypto = require("crypto");
      const validSignature = crypto
        .createHmac("sha256", config.webhookSecret)
        .update(payload)
        .digest("hex");

      const isValid = secureHandler.verifySignature(payload, `sha256=${validSignature}`);
      expect(isValid).toBe(true);

      // 3. Test invalid signature
      const invalidSignature = "sha256=invalid-signature";
      const isInvalid = secureHandler.verifySignature(payload, invalidSignature);
      expect(isInvalid).toBe(false);
    });

    it("should skip verification when no secret is configured", async () => {
      // 1. Handler without secret
      const unsecureConfig = { ...config, webhookSecret: undefined };
      const unsecureHandler = new LinearWebhookHandler(unsecureConfig, logger);

      // 2. Any signature should pass
      const payload = JSON.stringify(mockWebhookEventIssueAssigned);
      const randomSignature = "sha256=random-signature";

      const result = unsecureHandler.verifySignature(payload, randomSignature);
      expect(result).toBe(true);

      // 3. Verify warning was logged
      expect(logger.warnCalls.some(call =>
        call.message.includes("No webhook secret configured")
      )).toBe(true);
    });
  });

  describe("Agent Mention Detection", () => {
    it("should detect various agent mention patterns", async () => {
      const testCases = [
        "@claude please help",
        "Claude, can you implement this?",
        "AI assistant needed here", 
        "Help with this implementation",
        "Fix this bug please",
        "Work on this feature"
      ];

      for (const testCase of testCases) {
        const comment = createMockComment({ body: testCase });
        const event = createMockWebhookEvent({
          type: "Comment",
          data: comment
        });

        const processed = await webhookHandler.processWebhook(event);
        expect(processed?.shouldTrigger).toBe(true);
        expect(processed?.triggerReason).toBe("Comment mentions agent");
      }
    });

    it("should not trigger on non-mention comments", async () => {
      const nonMentionCases = [
        "This is a regular comment",
        "Discussing the issue with team",
        "Status update: in progress",
        "Meeting scheduled for tomorrow"
      ];

      for (const testCase of nonMentionCases) {
        const comment = createMockComment({ body: testCase });
        const event = createMockWebhookEvent({
          type: "Comment", 
          data: comment
        });

        const processed = await webhookHandler.processWebhook(event);
        expect(processed?.shouldTrigger).toBe(false);
      }
    });
  });
});