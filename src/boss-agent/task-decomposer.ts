/**
 * Task Decomposer - Breaks down complex tasks into subtasks
 */

import { nanoid } from "nanoid";
import type { Issue, Comment } from "@linear/sdk";
import type {
  TaskAnalysis,
  TaskDecomposition,
  Subtask,
  AgentType,
  Logger,
} from "../core/types.js";

/**
 * Task Decomposer
 */
export class TaskDecomposer {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Decompose task into subtasks
   */
  async decompose(
    issue: Issue,
    analysis: TaskAnalysis,
    comment?: Comment
  ): Promise<TaskDecomposition> {
    this.logger.info("Decomposing task into subtasks", {
      issueId: issue.id,
      identifier: issue.identifier,
      complexity: analysis.complexity,
      estimatedSubtasks: analysis.estimatedSubtasks,
    });

    const description = issue.description || "";
    const title = issue.title || "";
    const commentText = comment?.body || "";

    // Generate subtasks based on task type
    const subtasks = await this.generateSubtasks(
      title,
      description,
      commentText,
      analysis
    );

    // Determine execution strategy
    const strategy = this.determineStrategy(subtasks, analysis);

    // Estimate total time
    const estimatedTime = this.estimateTime(subtasks);

    const decomposition: TaskDecomposition = {
      originalTask: `${title}\n\n${description}`,
      subtasks,
      strategy,
      estimatedTime,
    };

    this.logger.info("Task decomposition completed", {
      issueId: issue.id,
      subtaskCount: subtasks.length,
      strategy,
      estimatedTime,
    });

    return decomposition;
  }

  /**
   * Generate subtasks based on task analysis
   */
  private async generateSubtasks(
    title: string,
    description: string,
    comment: string,
    analysis: TaskAnalysis
  ): Promise<Subtask[]> {
    const subtasks: Subtask[] = [];

    // Strategy based on task type
    switch (analysis.taskType) {
      case "feature":
        subtasks.push(...this.generateFeatureSubtasks(title, description));
        break;
      case "bug":
        subtasks.push(...this.generateBugSubtasks(title, description));
        break;
      case "refactor":
        subtasks.push(...this.generateRefactorSubtasks(title, description));
        break;
      case "test":
        subtasks.push(...this.generateTestSubtasks(title, description));
        break;
      case "docs":
        subtasks.push(...this.generateDocsSubtasks(title, description));
        break;
      case "mixed":
        subtasks.push(...this.generateMixedSubtasks(title, description));
        break;
    }

    // If we don't have enough subtasks, add general ones
    if (subtasks.length < analysis.estimatedSubtasks) {
      subtasks.push(
        ...this.generateGenericSubtasks(
          title,
          description,
          analysis.estimatedSubtasks - subtasks.length
        )
      );
    }

    return subtasks;
  }

  /**
   * Generate subtasks for feature implementation
   */
  private generateFeatureSubtasks(title: string, description: string): Subtask[] {
    const subtasks: Subtask[] = [];

    // 1. Implementation
    subtasks.push({
      id: nanoid(10),
      title: `Implement: ${title}`,
      description: `Implement the core functionality: ${description.slice(0, 200)}`,
      agentType: "code_writer",
      dependencies: [],
      priority: 10,
      complexity: 7,
      status: "pending",
    });

    // 2. Tests
    subtasks.push({
      id: nanoid(10),
      title: "Write tests",
      description: "Write unit and integration tests for the new feature",
      agentType: "test_writer",
      dependencies: [subtasks[0].id],
      priority: 8,
      complexity: 5,
      status: "pending",
    });

    // 3. Documentation
    subtasks.push({
      id: nanoid(10),
      title: "Update documentation",
      description: "Document the new feature and update relevant docs",
      agentType: "documentation",
      dependencies: [subtasks[0].id],
      priority: 6,
      complexity: 3,
      status: "pending",
    });

    // 4. Review
    subtasks.push({
      id: nanoid(10),
      title: "Code review",
      description: "Review implementation for quality and best practices",
      agentType: "reviewer",
      dependencies: [subtasks[0].id, subtasks[1].id],
      priority: 9,
      complexity: 4,
      status: "pending",
    });

    return subtasks;
  }

  /**
   * Generate subtasks for bug fixing
   */
  private generateBugSubtasks(title: string, description: string): Subtask[] {
    const subtasks: Subtask[] = [];

    // 1. Debug
    subtasks.push({
      id: nanoid(10),
      title: `Debug: ${title}`,
      description: `Investigate and identify root cause: ${description.slice(0, 200)}`,
      agentType: "debugger",
      dependencies: [],
      priority: 10,
      complexity: 6,
      status: "pending",
    });

    // 2. Fix
    subtasks.push({
      id: nanoid(10),
      title: "Implement fix",
      description: "Implement the fix for the identified issue",
      agentType: "code_writer",
      dependencies: [subtasks[0].id],
      priority: 9,
      complexity: 5,
      status: "pending",
    });

    // 3. Test
    subtasks.push({
      id: nanoid(10),
      title: "Add regression tests",
      description: "Add tests to prevent regression",
      agentType: "test_writer",
      dependencies: [subtasks[1].id],
      priority: 8,
      complexity: 4,
      status: "pending",
    });

    return subtasks;
  }

  /**
   * Generate subtasks for refactoring
   */
  private generateRefactorSubtasks(title: string, description: string): Subtask[] {
    const subtasks: Subtask[] = [];

    // 1. Refactor
    subtasks.push({
      id: nanoid(10),
      title: `Refactor: ${title}`,
      description: `Refactor code: ${description.slice(0, 200)}`,
      agentType: "refactorer",
      dependencies: [],
      priority: 10,
      complexity: 7,
      status: "pending",
    });

    // 2. Test
    subtasks.push({
      id: nanoid(10),
      title: "Verify tests pass",
      description: "Ensure all existing tests still pass after refactoring",
      agentType: "test_writer",
      dependencies: [subtasks[0].id],
      priority: 9,
      complexity: 4,
      status: "pending",
    });

    // 3. Review
    subtasks.push({
      id: nanoid(10),
      title: "Review refactored code",
      description: "Review code quality improvements",
      agentType: "reviewer",
      dependencies: [subtasks[0].id],
      priority: 7,
      complexity: 3,
      status: "pending",
    });

    return subtasks;
  }

  /**
   * Generate subtasks for testing
   */
  private generateTestSubtasks(title: string, description: string): Subtask[] {
    const subtasks: Subtask[] = [];

    subtasks.push({
      id: nanoid(10),
      title: `Write tests: ${title}`,
      description: description,
      agentType: "test_writer",
      dependencies: [],
      priority: 10,
      complexity: 6,
      status: "pending",
    });

    return subtasks;
  }

  /**
   * Generate subtasks for documentation
   */
  private generateDocsSubtasks(title: string, description: string): Subtask[] {
    const subtasks: Subtask[] = [];

    subtasks.push({
      id: nanoid(10),
      title: `Documentation: ${title}`,
      description: description,
      agentType: "documentation",
      dependencies: [],
      priority: 10,
      complexity: 4,
      status: "pending",
    });

    return subtasks;
  }

  /**
   * Generate subtasks for mixed tasks
   */
  private generateMixedSubtasks(title: string, description: string): Subtask[] {
    const subtasks: Subtask[] = [];

    // General implementation
    subtasks.push({
      id: nanoid(10),
      title: `Implement: ${title}`,
      description: description,
      agentType: "general",
      dependencies: [],
      priority: 10,
      complexity: 7,
      status: "pending",
    });

    // Review
    subtasks.push({
      id: nanoid(10),
      title: "Review changes",
      description: "Review all changes for quality",
      agentType: "reviewer",
      dependencies: [subtasks[0].id],
      priority: 8,
      complexity: 4,
      status: "pending",
    });

    return subtasks;
  }

  /**
   * Generate generic subtasks
   */
  private generateGenericSubtasks(
    title: string,
    description: string,
    count: number
  ): Subtask[] {
    const subtasks: Subtask[] = [];

    for (let i = 0; i < count; i++) {
      subtasks.push({
        id: nanoid(10),
        title: `Subtask ${i + 1}: ${title}`,
        description: `Part ${i + 1} of implementation: ${description.slice(0, 150)}`,
        agentType: "general",
        dependencies: i > 0 ? [subtasks[i - 1].id] : [],
        priority: 10 - i,
        complexity: 5,
        status: "pending",
      });
    }

    return subtasks;
  }

  /**
   * Determine execution strategy
   */
  private determineStrategy(
    subtasks: Subtask[],
    analysis: TaskAnalysis
  ): "sequential" | "parallel" | "hybrid" {
    // Count dependencies
    const dependencyCount = subtasks.reduce(
      (sum, task) => sum + task.dependencies.length,
      0
    );

    // If most tasks have dependencies, use sequential
    if (dependencyCount > subtasks.length * 0.6) {
      return "sequential";
    }

    // If few dependencies, use parallel
    if (dependencyCount === 0 || dependencyCount < subtasks.length * 0.3) {
      return "parallel";
    }

    // Otherwise hybrid
    return "hybrid";
  }

  /**
   * Estimate total time in minutes
   */
  private estimateTime(subtasks: Subtask[]): number {
    // Base time per complexity point
    const minutesPerComplexity = 5;

    // Sum up complexity
    const totalComplexity = subtasks.reduce(
      (sum, task) => sum + task.complexity,
      0
    );

    return totalComplexity * minutesPerComplexity;
  }
}
