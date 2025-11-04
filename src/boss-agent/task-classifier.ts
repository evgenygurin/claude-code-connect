/**
 * Task Classifier
 *
 * Analyzes incoming events and classifies tasks by type, complexity, and priority
 */

import type { Issue, Comment } from '@linear/sdk';
import type { Logger } from '../core/types.js';
import type { TaskAnalysis, TaskContext } from './types.js';
import { TaskType, Complexity, Priority } from '../codegen/types.js';

/**
 * Task classification patterns
 */
const TASK_TYPE_PATTERNS: Record<TaskType, string[]> = {
  bug_fix: ['fix', 'bug', 'error', 'crash', 'issue', 'broken', 'not working', 'fails'],
  feature_implementation: ['implement', 'add', 'create', 'new', 'feature', 'enhancement'],
  refactoring: ['refactor', 'improve', 'optimize', 'clean', 'restructure', 'reorganize'],
  testing: ['test', 'coverage', 'unit test', 'integration test', 'e2e'],
  documentation: ['docs', 'documentation', 'readme', 'guide', 'document'],
  ci_fix: ['ci', 'build', 'pipeline', 'deploy', 'github actions', 'circleci'],
  sentry_error: ['sentry', 'production error', 'runtime error', 'exception'],
  code_review: ['review', 'code review', 'pr review', 'check'],
  optimization: ['performance', 'slow', 'optimize', 'speed', 'memory', 'cpu'],
};

/**
 * Complexity indicators
 */
const COMPLEXITY_INDICATORS = {
  simple: ['typo', 'simple', 'minor', 'small', 'quick', 'easy'],
  medium: ['moderate', 'medium', 'normal', 'standard'],
  complex: ['complex', 'major', 'large', 'difficult', 'complicated', 'refactor', 'architecture'],
};

/**
 * Priority indicators
 */
const PRIORITY_INDICATORS = {
  low: ['low', 'minor', 'nice to have', 'future', 'someday'],
  medium: ['medium', 'normal', 'moderate'],
  high: ['high', 'important', 'urgent', 'asap', 'priority'],
  critical: ['critical', 'blocker', 'production', 'severe', 'emergency', 'p0'],
};

/**
 * Task Classifier
 */
export class TaskClassifier {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Classify task from Linear issue
   */
  async classifyFromIssue(issue: Issue, comment?: Comment): Promise<TaskAnalysis> {
    this.logger.info('Classifying task from issue', {
      issueId: issue.id,
      issueIdentifier: issue.identifier,
      hasComment: !!comment,
    });

    // Extract text for analysis
    const text = this.extractText(issue, comment);
    const keywords = this.extractKeywords(text);

    // Classify task type
    const taskType = this.detectTaskType(text, keywords);

    // Assess complexity
    const complexity = this.assessComplexity(text, keywords, issue);

    // Determine priority
    const priority = this.determinePriority(text, keywords, issue);

    // Estimate scope
    const scope = this.estimateScope(issue, text);

    // Gather context
    const context = await this.gatherContext(issue, comment);

    // Estimate time
    const estimatedTime = this.estimateTime(complexity, taskType);

    const analysis: TaskAnalysis = {
      taskType,
      complexity,
      priority,
      estimatedTime,
      keywords,
      scope,
      context,
      metadata: {
        issueId: issue.id,
        issueIdentifier: issue.identifier,
        issueTitle: issue.title,
        hasLabels: issue.labels && (await issue.labels()).nodes.length > 0,
        hasDescription: !!issue.description,
        analyzedAt: new Date().toISOString(),
      },
    };

    this.logger.info('Task classification complete', {
      taskType,
      complexity,
      priority,
      estimatedTime,
    });

    return analysis;
  }

  /**
   * Extract text from issue and comment
   */
  private extractText(issue: Issue, comment?: Comment): string {
    const parts: string[] = [];

    if (issue.title) parts.push(issue.title);
    if (issue.description) parts.push(issue.description);
    if (comment?.body) parts.push(comment.body);

    return parts.join(' ').toLowerCase();
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Remove common words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
      'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));

    // Count frequency
    const frequency = new Map<string, number>();
    for (const word of words) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }

    // Return top keywords
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Detect task type from text
   */
  private detectTaskType(text: string, keywords: string[]): TaskType {
    const scores = new Map<TaskType, number>();

    // Score each task type
    for (const [type, patterns] of Object.entries(TASK_TYPE_PATTERNS)) {
      let score = 0;

      for (const pattern of patterns) {
        // Check in full text
        if (text.includes(pattern)) {
          score += 2;
        }

        // Check in keywords
        if (keywords.some((kw) => kw.includes(pattern) || pattern.includes(kw))) {
          score += 1;
        }
      }

      scores.set(type as TaskType, score);
    }

    // Get highest score
    let maxScore = 0;
    let detectedType: TaskType = TaskType.FEATURE;

    for (const [type, score] of scores.entries()) {
      if (score > maxScore) {
        maxScore = score;
        detectedType = type;
      }
    }

    // Default to feature if no clear match
    if (maxScore === 0) {
      return TaskType.FEATURE;
    }

    return detectedType;
  }

  /**
   * Assess task complexity
   */
  private assessComplexity(text: string, keywords: string[], issue: Issue): Complexity {
    let score = 0;

    // Check complexity indicators
    for (const indicator of COMPLEXITY_INDICATORS.simple) {
      if (text.includes(indicator)) score -= 2;
    }

    for (const indicator of COMPLEXITY_INDICATORS.complex) {
      if (text.includes(indicator)) score += 2;
    }

    // Description length
    const descLength = issue.description?.length || 0;
    if (descLength < 100) score -= 1;
    if (descLength > 500) score += 1;
    if (descLength > 1000) score += 2;

    // Multiple files mentioned
    const filePatterns = /\b\w+\.(ts|js|tsx|jsx|py|java|go|rs)\b/g;
    const filesMatched = text.match(filePatterns);
    if (filesMatched && filesMatched.length > 3) score += 2;

    // Architecture keywords
    const architectureKeywords = ['architecture', 'design', 'pattern', 'system', 'refactor'];
    if (architectureKeywords.some((kw) => text.includes(kw))) score += 1;

    // Determine complexity
    if (score <= -2) return Complexity.SIMPLE;
    if (score >= 3) return Complexity.COMPLEX;
    return Complexity.MEDIUM;
  }

  /**
   * Determine task priority
   */
  private determinePriority(text: string, keywords: string[], issue: Issue): Priority {
    let score = 0;

    // Check priority indicators
    for (const indicator of PRIORITY_INDICATORS.low) {
      if (text.includes(indicator)) score -= 2;
    }

    for (const indicator of PRIORITY_INDICATORS.high) {
      if (text.includes(indicator)) score += 1;
    }

    for (const indicator of PRIORITY_INDICATORS.critical) {
      if (text.includes(indicator)) score += 3;
    }

    // Production/critical keywords
    if (text.includes('production') || text.includes('prod')) score += 2;
    if (text.includes('customer') || text.includes('user')) score += 1;

    // Determine priority
    if (score >= 4) return Priority.CRITICAL;
    if (score >= 2) return Priority.HIGH;
    if (score <= -2) return Priority.LOW;
    return Priority.MEDIUM;
  }

  /**
   * Estimate scope
   */
  private estimateScope(issue: Issue, text: string): {
    filesAffected?: number;
    linesOfCode?: number;
    dependencies?: string[];
  } {
    // Extract file mentions
    const filePatterns = /\b\w+\.(ts|js|tsx|jsx|py|java|go|rs)\b/g;
    const filesMatched = text.match(filePatterns);
    const filesAffected = filesMatched ? new Set(filesMatched).size : undefined;

    // Extract dependencies
    const depPatterns = /@[\w-]+\/[\w-]+|[\w-]+\.js|[\w-]+\.ts/g;
    const depsMatched = text.match(depPatterns);
    const dependencies = depsMatched ? Array.from(new Set(depsMatched)).slice(0, 5) : undefined;

    return {
      filesAffected,
      dependencies,
    };
  }

  /**
   * Gather context from issue
   */
  private async gatherContext(issue: Issue, comment?: Comment): Promise<TaskContext> {
    const context: TaskContext = {
      issue,
      comment,
    };

    // Try to extract repository info
    const repoMatch = issue.url?.match(/github\.com\/([\w-]+\/[\w-]+)/);
    if (repoMatch) {
      context.repository = repoMatch[1];
    }

    // Extract related issues
    const issueRefs = issue.description?.match(/#\d+/g);
    if (issueRefs) {
      context.relatedIssues = issueRefs.map((ref) => ref.slice(1));
    }

    // Extract file paths
    const filePaths = issue.description?.match(/[\w/.-]+\.(ts|js|tsx|jsx|py|java|go|rs)/g);
    if (filePaths) {
      context.files = Array.from(new Set(filePaths));
    }

    return context;
  }

  /**
   * Estimate time to complete
   */
  private estimateTime(complexity: Complexity, taskType: TaskType): string {
    // Base estimates by complexity
    const baseEstimates: Record<Complexity, string> = {
      simple: '30 min - 1 hour',
      medium: '2-4 hours',
      complex: '1-2 days',
    };

    // Adjust for task type
    const adjustments: Partial<Record<TaskType, string>> = {
      bug_fix: '1-2 hours',
      testing: '2-3 hours',
      documentation: '1-2 hours',
      code_review: '30 min - 1 hour',
    };

    return adjustments[taskType] || baseEstimates[complexity];
  }
}
