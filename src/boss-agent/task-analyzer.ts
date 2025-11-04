/**
 * Task Analyzer - Analyzes task complexity for Boss Agent delegation decisions
 */

import type { Issue, Comment } from "@linear/sdk";
import type {
  TaskAnalysis,
  TaskComplexity,
  TaskComplexityValues,
  Logger,
} from "../core/types.js";

/**
 * Keywords that indicate different task types and complexity
 */
const COMPLEXITY_INDICATORS = {
  high: [
    "refactor",
    "redesign",
    "architecture",
    "migration",
    "rewrite",
    "complex",
    "multiple",
    "system",
    "integrate",
    "performance",
    "security",
    "scalability",
  ],
  medium: [
    "feature",
    "implement",
    "add",
    "create",
    "build",
    "update",
    "modify",
    "enhance",
    "improve",
  ],
  low: [
    "fix",
    "bug",
    "typo",
    "small",
    "simple",
    "quick",
    "minor",
    "update",
    "tweak",
  ],
};

const TASK_TYPE_KEYWORDS = {
  feature: ["feature", "add", "create", "implement", "build", "new"],
  bug: ["bug", "fix", "issue", "error", "broken", "crash"],
  refactor: ["refactor", "clean", "reorganize", "restructure"],
  test: ["test", "testing", "coverage", "unit test", "integration test"],
  docs: ["document", "readme", "docs", "documentation", "comment"],
};

/**
 * Task Analyzer
 */
export class TaskAnalyzer {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Analyze task complexity and determine if delegation is needed
   */
  async analyze(
    issue: Issue,
    comment?: Comment,
    delegationThreshold?: number
  ): Promise<TaskAnalysis> {
    this.logger.info("Analyzing task complexity", {
      issueId: issue.id,
      identifier: issue.identifier,
    });

    // Combine issue and comment text for analysis
    const description = issue.description || "";
    const title = issue.title || "";
    const commentText = comment?.body || "";
    const fullText = `${title} ${description} ${commentText}`.toLowerCase();

    // Calculate complexity score
    const complexityScore = this.calculateComplexityScore(fullText);

    // Determine complexity level
    const complexity = this.getComplexityLevel(complexityScore);

    // Determine task type
    const taskType = this.determineTaskType(fullText);

    // Estimate subtask count
    const estimatedSubtasks = this.estimateSubtaskCount(
      complexityScore,
      fullText
    );

    // Should delegate based on threshold
    const threshold = delegationThreshold || 6;
    const shouldDelegate = complexityScore >= threshold;

    // Generate reasoning
    const reasoning = this.generateReasoning(
      complexityScore,
      complexity,
      taskType,
      estimatedSubtasks,
      shouldDelegate
    );

    const analysis: TaskAnalysis = {
      complexityScore,
      complexity,
      shouldDelegate,
      estimatedSubtasks,
      taskType,
      reasoning,
    };

    this.logger.info("Task analysis completed", {
      issueId: issue.id,
      complexityScore,
      complexity,
      shouldDelegate,
      estimatedSubtasks,
      taskType,
    });

    return analysis;
  }

  /**
   * Calculate complexity score (1-10)
   */
  private calculateComplexityScore(text: string): number {
    let score = 5; // Base score

    // Check high complexity indicators
    const highCount = COMPLEXITY_INDICATORS.high.filter((keyword) =>
      text.includes(keyword)
    ).length;
    score += highCount * 1.5;

    // Check medium complexity indicators
    const mediumCount = COMPLEXITY_INDICATORS.medium.filter((keyword) =>
      text.includes(keyword)
    ).length;
    score += mediumCount * 0.5;

    // Check low complexity indicators (reduce score)
    const lowCount = COMPLEXITY_INDICATORS.low.filter((keyword) =>
      text.includes(keyword)
    ).length;
    score -= lowCount * 0.5;

    // Text length factor (longer descriptions = more complex)
    if (text.length > 1000) score += 2;
    else if (text.length > 500) score += 1;
    else if (text.length < 100) score -= 1;

    // Multiple file indicators
    const fileIndicators = ["files", "modules", "components", "services"];
    if (fileIndicators.some((keyword) => text.includes(keyword))) {
      score += 1.5;
    }

    // Multiple step indicators
    const stepIndicators = ["steps", "phases", "stages", "first", "then"];
    const stepCount = stepIndicators.filter((keyword) =>
      text.includes(keyword)
    ).length;
    if (stepCount >= 2) score += 2;

    // Clamp to 1-10 range
    return Math.max(1, Math.min(10, Math.round(score)));
  }

  /**
   * Get complexity level from score
   */
  private getComplexityLevel(score: number): TaskComplexity {
    if (score >= 7) return "complex";
    if (score >= 4) return "medium";
    return "simple";
  }

  /**
   * Determine primary task type
   */
  private determineTaskType(
    text: string
  ): "feature" | "bug" | "refactor" | "test" | "docs" | "mixed" {
    const scores: Record<string, number> = {
      feature: 0,
      bug: 0,
      refactor: 0,
      test: 0,
      docs: 0,
    };

    // Count keyword matches for each type
    for (const [type, keywords] of Object.entries(TASK_TYPE_KEYWORDS)) {
      scores[type] = keywords.filter((keyword) => text.includes(keyword)).length;
    }

    // Find highest scoring type
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return "mixed";

    const matchingTypes = Object.entries(scores).filter(
      ([, score]) => score === maxScore
    );

    // If multiple types match equally, it's mixed
    if (matchingTypes.length > 1) return "mixed";

    return matchingTypes[0][0] as
      | "feature"
      | "bug"
      | "refactor"
      | "test"
      | "docs";
  }

  /**
   * Estimate number of subtasks needed
   */
  private estimateSubtaskCount(score: number, text: string): number {
    let count = 1; // Minimum

    // Base count on complexity
    if (score >= 9) count = 5;
    else if (score >= 7) count = 3;
    else if (score >= 5) count = 2;
    else count = 1;

    // Look for explicit steps/phases
    const listMatches = text.match(/\d+\./g);
    if (listMatches && listMatches.length > count) {
      count = Math.min(listMatches.length, 8); // Cap at 8 subtasks
    }

    return count;
  }

  /**
   * Generate reasoning explanation
   */
  private generateReasoning(
    score: number,
    complexity: TaskComplexity,
    taskType: string,
    subtasks: number,
    shouldDelegate: boolean
  ): string {
    const parts: string[] = [];

    parts.push(
      `Task complexity score: ${score}/10 (${complexity} complexity)`
    );
    parts.push(`Task type: ${taskType}`);
    parts.push(`Estimated subtasks: ${subtasks}`);

    if (shouldDelegate) {
      parts.push(
        `Delegation recommended: Task complexity exceeds threshold, breaking down into specialized subtasks for parallel execution`
      );
    } else {
      parts.push(
        `Direct execution recommended: Task complexity is manageable for a single agent`
      );
    }

    return parts.join(". ");
  }
}
