/**
 * Integration tests for Testing Agent end-to-end functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TestingAgent } from "./agent.js";
import { TestingAgentCLI } from "./cli.js";
import type { IntegrationConfig } from "../core/types.js";
import { mockIntegrationConfig, createMockLogger } from "./mocks.js";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

// Mock file system operations
vi.mock("fs/promises", () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  rm: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn()
}));

vi.mock("glob", () => ({
  glob: vi.fn()
}));

describe("Testing Agent Integration", () => {
  let testingAgent: TestingAgent;
  let cli: TestingAgentCLI;
  let loggerSpy: ReturnType<typeof createMockLogger>;
  let config: IntegrationConfig;
  let mockGlob: any;
  let mockReadFile: any;
  let mockWriteFile: any;
  let mockMkdir: any;

  beforeEach(() => {
    vi.clearAllMocks();
    loggerSpy = createMockLogger();
    config = { ...mockIntegrationConfig };
    testingAgent = new TestingAgent(config, loggerSpy);
    cli = new TestingAgentCLI(config);

    // Setup mocks
    mockGlob = vi.mocked(require("glob").glob);
    mockReadFile = vi.mocked(require("fs/promises").readFile);
    mockWriteFile = vi.mocked(require("fs/promises").writeFile);
    mockMkdir = vi.mocked(require("fs/promises").mkdir);

    // Mock successful file operations
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("End-to-End Workflow", () => {
    it("should perform complete analysis and generation workflow", async () => {
      // Mock file discovery
      mockGlob
        .mockResolvedValueOnce([
          "/project/src/sessions/manager.ts",
          "/project/src/webhooks/handler.ts",
          "/project/src/core/types.ts",
          "/project/src/utils/logger.ts"
        ])
        .mockResolvedValueOnce([
          "/project/src/utils/logger.test.ts"
        ]);

      // Mock file content for analysis
      const sessionManagerContent = `
        import type { ClaudeSession, SessionStorage } from "../core/types.js";

        export class SessionManager {
          private storage: SessionStorage;
          
          constructor(config: IntegrationConfig, logger: Logger, storage?: SessionStorage) {
            this.config = config;
            this.logger = logger;
            this.storage = storage || new InMemorySessionStorage(logger);
          }

          async createSession(issue: Issue, triggerComment?: Comment): Promise<ClaudeSession> {
            const sessionId = nanoid();
            const workingDir = this.getWorkingDirectory(sessionId);
            
            if (this.config.createBranches) {
              const branchName = this.generateBranchName(issue);
              // Create git branch logic
            }
            
            const session = {
              id: sessionId,
              issueId: issue.id,
              status: SessionStatus.CREATED,
              // ... more session setup
            };
            
            await this.storage.save(session);
            return session;
          }

          async startSession(sessionId: string, issue: Issue): Promise<ClaudeExecutionResult> {
            const session = await this.storage.load(sessionId);
            
            if (!session) {
              throw new Error("Session not found");
            }
            
            if (session.status === SessionStatus.RUNNING) {
              throw new Error("Session already running");
            }
            
            try {
              const result = await this.executor.execute(context);
              await this.updateSessionStatus(sessionId, SessionStatus.COMPLETED);
              return result;
            } catch (error) {
              await this.updateSessionStatus(sessionId, SessionStatus.FAILED);
              throw error;
            }
          }
        }
      `;

      const webhookHandlerContent = `
        import { z } from "zod";
        import type { LinearWebhookEvent, ProcessedEvent } from "../core/types.js";

        export class LinearWebhookHandler {
          constructor(config: IntegrationConfig, logger: Logger) {
            this.config = config;
            this.logger = logger;
          }

          validateWebhook(payload: unknown): LinearWebhookEvent | null {
            try {
              const result = WebhookEventSchema.parse(payload);
              return result as LinearWebhookEvent;
            } catch (error) {
              this.logger.error("Validation failed", error);
              return null;
            }
          }

          async processWebhook(event: LinearWebhookEvent): Promise<ProcessedEvent | null> {
            if (event.organizationId !== this.config.linearOrganizationId) {
              return null;
            }

            switch (event.type) {
              case "Issue":
                return await this.processIssueEvent(event);
              case "Comment":
                return await this.processCommentEvent(event);
              default:
                return null;
            }
          }

          verifySignature(payload: string, signature: string): boolean {
            if (!this.config.webhookSecret) {
              return true;
            }
            
            const crypto = require("crypto");
            const expectedSignature = crypto
              .createHmac("sha256", this.config.webhookSecret)
              .update(payload)
              .digest("hex");
              
            return crypto.timingSafeEqual(
              Buffer.from(expectedSignature),
              Buffer.from(signature.replace("sha256=", ""))
            );
          }
        }
      `;

      const typesContent = `
        export interface ClaudeSession {
          id: string;
          issueId: string;
          status: SessionStatus;
        }

        export const SessionStatus = {
          CREATED: "created",
          RUNNING: "running",
          COMPLETED: "completed"
        } as const;
      `;

      const loggerContent = `
        export class ConsoleLogger implements Logger {
          info(message: string) { console.log(message); }
          error(message: string, error?: Error) { console.error(message, error); }
        }
      `;

      mockReadFile
        .mockResolvedValueOnce(sessionManagerContent)
        .mockResolvedValueOnce(webhookHandlerContent)
        .mockResolvedValueOnce(typesContent)
        .mockResolvedValueOnce(loggerContent);

      // Step 1: Analyze coverage
      const coverage = await testingAgent.analyzeCoverage();

      expect(coverage.totalSourceFiles).toBe(4);
      expect(coverage.testedFiles).toBe(1); // Only logger has tests
      expect(coverage.coveragePercentage).toBe(25); // 1/4 * 100
      expect(coverage.missingTests).toHaveLength(3);
      expect(coverage.recommendations).toHaveLength(3);

      // Verify SessionManager has highest priority
      const sessionManagerRec = coverage.recommendations.find(r => r.componentName === "SessionManager");
      expect(sessionManagerRec).toBeDefined();
      expect(sessionManagerRec!.priority).toBeGreaterThanOrEqual(8);

      // Step 2: Generate test for SessionManager
      const highestPriorityRec = coverage.recommendations
        .sort((a, b) => b.priority - a.priority)[0];

      expect(highestPriorityRec.componentName).toBe("SessionManager");

      const generatedTest = await testingAgent.generateSampleTest(highestPriorityRec);

      // Verify generated test content
      expect(generatedTest).toContain("describe(\"SessionManager\"");
      expect(generatedTest).toContain("import { SessionManager }");
      expect(generatedTest).toContain("mockLogger: Logger");
      expect(generatedTest).toContain("mockConfig: IntegrationConfig");
      expect(generatedTest).toContain("new SessionManager(");
      expect(generatedTest).toContain("toBeInstanceOf(SessionManager)");

      // Verify async test patterns
      expect(generatedTest).toContain("async operations");
      expect(generatedTest).toContain("error handling");

      // Step 3: Verify file would be written correctly
      expect(highestPriorityRec.suggestedTestFile).toBe("src/sessions/manager.test.ts");

      // Step 4: Test scenarios should be comprehensive
      expect(highestPriorityRec.scenarios).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            description: expect.stringContaining("instantiation"),
            type: "unit"
          }),
          expect.objectContaining({
            description: expect.stringContaining("Async operations"),
            type: "unit"
          })
        ])
      );

      // Step 5: Verify recommendations are practical
      const webhookRec = coverage.recommendations.find(r => r.componentName === "LinearWebhookHandler");
      expect(webhookRec?.scenarios).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            description: expect.stringContaining("validation"),
            type: "unit"
          })
        ])
      );
    });

    it("should handle complex real-world codebase analysis", async () => {
      // Simulate a larger, more complex project structure
      mockGlob
        .mockResolvedValueOnce([
          "/project/src/sessions/manager.ts",
          "/project/src/sessions/storage.ts",
          "/project/src/webhooks/handler.ts",
          "/project/src/webhooks/router.ts",
          "/project/src/claude/executor.ts",
          "/project/src/linear/client.ts",
          "/project/src/server/integration.ts",
          "/project/src/utils/config.ts",
          "/project/src/utils/logger.ts",
          "/project/src/core/types.ts"
        ])
        .mockResolvedValueOnce([
          "/project/src/utils/config.test.ts",
          "/project/src/utils/logger.test.ts"
        ]);

      // Mock complex file content
      const complexContent = `
        import { LinearClient } from "@linear/sdk";
        import { z } from "zod";
        import crypto from "crypto";

        export class ComplexWebhookProcessor {
          constructor(
            private config: IntegrationConfig,
            private logger: Logger,
            private linearClient: LinearClient,
            private sessionManager: SessionManager
          ) {}

          async processEvent(event: LinearWebhookEvent): Promise<ProcessedEvent> {
            // Complex validation chain
            if (!this.validateEvent(event)) {
              throw new Error("Invalid event");
            }

            if (!await this.verifyPermissions(event.actor)) {
              throw new Error("Insufficient permissions");
            }

            // Multi-step processing
            switch (event.type) {
              case "Issue":
                return await this.handleIssue(event);
              case "Comment":
                return await this.handleComment(event);
              default:
                return await this.handleUnknown(event);
            }
          }

          private async handleIssue(event: LinearWebhookEvent): Promise<ProcessedEvent> {
            const issue = await this.linearClient.issue(event.data.id);
            
            if (event.action === "create") {
              await this.onIssueCreated(issue);
            } else if (event.action === "update") {
              await this.onIssueUpdated(issue, event.data.previousState);
            }

            return this.buildProcessedEvent(event, issue);
          }

          private validateEvent(event: LinearWebhookEvent): boolean {
            const schema = z.object({
              type: z.string(),
              action: z.enum(["create", "update", "remove"]),
              data: z.any(),
              organizationId: z.string()
            });

            try {
              schema.parse(event);
              return true;
            } catch {
              return false;
            }
          }
        }
      `;

      mockReadFile.mockResolvedValue(complexContent);

      const coverage = await testingAgent.analyzeCoverage();

      expect(coverage.totalSourceFiles).toBe(10);
      expect(coverage.testedFiles).toBe(2);
      expect(coverage.coveragePercentage).toBe(20);

      // Verify complex components get high priority
      const complexRec = coverage.recommendations.find(r => 
        r.componentName === "ComplexWebhookProcessor"
      );
      
      expect(complexRec).toBeDefined();
      expect(complexRec!.priority).toBeGreaterThanOrEqual(7);

      // Should identify multiple scenario types
      expect(complexRec!.scenarios).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "unit" }),
          expect.objectContaining({ type: "integration" })
        ])
      );

      // Should detect external dependencies
      expect(complexRec!.scenarios.some(s => 
        s.dependencies.includes("@linear/sdk") || 
        s.dependencies.includes("zod")
      )).toBe(true);
    });
  });

  describe("CLI Integration", () => {
    it("should support full CLI workflow", async () => {
      // Mock console.log to capture CLI output
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Mock basic project with missing tests
      mockGlob
        .mockResolvedValueOnce([
          "/project/src/sessions/manager.ts",
          "/project/src/webhooks/handler.ts"
        ])
        .mockResolvedValueOnce([]); // No existing tests

      mockReadFile.mockResolvedValue(`
        export class TestComponent {
          async processData() {
            return "processed";
          }
        }
      `);

      // Test coverage analysis
      await cli.analyzeCoverage();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Analyzing test coverage")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Coverage: 0%")
      );

      // Test single file generation
      await cli.generateTest("src/sessions/manager.ts");

      expect(mockMkdir).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalledWith(
        "src/sessions/manager.test.ts",
        expect.stringContaining("describe(\"TestComponent\"")
      );

      consoleSpy.mockRestore();
    });

    it("should handle CLI error scenarios gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("Process exit called");
      });

      // Mock file system error
      mockGlob.mockRejectedValue(new Error("File system error"));

      await expect(cli.analyzeCoverage()).rejects.toThrow("Process exit called");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to analyze coverage"),
        "File system error"
      );

      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });
  });

  describe("Mock Data Integration", () => {
    it("should use mock data effectively in generated tests", async () => {
      mockGlob
        .mockResolvedValueOnce(["/project/src/test/component.ts"])
        .mockResolvedValueOnce([]);

      const componentContent = `
        import type { Issue, Comment } from "@linear/sdk";
        
        export class IssueProcessor {
          async processIssue(issue: Issue, comment?: Comment): Promise<string> {
            if (comment?.body.includes("@claude")) {
              return "triggered";
            }
            return "ignored";
          }
        }
      `;

      mockReadFile.mockResolvedValue(componentContent);

      const coverage = await testingAgent.analyzeCoverage();
      const recommendation = coverage.recommendations[0];
      const generatedTest = await testingAgent.generateSampleTest(recommendation);

      // Should import and use proper mock data
      expect(generatedTest).toContain("import {");
      expect(generatedTest).toContain("from \"../testing/mocks.js\"");
      expect(generatedTest).toContain("mockConfig: IntegrationConfig");
      expect(generatedTest).toContain("mockLogger: Logger");

      // Should include Linear SDK specific patterns
      expect(generatedTest).toContain("Issue");
      expect(generatedTest).toContain("Comment");
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle large codebases efficiently", async () => {
      // Simulate large project with many files
      const manyFiles = Array.from({ length: 100 }, (_, i) => 
        `/project/src/module${i}/component${i}.ts`
      );

      mockGlob
        .mockResolvedValueOnce(manyFiles)
        .mockResolvedValueOnce([]);

      mockReadFile.mockResolvedValue(`
        export class Component {
          process() { return true; }
        }
      `);

      const startTime = Date.now();
      const coverage = await testingAgent.analyzeCoverage();
      const duration = Date.now() - startTime;

      expect(coverage.totalSourceFiles).toBe(100);
      expect(coverage.recommendations).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it("should prioritize correctly across many components", async () => {
      const mixedFiles = [
        "/project/src/sessions/manager.ts",      // High priority
        "/project/src/webhooks/handler.ts",     // High priority
        "/project/src/utils/helper.ts",         // Low priority
        "/project/src/config/settings.ts"      // Low priority
      ];

      mockGlob
        .mockResolvedValueOnce(mixedFiles)
        .mockResolvedValueOnce([]);

      const highPriorityContent = `
        export class SessionManager {
          async createSession() {}
          async startSession() {}
          async cancelSession() {}
        }
      `;

      const lowPriorityContent = `
        export function formatString(str: string): string {
          return str.trim();
        }
      `;

      mockReadFile
        .mockResolvedValueOnce(highPriorityContent)
        .mockResolvedValueOnce(highPriorityContent)
        .mockResolvedValueOnce(lowPriorityContent)
        .mockResolvedValueOnce(lowPriorityContent);

      const coverage = await testingAgent.analyzeCoverage();
      const sortedRecs = coverage.recommendations.sort((a, b) => b.priority - a.priority);

      // Core components should be first
      expect(sortedRecs[0].componentName).toBe("SessionManager");
      expect(sortedRecs[1].componentName).toBe("SessionManager");
      expect(sortedRecs[0].priority).toBeGreaterThan(sortedRecs[2].priority);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle malformed source files gracefully", async () => {
      mockGlob
        .mockResolvedValueOnce(["/project/src/broken.ts"])
        .mockResolvedValueOnce([]);

      const malformedContent = `
        // Malformed TypeScript
        export class BrokenClass {
          // Missing closing brace
          method() {
            return "broken"
      `;

      mockReadFile.mockResolvedValue(malformedContent);

      const coverage = await testingAgent.analyzeCoverage();

      // Should still provide some analysis even with malformed files
      expect(coverage.totalSourceFiles).toBe(1);
      // May or may not find the broken class, but shouldn't crash
      expect(coverage.recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle empty or minimal files", async () => {
      mockGlob
        .mockResolvedValueOnce([
          "/project/src/empty.ts",
          "/project/src/minimal.ts"
        ])
        .mockResolvedValueOnce([]);

      mockReadFile
        .mockResolvedValueOnce("// Empty file")
        .mockResolvedValueOnce("const VALUE = 42;"); // No exports

      const coverage = await testingAgent.analyzeCoverage();

      expect(coverage.totalSourceFiles).toBe(2);
      expect(coverage.recommendations).toEqual([]); // No testable components
    });
  });
});