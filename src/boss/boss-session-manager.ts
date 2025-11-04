/**
 * Boss Session Manager - Extends SessionManager with Boss Agent capabilities
 *
 * When Boss mode is enabled:
 * 1. Analyzes issues for complexity
 * 2. Delegates complex tasks to specialized agents
 * 3. Orchestrates sub-agent execution
 * 4. Aggregates and reports results
 */

import type { Issue, Comment } from "@linear/sdk";
import type {
  IntegrationConfig,
  Logger,
  SessionStorage,
  ClaudeSession,
} from "../core/types.js";
import { SessionManager } from "../sessions/manager.js";
import { BossAgent } from "./boss-agent.js";
import { AgentOrchestrator } from "./orchestrator.js";
import type {
  BossAgentConfig,
  BossAnalysis,
  OrchestrationContext,
} from "./types.js";

/**
 * Boss Session Manager
 */
export class BossSessionManager extends SessionManager {
  private bossAgent?: BossAgent;
  private orchestrator?: AgentOrchestrator;
  private bossConfig: BossAgentConfig;

  constructor(
    config: IntegrationConfig,
    logger: Logger,
    storage: SessionStorage
  ) {
    super(config, logger, storage);

    // Initialize Boss Agent config
    this.bossConfig = {
      enabled: config.enableBossAgent ?? false,
      maxConcurrentAgents: config.maxConcurrentAgents ?? 3,
      maxDelegationDepth: 2, // Max nested delegation levels
      delegationThreshold: config.bossAgentThreshold ?? 6, // Complexity >= 6 triggers delegation
      agentCapabilities: [], // Will use defaults from BossAgent
      autoDelegation: true,
    };

    // Initialize Boss Agent if enabled
    if (this.bossConfig.enabled) {
      this.bossAgent = new BossAgent(this.bossConfig, logger);
      this.orchestrator = new AgentOrchestrator(
        config,
        logger,
        this,
        this.bossConfig.maxConcurrentAgents
      );

      this.setupOrchestratorEvents();

      logger.info("Boss Agent mode enabled", {
        threshold: this.bossConfig.delegationThreshold,
        maxConcurrentAgents: this.bossConfig.maxConcurrentAgents,
      });
    }
  }

  /**
   * Create session with Boss Agent analysis
   */
  async createSession(
    issue: Issue,
    triggerComment?: Comment
  ): Promise<ClaudeSession> {
    // If Boss Agent disabled, use normal flow
    if (!this.bossAgent || !this.bossConfig.enabled) {
      return super.createSession(issue, triggerComment);
    }

    this.logger.info("Boss Agent analyzing issue for delegation", {
      issueId: issue.id,
      identifier: issue.identifier,
    });

    // Analyze issue
    const analysis = await this.bossAgent.analyzeIssue(issue, triggerComment);

    // Check if complexity warrants delegation
    if (analysis.complexity < this.bossConfig.delegationThreshold) {
      this.logger.info("Issue complexity below threshold, using normal execution", {
        issueId: issue.id,
        complexity: analysis.complexity,
        threshold: this.bossConfig.delegationThreshold,
      });
      return super.createSession(issue, triggerComment);
    }

    // Create boss session
    const session = await super.createSession(issue, triggerComment);

    // Store analysis in session metadata
    (session as any).bossAnalysis = analysis;

    this.logger.info("Boss Agent will delegate this task", {
      issueId: issue.id,
      sessionId: session.id,
      complexity: analysis.complexity,
      estimatedTasks: analysis.estimatedTasks,
      recommendedAgents: analysis.recommendedAgents.join(", "),
    });

    return session;
  }

  /**
   * Start session with Boss Agent orchestration
   */
  async startSession(
    sessionId: string,
    issue: Issue,
    triggerComment?: Comment
  ): Promise<void> {
    // Load session
    const session = await this.storage.load(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Check if this is a boss session
    const bossAnalysis = (session as any).bossAnalysis as BossAnalysis | undefined;

    if (!bossAnalysis || !this.bossAgent || !this.orchestrator) {
      // Not a boss session or boss disabled, use normal flow
      return super.startSession(sessionId, issue, triggerComment);
    }

    this.logger.info("Boss Agent starting orchestrated execution", {
      sessionId,
      issueId: issue.id,
      estimatedTasks: bossAnalysis.estimatedTasks,
    });

    // Create delegation plan
    const tasks = await this.bossAgent.createDelegationPlan(bossAnalysis);

    // Create orchestration context
    const context: OrchestrationContext = {
      bossSession: session,
      issue,
      triggerComment,
      analysis: bossAnalysis,
      config: this.config,
      tasks,
      activeAgents: new Map(),
    };

    // Start orchestration
    await this.orchestrator.start(context);

    this.logger.info("Boss Agent orchestration started", {
      sessionId,
      totalTasks: tasks.length,
    });
  }

  /**
   * Setup orchestrator event handlers
   */
  private setupOrchestratorEvents(): void {
    if (!this.orchestrator) return;

    // Listen for orchestration completion
    this.orchestrator.on("orchestration:complete", async (status) => {
      this.logger.info("Boss Agent orchestration completed", {
        totalTasks: status.totalTasks,
        completed: status.completedTasks,
        failed: status.failedTasks,
      });

      // Find boss session and update
      // Note: In real implementation, we'd need to track boss session ID
    });

    // Listen for task events
    this.orchestrator.on("task:started", (task) => {
      this.logger.info("Boss Agent: Sub-task started", {
        taskId: task.id,
        agentType: task.agentType,
        title: task.title,
      });
    });

    this.orchestrator.on("task:completed", (task) => {
      this.logger.info("Boss Agent: Sub-task completed", {
        taskId: task.id,
        agentType: task.agentType,
        duration: task.result?.duration,
      });
    });

    this.orchestrator.on("task:failed", (task, error) => {
      this.logger.error("Boss Agent: Sub-task failed", error, {
        taskId: task.id,
        agentType: task.agentType,
      });
    });
  }

  /**
   * Get Boss Agent status
   */
  getBossStatus(): {
    enabled: boolean;
    orchestratorActive: boolean;
    orchestrationStatus?: any;
  } {
    return {
      enabled: this.bossConfig.enabled,
      orchestratorActive: this.orchestrator?.getStatus().active ?? false,
      orchestrationStatus: this.orchestrator?.getStatus(),
    };
  }
}
