/**
 * Boss Agent Orchestrator - Main coordination layer for task delegation
 */

import { EventEmitter } from "events";
import { nanoid } from "nanoid";
import type { Issue, Comment } from "@linear/sdk";
import type {
  DelegationSession,
  DelegationResult,
  IntegrationConfig,
  Logger,
  SessionStorage,
} from "../core/types.js";
import { TaskAnalyzer } from "./task-analyzer.js";
import { TaskDecomposer } from "./task-decomposer.js";
import { AgentRegistry } from "./agent-registry.js";
import { DelegationManager } from "./delegation-manager.js";
import { ResultAggregator } from "./result-aggregator.js";

/**
 * Boss Agent Orchestrator Events
 */
export interface BossAgentEvents {
  "delegation:started": (session: DelegationSession) => void;
  "delegation:completed": (session: DelegationSession, result: DelegationResult) => void;
  "delegation:failed": (session: DelegationSession, error: Error) => void;
}

/**
 * Boss Agent Orchestrator
 */
export class BossAgentOrchestrator extends EventEmitter {
  private config: IntegrationConfig;
  private logger: Logger;
  private storage: SessionStorage;

  private taskAnalyzer: TaskAnalyzer;
  private taskDecomposer: TaskDecomposer;
  private agentRegistry: AgentRegistry;
  private delegationManager: DelegationManager;
  private resultAggregator: ResultAggregator;

  private activeDelegations = new Map<string, DelegationSession>();

  constructor(
    config: IntegrationConfig,
    logger: Logger,
    storage: SessionStorage
  ) {
    super();
    this.config = config;
    this.logger = logger;
    this.storage = storage;

    // Initialize components
    this.taskAnalyzer = new TaskAnalyzer(logger);
    this.taskDecomposer = new TaskDecomposer(logger);
    this.agentRegistry = new AgentRegistry(logger);
    this.delegationManager = new DelegationManager(
      config,
      logger,
      storage,
      this.agentRegistry
    );
    this.resultAggregator = new ResultAggregator(logger);

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for delegation manager
   */
  private setupEventListeners(): void {
    this.delegationManager.on("subtask:started", (subtask) => {
      this.logger.info("Subtask started", {
        subtaskId: subtask.id,
        title: subtask.title,
      });
    });

    this.delegationManager.on("subtask:completed", (subtask, result) => {
      this.logger.info("Subtask completed", {
        subtaskId: subtask.id,
        title: subtask.title,
        success: result.success,
      });
    });

    this.delegationManager.on("subtask:failed", (subtask, error) => {
      this.logger.error("Subtask failed", error, {
        subtaskId: subtask.id,
        title: subtask.title,
      });
    });
  }

  /**
   * Handle task - main entry point
   */
  async handleTask(
    issue: Issue,
    comment?: Comment
  ): Promise<DelegationResult | null> {
    this.logger.info("Boss Agent handling task", {
      issueId: issue.id,
      identifier: issue.identifier,
      enableBossAgent: this.config.enableBossAgent,
    });

    // Check if Boss Agent is enabled
    if (!this.config.enableBossAgent) {
      this.logger.info("Boss Agent disabled, skipping delegation");
      return null;
    }

    try {
      // 1. Analyze task complexity
      const analysis = await this.taskAnalyzer.analyze(
        issue,
        comment,
        this.config.bossAgentThreshold
      );

      this.logger.info("Task analysis completed", {
        issueId: issue.id,
        complexityScore: analysis.complexityScore,
        shouldDelegate: analysis.shouldDelegate,
      });

      // If task is simple enough, return null to let normal flow handle it
      if (!analysis.shouldDelegate) {
        this.logger.info("Task complexity below threshold, using direct execution");
        return null;
      }

      // 2. Decompose task into subtasks
      const decomposition = await this.taskDecomposer.decompose(
        issue,
        analysis,
        comment
      );

      this.logger.info("Task decomposition completed", {
        issueId: issue.id,
        subtaskCount: decomposition.subtasks.length,
        strategy: decomposition.strategy,
      });

      // 3. Create delegation session
      const session = this.createDelegationSession(
        issue.id,
        analysis,
        decomposition
      );

      this.activeDelegations.set(session.id, session);
      this.emit("delegation:started", session);

      // 4. Execute subtasks
      session.status = "executing";
      session.startedAt = new Date();

      const results = await this.delegationManager.executeSubtasks(
        decomposition.subtasks,
        issue,
        decomposition.strategy,
        comment
      );

      // 5. Aggregate results
      session.status = "aggregating";

      const aggregatedResult = await this.resultAggregator.aggregate(
        decomposition.subtasks,
        results
      );

      // 6. Complete delegation
      session.status = aggregatedResult.success ? "completed" : "failed";
      session.completedAt = new Date();
      session.result = aggregatedResult;

      this.activeDelegations.delete(session.id);

      if (aggregatedResult.success) {
        this.emit("delegation:completed", session, aggregatedResult);
      } else {
        this.emit("delegation:failed", session, new Error("Some subtasks failed"));
      }

      this.logger.info("Delegation completed", {
        sessionId: session.id,
        issueId: issue.id,
        success: aggregatedResult.success,
        duration: aggregatedResult.duration,
      });

      return aggregatedResult;
    } catch (error) {
      this.logger.error("Boss Agent delegation failed", error as Error, {
        issueId: issue.id,
      });
      throw error;
    }
  }

  /**
   * Create delegation session
   */
  private createDelegationSession(
    issueId: string,
    analysis: any,
    decomposition: any
  ): DelegationSession {
    return {
      id: nanoid(),
      issueId,
      analysis,
      decomposition,
      status: "planning",
      createdAt: new Date(),
      activeSessions: new Map(),
    };
  }

  /**
   * Get active delegations
   */
  getActiveDelegations(): DelegationSession[] {
    return Array.from(this.activeDelegations.values());
  }

  /**
   * Cancel delegation session
   */
  async cancelDelegation(sessionId: string): Promise<void> {
    const session = this.activeDelegations.get(sessionId);
    if (!session) {
      throw new Error(`Delegation session not found: ${sessionId}`);
    }

    this.logger.info("Cancelling delegation session", { sessionId });

    await this.delegationManager.cancelAll();

    session.status = "failed";
    this.activeDelegations.delete(sessionId);

    this.logger.info("Delegation session cancelled", { sessionId });
  }

  /**
   * Get agent registry (for inspection/testing)
   */
  getAgentRegistry(): AgentRegistry {
    return this.agentRegistry;
  }

  /**
   * Typed event emitter methods
   */
  on<K extends keyof BossAgentEvents>(
    event: K,
    listener: BossAgentEvents[K]
  ): this {
    return super.on(event, listener);
  }

  once<K extends keyof BossAgentEvents>(
    event: K,
    listener: BossAgentEvents[K]
  ): this {
    return super.once(event, listener);
  }

  emit<K extends keyof BossAgentEvents>(
    event: K,
    ...args: Parameters<BossAgentEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
