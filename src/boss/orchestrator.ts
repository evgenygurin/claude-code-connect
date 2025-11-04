/**
 * Agent Orchestrator - Manages execution of delegated tasks by sub-agents
 *
 * Orchestrator responsibilities:
 * 1. Start and manage sub-agent processes
 * 2. Monitor task execution
 * 3. Handle dependencies between tasks
 * 4. Collect and report results
 */

import { EventEmitter } from "events";
import type {
  AgentOrchestrator as IAgentOrchestrator,
  OrchestrationContext,
  OrchestrationStatus,
  AgentInstance,
  DelegatedTask,
  TaskStatus,
} from "./types.js";
import type { Logger, IntegrationConfig } from "../core/types.js";
import { ClaudeExecutor } from "../claude/executor.js";
import { SessionManager } from "../sessions/manager.js";

/**
 * Orchestrator events
 */
export interface OrchestratorEvents {
  "task:started": (task: DelegatedTask) => void;
  "task:completed": (task: DelegatedTask) => void;
  "task:failed": (task: DelegatedTask, error: Error) => void;
  "agent:spawned": (agent: AgentInstance) => void;
  "agent:terminated": (agent: AgentInstance) => void;
  "orchestration:complete": (status: OrchestrationStatus) => void;
}

/**
 * Agent Orchestrator implementation
 */
export class AgentOrchestrator extends EventEmitter implements IAgentOrchestrator {
  private logger: Logger;
  private config: IntegrationConfig;
  private sessionManager: SessionManager;
  private executor: ClaudeExecutor;

  private context?: OrchestrationContext;
  private isRunning = false;
  private activeAgents = new Map<string, AgentInstance>();
  private maxConcurrentAgents: number;

  constructor(
    config: IntegrationConfig,
    logger: Logger,
    sessionManager: SessionManager,
    maxConcurrentAgents: number = 3
  ) {
    super();
    this.config = config;
    this.logger = logger;
    this.sessionManager = sessionManager;
    this.executor = new ClaudeExecutor(logger);
    this.maxConcurrentAgents = maxConcurrentAgents;
  }

  /**
   * Start orchestration
   */
  async start(context: OrchestrationContext): Promise<void> {
    this.logger.info("Agent Orchestrator starting", {
      bossSessionId: context.bossSession.id,
      totalTasks: context.tasks.length,
      issueId: context.issue.id,
    });

    this.context = context;
    this.isRunning = true;
    this.activeAgents = context.activeAgents;

    // Start task execution loop
    await this.executionLoop();
  }

  /**
   * Stop orchestration
   */
  async stop(): Promise<void> {
    this.logger.info("Agent Orchestrator stopping");
    this.isRunning = false;

    // Stop all active agents
    for (const [agentId, agent] of this.activeAgents.entries()) {
      await this.terminateAgent(agent);
    }

    this.activeAgents.clear();
  }

  /**
   * Get orchestration status
   */
  getStatus(): OrchestrationStatus {
    if (!this.context) {
      return {
        active: false,
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        activeAgents: 0,
        progress: 0,
      };
    }

    const { tasks } = this.context;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const failedTasks = tasks.filter((t) => t.status === "failed").length;

    return {
      active: this.isRunning,
      totalTasks: tasks.length,
      completedTasks,
      failedTasks,
      activeAgents: this.activeAgents.size,
      startedAt: this.context.bossSession.startedAt,
      progress: tasks.length > 0 ? completedTasks / tasks.length : 0,
    };
  }

  /**
   * Get active agents
   */
  getActiveAgents(): AgentInstance[] {
    return Array.from(this.activeAgents.values());
  }

  // ========== Private Methods ==========

  /**
   * Main execution loop
   */
  private async executionLoop(): Promise<void> {
    if (!this.context) return;

    while (this.isRunning) {
      const { tasks } = this.context;

      // Check if all tasks are complete
      if (this.areAllTasksComplete(tasks)) {
        this.logger.info("All tasks complete, finishing orchestration");
        await this.finish();
        break;
      }

      // Get next tasks to execute
      const nextTasks = this.getNextTasks(tasks);

      // Execute tasks concurrently (up to max limit)
      for (const task of nextTasks) {
        if (this.activeAgents.size >= this.maxConcurrentAgents) {
          break;
        }

        await this.executeTask(task);
      }

      // Wait before next iteration
      await this.sleep(1000);
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: DelegatedTask): Promise<void> {
    this.logger.info("Orchestrator executing task", {
      taskId: task.id,
      agentType: task.agentType,
      title: task.title,
    });

    try {
      // Update task status
      task.status = "running" as TaskStatus;
      task.startedAt = new Date();

      // Create agent instance
      const agent: AgentInstance = {
        id: `agent-${task.id}`,
        type: task.agentType,
        sessionId: this.context!.bossSession.id,
        taskId: task.id,
        status: "starting",
        startedAt: new Date(),
      };

      this.activeAgents.set(agent.id, agent);
      this.emit("agent:spawned", agent);
      this.emit("task:started", task);

      // Execute task in background
      this.executeTaskAsync(task, agent).catch((error) => {
        this.logger.error("Task execution failed", error as Error, {
          taskId: task.id,
        });
      });
    } catch (error) {
      this.logger.error("Failed to start task execution", error as Error, {
        taskId: task.id,
      });

      task.status = "failed" as TaskStatus;
      task.completedAt = new Date();
      this.emit("task:failed", task, error as Error);
    }
  }

  /**
   * Execute task asynchronously
   */
  private async executeTaskAsync(
    task: DelegatedTask,
    agent: AgentInstance
  ): Promise<void> {
    const startTime = Date.now();

    try {
      agent.status = "running";

      // Create execution context for sub-agent
      const executionContext = {
        session: this.context!.bossSession,
        issue: this.context!.issue,
        triggerComment: this.context!.triggerComment,
        workingDir: this.context!.bossSession.workingDir,
        branchName: this.context!.bossSession.branchName,
        config: this.config,
        context: {
          delegatedTask: task,
          agentType: task.agentType,
          bossMode: true,
        },
      };

      // Execute via Claude executor
      const result = await this.executor.execute(executionContext);

      // Update task with result
      task.status = result.success ? "completed" : "failed";
      task.completedAt = new Date();
      task.result = {
        success: result.success,
        output: result.output,
        error: result.error,
        filesModified: result.filesModified,
        duration: Date.now() - startTime,
      };

      agent.status = result.success ? "completed" : "failed";
      agent.completedAt = new Date();

      // Emit events
      if (result.success) {
        this.emit("task:completed", task);
      } else {
        this.emit("task:failed", task, new Error(result.error || "Unknown error"));
      }

      // Remove from active agents
      this.activeAgents.delete(agent.id);
      this.emit("agent:terminated", agent);

      this.logger.info("Task execution finished", {
        taskId: task.id,
        success: result.success,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      task.status = "failed" as TaskStatus;
      task.completedAt = new Date();
      task.result = {
        success: false,
        error: (error as Error).message,
        duration: Date.now() - startTime,
      };

      agent.status = "failed";
      agent.completedAt = new Date();

      this.activeAgents.delete(agent.id);
      this.emit("agent:terminated", agent);
      this.emit("task:failed", task, error as Error);

      this.logger.error("Task execution error", error as Error, {
        taskId: task.id,
      });
    }
  }

  /**
   * Terminate agent
   */
  private async terminateAgent(agent: AgentInstance): Promise<void> {
    this.logger.info("Terminating agent", {
      agentId: agent.id,
      taskId: agent.taskId,
    });

    // Cancel session if running
    if (agent.sessionId) {
      try {
        await this.executor.cancelSession(agent.sessionId);
      } catch (error) {
        this.logger.error("Failed to cancel agent session", error as Error, {
          agentId: agent.id,
        });
      }
    }

    this.activeAgents.delete(agent.id);
    this.emit("agent:terminated", agent);
  }

  /**
   * Get next tasks to execute
   */
  private getNextTasks(tasks: DelegatedTask[]): DelegatedTask[] {
    return tasks
      .filter((task) => {
        // Only pending tasks
        if (task.status !== "pending") return false;

        // Check dependencies
        if (task.dependencies && task.dependencies.length > 0) {
          const allDepsComplete = task.dependencies.every((depId) => {
            const dep = tasks.find((t) => t.id === depId);
            return dep && dep.status === "completed";
          });
          if (!allDepsComplete) return false;
        }

        return true;
      })
      .sort((a, b) => b.priority - a.priority); // Sort by priority
  }

  /**
   * Check if all tasks are complete
   */
  private areAllTasksComplete(tasks: DelegatedTask[]): boolean {
    return tasks.every(
      (task) =>
        task.status === "completed" ||
        task.status === "failed" ||
        task.status === "cancelled"
    );
  }

  /**
   * Finish orchestration
   */
  private async finish(): Promise<void> {
    this.isRunning = false;

    const status = this.getStatus();
    this.emit("orchestration:complete", status);

    this.logger.info("Orchestration complete", {
      totalTasks: status.totalTasks,
      completed: status.completedTasks,
      failed: status.failedTasks,
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Type-safe event emitter methods
   */
  on<K extends keyof OrchestratorEvents>(
    event: K,
    listener: OrchestratorEvents[K]
  ): this {
    return super.on(event, listener);
  }

  emit<K extends keyof OrchestratorEvents>(
    event: K,
    ...args: Parameters<OrchestratorEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
