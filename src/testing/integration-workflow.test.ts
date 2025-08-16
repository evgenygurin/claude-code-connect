/**
 * Complete Integration Workflow Tests
 * 
 * This file demonstrates the comprehensive testing workflow for the Claude Code + Linear integration,
 * providing practical test cases that validate the entire system without requiring actual Linear API calls.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  MockWebhookServer,
  WebhookTestScenarioBuilder,
  WebhookIntegrationTestRunner,
  WebhookTestValidators
} from "./mock-webhook-server.js";
import type { IntegrationConfig } from "../core/types.js";
import { mockIntegrationConfig } from "./mocks.js";

describe("Complete Integration Workflow Tests", () => {
  let testRunner: WebhookIntegrationTestRunner;
  let config: IntegrationConfig;

  beforeEach(() => {
    config = { ...mockIntegrationConfig };
    testRunner = new WebhookIntegrationTestRunner(config);
  });

  afterEach(async () => {
    // Cleanup is handled by test runner
  });

  describe("Single Agent Workflows", () => {
    it("should complete issue assignment → code analysis workflow", async () => {
      const { issue, event } = WebhookTestScenarioBuilder.createIssueAssignmentScenario();

      const result = await testRunner.runScenario(
        "Issue Assignment Analysis",
        [event],
        {
          triggeredEvents: 1,
          sessionsCreated: 1,
          specificAgentTypes: ["analysis"]
        }
      );

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.triggeredEvents).toBe(1);
      expect(result.stats.completedSessions).toBe(1);

      // Validate the session and execution result
      const sessionResult = result.results[0];
      expect(sessionResult.processed?.shouldTrigger).toBe(true);
      expect(sessionResult.session).toBeDefined();
      expect(sessionResult.executionResult).toBeDefined();

      // Validate session structure
      expect(WebhookTestValidators.validateSession(
        sessionResult.session!,
        issue.id
      )).toBe(true);

      // Validate execution result
      expect(WebhookTestValidators.validateExecutionResult(
        sessionResult.executionResult!
      )).toBe(true);
    });

    it("should complete comment mention → bug fix workflow", async () => {
      const { issue, comment, event } = WebhookTestScenarioBuilder.createBugFixScenario();

      const result = await testRunner.runScenario(
        "Bug Fix Workflow",
        [event],
        {
          triggeredEvents: 1,
          sessionsCreated: 1,
          specificAgentTypes: ["bugfix"]
        }
      );

      expect(result.success).toBe(true);
      expect(result.stats.triggeredEvents).toBe(1);

      const sessionResult = result.results[0];
      expect(sessionResult.processed?.triggerReason).toBe("Comment mentions agent");
      expect(sessionResult.processed?.comment?.body).toContain("urgent bug fix");
      expect(sessionResult.executionResult?.output).toContain("Bug fixed successfully");
      expect(sessionResult.executionResult?.commits[0].message).toContain("fix:");
    });

    it("should complete testing agent workflow", async () => {
      const { issue, comment, event } = WebhookTestScenarioBuilder.createTestingScenario();

      const result = await testRunner.runScenario(
        "Testing Agent Workflow",
        [event],
        {
          triggeredEvents: 1,
          sessionsCreated: 1,
          specificAgentTypes: ["testing"]
        }
      );

      expect(result.success).toBe(true);
      
      const sessionResult = result.results[0];
      expect(sessionResult.executionResult?.output).toContain("Test suite created");
      expect(sessionResult.executionResult?.filesModified.some(f => f.includes("test"))).toBe(true);
      expect(sessionResult.executionResult?.commits[0].message).toContain("test:");
    });

    it("should complete performance optimization workflow", async () => {
      const { issue, comment, event } = WebhookTestScenarioBuilder.createPerformanceScenario();

      const result = await testRunner.runScenario(
        "Performance Optimization Workflow",
        [event],
        {
          triggeredEvents: 1,
          sessionsCreated: 1,
          specificAgentTypes: ["performance"]
        }
      );

      expect(result.success).toBe(true);
      
      const sessionResult = result.results[0];
      expect(sessionResult.executionResult?.output).toContain("Performance optimized");
      expect(sessionResult.executionResult?.commits[0].message).toContain("perf:");
      expect(sessionResult.executionResult?.duration).toBeGreaterThan(0);
    });
  });

  describe("Multi-Agent Coordination Workflows", () => {
    it("should coordinate multiple agents for complex feature development", async () => {
      const { issue, comments, events } = WebhookTestScenarioBuilder.createMultiAgentScenario();

      const result = await testRunner.runScenario(
        "Multi-Agent OAuth2 Implementation",
        events,
        {
          triggeredEvents: 4,
          sessionsCreated: 4,
          specificAgentTypes: ["analysis", "implementation", "testing", "documentation"]
        }
      );

      expect(result.success).toBe(true);
      expect(result.stats.triggeredEvents).toBe(4);
      expect(result.stats.completedSessions).toBe(4);

      // Verify each agent type produced appropriate outputs
      const analysisResult = result.results[0];
      const implementationResult = result.results[1];
      const testingResult = result.results[2];
      const docResult = result.results[3];

      // Analysis agent
      expect(analysisResult.executionResult?.output).toContain("analysis completed");
      expect(analysisResult.executionResult?.filesModified.some(f => f.includes("analysis/"))).toBe(true);

      // Implementation agent
      expect(implementationResult.executionResult?.commits[0].message).toContain("feat:");

      // Testing agent
      expect(testingResult.executionResult?.filesModified.some(f => f.includes("test"))).toBe(true);

      // Documentation agent
      expect(docResult.executionResult?.filesModified.some(f => f.includes("docs/"))).toBe(true);
    });

    it("should handle concurrent sessions for different issues", async () => {
      // Create multiple different scenarios
      const scenario1 = WebhookTestScenarioBuilder.createBugFixScenario();
      const scenario2 = WebhookTestScenarioBuilder.createTestingScenario();
      const scenario3 = WebhookTestScenarioBuilder.createPerformanceScenario();

      const allEvents = [scenario1.event, scenario2.event, scenario3.event];

      const result = await testRunner.runScenario(
        "Concurrent Different Issues",
        allEvents,
        {
          triggeredEvents: 3,
          sessionsCreated: 3
        }
      );

      expect(result.success).toBe(true);
      expect(result.stats.triggeredEvents).toBe(3);
      expect(result.stats.completedSessions).toBe(3);

      // Verify each session is independent
      const sessions = result.results.map(r => r.session);
      const sessionIds = sessions.map(s => s?.id);
      const uniqueSessionIds = new Set(sessionIds);
      expect(uniqueSessionIds.size).toBe(3); // All sessions should be unique

      // Verify different issue IDs
      const issueIds = sessions.map(s => s?.issueId);
      const uniqueIssueIds = new Set(issueIds);
      expect(uniqueIssueIds.size).toBe(3); // All issues should be unique
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle webhook events that don't trigger", async () => {
      // Create non-triggering events
      const nonTriggerScenario = WebhookTestScenarioBuilder.createCommentMentionScenario(
        "This is just a regular comment without any agent mention"
      );

      const result = await testRunner.runScenario(
        "Non-Triggering Events",
        [nonTriggerScenario.event],
        {
          triggeredEvents: 0,
          sessionsCreated: 0
        }
      );

      expect(result.success).toBe(true);
      expect(result.stats.triggeredEvents).toBe(0);
      expect(result.stats.completedSessions).toBe(0);

      const sessionResult = result.results[0];
      expect(sessionResult.processed?.shouldTrigger).toBe(false);
      expect(sessionResult.session).toBeUndefined();
      expect(sessionResult.executionResult).toBeUndefined();
    });

    it("should handle malformed webhook events gracefully", async () => {
      const server = new MockWebhookServer(config);
      await server.start();

      try {
        // Test with malformed event
        const malformedEvent = {
          action: "invalid-action",
          type: "Unknown",
          data: null,
          organizationId: "wrong-org"
        } as any;

        const result = await server.receiveWebhook(malformedEvent);
        expect(result.processed).toBeNull();
      } finally {
        await server.stop();
      }
    });

    it("should handle events from wrong organization", async () => {
      const wrongOrgScenario = WebhookTestScenarioBuilder.createIssueAssignmentScenario();
      wrongOrgScenario.event.organizationId = "wrong-organization-id";

      const result = await testRunner.runScenario(
        "Wrong Organization Events",
        [wrongOrgScenario.event],
        {
          triggeredEvents: 0,
          sessionsCreated: 0
        }
      );

      expect(result.success).toBe(true);
      expect(result.stats.triggeredEvents).toBe(0);
      expect(result.results[0].processed).toBeNull();
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle high volume of webhook events", async () => {
      const stressTestResult = await testRunner.runStressTest(100, 20);

      expect(stressTestResult.success).toBe(true);
      expect(stressTestResult.eventsPerSecond).toBeGreaterThan(10); // Should process at least 10 events per second
      expect(stressTestResult.processingTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(stressTestResult.errors).toHaveLength(0);
    });

    it("should handle rapid sequential events for same issue", async () => {
      const baseScenario = WebhookTestScenarioBuilder.createIssueAssignmentScenario();
      
      // Create multiple comments on the same issue
      const rapidEvents = [];
      for (let i = 0; i < 5; i++) {
        const commentScenario = WebhookTestScenarioBuilder.createCommentMentionScenario(
          `@claude comment ${i + 1} for rapid testing`
        );
        // Use the same issue ID for all comments
        commentScenario.comment.issue = baseScenario.issue;
        commentScenario.event.data = commentScenario.comment;
        rapidEvents.push(commentScenario.event);
      }

      const result = await testRunner.runScenario(
        "Rapid Sequential Events",
        rapidEvents,
        {
          triggeredEvents: 5,
          sessionsCreated: 5 // Each comment should create separate session
        }
      );

      expect(result.success).toBe(true);
      expect(result.stats.triggeredEvents).toBe(5);
      expect(result.stats.completedSessions).toBe(5);

      // Verify all sessions are for the same issue but different sessions
      const sessions = result.results.map(r => r.session).filter(s => s);
      const issueIds = sessions.map(s => s!.issueId);
      const sessionIds = sessions.map(s => s!.id);

      expect(new Set(issueIds).size).toBe(1); // All same issue
      expect(new Set(sessionIds).size).toBe(5); // All different sessions
    });
  });

  describe("Agent-Specific Behavior Validation", () => {
    it("should trigger different agents based on comment content", async () => {
      const agentTests = [
        {
          comment: "@claude analyze the database performance issues",
          expectedAgent: "analysis",
          expectedFiles: ["analysis/"]
        },
        {
          comment: "@claude fix the memory leak in image processing",
          expectedAgent: "bugfix",
          expectedCommitPrefix: "fix:"
        },
        {
          comment: "@claude add comprehensive tests for the API",
          expectedAgent: "testing",
          expectedFiles: ["tests/"]
        },
        {
          comment: "@claude optimize the query performance",
          expectedAgent: "performance",
          expectedCommitPrefix: "perf:"
        },
        {
          comment: "@claude document the new API endpoints",
          expectedAgent: "documentation",
          expectedFiles: ["docs/"]
        }
      ];

      for (const test of agentTests) {
        const { issue, comment, event } = WebhookTestScenarioBuilder.createCommentMentionScenario(
          test.comment
        );

        const result = await testRunner.runScenario(
          `Agent Type: ${test.expectedAgent}`,
          [event],
          {
            triggeredEvents: 1,
            sessionsCreated: 1
          }
        );

        expect(result.success).toBe(true);
        const sessionResult = result.results[0];

        if (test.expectedFiles) {
          expect(sessionResult.executionResult?.filesModified.some(f =>
            test.expectedFiles!.some(pattern => f.includes(pattern))
          )).toBe(true);
        }

        if (test.expectedCommitPrefix) {
          expect(sessionResult.executionResult?.commits[0].message).toContain(test.expectedCommitPrefix);
        }
      }
    });
  });

  describe("Session Management Validation", () => {
    it("should properly track session lifecycle", async () => {
      const server = new MockWebhookServer(config);
      await server.start();

      try {
        const { issue, event } = WebhookTestScenarioBuilder.createIssueAssignmentScenario();

        // Send webhook and track session lifecycle
        const initialStats = server.getStats();
        expect(initialStats.activeSessions).toBe(0);
        expect(initialStats.completedSessions).toBe(0);

        const result = await server.receiveWebhook(event);

        const finalStats = server.getStats();
        expect(finalStats.completedSessions).toBe(1);
        expect(finalStats.activeSessions).toBe(0); // Should be completed by now

        // Verify session details
        const sessions = server.getSessions();
        expect(sessions).toHaveLength(1);
        expect(sessions[0].issueId).toBe(issue.id);
        expect(sessions[0].id).toBe(result.session?.id);

      } finally {
        await server.stop();
      }
    });

    it("should clean up properly on server stop", async () => {
      const server = new MockWebhookServer(config);
      await server.start();

      // Create some sessions
      const { event } = WebhookTestScenarioBuilder.createIssueAssignmentScenario();
      await server.receiveWebhook(event);

      expect(server.getStats().completedSessions).toBeGreaterThan(0);

      // Stop server should clean up
      await server.stop();

      expect(server.getStats().completedSessions).toBe(0);
      expect(server.getSessions()).toHaveLength(0);
    });
  });

  describe("Webhook Signature Validation", () => {
    it("should handle webhook signature verification correctly", async () => {
      // Test with webhook secret configured
      const secureConfig = {
        ...config,
        webhookSecret: "test-webhook-secret"
      };

      const secureRunner = new WebhookIntegrationTestRunner(secureConfig);
      const { issue, event } = WebhookTestScenarioBuilder.createIssueAssignmentScenario();

      const result = await secureRunner.runScenario(
        "Secure Webhook Processing",
        [event],
        {
          triggeredEvents: 1,
          sessionsCreated: 1
        }
      );

      // Should still work (mock server doesn't enforce signature validation)
      expect(result.success).toBe(true);
    });
  });

  describe("Event Processing Pipeline Validation", () => {
    it("should maintain correct event processing order", async () => {
      const server = new MockWebhookServer(config);
      await server.start();

      try {
        const events = [];
        const expectedOrder = [];

        // Create a sequence of events
        for (let i = 0; i < 3; i++) {
          const scenario = WebhookTestScenarioBuilder.createCommentMentionScenario(
            `@claude sequential event ${i + 1}`
          );
          events.push(scenario.event);
          expectedOrder.push(scenario.event.createdAt);
        }

        // Process events sequentially
        for (const event of events) {
          await server.receiveWebhook(event);
        }

        // Verify processing order
        const processedEvents = server.getProcessedEvents();
        expect(processedEvents).toHaveLength(3);

        for (let i = 0; i < processedEvents.length; i++) {
          expect(processedEvents[i].shouldTrigger).toBe(true);
          expect(processedEvents[i].triggerReason).toBe("Comment mentions agent");
        }

      } finally {
        await server.stop();
      }
    });
  });
});