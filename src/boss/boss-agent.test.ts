/**
 * Boss Agent Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { BossAgent } from "./boss-agent.js";
import type { BossAgentConfig } from "./types.js";
import type { Logger } from "../core/types.js";

// Mock logger
const mockLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

// Mock Linear issue
const createMockIssue = (title: string, description?: string) => ({
  id: "test-issue-123",
  identifier: "TEST-123",
  title,
  description,
  url: "https://linear.app/test/issue/TEST-123",
  createdAt: new Date(),
  updatedAt: new Date(),
  creator: { id: "user-1", name: "Test User" },
  state: Promise.resolve({ name: "Todo", type: "triage" as const }),
  team: Promise.resolve({ id: "team-1", name: "Engineering" }),
});

describe("BossAgent", () => {
  let bossAgent: BossAgent;
  let config: BossAgentConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      maxConcurrentAgents: 3,
      maxDelegationDepth: 2,
      delegationThreshold: 6,
      agentCapabilities: [],
      autoDelegation: true,
    };

    bossAgent = new BossAgent(config, mockLogger);
  });

  describe("analyzeIssue", () => {
    it("should analyze simple bug fix as low complexity", async () => {
      const issue = createMockIssue(
        "Fix typo in documentation",
        "There is a typo in the README",
      );

      const analysis = await bossAgent.analyzeIssue(issue as any);

      expect(analysis).toBeDefined();
      expect(analysis.complexity).toBeLessThan(6);
      expect(analysis.recommendedAgents).toContain("docs");
    });

    it("should analyze backend API task as medium complexity", async () => {
      const issue = createMockIssue(
        "Implement user authentication API",
        "We need to implement JWT-based authentication with login and signup endpoints",
      );

      const analysis = await bossAgent.analyzeIssue(issue as any);

      expect(analysis).toBeDefined();
      expect(analysis.complexity).toBeGreaterThanOrEqual(5);
      expect(analysis.recommendedAgents).toContain("backend");
      expect(analysis.recommendedAgents).toContain("security");
    });

    it("should analyze refactoring as high complexity", async () => {
      const issue = createMockIssue(
        "Refactor entire authentication architecture",
        "Major refactor of the authentication system with breaking changes",
      );

      const analysis = await bossAgent.analyzeIssue(issue as any);

      expect(analysis).toBeDefined();
      expect(analysis.complexity).toBeGreaterThanOrEqual(7);
    });

    it("should identify multiple agent types for complex tasks", async () => {
      const issue = createMockIssue(
        "Build complete user dashboard",
        "Implement frontend UI with React, backend API endpoints, database schema, and comprehensive tests",
      );

      const analysis = await bossAgent.analyzeIssue(issue as any);

      expect(analysis.recommendedAgents.length).toBeGreaterThan(1);
      expect(analysis.recommendedAgents).toContain("frontend");
      expect(analysis.recommendedAgents).toContain("backend");
      expect(analysis.recommendedAgents).toContain("database");
      expect(analysis.recommendedAgents).toContain("test");
    });
  });

  describe("createDelegationPlan", () => {
    it("should create delegation plan from analysis", async () => {
      const issue = createMockIssue(
        "Implement API endpoints",
        "Create REST API endpoints for user management",
      );

      const analysis = await bossAgent.analyzeIssue(issue as any);
      const plan = await bossAgent.createDelegationPlan(analysis);

      expect(plan).toBeDefined();
      expect(Array.isArray(plan)).toBe(true);
      expect(plan.length).toBeGreaterThan(0);

      // Check task structure
      const task = plan[0];
      expect(task.id).toBeDefined();
      expect(task.title).toBeDefined();
      expect(task.description).toBeDefined();
      expect(task.agentType).toBeDefined();
      expect(task.priority).toBeGreaterThan(0);
      expect(task.status).toBe("pending");
    });

    it("should sort tasks by priority", async () => {
      const issue = createMockIssue(
        "Security audit and frontend updates",
        "Perform security audit and update UI components",
      );

      const analysis = await bossAgent.analyzeIssue(issue as any);
      const plan = await bossAgent.createDelegationPlan(analysis);

      // Security tasks should have higher priority than frontend
      const securityTask = plan.find((t) => t.agentType === "security");
      const frontendTask = plan.find((t) => t.agentType === "frontend");

      if (securityTask && frontendTask) {
        expect(securityTask.priority).toBeGreaterThan(frontendTask.priority);
      }
    });
  });

  describe("aggregateResults", () => {
    it("should aggregate successful task results", async () => {
      const tasks = [
        {
          id: "task-1",
          title: "Backend task",
          description: "API implementation",
          agentType: "backend" as const,
          priority: 8,
          status: "completed" as const,
          createdAt: new Date(),
          result: {
            success: true,
            output: "API endpoints created",
            filesModified: ["src/api/users.ts"],
            duration: 5000,
          },
        },
        {
          id: "task-2",
          title: "Frontend task",
          description: "UI implementation",
          agentType: "frontend" as const,
          priority: 6,
          status: "completed" as const,
          createdAt: new Date(),
          result: {
            success: true,
            output: "UI components created",
            filesModified: ["src/components/UserDashboard.tsx"],
            duration: 3000,
          },
        },
      ];

      const result = await bossAgent.aggregateResults(tasks);

      expect(result.success).toBe(true);
      expect(result.filesModified.length).toBe(2);
      expect(result.duration).toBe(8000);
      expect(result.output).toContain("Completed");
    });

    it("should handle failed tasks", async () => {
      const tasks = [
        {
          id: "task-1",
          title: "Backend task",
          description: "API implementation",
          agentType: "backend" as const,
          priority: 8,
          status: "failed" as const,
          createdAt: new Date(),
          result: {
            success: false,
            error: "Compilation error",
            duration: 1000,
          },
        },
      ];

      const result = await bossAgent.aggregateResults(tasks);

      expect(result.success).toBe(false);
      expect(result.error).toContain("failed");
    });
  });

  describe("Boss Agent Philosophy", () => {
    it("should NOT execute tasks itself", () => {
      // Boss Agent should only have analysis and delegation methods
      expect(typeof bossAgent.analyzeIssue).toBe("function");
      expect(typeof bossAgent.createDelegationPlan).toBe("function");
      expect(typeof bossAgent.delegateTask).toBe("function");
      expect(typeof bossAgent.aggregateResults).toBe("function");

      // Boss Agent should NOT have execute methods
      expect((bossAgent as any).execute).toBeUndefined();
      expect((bossAgent as any).runCode).toBeUndefined();
      expect((bossAgent as any).executeCommand).toBeUndefined();
    });

    it("should work at high level of abstraction", async () => {
      const issue = createMockIssue(
        "Complex refactoring task",
        "Refactor authentication with database migration and API changes",
      );

      const analysis = await bossAgent.analyzeIssue(issue as any);

      // Boss Agent should identify what needs to be done, not how
      expect(analysis.taskBreakdown.length).toBeGreaterThan(0);

      for (const task of analysis.taskBreakdown) {
        // Task descriptions should be high-level
        expect(task.title).toBeDefined();
        expect(task.agentType).toBeDefined();

        // Should NOT contain low-level implementation details
        expect(task.description).not.toContain("function");
        expect(task.description).not.toContain("const");
        expect(task.description).not.toContain("import");
      }
    });
  });
});
