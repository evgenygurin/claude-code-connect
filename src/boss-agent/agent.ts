/**
 * Boss Agent
 *
 * Main coordinator class that analyzes tasks, makes decisions,
 * delegates to Codegen, monitors progress, and reports results.
 *
 * CRITICAL: Boss Agent NEVER codes - only coordinates.
 */

import type { Issue, Comment } from '@linear/sdk';
import type { IntegrationConfig, Logger } from '../core/types.js';
import type {
  TaskAnalysis,
  BossAgentDecision,
  DelegationResult,
  ExecutionResult,
  BossAgentSession,
  BossAgentTrigger,
  TaskContext,
} from './types.js';
import { TaskClassifier } from './task-classifier.js';
import { DecisionEngine } from './decision-engine.js';
import { CodegenClient } from '../codegen/client.js';
import { CodegenPromptBuilder } from '../codegen/prompt-builder.js';
import type { CodegenTask, CodegenTaskResult } from '../codegen/types.js';

/**
 * Boss Agent - The Coordinator
 *
 * This class orchestrates the entire workflow:
 * 1. Analyze incoming tasks
 * 2. Make strategic decisions
 * 3. Delegate to Codegen agents
 * 4. Monitor execution
 * 5. Report results
 */
export class BossAgent {
  private config: IntegrationConfig;
  private logger: Logger;
  private classifier: TaskClassifier;
  private decisionEngine: DecisionEngine;
  private codegenClient: CodegenClient;
  private promptBuilder: CodegenPromptBuilder;
  private activeSessions: Map<string, BossAgentSession>;

  constructor(
    config: IntegrationConfig,
    logger: Logger,
    codegenClient: CodegenClient,
  ) {
    this.config = config;
    this.logger = logger;
    this.codegenClient = codegenClient;
    this.classifier = new TaskClassifier(logger);
    this.decisionEngine = new DecisionEngine(logger);
    this.promptBuilder = new CodegenPromptBuilder();
    this.activeSessions = new Map();

    this.logger.info('Boss Agent initialized', {
      mode: 'coordinator',
      codegenEnabled: true,
    });
  }

  /**
   * Analyze task from Linear issue
   */
  async analyzeTask(issue: Issue, comment?: Comment): Promise<TaskAnalysis> {
    this.logger.info('Boss Agent analyzing task', {
      issueId: issue.id,
      issueIdentifier: issue.identifier,
    });

    const analysis = await this.classifier.classifyFromIssue(issue, comment);

    this.logger.info('Task analysis complete', {
      taskType: analysis.taskType,
      complexity: analysis.complexity,
      priority: analysis.priority,
    });

    return analysis;
  }

  /**
   * Make decision about task delegation
   */
  async makeDecision(analysis: TaskAnalysis): Promise<BossAgentDecision> {
    this.logger.info('Boss Agent making decision', {
      taskType: analysis.taskType,
      complexity: analysis.complexity,
      priority: analysis.priority,
    });

    const decision = await this.decisionEngine.decide(analysis);

    this.logger.info('Decision made', {
      shouldDelegate: decision.shouldDelegate,
      delegateTo: decision.delegateTo,
      strategy: decision.strategy,
    });

    return decision;
  }

  /**
   * Delegate task to Codegen
   */
  async delegate(
    decision: BossAgentDecision,
    analysis: TaskAnalysis,
  ): Promise<DelegationResult> {
    this.logger.info('Boss Agent delegating task', {
      delegateTo: decision.delegateTo,
      taskType: decision.taskType,
      strategy: decision.strategy,
    });

    if (!decision.shouldDelegate) {
      throw new Error('Cannot delegate: decision.shouldDelegate is false');
    }

    if (decision.delegateTo !== 'codegen') {
      throw new Error(`Unsupported delegation target: ${decision.delegateTo}`);
    }

    try {
      // Build prompt for Codegen
      const prompt = this.buildPrompt(decision, analysis);

      // Create Codegen task
      const codegenTask = await this.codegenClient.runTask(prompt, {
        branch: decision.options?.branchName,
        labels: decision.options?.labels,
        autoMerge: decision.options?.autoMerge,
        priority: decision.priority,
        timeout: decision.options?.timeout,
        createPR: decision.options?.createPR,
        assignReviewers: decision.options?.requireReview,
        reviewers: decision.options?.reviewers,
      });

      const result: DelegationResult = {
        taskId: codegenTask.id,
        delegatedTo: 'codegen',
        codegenTask,
        status: 'delegated',
        timestamp: new Date(),
      };

      this.logger.info('Task delegated successfully', {
        taskId: codegenTask.id,
        codegenTaskId: codegenTask.id,
      });

      return result;
    } catch (error) {
      this.logger.error('Delegation failed', error as Error);

      return {
        taskId: `failed-${Date.now()}`,
        delegatedTo: 'codegen',
        status: 'failed',
        timestamp: new Date(),
        error: (error as Error).message,
      };
    }
  }

  /**
   * Monitor task execution
   */
  async monitor(
    delegationResult: DelegationResult,
    analysis: TaskAnalysis,
    options?: {
      pollInterval?: number;
      onProgress?: (task: CodegenTask) => void | Promise<void>;
    },
  ): Promise<ExecutionResult> {
    this.logger.info('Boss Agent monitoring task', {
      taskId: delegationResult.taskId,
    });

    if (delegationResult.status === 'failed') {
      return this.buildFailedResult(delegationResult, analysis);
    }

    try {
      // Wait for Codegen task completion
      const result = await this.codegenClient.waitForCompletion(
        delegationResult.taskId,
        {
          pollInterval: options?.pollInterval || 30000,
          timeout: analysis.complexity === 'complex' ? 4 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000,
          onProgress: options?.onProgress,
        },
      );

      const executionResult = this.buildSuccessResult(
        delegationResult,
        analysis,
        result,
      );

      this.logger.info('Task execution completed', {
        taskId: delegationResult.taskId,
        success: executionResult.status === 'success',
        duration: executionResult.duration,
      });

      return executionResult;
    } catch (error) {
      this.logger.error('Task execution failed', error as Error, {
        taskId: delegationResult.taskId,
      });

      return this.buildFailedResult(delegationResult, analysis, error as Error);
    }
  }

  /**
   * Execute complete workflow
   */
  async executeWorkflow(
    issue: Issue,
    comment?: Comment,
  ): Promise<ExecutionResult> {
    const sessionId = this.generateSessionId();
    const startTime = Date.now();

    this.logger.info('Boss Agent executing workflow', {
      sessionId,
      issueId: issue.id,
      issueIdentifier: issue.identifier,
    });

    // Create session
    const session: BossAgentSession = {
      id: sessionId,
      issueId: issue.id,
      issueIdentifier: issue.identifier,
      issueTitle: issue.title,
      status: 'analyzing',
      startedAt: new Date(),
      updatedAt: new Date(),
    };

    this.activeSessions.set(sessionId, session);

    try {
      // Step 1: Analyze
      const analysis = await this.analyzeTask(issue, comment);
      session.analysis = analysis;
      session.status = 'analyzing';
      session.updatedAt = new Date();

      // Step 2: Decide
      const decision = await this.makeDecision(analysis);
      session.decision = decision;
      session.updatedAt = new Date();

      // Check if should delegate
      if (!decision.shouldDelegate) {
        this.logger.info('Task not delegated', {
          reason: decision.reason,
        });

        session.status = 'completed';
        session.completedAt = new Date();
        session.updatedAt = new Date();

        return {
          taskId: sessionId,
          issueId: issue.id,
          issueIdentifier: issue.identifier,
          issueTitle: issue.title,
          status: 'failed',
          delegatedTo: decision.delegateTo,
          duration: Date.now() - startTime,
          startedAt: new Date(startTime),
          completedAt: new Date(),
          error: decision.reason || 'Task not eligible for delegation',
          originalIssue: issue,
          originalComment: comment,
        };
      }

      // Step 3: Delegate
      const delegation = await this.delegate(decision, analysis);
      session.delegation = delegation;
      session.status = 'delegated';
      session.updatedAt = new Date();

      // Step 4: Monitor
      session.status = 'monitoring';
      session.updatedAt = new Date();

      const result = await this.monitor(delegation, analysis);
      session.result = result;
      session.status = result.status === 'success' ? 'completed' : 'failed';
      session.completedAt = new Date();
      session.updatedAt = new Date();

      return result;
    } catch (error) {
      this.logger.error('Workflow execution failed', error as Error, {
        sessionId,
      });

      session.status = 'failed';
      session.completedAt = new Date();
      session.updatedAt = new Date();

      return {
        taskId: sessionId,
        issueId: issue.id,
        issueIdentifier: issue.identifier,
        issueTitle: issue.title,
        status: 'failed',
        delegatedTo: 'codegen',
        duration: Date.now() - startTime,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        error: (error as Error).message,
        originalIssue: issue,
        originalComment: comment,
      };
    } finally {
      // Session will remain in activeSessions for history
    }
  }

  /**
   * Build prompt for Codegen
   */
  private buildPrompt(
    decision: BossAgentDecision,
    analysis: TaskAnalysis,
  ): string {
    if (!analysis.context.issue) {
      throw new Error('Cannot build prompt: missing issue in context');
    }

    return this.promptBuilder.build(
      analysis.context.issue,
      decision.taskType,
      analysis.context,
    );
  }

  /**
   * Build success execution result
   */
  private buildSuccessResult(
    delegation: DelegationResult,
    analysis: TaskAnalysis,
    codegenResult: CodegenTaskResult,
  ): ExecutionResult {
    const issue = analysis.context.issue!;

    return {
      taskId: delegation.taskId,
      issueId: issue.id,
      issueIdentifier: issue.identifier,
      issueTitle: issue.title,
      status: 'success',
      delegatedTo: 'codegen',
      codegenTaskId: delegation.taskId,
      result: codegenResult,
      duration: codegenResult.duration,
      startedAt: delegation.timestamp,
      completedAt: new Date(),
      originalIssue: issue,
      originalComment: analysis.context.comment,
    };
  }

  /**
   * Build failed execution result
   */
  private buildFailedResult(
    delegation: DelegationResult,
    analysis: TaskAnalysis,
    error?: Error,
  ): ExecutionResult {
    const issue = analysis.context.issue!;

    return {
      taskId: delegation.taskId,
      issueId: issue.id,
      issueIdentifier: issue.identifier,
      issueTitle: issue.title,
      status: 'failed',
      delegatedTo: 'codegen',
      codegenTaskId: delegation.taskId,
      duration: Date.now() - delegation.timestamp.getTime(),
      startedAt: delegation.timestamp,
      completedAt: new Date(),
      error: error?.message || delegation.error || 'Unknown error',
      originalIssue: issue,
      originalComment: analysis.context.comment,
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `boss-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): BossAgentSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): BossAgentSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.activeSessions.size;
  }
}
