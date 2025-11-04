/**
 * Task Analyzer Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TaskAnalyzer } from "./task-analyzer.js";
import type { Logger } from "../core/types.js";

// Mock logger
const mockLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

// Mock issue
const createMockIssue = (title: string, description: string) => ({
  id: "test-issue-id",
  identifier: "TEST-123",
  title,
  description,
  url: "https://linear.app/test/TEST-123",
  creator: Promise.resolve({ id: "user-123" }),
});

describe("TaskAnalyzer", () => {
  let analyzer: TaskAnalyzer;

  beforeEach(() => {
    analyzer = new TaskAnalyzer(mockLogger);
  });

  it("should analyze simple tasks correctly", async () => {
    const issue = createMockIssue(
      "Fix typo in README",
      "There's a small typo that needs fixing"
    );

    const analysis = await analyzer.analyze(issue as any, undefined, 6);

    expect(analysis.complexity).toBe("simple");
    expect(analysis.complexityScore).toBeLessThan(6);
    expect(analysis.shouldDelegate).toBe(false);
  });

  it("should analyze complex tasks correctly", async () => {
    const issue = createMockIssue(
      "Refactor authentication system",
      "We need to redesign and refactor the entire authentication architecture to support multiple providers. This involves migrating the database schema, updating all API endpoints, and integrating with external services."
    );

    const analysis = await analyzer.analyze(issue as any, undefined, 6);

    expect(analysis.complexity).toBe("complex");
    expect(analysis.complexityScore).toBeGreaterThanOrEqual(6);
    expect(analysis.shouldDelegate).toBe(true);
    expect(analysis.estimatedSubtasks).toBeGreaterThan(1);
  });

  it("should identify feature tasks", async () => {
    const issue = createMockIssue(
      "Implement user dashboard",
      "Add a new feature: user dashboard with analytics"
    );

    const analysis = await analyzer.analyze(issue as any, undefined, 6);

    expect(analysis.taskType).toBe("feature");
  });

  it("should identify bug tasks", async () => {
    const issue = createMockIssue(
      "Fix login error",
      "Users are getting an error when trying to log in"
    );

    const analysis = await analyzer.analyze(issue as any, undefined, 6);

    expect(analysis.taskType).toBe("bug");
  });

  it("should respect custom delegation threshold", async () => {
    const issue = createMockIssue(
      "Medium complexity task",
      "This is a medium complexity implementation task"
    );

    // Low threshold - should delegate
    const analysis1 = await analyzer.analyze(issue as any, undefined, 3);
    expect(analysis1.shouldDelegate).toBe(true);

    // High threshold - should not delegate
    const analysis2 = await analyzer.analyze(issue as any, undefined, 9);
    expect(analysis2.shouldDelegate).toBe(false);
  });

  it("should estimate subtask count based on complexity", async () => {
    const simpleIssue = createMockIssue("Simple fix", "Quick bug fix");
    const simpleAnalysis = await analyzer.analyze(simpleIssue as any);
    expect(simpleAnalysis.estimatedSubtasks).toBe(1);

    const complexIssue = createMockIssue(
      "Complex feature",
      "Implement complex multi-step feature with multiple components and integration points"
    );
    const complexAnalysis = await analyzer.analyze(complexIssue as any);
    expect(complexAnalysis.estimatedSubtasks).toBeGreaterThan(2);
  });

  it("should generate reasoning", async () => {
    const issue = createMockIssue("Test task", "Test description");
    const analysis = await analyzer.analyze(issue as any);

    expect(analysis.reasoning).toContain("complexity score");
    expect(analysis.reasoning).toContain("Task type");
  });
});
