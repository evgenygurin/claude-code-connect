/**
 * Delegation Manager - Manages sub-agent execution and coordination
 */

import { EventEmitter } from "events";
import type { Issue, Comment } from "@linear/sdk";
import type {
  Subtask,
  SubtaskResult,
  ClaudeSession,
  ClaudeExecutionContext,
  ClaudeExecutionResult,
  IntegrationConfig,
  Logger,
  SessionStorage,
} from "../core/types.js";
import { ClaudeExecutor } from "../claude/executor.js";
import { AgentRegistry } from "./agent-registry.js";
import { createSession } from "../sessions/storage.js";
import { nanoid } from "nanoid";

/**
 * Delegation Manager Events
 */
export interface DelegationManagerEvents {
  "subtask:started": (subtask: Subtask) => void;
  "subtask:completed": (subtask: Subtask, result: SubtaskResult) => void;
  "subtask:failed": (subtask: Subtask, error: Error) => void;
}

/**
 * Delegation Manager
 */
export class DelegationManager extends EventEmitter {
  private config: IntegrationConfig;
  private logger: Logger;
  private storage: SessionStorage;
  private executor: ClaudeExecutor;
  private agentRegistry: AgentRegistry;
  private activeSubtasks = new Map<string, Subtask>();

  constructor(
    config: IntegrationConfig,
    logger: Logger,
    storage: SessionStorage,
    agentRegistry: AgentRegistry
  ) {
    super();
    this.config = config;
    this.logger = logger;
    this.storage = storage;
    this.agentRegistry = agentRegistry;
    this.executor = new ClaudeExecutor(logger);
  }

  /**
   * Execute subtasks with proper coordination
   */
  async executeSubtasks(
    subtasks: Subtask[],
    issue: Issue,
    strategy: "sequential" | "parallel" | "hybrid",
    comment?: Comment
  ): Promise<SubtaskResult[]> {
    this.logger.info("Starting subtask execution", {
      issueId: issue.id,
      subtaskCount: subtasks.length,
      strategy,
    });

    switch (strategy) {
      case "sequential":
        return await this.executeSequential(subtasks, issue, comment);
      case "parallel":
        return await this.executeParallel(subtasks, issue, comment);
      case "hybrid":
        return await this.executeHybrid(subtasks, issue, comment);
      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  }

  /**
   * Execute subtasks sequentially
   */
  private async executeSequential(
    subtasks: Subtask[],
    issue: Issue,
    comment?: Comment
  ): Promise<SubtaskResult[]> {
    this.logger.info("Executing subtasks sequentially", {
      subtaskCount: subtasks.length,
    });

    const results: SubtaskResult[] = [];

    for (const subtask of subtasks) {
      try {
        const result = await this.executeSubtask(subtask, issue, comment);
        results.push(result);

        if (!result.success) {
          this.logger.warn("Subtask failed, stopping sequential execution", {
            subtaskId: subtask.id,
            subtaskTitle: subtask.title,
          });
          break;
        }
      } catch (error) {
        this.logger.error("Subtask execution failed", error as Error, {
          subtaskId: subtask.id,
        });
        results.push({
          success: false,
          error: (error as Error).message,
          filesModified: [],
          commits: [],
          duration: 0,
        });
        break;
      }
    }

    return results;
  }

  /**
   * Execute subtasks in parallel
   */
  private async executeParallel(
    subtasks: Subtask[],
    issue: Issue,
    comment?: Comment
  ): Promise<SubtaskResult[]> {
    const maxConcurrent = this.config.maxConcurrentAgents || 3;

    this.logger.info("Executing subtasks in parallel", {
      subtaskCount: subtasks.length,
      maxConcurrent,
    });

    const results: SubtaskResult[] = [];
    const executing: Promise<SubtaskResult>[] = [];

    for (const subtask of subtasks) {
      // Wait if we've reached max concurrent
      if (executing.length >= maxConcurrent) {
        const result = await Promise.race(executing);
        results.push(result);
        executing.splice(
          executing.findIndex((p) => p === Promise.resolve(result)),
          1
        );
      }

      // Start subtask execution
      const promise = this.executeSubtask(subtask, issue, comment);
      executing.push(promise);
    }

    // Wait for remaining subtasks
    const remaining = await Promise.all(executing);
    results.push(...remaining);

    return results;
  }

  /**
   * Execute subtasks with hybrid strategy (respects dependencies)
   */
  private async executeHybrid(
    subtasks: Subtask[],
    issue: Issue,
    comment?: Comment
  ): Promise<SubtaskResult[]> {
    this.logger.info("Executing subtasks with hybrid strategy", {
      subtaskCount: subtasks.length,
    });

    const results: SubtaskResult[] = [];
    const completed = new Set<string>();
    const subtaskMap = new Map(subtasks.map((st) => [st.id, st]));

    // Keep executing until all subtasks are done
    while (completed.size < subtasks.length) {
      // Find subtasks ready to execute
      const ready = subtasks.filter((st) => {
        // Skip if already completed
        if (completed.has(st.id)) return false;

        // Check if dependencies are met
        return st.dependencies.every((depId) => completed.has(depId));
      });

      if (ready.length === 0) {
        this.logger.error("No subtasks ready to execute, circular dependency?", {
          completed: completed.size,
          total: subtasks.length,
        });
        break;
      }

      // Execute ready subtasks in parallel (respecting concurrency limit)
      const batchResults = await this.executeParallel(ready, issue, comment);

      // Update completed set and results
      ready.forEach((st, index) => {
        if (batchResults[index].success) {
          completed.add(st.id);
        }
        results.push(batchResults[index]);
      });
    }

    return results;
  }

  /**
   * Execute a single subtask
   */
  private async executeSubtask(
    subtask: Subtask,
    issue: Issue,
    comment?: Comment
  ): Promise<SubtaskResult> {
    const startTime = Date.now();

    this.logger.info("Executing subtask", {
      subtaskId: subtask.id,
      title: subtask.title,
      agentType: subtask.agentType,
    });

    // Mark as running
    subtask.status = "running";
    this.activeSubtasks.set(subtask.id, subtask);
    this.emit("subtask:started", subtask);

    try {
      // Create session for subtask
      const session = await this.createSubtaskSession(subtask, issue);
      subtask.sessionId = session.id;

      // Generate agent-specific prompt
      const prompt = this.generateSubtaskPrompt(subtask, issue, comment);

      // Create execution context
      const context: ClaudeExecutionContext = {
        session,
        issue,
        triggerComment: comment,
        workingDir: session.workingDir,
        branchName: session.branchName,
        config: this.config,
        context: {
          subtask,
          agentType: subtask.agentType,
          isSubtask: true,
          parentIssueId: issue.id,
          customPrompt: prompt,
        },
      };

      // Execute
      const result = await this.executor.execute(context);

      // Convert to SubtaskResult
      const subtaskResult: SubtaskResult = {
        success: result.success,
        output: result.output,
        error: result.error,
        filesModified: result.filesModified,
        commits: result.commits,
        duration: Date.now() - startTime,
      };

      // Update subtask
      subtask.status = subtaskResult.success ? "completed" : "failed";
      subtask.result = subtaskResult;
      this.activeSubtasks.delete(subtask.id);

      if (subtaskResult.success) {
        this.emit("subtask:completed", subtask, subtaskResult);
      } else {
        this.emit("subtask:failed", subtask, new Error(subtaskResult.error));
      }

      this.logger.info("Subtask execution completed", {
        subtaskId: subtask.id,
        success: subtaskResult.success,
        duration: subtaskResult.duration,
      });

      return subtaskResult;
    } catch (error) {
      subtask.status = "failed";
      this.activeSubtasks.delete(subtask.id);

      const subtaskResult: SubtaskResult = {
        success: false,
        error: (error as Error).message,
        filesModified: [],
        commits: [],
        duration: Date.now() - startTime,
      };

      this.emit("subtask:failed", subtask, error as Error);

      this.logger.error("Subtask execution failed", error as Error, {
        subtaskId: subtask.id,
      });

      return subtaskResult;
    }
  }

  /**
   * Create session for subtask
   */
  private async createSubtaskSession(
    subtask: Subtask,
    issue: Issue
  ): Promise<ClaudeSession> {
    const sessionId = nanoid();

    const metadata = {
      createdBy: "boss-agent",
      organizationId: this.config.linearOrganizationId,
      projectScope: [this.config.projectRootDir],
      permissions: {
        canRead: true,
        canWrite: true,
        canExecute: true,
        canNetwork: false,
        canModifyFileSystem: true,
      },
      issueTitle: `[Subtask] ${subtask.title}`,
      triggerEventType: "boss-agent-delegation",
    };

    const session = createSession(
      issue.id,
      `${issue.identifier}-${subtask.id}`,
      metadata
    );

    // Use same branch or create subtask branch
    if (subtask.agentType !== "reviewer" && subtask.agentType !== "documentation") {
      session.branchName = `claude/${issue.identifier.toLowerCase()}-${subtask.id}`;
    }

    await this.storage.save(session);

    return session;
  }

  /**
   * Generate prompt for subtask with agent-specific instructions
   */
  private generateSubtaskPrompt(
    subtask: Subtask,
    issue: Issue,
    comment?: Comment
  ): string {
    const context = `
## Parent Issue: ${issue.identifier} - ${issue.title}
${issue.description || ""}

## Subtask Details
- **Title**: ${subtask.title}
- **Description**: ${subtask.description}
- **Agent Type**: ${subtask.agentType}
- **Priority**: ${subtask.priority}/10
- **Complexity**: ${subtask.complexity}/10

${comment ? `## Additional Context from Comment\n${comment.body}` : ""}
    `.trim();

    return this.agentRegistry.generatePrompt(
      subtask.agentType,
      subtask.description,
      context
    );
  }

  /**
   * Get active subtasks
   */
  getActiveSubtasks(): Subtask[] {
    return Array.from(this.activeSubtasks.values());
  }

  /**
   * Cancel all active subtasks
   */
  async cancelAll(): Promise<void> {
    this.logger.info("Cancelling all active subtasks", {
      count: this.activeSubtasks.size,
    });

    for (const subtask of this.activeSubtasks.values()) {
      if (subtask.sessionId) {
        await this.executor.cancelSession(subtask.sessionId);
      }
      subtask.status = "failed";
    }

    this.activeSubtasks.clear();
  }

  /**
   * Typed event emitter methods
   */
  on<K extends keyof DelegationManagerEvents>(
    event: K,
    listener: DelegationManagerEvents[K]
  ): this {
    return super.on(event, listener);
  }

  once<K extends keyof DelegationManagerEvents>(
    event: K,
    listener: DelegationManagerEvents[K]
  ): this {
    return super.once(event, listener);
  }

  emit<K extends keyof DelegationManagerEvents>(
    event: K,
    ...args: Parameters<DelegationManagerEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
