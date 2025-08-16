/**
 * Mock Webhook Server for Testing Linear Integration
 * 
 * This module provides a complete testing framework that simulates:
 * - Linear webhook events
 * - HTTP server webhook endpoints
 * - Event processing pipeline
 * - Session management validation
 * - Agent execution simulation
 */

import { EventEmitter } from "events";
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
import {
  mockIntegrationConfig,
  mockUser,
  mockAgentUser,
  createMockWebhookEvent,
  createMockIssue,
  createMockComment,
  createMockLogger
} from "./mocks.js";

/**
 * Mock webhook server that simulates Linear webhook delivery
 */
export class MockWebhookServer extends EventEmitter {
  private config: IntegrationConfig;
  private logger: Logger;
  private webhookHandler: LinearWebhookHandler;
  private sessionManager: SessionManager;
  private isRunning: boolean = false;
  private processedEvents: ProcessedEvent[] = [];
  private activeSessions: Map<string, ClaudeSession> = new Map();

  constructor(config?: Partial<IntegrationConfig>) {
    super();
    this.config = { ...mockIntegrationConfig, ...config };
    this.logger = createMockLogger();
    this.webhookHandler = new LinearWebhookHandler(this.config, this.logger);
    this.sessionManager = new SessionManager(this.config, this.logger);
  }

  /**
   * Start the mock webhook server
   */
  async start(): Promise<void> {
    this.isRunning = true;
    this.logger.info("Mock webhook server started", {
      port: this.config.webhookPort,
      organizationId: this.config.linearOrganizationId
    });
    this.emit("server:started");
  }

  /**
   * Stop the mock webhook server
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    
    // Cancel all active sessions
    for (const session of this.activeSessions.values()) {
      if (session.status === SessionStatus.RUNNING) {
        await this.sessionManager.cancelSession(session.id);
      }
    }
    
    this.activeSessions.clear();
    this.processedEvents = [];
    
    this.logger.info("Mock webhook server stopped");
    this.emit("server:stopped");
  }

  /**
   * Simulate receiving a Linear webhook event
   */
  async receiveWebhook(event: LinearWebhookEvent): Promise<{
    processed: ProcessedEvent | null;
    session?: ClaudeSession;
    executionResult?: ClaudeExecutionResult;
  }> {
    if (!this.isRunning) {
      throw new Error("Mock server is not running");
    }

    this.logger.info("Webhook received", {
      type: event.type,
      action: event.action,
      organizationId: event.organizationId
    });

    this.emit("webhook:received", event);

    // 1. Process webhook event
    const processedEvent = await this.webhookHandler.processWebhook(event);
    
    if (!processedEvent) {
      this.emit("webhook:ignored", event);
      return { processed: null };
    }

    this.processedEvents.push(processedEvent);
    this.emit("webhook:processed", processedEvent);

    // 2. If event should trigger, create and start session
    if (processedEvent.shouldTrigger) {
      const session = await this.sessionManager.createSession(
        processedEvent.issue,
        processedEvent.comment
      );

      this.activeSessions.set(session.id, session);
      this.emit("session:created", session);

      // 3. Start session execution (mocked)
      const executionResult = await this.simulateClaudeExecution(
        session,
        processedEvent
      );

      this.emit("session:completed", session, executionResult);

      return {
        processed: processedEvent,
        session,
        executionResult
      };
    }

    return { processed: processedEvent };
  }

  /**
   * Simulate Claude Code execution based on event type and content
   */
  private async simulateClaudeExecution(
    session: ClaudeSession,
    event: ProcessedEvent
  ): Promise<ClaudeExecutionResult> {
    this.logger.info("Simulating Claude execution", {
      sessionId: session.id,
      issueId: event.issue.id,
      eventType: event.type
    });

    // Update session to running
    await this.sessionManager.updateSessionStatus(session.id, SessionStatus.RUNNING);
    
    // Simulate execution time
    await new Promise(resolve => setTimeout(resolve, 100));

    // Determine agent type and generate appropriate result
    const agentType = this.determineAgentType(event);
    const result = this.generateExecutionResult(agentType, event);

    // Update session based on result
    if (result.success) {
      await this.sessionManager.updateSessionStatus(session.id, SessionStatus.COMPLETED);
    } else {
      await this.sessionManager.updateSessionStatus(session.id, SessionStatus.FAILED);
    }

    return result;
  }

  /**
   * Determine the type of Claude agent based on the event
   */
  private determineAgentType(event: ProcessedEvent): string {
    const content = (event.comment?.body || event.issue.description || "").toLowerCase();

    if (content.includes("analyze") || content.includes("review")) {
      return "analysis";
    }
    if (content.includes("test") || content.includes("testing")) {
      return "testing";
    }
    if (content.includes("fix") || content.includes("bug")) {
      return "bugfix";
    }
    if (content.includes("document") || content.includes("docs")) {
      return "documentation";
    }
    if (content.includes("optimize") || content.includes("performance")) {
      return "performance";
    }
    if (content.includes("implement") || content.includes("create")) {
      return "implementation";
    }

    return "general";
  }

  /**
   * Generate mock execution result based on agent type
   */
  private generateExecutionResult(
    agentType: string,
    event: ProcessedEvent
  ): ClaudeExecutionResult {
    const baseResult = {
      success: true,
      duration: Math.floor(Math.random() * 1800000) + 300000, // 5-30 minutes
      exitCode: 0
    };

    switch (agentType) {
      case "analysis":
        return {
          ...baseResult,
          output: "Code analysis completed. Found 3 optimization opportunities and 2 potential issues.",
          filesModified: [
            "analysis/code-review.md",
            "analysis/recommendations.md"
          ],
          commits: [{
            hash: "analysis123",
            message: "analysis: code review and recommendations",
            author: "Claude Analysis Agent",
            timestamp: new Date(),
            files: ["analysis/code-review.md"]
          }]
        };

      case "testing":
        return {
          ...baseResult,
          output: "Test suite created with 85% coverage. Added 42 test cases including edge cases.",
          filesModified: [
            "tests/unit/component.test.ts",
            "tests/integration/api.test.ts",
            "tests/fixtures/test-data.ts"
          ],
          commits: [{
            hash: "test456",
            message: "test: comprehensive test suite for new features",
            author: "Claude Testing Agent",
            timestamp: new Date(),
            files: ["tests/unit/component.test.ts"]
          }]
        };

      case "bugfix":
        return {
          ...baseResult,
          output: "Bug fixed successfully. Root cause: improper input validation. Added comprehensive validation and tests.",
          filesModified: [
            "src/utils/validation.ts",
            "src/api/endpoints.ts",
            "tests/validation.test.ts"
          ],
          commits: [{
            hash: "fix789",
            message: "fix: resolve input validation bug in API endpoints",
            author: "Claude Bug Fix Agent",
            timestamp: new Date(),
            files: ["src/utils/validation.ts"]
          }]
        };

      case "documentation":
        return {
          ...baseResult,
          output: "Documentation updated with comprehensive API reference, examples, and migration guide.",
          filesModified: [
            "docs/api/reference.md",
            "docs/examples/usage.md",
            "README.md"
          ],
          commits: [{
            hash: "docs012",
            message: "docs: update API documentation and examples",
            author: "Claude Documentation Agent",
            timestamp: new Date(),
            files: ["docs/api/reference.md"]
          }]
        };

      case "performance":
        return {
          ...baseResult,
          output: "Performance optimized. Reduced response time by 60% through caching and query optimization.",
          filesModified: [
            "src/cache/redis-cache.ts",
            "src/database/optimized-queries.ts",
            "performance/benchmark-results.md"
          ],
          commits: [{
            hash: "perf345",
            message: "perf: optimize response times with caching and query improvements",
            author: "Claude Performance Agent",
            timestamp: new Date(),
            files: ["src/cache/redis-cache.ts"]
          }]
        };

      case "implementation":
        return {
          ...baseResult,
          output: "Feature implemented successfully with proper error handling and logging.",
          filesModified: [
            "src/features/new-feature.ts",
            "src/api/new-endpoints.ts",
            "src/types/feature-types.ts"
          ],
          commits: [{
            hash: "feat678",
            message: "feat: implement new feature with comprehensive error handling",
            author: "Claude Implementation Agent",
            timestamp: new Date(),
            files: ["src/features/new-feature.ts"]
          }]
        };

      default:
        return {
          ...baseResult,
          output: "Task completed successfully with appropriate changes.",
          filesModified: [
            "src/general/changes.ts"
          ],
          commits: [{
            hash: "general901",
            message: "chore: general improvements and updates",
            author: "Claude General Agent",
            timestamp: new Date(),
            files: ["src/general/changes.ts"]
          }]
        };
    }
  }

  /**
   * Get server statistics
   */
  getStats(): {
    isRunning: boolean;
    totalEvents: number;
    triggeredEvents: number;
    activeSessions: number;
    completedSessions: number;
  } {
    const triggeredEvents = this.processedEvents.filter(e => e.shouldTrigger).length;
    const activeSessions = Array.from(this.activeSessions.values())
      .filter(s => s.status === SessionStatus.RUNNING).length;
    const completedSessions = Array.from(this.activeSessions.values())
      .filter(s => s.status === SessionStatus.COMPLETED).length;

    return {
      isRunning: this.isRunning,
      totalEvents: this.processedEvents.length,
      triggeredEvents,
      activeSessions,
      completedSessions
    };
  }

  /**
   * Get all processed events
   */
  getProcessedEvents(): ProcessedEvent[] {
    return [...this.processedEvents];
  }

  /**
   * Get all sessions
   */
  getSessions(): ClaudeSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.processedEvents = [];
    this.activeSessions.clear();
  }
}

/**
 * Test scenario builder for common webhook patterns
 */
export class WebhookTestScenarioBuilder {
  /**
   * Create issue assignment scenario
   */
  static createIssueAssignmentScenario() {
    const issue = createMockIssue({
      title: "Implement user authentication service",
      description: "Create JWT-based authentication with refresh tokens",
      assignee: mockAgentUser
    });

    const event = createMockWebhookEvent({
      action: "update",
      type: "Issue",
      data: issue,
      actor: mockUser
    });

    return { issue, event };
  }

  /**
   * Create comment mention scenario
   */
  static createCommentMentionScenario(mentionText: string = "@claude please help with this issue") {
    const issue = createMockIssue({
      title: "Bug in payment processing",
      description: "Users experiencing payment failures"
    });

    const comment = createMockComment({
      body: mentionText,
      issue
    });

    const event = createMockWebhookEvent({
      action: "create",
      type: "Comment",
      data: comment,
      actor: mockUser
    });

    return { issue, comment, event };
  }

  /**
   * Create bug fix scenario
   */
  static createBugFixScenario() {
    const issue = createMockIssue({
      title: "CRITICAL: Memory leak in image processing",
      description: "Server crashes after processing 100+ images"
    });

    const comment = createMockComment({
      body: "@claude urgent bug fix needed - memory leak causing server crashes in production",
      issue
    });

    const event = createMockWebhookEvent({
      action: "create",
      type: "Comment",
      data: comment,
      actor: mockUser
    });

    return { issue, comment, event };
  }

  /**
   * Create testing request scenario
   */
  static createTestingScenario() {
    const issue = createMockIssue({
      title: "Add comprehensive tests for API gateway",
      description: "New API gateway needs thorough testing coverage"
    });

    const comment = createMockComment({
      body: "@claude add comprehensive tests for the API gateway including unit, integration, and load tests",
      issue
    });

    const event = createMockWebhookEvent({
      action: "create",
      type: "Comment",
      data: comment,
      actor: mockUser
    });

    return { issue, comment, event };
  }

  /**
   * Create performance optimization scenario
   */
  static createPerformanceScenario() {
    const issue = createMockIssue({
      title: "API response times too slow",
      description: "Average response time is 3 seconds, need to optimize to under 500ms"
    });

    const comment = createMockComment({
      body: "@claude optimize the API performance - current response times are unacceptable for production",
      issue
    });

    const event = createMockWebhookEvent({
      action: "create",
      type: "Comment",
      data: comment,
      actor: mockUser
    });

    return { issue, comment, event };
  }

  /**
   * Create multi-agent coordination scenario
   */
  static createMultiAgentScenario() {
    const issue = createMockIssue({
      title: "Implement complete OAuth2 authentication system",
      description: "Build OAuth2 system with Google/GitHub providers, comprehensive testing, and documentation"
    });

    const analysisComment = createMockComment({
      body: "@claude analyze the current auth system and design OAuth2 architecture",
      issue
    });

    const implementationComment = createMockComment({
      body: "@claude implement the OAuth2 system based on the analysis",
      issue
    });

    const testingComment = createMockComment({
      body: "@claude add comprehensive tests for OAuth2 including edge cases",
      issue
    });

    const docComment = createMockComment({
      body: "@claude document the OAuth2 API and integration guide",
      issue
    });

    return {
      issue,
      comments: [analysisComment, implementationComment, testingComment, docComment],
      events: [
        createMockWebhookEvent({ action: "create", type: "Comment", data: analysisComment, actor: mockUser }),
        createMockWebhookEvent({ action: "create", type: "Comment", data: implementationComment, actor: mockUser }),
        createMockWebhookEvent({ action: "create", type: "Comment", data: testingComment, actor: mockUser }),
        createMockWebhookEvent({ action: "create", type: "Comment", data: docComment, actor: mockUser })
      ]
    };
  }
}

/**
 * Integration test runner for webhook scenarios
 */
export class WebhookIntegrationTestRunner {
  private server: MockWebhookServer;

  constructor(config?: Partial<IntegrationConfig>) {
    this.server = new MockWebhookServer(config);
  }

  /**
   * Run a complete test scenario
   */
  async runScenario(
    name: string,
    events: LinearWebhookEvent[],
    expectedOutcomes: {
      triggeredEvents: number;
      sessionsCreated: number;
      specificAgentTypes?: string[];
    }
  ): Promise<{
    success: boolean;
    results: any[];
    stats: any;
    errors: string[];
  }> {
    const errors: string[] = [];
    const results: any[] = [];

    try {
      await this.server.start();

      // Process all events
      for (const event of events) {
        const result = await this.server.receiveWebhook(event);
        results.push(result);
      }

      // Verify outcomes
      const stats = this.server.getStats();
      
      if (stats.triggeredEvents !== expectedOutcomes.triggeredEvents) {
        errors.push(`Expected ${expectedOutcomes.triggeredEvents} triggered events, got ${stats.triggeredEvents}`);
      }

      if (stats.completedSessions !== expectedOutcomes.sessionsCreated) {
        errors.push(`Expected ${expectedOutcomes.sessionsCreated} sessions, got ${stats.completedSessions}`);
      }

      return {
        success: errors.length === 0,
        results,
        stats,
        errors
      };

    } catch (error) {
      errors.push(`Scenario execution failed: ${(error as Error).message}`);
      return {
        success: false,
        results,
        stats: this.server.getStats(),
        errors
      };
    } finally {
      await this.server.stop();
    }
  }

  /**
   * Run performance stress test
   */
  async runStressTest(
    eventCount: number,
    concurrentEvents: number = 10
  ): Promise<{
    success: boolean;
    processingTime: number;
    eventsPerSecond: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      await this.server.start();

      const startTime = Date.now();
      const events: LinearWebhookEvent[] = [];

      // Generate test events
      for (let i = 0; i < eventCount; i++) {
        const scenario = WebhookTestScenarioBuilder.createCommentMentionScenario(
          `@claude test event ${i + 1}`
        );
        events.push(scenario.event);
      }

      // Process events in batches
      const batches = [];
      for (let i = 0; i < events.length; i += concurrentEvents) {
        batches.push(events.slice(i, i + concurrentEvents));
      }

      for (const batch of batches) {
        await Promise.all(
          batch.map(event => this.server.receiveWebhook(event))
        );
      }

      const processingTime = Date.now() - startTime;
      const eventsPerSecond = (eventCount / processingTime) * 1000;

      return {
        success: true,
        processingTime,
        eventsPerSecond,
        errors
      };

    } catch (error) {
      errors.push(`Stress test failed: ${(error as Error).message}`);
      return {
        success: false,
        processingTime: 0,
        eventsPerSecond: 0,
        errors
      };
    } finally {
      await this.server.stop();
    }
  }
}

/**
 * Validation helpers for test assertions
 */
export class WebhookTestValidators {
  /**
   * Validate session was created correctly
   */
  static validateSession(session: ClaudeSession, expectedIssueId: string): boolean {
    return (
      session.issueId === expectedIssueId &&
      session.status !== undefined &&
      session.id.length > 0 &&
      session.workingDir.includes(".claude-sessions") &&
      session.startedAt instanceof Date
    );
  }

  /**
   * Validate execution result structure
   */
  static validateExecutionResult(result: ClaudeExecutionResult): boolean {
    return (
      typeof result.success === "boolean" &&
      typeof result.duration === "number" &&
      typeof result.exitCode === "number" &&
      Array.isArray(result.filesModified) &&
      Array.isArray(result.commits)
    );
  }

  /**
   * Validate webhook processing result
   */
  static validateProcessedEvent(event: ProcessedEvent, shouldTrigger: boolean): boolean {
    return (
      event.shouldTrigger === shouldTrigger &&
      event.issue !== undefined &&
      event.actor !== undefined &&
      event.timestamp instanceof Date &&
      (shouldTrigger ? event.triggerReason !== undefined : true)
    );
  }
}