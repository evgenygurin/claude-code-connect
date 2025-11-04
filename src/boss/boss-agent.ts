/**
 * Boss Agent - High-level coordinator that delegates tasks to specialized agents
 *
 * The Boss Agent NEVER executes tasks itself - it only:
 * 1. Analyzes incoming issues
 * 2. Breaks them down into subtasks
 * 3. Delegates to specialized agents
 * 4. Monitors progress
 * 5. Aggregates results
 */

import type { Issue, Comment } from "@linear/sdk";
import type {
  BossAgent as IBossAgent,
  BossAnalysis,
  DelegatedTask,
  AgentInstance,
  AgentType,
  AgentCapability,
  TaskBreakdown,
  BossAgentConfig,
  TaskStatusValues,
  AgentTypeValues,
} from "./types.js";
import type {
  ClaudeExecutionResult,
  IntegrationConfig,
  Logger,
} from "../core/types.js";
import { nanoid } from "nanoid";

/**
 * Default agent capabilities
 */
const DEFAULT_AGENT_CAPABILITIES: AgentCapability[] = [
  {
    type: "backend" as AgentType,
    keywords: ["api", "server", "backend", "database", "endpoint", "service"],
    filePatterns: ["**/*.ts", "**/*.js", "**/*.py", "**/*.go", "**/*.java"],
    technologies: ["node", "express", "fastify", "python", "go", "java"],
    maxComplexity: 8,
    description: "Backend development: APIs, services, databases",
  },
  {
    type: "frontend" as AgentType,
    keywords: ["ui", "frontend", "component", "react", "vue", "angular", "css"],
    filePatterns: ["**/*.tsx", "**/*.jsx", "**/*.vue", "**/*.css", "**/*.scss"],
    technologies: ["react", "vue", "angular", "svelte", "tailwind"],
    maxComplexity: 7,
    description: "Frontend development: UI, components, styling",
  },
  {
    type: "test" as AgentType,
    keywords: ["test", "testing", "spec", "unit", "integration", "e2e"],
    filePatterns: ["**/*.test.*", "**/*.spec.*", "**/test/**"],
    technologies: ["jest", "vitest", "mocha", "cypress", "playwright"],
    maxComplexity: 6,
    description: "Testing: unit, integration, e2e tests",
  },
  {
    type: "security" as AgentType,
    keywords: ["security", "auth", "authentication", "authorization", "vulnerability"],
    filePatterns: ["**/security/**", "**/auth/**"],
    technologies: ["oauth", "jwt", "passport"],
    maxComplexity: 9,
    description: "Security: authentication, authorization, vulnerabilities",
  },
  {
    type: "devops" as AgentType,
    keywords: ["deploy", "ci", "cd", "docker", "kubernetes", "infrastructure"],
    filePatterns: ["**/Dockerfile", "**/*.yml", "**/*.yaml", "**/terraform/**"],
    technologies: ["docker", "kubernetes", "terraform", "github-actions"],
    maxComplexity: 8,
    description: "DevOps: deployment, CI/CD, infrastructure",
  },
  {
    type: "database" as AgentType,
    keywords: ["database", "sql", "migration", "schema", "query"],
    filePatterns: ["**/migrations/**", "**/*.sql"],
    technologies: ["postgresql", "mysql", "mongodb", "redis"],
    maxComplexity: 7,
    description: "Database: schema, migrations, queries",
  },
  {
    type: "docs" as AgentType,
    keywords: ["documentation", "readme", "docs", "guide"],
    filePatterns: ["**/*.md", "**/docs/**"],
    technologies: ["markdown"],
    maxComplexity: 4,
    description: "Documentation: README, guides, API docs",
  },
];

/**
 * Boss Agent implementation
 */
export class BossAgent implements IBossAgent {
  private config: BossAgentConfig;
  private logger: Logger;

  constructor(config: BossAgentConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;

    // Use default capabilities if none provided
    if (!this.config.agentCapabilities || this.config.agentCapabilities.length === 0) {
      this.config.agentCapabilities = DEFAULT_AGENT_CAPABILITIES;
    }
  }

  /**
   * Analyze issue and determine delegation strategy
   *
   * Boss Agent performs HIGH-LEVEL analysis only:
   * - Reads issue title and description
   * - Identifies keywords and patterns
   * - Estimates complexity
   * - Does NOT dive into code details
   */
  async analyzeIssue(issue: Issue, comment?: Comment): Promise<BossAnalysis> {
    this.logger.info("Boss Agent analyzing issue", {
      issueId: issue.id,
      identifier: issue.identifier,
      title: issue.title,
    });

    // Combine issue description and comment for analysis
    const fullText = [
      issue.title,
      issue.description || "",
      comment?.body || "",
    ].join(" ").toLowerCase();

    // Calculate complexity based on keywords and issue metadata
    const complexity = this.estimateComplexity(fullText, issue);

    // Identify required agent types
    const recommendedAgents = this.identifyRequiredAgents(fullText);

    // Create task breakdown
    const taskBreakdown = this.createTaskBreakdown(
      issue,
      comment,
      fullText,
      recommendedAgents
    );

    const analysis: BossAnalysis = {
      issue,
      complexity,
      estimatedTasks: taskBreakdown.length,
      recommendedAgents,
      taskBreakdown,
      analyzedAt: new Date(),
      confidence: this.calculateConfidence(taskBreakdown),
    };

    this.logger.info("Boss Agent analysis complete", {
      issueId: issue.id,
      complexity,
      estimatedTasks: analysis.estimatedTasks,
      recommendedAgents: recommendedAgents.join(", "),
      confidence: analysis.confidence,
    });

    return analysis;
  }

  /**
   * Create delegation plan from analysis
   *
   * Boss Agent creates structured plan WITHOUT implementation details
   */
  async createDelegationPlan(analysis: BossAnalysis): Promise<DelegatedTask[]> {
    this.logger.info("Boss Agent creating delegation plan", {
      issueId: analysis.issue.id,
      taskCount: analysis.taskBreakdown.length,
    });

    const tasks: DelegatedTask[] = [];

    for (const breakdown of analysis.taskBreakdown) {
      const task: DelegatedTask = {
        id: nanoid(),
        title: breakdown.title,
        description: breakdown.description,
        agentType: breakdown.agentType,
        priority: breakdown.priority,
        status: "pending" as const,
        files: breakdown.files,
        dependencies: breakdown.dependencies,
        createdAt: new Date(),
        linearIssueId: analysis.issue.id,
      };

      tasks.push(task);
    }

    // Sort by priority and dependencies
    const sortedTasks = this.sortTasksByDependencies(tasks);

    this.logger.info("Boss Agent delegation plan created", {
      issueId: analysis.issue.id,
      totalTasks: sortedTasks.length,
    });

    return sortedTasks;
  }

  /**
   * Delegate task to appropriate agent
   *
   * Boss Agent DELEGATES but does NOT execute
   */
  async delegateTask(task: DelegatedTask): Promise<AgentInstance> {
    this.logger.info("Boss Agent delegating task", {
      taskId: task.id,
      agentType: task.agentType,
      title: task.title,
    });

    // Create agent instance
    const instance: AgentInstance = {
      id: nanoid(),
      type: task.agentType,
      sessionId: "", // Will be filled by orchestrator
      taskId: task.id,
      status: "starting",
      startedAt: new Date(),
    };

    this.logger.info("Boss Agent delegated task", {
      taskId: task.id,
      agentInstanceId: instance.id,
      agentType: instance.type,
    });

    return instance;
  }

  /**
   * Monitor progress (high-level only)
   *
   * Boss Agent monitors WITHOUT interfering
   */
  async monitorProgress(context: any): Promise<void> {
    const { tasks, activeAgents } = context;

    const completed = tasks.filter((t: DelegatedTask) => t.status === "completed").length;
    const failed = tasks.filter((t: DelegatedTask) => t.status === "failed").length;
    const running = tasks.filter((t: DelegatedTask) => t.status === "running").length;

    this.logger.info("Boss Agent monitoring progress", {
      totalTasks: tasks.length,
      completed,
      failed,
      running,
      activeAgents: activeAgents.size,
    });
  }

  /**
   * Aggregate results from sub-agents
   *
   * Boss Agent collects and summarizes WITHOUT details
   */
  async aggregateResults(tasks: DelegatedTask[]): Promise<ClaudeExecutionResult> {
    this.logger.info("Boss Agent aggregating results", {
      totalTasks: tasks.length,
    });

    const completed = tasks.filter((t) => t.status === "completed");
    const failed = tasks.filter((t) => t.status === "failed");

    const allFilesModified = new Set<string>();
    let totalDuration = 0;

    for (const task of completed) {
      if (task.result?.filesModified) {
        task.result.filesModified.forEach((f) => allFilesModified.add(f));
      }
      if (task.result?.duration) {
        totalDuration += task.result.duration;
      }
    }

    const success = failed.length === 0 && completed.length === tasks.length;

    const output = this.generateSummaryReport(tasks);

    const result: ClaudeExecutionResult = {
      success,
      output,
      error: failed.length > 0 ? `${failed.length} tasks failed` : undefined,
      filesModified: Array.from(allFilesModified),
      commits: [], // Commits handled by sub-agents
      duration: totalDuration,
      exitCode: success ? 0 : 1,
    };

    this.logger.info("Boss Agent aggregation complete", {
      success,
      completedTasks: completed.length,
      failedTasks: failed.length,
      filesModified: result.filesModified.length,
    });

    return result;
  }

  // ========== Private Helper Methods ==========

  /**
   * Estimate complexity from text and issue metadata
   */
  private estimateComplexity(text: string, issue: Issue): number {
    let complexity = 3; // Base complexity

    // Increase complexity based on keywords
    const complexityIndicators = {
      high: ["refactor", "architecture", "migration", "breaking"],
      medium: ["implement", "feature", "integration"],
      low: ["fix", "bug", "typo", "documentation"],
    };

    if (complexityIndicators.high.some((k) => text.includes(k))) {
      complexity += 4;
    } else if (complexityIndicators.medium.some((k) => text.includes(k))) {
      complexity += 2;
    }

    // Description length indicates complexity
    if (issue.description && issue.description.length > 500) {
      complexity += 2;
    }

    return Math.min(complexity, 10);
  }

  /**
   * Identify required agent types from text
   */
  private identifyRequiredAgents(text: string): AgentType[] {
    const agents = new Set<AgentType>();

    for (const capability of this.config.agentCapabilities) {
      const matches = capability.keywords.some((keyword) =>
        text.includes(keyword)
      );
      if (matches) {
        agents.add(capability.type);
      }
    }

    // Always include worker as fallback
    if (agents.size === 0) {
      agents.add("worker" as AgentType);
    }

    return Array.from(agents);
  }

  /**
   * Create task breakdown
   */
  private createTaskBreakdown(
    issue: Issue,
    comment: Comment | undefined,
    text: string,
    agents: AgentType[]
  ): TaskBreakdown[] {
    const breakdown: TaskBreakdown[] = [];

    // Create one task per identified agent type
    for (const agentType of agents) {
      const capability = this.config.agentCapabilities.find(
        (c) => c.type === agentType
      );

      breakdown.push({
        title: `${capability?.description || agentType} tasks for ${issue.identifier}`,
        description: comment?.body || issue.description || issue.title,
        agentType,
        priority: this.calculatePriority(agentType, text),
        complexity: capability?.maxComplexity || 5,
      });
    }

    return breakdown;
  }

  /**
   * Calculate priority for agent type
   */
  private calculatePriority(agentType: AgentType, text: string): number {
    // Security and critical bugs are highest priority
    if (agentType === "security" || text.includes("critical")) {
      return 10;
    }

    // Backend and database are high priority
    if (agentType === "backend" || agentType === "database") {
      return 8;
    }

    // Frontend and tests are medium priority
    if (agentType === "frontend" || agentType === "test") {
      return 6;
    }

    // Documentation is lower priority
    if (agentType === "docs") {
      return 3;
    }

    return 5;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(breakdown: TaskBreakdown[]): number {
    if (breakdown.length === 0) return 0;
    if (breakdown.length === 1) return 0.9;
    if (breakdown.length <= 3) return 0.8;
    return 0.7;
  }

  /**
   * Sort tasks by dependencies
   */
  private sortTasksByDependencies(tasks: DelegatedTask[]): DelegatedTask[] {
    // Simple topological sort by priority for now
    return [...tasks].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Generate summary report
   */
  private generateSummaryReport(tasks: DelegatedTask[]): string {
    const lines: string[] = [
      "# Boss Agent Execution Summary",
      "",
      `**Total Tasks**: ${tasks.length}`,
      `**Completed**: ${tasks.filter((t) => t.status === "completed").length}`,
      `**Failed**: ${tasks.filter((t) => t.status === "failed").length}`,
      "",
      "## Task Breakdown",
      "",
    ];

    for (const task of tasks) {
      const status = task.status === "completed" ? "✅" : task.status === "failed" ? "❌" : "⏳";
      lines.push(`${status} **${task.title}** (${task.agentType})`);
      if (task.result?.output) {
        lines.push(`   ${task.result.output.substring(0, 100)}...`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }
}
