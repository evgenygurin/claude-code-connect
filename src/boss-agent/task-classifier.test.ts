/**
 * Unit tests for TaskClassifier
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskClassifier } from './task-classifier.js';
import type { Logger } from '../core/types.js';
import type { Issue, Comment } from '@linear/sdk';

// Mock logger
const mockLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

// Helper to create mock issue
function createMockIssue(
  title: string,
  description: string,
  priority?: number,
  labelNames?: string[],
): Issue {
  return {
    id: 'test-issue-id',
    identifier: 'TEST-123',
    title,
    description,
    priority: priority || 0,
    labels: () =>
      Promise.resolve({
        nodes: labelNames?.map((name) => ({ id: name, name })) || [],
      }),
  } as unknown as Issue;
}

// Helper to create mock comment
function createMockComment(body: string): Comment {
  return {
    id: 'test-comment-id',
    body,
  } as unknown as Comment;
}

describe('TaskClassifier', () => {
  let classifier: TaskClassifier;

  beforeEach(() => {
    classifier = new TaskClassifier(mockLogger);
  });

  describe('Task Type Detection', () => {
    it('should detect bug fix from title keywords', async () => {
      const issue = createMockIssue('Fix: Login button not working', 'User cannot login');
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.taskType).toBe('bug_fix');
    });

    it('should detect feature from title keywords', async () => {
      const issue = createMockIssue('Add user authentication', 'Implement OAuth 2.0');
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.taskType).toBe('feature_implementation');
    });

    it('should detect refactoring from title keywords', async () => {
      const issue = createMockIssue('Refactor: Database connection logic', 'Clean up code');
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.taskType).toBe('refactoring');
    });

    it('should detect testing from title keywords', async () => {
      const issue = createMockIssue('Add tests for API endpoints', 'Unit and integration tests needed');
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.taskType).toBe('testing');
    });

    it('should detect documentation from title keywords', async () => {
      const issue = createMockIssue('Update API documentation', 'Add examples to README');
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.taskType).toBe('documentation');
    });

    it('should detect optimization from performance keywords', async () => {
      const issue = createMockIssue('Optimize slow database queries', 'Performance improvements needed');
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.taskType).toBe('optimization');
    });
  });

  describe('Complexity Assessment', () => {
    it('should assess simple tasks correctly', async () => {
      const issue = createMockIssue('Fix typo in button text', 'Change "Sumbit" to "Submit"');
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.complexity).toBe('simple');
    });

    it('should assess medium complexity tasks', async () => {
      const issue = createMockIssue(
        'Add password reset feature',
        'Implement email-based password reset with token validation. Need to create reset token generation, email sending, and password update endpoints.',
      );
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.complexity).toBe('medium');
    });

    it('should assess complex tasks correctly', async () => {
      const issue = createMockIssue(
        'Implement real-time chat system',
        'Build WebSocket-based chat with message history, file uploads, user presence, typing indicators, and message reactions. Need to handle scaling, authentication, database schema, and frontend components.',
      );
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.complexity).toBe('complex');
    });

    it('should consider technical keywords for complexity', async () => {
      const issue = createMockIssue(
        'Migrate to microservices architecture',
        'Need to refactor monolith, handle distributed transactions, implement service mesh, setup CI/CD pipeline',
      );
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.complexity).toBe('complex');
    });

    it('should increase complexity for multiple components', async () => {
      const issue = createMockIssue(
        'Add feature',
        'Change database schema, update API endpoints, modify frontend, write tests, update documentation',
      );
      const analysis = await classifier.classifyFromIssue(issue);
      expect(['medium', 'complex']).toContain(analysis.complexity);
    });
  });

  describe('Priority Determination', () => {
    it('should detect critical priority from keywords', async () => {
      const issue = createMockIssue('Critical: Production database down', 'Urgent fix needed');
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.priority).toBe('critical');
    });

    it('should detect high priority from keywords', async () => {
      const issue = createMockIssue('Important: Payment processing broken', 'High priority issue');
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.priority).toBe('high');
    });

    it('should detect medium priority as default', async () => {
      const issue = createMockIssue('Add new feature', 'Regular feature request');
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.priority).toBe('medium');
    });

    it('should detect low priority from keywords', async () => {
      const issue = createMockIssue('Nice to have: Dark mode', 'Low priority enhancement');
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.priority).toBe('low');
    });

    it('should increase priority for production issues', async () => {
      const issue = createMockIssue('Fix production error', 'Error in production environment');
      const analysis = await classifier.classifyFromIssue(issue);
      expect(['high', 'critical']).toContain(analysis.priority);
    });

    it('should use Linear priority if higher', async () => {
      const issue = createMockIssue('Regular task', 'Normal description', 1); // High priority
      const analysis = await classifier.classifyFromIssue(issue);
      expect(['high', 'critical']).toContain(analysis.priority);
    });
  });

  describe('Keyword Extraction', () => {
    it('should extract relevant keywords', async () => {
      const issue = createMockIssue(
        'Fix authentication bug in login API',
        'Users cannot authenticate with OAuth tokens',
      );
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.keywords).toContain('fix');
      expect(analysis.keywords).toContain('authentication');
      expect(analysis.keywords).toContain('login');
      expect(analysis.keywords).toContain('api');
    });

    it('should filter out common stop words', async () => {
      const issue = createMockIssue('The user cannot use the feature', 'It is not working');
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.keywords).not.toContain('the');
      expect(analysis.keywords).not.toContain('is');
      expect(analysis.keywords).not.toContain('it');
    });
  });

  describe('Time Estimation', () => {
    it('should estimate short time for simple tasks', async () => {
      const issue = createMockIssue('Fix typo', 'Simple text change');
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.estimatedTime).toMatch(/minute|hour/);
    });

    it('should estimate medium time for medium complexity', async () => {
      const issue = createMockIssue(
        'Add email validation',
        'Implement email validation with regex and database check',
      );
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.estimatedTime).toMatch(/hour|day/);
    });

    it('should estimate long time for complex tasks', async () => {
      const issue = createMockIssue(
        'Migrate to new architecture',
        'Complete system redesign with database migration, API changes, and frontend updates',
      );
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.estimatedTime).toMatch(/day|week/);
    });
  });

  describe('Scope Estimation', () => {
    it('should estimate files affected', async () => {
      const issue = createMockIssue(
        'Update authentication flow',
        'Changes needed in auth.ts, login.ts, middleware.ts',
      );
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.scope.filesAffected).toBeGreaterThan(0);
    });

    it('should detect dependencies', async () => {
      const issue = createMockIssue(
        'Add new library',
        'Need to install express, jsonwebtoken, and bcrypt packages',
      );
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.scope.dependencies).toBeDefined();
      expect(analysis.scope.dependencies?.length).toBeGreaterThan(0);
    });
  });

  describe('Context Gathering', () => {
    it('should include issue in context', async () => {
      const issue = createMockIssue('Test issue', 'Test description');
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.context.issue).toBe(issue);
    });

    it('should include comment in context', async () => {
      const issue = createMockIssue('Test issue', 'Test description');
      const comment = createMockComment('@claude please help with this');
      const analysis = await classifier.classifyFromIssue(issue, comment);
      expect(analysis.context.comment).toBe(comment);
    });

    it('should extract file paths from description', async () => {
      const issue = createMockIssue('Fix bug', 'Error in src/auth/login.ts and src/api/users.ts');
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.context.files).toBeDefined();
      expect(analysis.context.files?.some((f) => f.includes('login.ts'))).toBe(true);
    });

    it('should extract stack information', async () => {
      const issue = createMockIssue(
        'Tech stack issue',
        'Using TypeScript, Node.js, PostgreSQL, and React',
      );
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.context.stack).toBeDefined();
    });
  });

  describe('Metadata', () => {
    it('should include additional metadata', async () => {
      const issue = createMockIssue('Test issue', 'Test description');
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.metadata).toBeDefined();
      expect(typeof analysis.metadata).toBe('object');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty description', async () => {
      const issue = createMockIssue('Only title', '');
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.taskType).toBeDefined();
      expect(analysis.complexity).toBeDefined();
      expect(analysis.priority).toBeDefined();
    });

    it('should handle very long descriptions', async () => {
      const longDescription = 'word '.repeat(1000);
      const issue = createMockIssue('Test', longDescription);
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.taskType).toBeDefined();
    });

    it('should handle special characters in text', async () => {
      const issue = createMockIssue(
        'Fix: Bug #123 @user $variable',
        'Error with <tag> and &amp; symbols',
      );
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.taskType).toBeDefined();
    });

    it('should handle null or undefined fields gracefully', async () => {
      const issue = {
        id: 'test',
        identifier: 'TEST-1',
        title: 'Test',
        description: null,
      } as unknown as Issue;
      const analysis = await classifier.classifyFromIssue(issue);
      expect(analysis.taskType).toBeDefined();
    });
  });
});
