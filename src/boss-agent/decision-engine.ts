/**
 * Decision Engine
 *
 * Makes strategic decisions about task delegation based on analysis
 */

import type { Logger } from '../core/types.js';
import type {
  TaskAnalysis,
  BossAgentDecision,
  DelegationOptions,
} from './types.js';
import { TaskType, Complexity, Priority } from '../codegen/types.js';
import { DelegationStrategy } from './types.js';

/**
 * Decision rules configuration
 */
interface DecisionRules {
  // Always delegate these types to Codegen
  alwaysDelegateTypes: TaskType[];

  // Never delegate these types (manual only)
  neverDelegateTypes: TaskType[];

  // Minimum complexity to delegate
  minComplexityForDelegation: Complexity;

  // Auto-delegate high priority tasks
  autoDelegateHighPriority: boolean;

  // Require human review for critical tasks
  requireReviewForCritical: boolean;
}

/**
 * Default decision rules
 */
const DEFAULT_RULES: DecisionRules = {
  alwaysDelegateTypes: [
    TaskType.BUG_FIX,
    TaskType.FEATURE,
    TaskType.REFACTOR,
    TaskType.TEST,
    TaskType.CI_FIX,
    TaskType.SENTRY_ERROR,
  ],
  neverDelegateTypes: [],
  minComplexityForDelegation: Complexity.SIMPLE,
  autoDelegateHighPriority: true,
  requireReviewForCritical: true,
};

/**
 * Decision Engine
 */
export class DecisionEngine {
  private logger: Logger;
  private rules: DecisionRules;

  constructor(logger: Logger, rules?: Partial<DecisionRules>) {
    this.logger = logger;
    this.rules = { ...DEFAULT_RULES, ...rules };
  }

  /**
   * Make decision about task delegation
   */
  async decide(analysis: TaskAnalysis): Promise<BossAgentDecision> {
    this.logger.info('Making delegation decision', {
      taskType: analysis.taskType,
      complexity: analysis.complexity,
      priority: analysis.priority,
    });

    // Determine if should delegate
    const shouldDelegate = this.shouldDelegate(analysis);
    const delegateTo = this.selectExecutor(analysis);
    const strategy = this.selectStrategy(analysis);
    const options = this.buildDelegationOptions(analysis);
    const estimatedCost = this.estimateCost(analysis);

    const decision: BossAgentDecision = {
      shouldDelegate,
      delegateTo,
      taskType: analysis.taskType,
      complexity: analysis.complexity,
      priority: analysis.priority,
      strategy,
      estimatedTime: analysis.estimatedTime,
      estimatedCost,
      options,
    };

    // Add reason if not delegating
    if (!shouldDelegate) {
      decision.reason = this.getNoDelegationReason(analysis);
    }

    this.logger.info('Decision made', {
      shouldDelegate,
      delegateTo,
      strategy,
      reason: decision.reason,
    });

    return decision;
  }

  /**
   * Determine if task should be delegated
   */
  private shouldDelegate(analysis: TaskAnalysis): boolean {
    // Check never delegate list
    if (this.rules.neverDelegateTypes.includes(analysis.taskType)) {
      return false;
    }

    // Check always delegate list
    if (this.rules.alwaysDelegateTypes.includes(analysis.taskType)) {
      return true;
    }

    // Check minimum complexity
    const complexityOrder = [Complexity.SIMPLE, Complexity.MEDIUM, Complexity.COMPLEX];
    const taskComplexityIndex = complexityOrder.indexOf(analysis.complexity);
    const minComplexityIndex = complexityOrder.indexOf(this.rules.minComplexityForDelegation);

    if (taskComplexityIndex < minComplexityIndex) {
      return false;
    }

    // Check priority rules
    if (analysis.priority === Priority.CRITICAL && this.rules.autoDelegateHighPriority) {
      return true;
    }

    // Default: delegate
    return true;
  }

  /**
   * Select executor (Codegen vs Claude vs Manual)
   */
  private selectExecutor(analysis: TaskAnalysis): 'codegen' | 'claude' | 'manual' {
    // For now, always delegate to Codegen
    // In future, could delegate to Claude for analysis-only tasks
    return 'codegen';
  }

  /**
   * Select delegation strategy
   */
  private selectStrategy(analysis: TaskAnalysis): DelegationStrategy {
    // Critical bugs: direct and fast
    if (analysis.priority === Priority.CRITICAL && analysis.taskType === TaskType.BUG_FIX) {
      return DelegationStrategy.DIRECT;
    }

    // Complex features: review first
    if (analysis.complexity === Complexity.COMPLEX && analysis.taskType === TaskType.FEATURE) {
      return DelegationStrategy.REVIEW_FIRST;
    }

    // Large refactoring: split into smaller tasks
    if (
      analysis.taskType === TaskType.REFACTOR &&
      analysis.complexity === Complexity.COMPLEX &&
      analysis.scope.filesAffected &&
      analysis.scope.filesAffected > 5
    ) {
      return DelegationStrategy.SPLIT;
    }

    // Multiple components: parallel execution
    if (
      analysis.scope.filesAffected &&
      analysis.scope.filesAffected > 3 &&
      analysis.complexity !== Complexity.COMPLEX
    ) {
      return DelegationStrategy.PARALLEL;
    }

    // Default: direct delegation
    return DelegationStrategy.DIRECT;
  }

  /**
   * Build delegation options
   */
  private buildDelegationOptions(analysis: TaskAnalysis): DelegationOptions {
    const options: DelegationOptions = {
      createBranch: true,
      createPR: true,
      autoMerge: false, // Never auto-merge, always require review
      requireReview: true,
    };

    // Branch naming
    if (analysis.context.issue) {
      const issue = analysis.context.issue;
      const slug = issue.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 50);
      options.branchName = `codegen/${issue.identifier.toLowerCase()}-${slug}`;
    }

    // Labels based on task type
    options.labels = [
      'codegen',
      this.getTaskTypeLabel(analysis.taskType),
    ];

    // Add priority label
    if (analysis.priority === Priority.CRITICAL || analysis.priority === Priority.HIGH) {
      options.labels.push(`priority:${analysis.priority}`);
    }

    // Reviewers for critical tasks
    if (analysis.priority === Priority.CRITICAL && this.rules.requireReviewForCritical) {
      options.requireReview = true;
      // Could add specific reviewers here
      // options.reviewers = ['@team/backend'];
    }

    // Timeout based on complexity
    options.timeout = this.getTimeoutForComplexity(analysis.complexity);

    // Retry on failure for simple tasks
    if (analysis.complexity === Complexity.SIMPLE) {
      options.retryOnFailure = true;
      options.maxRetries = 2;
    }

    return options;
  }

  /**
   * Get task type label
   */
  private getTaskTypeLabel(taskType: TaskType): string {
    const labelMap: Record<TaskType, string> = {
      bug_fix: 'bug',
      feature_implementation: 'feature',
      refactoring: 'refactor',
      testing: 'tests',
      documentation: 'docs',
      ci_fix: 'ci',
      sentry_error: 'sentry',
      code_review: 'review',
      optimization: 'performance',
    };

    return labelMap[taskType] || 'task';
  }

  /**
   * Get timeout for complexity
   */
  private getTimeoutForComplexity(complexity: Complexity): number {
    const timeouts: Record<Complexity, number> = {
      simple: 30 * 60 * 1000, // 30 minutes
      medium: 2 * 60 * 60 * 1000, // 2 hours
      complex: 4 * 60 * 60 * 1000, // 4 hours
    };

    return timeouts[complexity];
  }

  /**
   * Estimate cost (in arbitrary units)
   */
  private estimateCost(analysis: TaskAnalysis): number {
    // Base cost by complexity
    const baseCosts: Record<Complexity, number> = {
      simple: 10,
      medium: 50,
      complex: 200,
    };

    let cost = baseCosts[analysis.complexity];

    // Adjust for task type
    const typeMultipliers: Partial<Record<TaskType, number>> = {
      bug_fix: 0.8,
      testing: 0.7,
      documentation: 0.5,
      feature_implementation: 1.2,
      refactoring: 1.5,
    };

    const multiplier = typeMultipliers[analysis.taskType] || 1.0;
    cost *= multiplier;

    // Adjust for priority
    if (analysis.priority === Priority.CRITICAL) {
      cost *= 1.5; // Higher priority = faster execution = higher cost
    }

    return Math.round(cost);
  }

  /**
   * Get reason for not delegating
   */
  private getNoDelegationReason(analysis: TaskAnalysis): string {
    if (this.rules.neverDelegateTypes.includes(analysis.taskType)) {
      return `Task type '${analysis.taskType}' is configured for manual handling`;
    }

    const complexityOrder = [Complexity.SIMPLE, Complexity.MEDIUM, Complexity.COMPLEX];
    const taskComplexityIndex = complexityOrder.indexOf(analysis.complexity);
    const minComplexityIndex = complexityOrder.indexOf(this.rules.minComplexityForDelegation);

    if (taskComplexityIndex < minComplexityIndex) {
      return `Task complexity '${analysis.complexity}' is below minimum threshold '${this.rules.minComplexityForDelegation}'`;
    }

    return 'Task does not meet delegation criteria';
  }

  /**
   * Update decision rules
   */
  updateRules(rules: Partial<DecisionRules>): void {
    this.rules = { ...this.rules, ...rules };
    this.logger.info('Decision rules updated', { rules: this.rules });
  }

  /**
   * Get current rules
   */
  getRules(): DecisionRules {
    return { ...this.rules };
  }
}
