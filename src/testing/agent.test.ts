/**
 * Tests for TestingAgent - demonstrating its capabilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TestingAgent } from "./agent.js";
import type { IntegrationConfig, Logger } from "../core/types.js";
import { mockIntegrationConfig, createMockLogger } from "./mocks.js";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

// Mock fs/promises for file system operations
vi.mock("fs/promises", () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  stat: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  rm: vi.fn()
}));

// Mock glob for file pattern matching
vi.mock("glob", () => ({
  glob: vi.fn()
}));

describe("TestingAgent", () => {
  let testingAgent: TestingAgent;
  let loggerSpy: ReturnType<typeof createMockLogger>;
  let config: IntegrationConfig;
  let mockGlob: any;
  let mockReadFile: any;

  beforeEach(() => {
    vi.clearAllMocks();
    loggerSpy = createMockLogger();
    config = { ...mockIntegrationConfig };
    testingAgent = new TestingAgent(config, loggerSpy);
    
    // Setup mocks
    mockGlob = vi.mocked(require("glob").glob);
    mockReadFile = vi.mocked(require("fs/promises").readFile);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("instantiation", () => {
    it("should create instance with valid config and logger", () => {
      const agent = new TestingAgent(config, loggerSpy);
      expect(agent).toBeInstanceOf(TestingAgent);
    });
  });

  describe("analyzeCoverage", () => {
    it("should analyze test coverage for project", async () => {
      // Mock file discovery
      mockGlob
        .mockResolvedValueOnce([
          "/test/project/src/sessions/manager.ts",
          "/test/project/src/webhooks/handler.ts",
          "/test/project/src/core/types.ts"
        ])
        .mockResolvedValueOnce([
          "/test/project/src/sessions/manager.test.ts"
        ]);

      // Mock file content reading
      mockReadFile.mockResolvedValue(`
        export class SessionManager {
          async createSession() {}
          async startSession() {}
        }
      `);

      const coverage = await testingAgent.analyzeCoverage();

      expect(coverage).toBeDefined();
      expect(coverage.totalSourceFiles).toBe(3);
      expect(coverage.testedFiles).toBe(1);
      expect(coverage.coveragePercentage).toBe(33); // 1/3 * 100
      expect(coverage.missingTests).toHaveLength(2);
      expect(coverage.recommendations).toBeInstanceOf(Array);
    });

    it("should log analysis start and completion", async () => {
      mockGlob.mockResolvedValue([]);

      await testingAgent.analyzeCoverage();

      expect(loggerSpy.info).toHaveBeenCalledWith("Starting test coverage analysis");
      expect(loggerSpy.info).toHaveBeenCalledWith("Test coverage analysis completed", expect.any(Object));
    });

    it("should handle file system errors gracefully", async () => {
      mockGlob.mockRejectedValue(new Error("File system error"));

      await expect(testingAgent.analyzeCoverage()).rejects.toThrow("File system error");
      expect(loggerSpy.error).toHaveBeenCalledWith(
        "Failed to analyze test coverage",
        expect.any(Error)
      );
    });
  });

  describe("generateRecommendations", () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue(`
        import { SessionStatus } from "../core/types.js";
        
        export class SessionManager {
          private storage: SessionStorage;
          
          constructor(config: IntegrationConfig, logger: Logger) {
            this.config = config;
            this.logger = logger;
          }
          
          async createSession(issue: Issue): Promise<ClaudeSession> {
            // Complex session creation logic
            if (config.createBranches) {
              await this.createBranch();
            }
            return session;
          }
          
          async startSession(id: string): Promise<void> {
            const session = await this.storage.load(id);
            if (!session) throw new Error("Not found");
            // More complex logic...
          }
        }
      `);
    });

    it("should generate recommendations for files", async () => {
      const files = ["src/sessions/manager.ts", "src/webhooks/handler.ts"];
      const recommendations = await testingAgent.generateRecommendations(files);

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBe(2);
      
      const sessionManagerRec = recommendations.find(r => r.componentName === "SessionManager");
      expect(sessionManagerRec).toBeDefined();
      expect(sessionManagerRec?.priority).toBeGreaterThan(5); // Should be high priority
      expect(sessionManagerRec?.scenarios).toBeInstanceOf(Array);
    });

    it("should prioritize core components higher", async () => {
      const files = ["src/sessions/manager.ts", "src/utils/helper.ts"];
      const recommendations = await testingAgent.generateRecommendations(files);

      const sessionManagerRec = recommendations.find(r => r.targetFile.includes("manager"));
      const utilsRec = recommendations.find(r => r.targetFile.includes("helper"));

      expect(sessionManagerRec?.priority).toBeGreaterThan(utilsRec?.priority || 0);
    });

    it("should handle file analysis errors gracefully", async () => {
      mockReadFile.mockRejectedValue(new Error("Permission denied"));

      const files = ["src/invalid/file.ts"];
      const recommendations = await testingAgent.generateRecommendations(files);

      expect(recommendations).toEqual([]);
      expect(loggerSpy.warn).toHaveBeenCalled();
    });

    it("should skip files with no exportable components", async () => {
      mockReadFile.mockResolvedValue(`
        // Just some internal helper functions
        function internalHelper() {}
        const CONSTANT = 42;
      `);

      const files = ["src/internal/constants.ts"];
      const recommendations = await testingAgent.generateRecommendations(files);

      expect(recommendations).toEqual([]);
    });
  });

  describe("generateSampleTest", () => {
    it("should generate class test template", async () => {
      mockReadFile.mockResolvedValue(`
        export class SessionManager {
          constructor(config: IntegrationConfig) {}
          async createSession(): Promise<Session> {}
        }
      `);

      const recommendation = {
        targetFile: "src/sessions/manager.ts",
        componentName: "SessionManager",
        priority: 8,
        reason: "Core session management logic",
        scenarios: [
          {
            description: "Component instantiation",
            type: "unit" as const,
            complexity: "simple" as const,
            dependencies: [],
            mocks: ["Logger"]
          }
        ],
        suggestedTestFile: "src/sessions/manager.test.ts"
      };

      const testContent = await testingAgent.generateSampleTest(recommendation);

      expect(testContent).toContain("describe(\"SessionManager\"");
      expect(testContent).toContain("import { SessionManager }");
      expect(testContent).toContain("new SessionManager(");
      expect(testContent).toContain("toBeInstanceOf(SessionManager)");
    });

    it("should generate function test template", async () => {
      mockReadFile.mockResolvedValue(`
        export function validateWebhook(payload: unknown): boolean {
          return true;
        }
      `);

      const recommendation = {
        targetFile: "src/utils/validation.ts",
        componentName: "validateWebhook",
        priority: 6,
        reason: "Input validation logic",
        scenarios: [],
        suggestedTestFile: "src/utils/validation.test.ts"
      };

      const testContent = await testingAgent.generateSampleTest(recommendation);

      expect(testContent).toContain("describe(\"validateWebhook\"");
      expect(testContent).toContain("import { validateWebhook }");
    });

    it("should include proper imports and mock setup", async () => {
      mockReadFile.mockResolvedValue(`
        export class TestClass {
          constructor() {}
        }
      `);

      const recommendation = {
        targetFile: "src/test/class.ts",
        componentName: "TestClass",
        priority: 5,
        reason: "Test",
        scenarios: [],
        suggestedTestFile: "src/test/class.test.ts"
      };

      const testContent = await testingAgent.generateSampleTest(recommendation);

      expect(testContent).toContain("import { describe, it, expect, beforeEach, afterEach, vi }");
      expect(testContent).toContain("import { TestClass }");
      expect(testContent).toContain("const mockLogger: Logger");
      expect(testContent).toContain("const mockConfig: IntegrationConfig");
    });
  });

  describe("code analysis", () => {
    it("should extract classes and functions from code", async () => {
      const code = `
        import { Logger } from "./types.js";
        
        export class SessionManager {
          constructor() {}
        }
        
        export async function validateInput() {}
        export function helperFunction() {}
      `;
      mockReadFile.mockResolvedValue(code);

      const recommendations = await testingAgent.generateRecommendations(["test.ts"]);
      const rec = recommendations[0];

      expect(rec.componentName).toBe("SessionManager"); // Should pick first class
    });

    it("should calculate complexity based on code structure", async () => {
      const complexCode = `
        export class ComplexManager {
          async processData(input: any) {
            if (input.type === "A") {
              for (const item of input.items) {
                if (item.valid) {
                  await this.processItem(item);
                } else {
                  try {
                    await this.handleInvalid(item);
                  } catch (error) {
                    this.logger.error("Failed", error);
                  }
                }
              }
            } else if (input.type === "B") {
              switch (input.subtype) {
                case "B1":
                  return await this.handleB1(input);
                case "B2":
                  return await this.handleB2(input);
                default:
                  throw new Error("Unknown subtype");
              }
            }
          }
        }
      `;
      mockReadFile.mockResolvedValue(complexCode);

      const recommendations = await testingAgent.generateRecommendations(["complex.ts"]);
      const rec = recommendations[0];

      expect(rec.priority).toBeGreaterThan(7); // High complexity should increase priority
    });

    it("should generate appropriate test scenarios", async () => {
      const asyncCode = `
        import { LinearClient } from "@linear/sdk";
        import { z } from "zod";
        
        export class WebhookHandler {
          async validateAndProcess(data: unknown) {
            const validated = schema.parse(data);
            return await this.client.process(validated);
          }
        }
      `;
      mockReadFile.mockResolvedValue(asyncCode);

      const recommendations = await testingAgent.generateRecommendations(["handler.ts"]);
      const rec = recommendations[0];

      expect(rec.scenarios).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            description: expect.stringContaining("Async operations"),
            type: "unit"
          }),
          expect.objectContaining({
            description: expect.stringContaining("Linear SDK integration"),
            type: "integration"
          }),
          expect.objectContaining({
            description: expect.stringContaining("Input validation"),
            type: "unit"
          })
        ])
      );
    });
  });

  describe("file path handling", () => {
    it("should generate correct test file paths", async () => {
      mockReadFile.mockResolvedValue("export class Test {}");

      const recommendations = await testingAgent.generateRecommendations([
        "src/sessions/manager.ts",
        "src/webhooks/handler.ts",
        "src/core/types.ts"
      ]);

      expect(recommendations[0].suggestedTestFile).toBe("src/sessions/manager.test.ts");
      expect(recommendations[1].suggestedTestFile).toBe("src/webhooks/handler.test.ts");
      expect(recommendations[2].suggestedTestFile).toBe("src/core/types.test.ts");
    });

    it("should handle nested directory structures", async () => {
      mockReadFile.mockResolvedValue("export class Deep {}");

      const recommendations = await testingAgent.generateRecommendations([
        "src/deeply/nested/directory/component.ts"
      ]);

      expect(recommendations[0].suggestedTestFile).toBe(
        "src/deeply/nested/directory/component.test.ts"
      );
    });
  });

  describe("priority calculation", () => {
    const testCases = [
      {
        file: "src/sessions/manager.ts",
        expectedMinPriority: 8,
        description: "session management file"
      },
      {
        file: "src/webhooks/handler.ts", 
        expectedMinPriority: 8,
        description: "webhook handler file"
      },
      {
        file: "src/claude/executor.ts",
        expectedMinPriority: 7,
        description: "claude executor file"
      },
      {
        file: "src/utils/helper.ts",
        expectedMinPriority: 5,
        description: "utility file"
      }
    ];

    testCases.forEach(({ file, expectedMinPriority, description }) => {
      it(`should assign high priority to ${description}`, async () => {
        mockReadFile.mockResolvedValue("export class Component {}");

        const recommendations = await testingAgent.generateRecommendations([file]);
        const rec = recommendations[0];

        expect(rec.priority).toBeGreaterThanOrEqual(expectedMinPriority);
      });
    });
  });

  describe("integration with existing test files", () => {
    it("should map existing tests to source files correctly", async () => {
      mockGlob
        .mockResolvedValueOnce([
          "/project/src/sessions/manager.ts",
          "/project/src/webhooks/handler.ts",
          "/project/src/core/types.ts"
        ])
        .mockResolvedValueOnce([
          "/project/src/sessions/manager.test.ts",
          "/project/test/integration/webhooks.spec.ts"
        ]);

      mockReadFile.mockResolvedValue("export class Test {}");

      const coverage = await testingAgent.analyzeCoverage();

      expect(coverage.testedFiles).toBe(2); // manager.ts and handler.ts should be detected as tested
      expect(coverage.missingTests).toEqual(["src/core/types.ts"]);
    });
  });
});