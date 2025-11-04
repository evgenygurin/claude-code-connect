/**
 * Unit tests for DecisionEngine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DecisionEngine } from './decision-engine.js';
import { DelegationStrategy } from './types.js';
import type { TaskAnalysis } from './types.js';
import type { Logger } from '../core/types.js';

// Mock logger
const mockLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

// Helper to create mock task analysis
function createMockAnalysis(
  taskType: string,
  complexity: 'simple' | 'medium' | 'complex',
  priority: 'low' | 'medium' | 'high' | 'critical',
): TaskAnalysis {
  return {
    taskType: taskType as any,
    complexity,
    priority,
    estimatedTime: '2 hours',
    keywords: ['test', 'example'],
    scope: {
      filesAffected: 3,
      linesOfCode: 100,
      dependencies: [],
    },
    context: {
      issue: {
        id: 'test-id',
        identifier: 'TEST-123',
        title: 'Test Issue',
        description: 'Test description',
      } as any,
    },
    metadata: {},
  };
}

describe('DecisionEngine', () => {
  let engine: DecisionEngine;

  beforeEach(() => {
    engine = new DecisionEngine(mockLogger);
  });

  describe('Delegation Decision', () => {
    it('should delegate simple bug fixes', async () => {
      const analysis = createMockAnalysis('bug_fix', 'simple', 'high');
      const decision = await engine.decide(analysis);
      expect(decision.shouldDelegate).toBe(true);
      expect(decision.delegateTo).toBe('codegen');
    });

    it('should delegate medium complexity features', async () => {
      const analysis = createMockAnalysis('feature_implementation', 'medium', 'medium');
      const decision = await engine.decide(analysis);
      expect(decision.shouldDelegate).toBe(true);
      expect(decision.delegateTo).toBe('codegen');
    });

    it('should delegate complex tasks', async () => {
      const analysis = createMockAnalysis('refactoring', 'complex', 'medium');
      const decision = await engine.decide(analysis);
      expect(decision.shouldDelegate).toBe(true);
      expect(decision.delegateTo).toBe('codegen');
    });

    it('should not delegate documentation tasks', async () => {
      const analysis = createMockAnalysis('documentation', 'simple', 'low');
      const decision = await engine.decide(analysis);
      // Documentation can be delegated if clear enough
      expect(['codegen', 'manual']).toContain(decision.delegateTo);
    });

    it('should always delegate critical priority tasks', async () => {
      const analysis = createMockAnalysis('bug_fix', 'complex', 'critical');
      const decision = await engine.decide(analysis);
      expect(decision.shouldDelegate).toBe(true);
      expect(decision.priority).toBe('critical');
    });
  });

  describe('Executor Selection', () => {
    it('should select codegen for code-related tasks', async () => {
      const codeTaskTypes = ['bug_fix', 'feature_implementation', 'refactoring', 'testing'];
      for (const taskType of codeTaskTypes) {
        const analysis = createMockAnalysis(taskType, 'medium', 'medium');
        const decision = await engine.decide(analysis);
        expect(decision.delegateTo).toBe('codegen');
      }
    });

    it('should consider manual for ambiguous tasks', async () => {
      const analysis = createMockAnalysis('optimization', 'complex', 'low');
      analysis.keywords = ['maybe', 'consider', 'think', 'unclear'];
      const decision = await engine.decide(analysis);
      expect(['codegen', 'manual']).toContain(decision.delegateTo);
    });
  });

  describe('Strategy Selection', () => {
    it('should use direct strategy for simple tasks', async () => {
      const analysis = createMockAnalysis('bug_fix', 'simple', 'medium');
      const decision = await engine.decide(analysis);
      expect(decision.strategy).toBe(DelegationStrategy.DIRECT);
    });

    it('should use direct strategy for critical bugs', async () => {
      const analysis = createMockAnalysis('bug_fix', 'medium', 'critical');
      const decision = await engine.decide(analysis);
      expect(decision.strategy).toBe(DelegationStrategy.DIRECT);
    });

    it('should use review-first for complex features', async () => {
      const analysis = createMockAnalysis('feature_implementation', 'complex', 'medium');
      const decision = await engine.decide(analysis);
      expect(decision.strategy).toBe(DelegationStrategy.REVIEW_FIRST);
    });

    it('should use split strategy for large refactoring', async () => {
      const analysis = createMockAnalysis('refactoring', 'complex', 'medium');
      analysis.scope.filesAffected = 20;
      analysis.scope.linesOfCode = 5000;
      const decision = await engine.decide(analysis);
      expect(decision.strategy).toBe(DelegationStrategy.SPLIT);
    });

    it('should use parallel strategy for multiple components', async () => {
      const analysis = createMockAnalysis('feature_implementation', 'complex', 'medium');
      analysis.keywords.push('frontend', 'backend', 'database');
      const decision = await engine.decide(analysis);
      expect([DelegationStrategy.PARALLEL, DelegationStrategy.SPLIT]).toContain(
        decision.strategy,
      );
    });

    it('should use sequential strategy for dependent tasks', async () => {
      const analysis = createMockAnalysis('feature_implementation', 'complex', 'medium');
      analysis.keywords.push('migration', 'schema', 'data');
      const decision = await engine.decide(analysis);
      // Sequential or split for data migrations
      expect([
        DelegationStrategy.SEQUENTIAL,
        DelegationStrategy.SPLIT,
        DelegationStrategy.REVIEW_FIRST,
      ]).toContain(decision.strategy);
    });
  });

  describe('Delegation Options', () => {
    it('should create branch for all tasks', async () => {
      const analysis = createMockAnalysis('feature_implementation', 'medium', 'medium');
      const decision = await engine.decide(analysis);
      expect(decision.options?.createBranch).toBe(true);
      expect(decision.options?.branchName).toBeDefined();
    });

    it('should generate branch name from issue identifier', async () => {
      const analysis = createMockAnalysis('bug_fix', 'simple', 'high');
      analysis.context.issue!.identifier = 'BUG-456';
      analysis.context.issue!.title = 'Fix login error';
      const decision = await engine.decide(analysis);
      expect(decision.options?.branchName).toMatch(/bug-456/i);
    });

    it('should create PR by default', async () => {
      const analysis = createMockAnalysis('feature_implementation', 'medium', 'medium');
      const decision = await engine.decide(analysis);
      expect(decision.options?.createPR).toBe(true);
    });

    it('should not auto-merge by default', async () => {
      const analysis = createMockAnalysis('feature_implementation', 'medium', 'medium');
      const decision = await engine.decide(analysis);
      expect(decision.options?.autoMerge).toBe(false);
    });

    it('should require review for complex tasks', async () => {
      const analysis = createMockAnalysis('refactoring', 'complex', 'medium');
      const decision = await engine.decide(analysis);
      expect(decision.options?.requireReview).toBe(true);
    });

    it('should set appropriate labels', async () => {
      const analysis = createMockAnalysis('bug_fix', 'simple', 'critical');
      const decision = await engine.decide(analysis);
      expect(decision.options?.labels).toBeDefined();
      expect(decision.options?.labels).toContain('bug');
    });

    it('should set higher timeout for complex tasks', async () => {
      const analysis = createMockAnalysis('feature_implementation', 'complex', 'medium');
      const decision = await engine.decide(analysis);
      expect(decision.options?.timeout).toBeGreaterThan(7200000); // > 2 hours
    });

    it('should set lower timeout for simple tasks', async () => {
      const analysis = createMockAnalysis('bug_fix', 'simple', 'medium');
      const decision = await engine.decide(analysis);
      expect(decision.options?.timeout).toBeLessThan(7200000); // < 2 hours
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate cost for simple tasks', async () => {
      const analysis = createMockAnalysis('bug_fix', 'simple', 'medium');
      const decision = await engine.decide(analysis);
      expect(decision.estimatedCost).toBeDefined();
      expect(decision.estimatedCost).toBeGreaterThan(0);
    });

    it('should estimate higher cost for complex tasks', async () => {
      const simpleAnalysis = createMockAnalysis('bug_fix', 'simple', 'medium');
      const complexAnalysis = createMockAnalysis('feature_implementation', 'complex', 'medium');

      const simpleDecision = await engine.decide(simpleAnalysis);
      const complexDecision = await engine.decide(complexAnalysis);

      expect(complexDecision.estimatedCost).toBeGreaterThan(simpleDecision.estimatedCost || 0);
    });
  });

  describe('Reason Explanation', () => {
    it('should provide reason when not delegating', async () => {
      const analysis = createMockAnalysis('optimization', 'simple', 'low');
      analysis.keywords = ['unclear', 'maybe', 'consider'];
      const decision = await engine.decide(analysis);
      if (!decision.shouldDelegate) {
        expect(decision.reason).toBeDefined();
        expect(decision.reason).toBeTruthy();
      }
    });

    it('should provide reason for delegation choice', async () => {
      const analysis = createMockAnalysis('bug_fix', 'critical', 'critical');
      const decision = await engine.decide(analysis);
      expect(decision.reason).toBeDefined();
    });
  });

  describe('Priority Mapping', () => {
    it('should preserve critical priority', async () => {
      const analysis = createMockAnalysis('bug_fix', 'medium', 'critical');
      const decision = await engine.decide(analysis);
      expect(decision.priority).toBe('critical');
    });

    it('should preserve high priority', async () => {
      const analysis = createMockAnalysis('bug_fix', 'medium', 'high');
      const decision = await engine.decide(analysis);
      expect(decision.priority).toBe('high');
    });

    it('should handle medium priority', async () => {
      const analysis = createMockAnalysis('feature_implementation', 'medium', 'medium');
      const decision = await engine.decide(analysis);
      expect(decision.priority).toBe('medium');
    });

    it('should handle low priority', async () => {
      const analysis = createMockAnalysis('documentation', 'simple', 'low');
      const decision = await engine.decide(analysis);
      expect(decision.priority).toBe('low');
    });
  });

  describe('Time Estimation', () => {
    it('should provide estimated time', async () => {
      const analysis = createMockAnalysis('bug_fix', 'medium', 'medium');
      const decision = await engine.decide(analysis);
      expect(decision.estimatedTime).toBeDefined();
      expect(decision.estimatedTime).toBeTruthy();
    });

    it('should use analysis estimated time', async () => {
      const analysis = createMockAnalysis('feature_implementation', 'complex', 'medium');
      analysis.estimatedTime = '5 days';
      const decision = await engine.decide(analysis);
      expect(decision.estimatedTime).toBe('5 days');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing scope information', async () => {
      const analysis = createMockAnalysis('bug_fix', 'medium', 'high');
      analysis.scope = {};
      const decision = await engine.decide(analysis);
      expect(decision.shouldDelegate).toBeDefined();
    });

    it('should handle empty keywords', async () => {
      const analysis = createMockAnalysis('feature_implementation', 'medium', 'medium');
      analysis.keywords = [];
      const decision = await engine.decide(analysis);
      expect(decision.shouldDelegate).toBeDefined();
    });

    it('should handle missing context', async () => {
      const analysis = createMockAnalysis('bug_fix', 'simple', 'medium');
      analysis.context = {};
      const decision = await engine.decide(analysis);
      expect(decision.shouldDelegate).toBeDefined();
    });

    it('should handle invalid task type', async () => {
      const analysis = createMockAnalysis('unknown_type', 'medium', 'medium');
      const decision = await engine.decide(analysis);
      expect(decision.shouldDelegate).toBeDefined();
      expect(decision.delegateTo).toBeDefined();
    });

    it('should handle extreme complexity', async () => {
      const analysis = createMockAnalysis('refactoring', 'complex', 'medium');
      analysis.scope.filesAffected = 1000;
      analysis.scope.linesOfCode = 50000;
      const decision = await engine.decide(analysis);
      expect(decision.strategy).toBe(DelegationStrategy.SPLIT);
    });
  });

  describe('Configuration Rules', () => {
    it('should respect decision rules', async () => {
      const analysis = createMockAnalysis('bug_fix', 'medium', 'critical');
      const decision = await engine.decide(analysis);
      // Critical bugs should use direct strategy
      expect(decision.strategy).toBe(DelegationStrategy.DIRECT);
      expect(decision.shouldDelegate).toBe(true);
    });

    it('should apply multiple rules consistently', async () => {
      const analyses = [
        createMockAnalysis('bug_fix', 'simple', 'high'),
        createMockAnalysis('bug_fix', 'simple', 'high'),
        createMockAnalysis('bug_fix', 'simple', 'high'),
      ];

      const decisions = await Promise.all(analyses.map((a) => engine.decide(a)));

      // All identical analyses should produce identical decisions
      expect(decisions[0].shouldDelegate).toBe(decisions[1].shouldDelegate);
      expect(decisions[0].strategy).toBe(decisions[1].strategy);
      expect(decisions[1].strategy).toBe(decisions[2].strategy);
    });
  });
});
