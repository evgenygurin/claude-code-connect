/**
 * Codegen Prompt Builder
 *
 * Builds context-rich prompts for Codegen agents based on task type
 */

import type { Issue, Comment } from '@linear/sdk';
import type { TaskType } from './types.js';
import type { TaskContext } from '../boss-agent/types.js';

/**
 * Prompt builder for Codegen tasks
 */
export class CodegenPromptBuilder {
  /**
   * Build prompt for bug fix
   */
  buildBugFixPrompt(issue: Issue, context: TaskContext): string {
    return `
# Bug Fix Task

## Issue: ${issue.identifier} - ${issue.title}

${issue.description || 'No description provided'}

## Requirements

- Identify and fix the root cause
- Add regression tests to prevent recurrence
- Update documentation if needed
- Follow existing code patterns

## Technical Context

${this.buildContextSection(context)}

## Acceptance Criteria

- All existing tests pass
- New tests added for the fix
- Code follows project style guide
- No new warnings or errors
- Bug is verified as fixed

## Important

- Focus on the root cause, not symptoms
- Ensure backward compatibility
- Add clear comments explaining the fix
    `.trim();
  }

  /**
   * Build prompt for feature implementation
   */
  buildFeaturePrompt(issue: Issue, context: TaskContext): string {
    return `
# Feature Implementation Task

## Feature: ${issue.identifier} - ${issue.title}

${issue.description || 'No description provided'}

## Requirements

- Implement the feature as described
- Add comprehensive tests (unit + integration)
- Update documentation
- Ensure backward compatibility
- Follow project architecture patterns

## Technical Context

${this.buildContextSection(context)}

## Acceptance Criteria

- Feature works as specified in the issue
- Tests pass with 80%+ coverage
- Documentation is complete and accurate
- Code review approved
- No breaking changes to existing functionality

## Guidelines

- Use TypeScript with strict types
- Follow existing code style
- Add JSDoc comments for public APIs
- Handle errors gracefully
- Consider edge cases
    `.trim();
  }

  /**
   * Build prompt for refactoring
   */
  buildRefactorPrompt(issue: Issue, context: TaskContext): string {
    return `
# Refactoring Task

## Refactor: ${issue.identifier} - ${issue.title}

${issue.description || 'No description provided'}

## Requirements

- Improve code quality and maintainability
- Maintain all existing functionality
- Add tests if missing
- Document significant changes
- Follow DRY and SOLID principles

## Technical Context

${this.buildContextSection(context)}

## Guidelines

- Extract reusable components
- Improve naming and structure
- Remove dead code
- Simplify complex logic
- Keep changes focused

## Acceptance Criteria

- All tests pass (no functionality changes)
- Code quality metrics improved
- Documentation updated
- No breaking changes
    `.trim();
  }

  /**
   * Build prompt for CI/CD fix
   */
  buildCIFixPrompt(
    failure: {
      buildNumber: string;
      jobName: string;
      error: string;
      logs: string;
    },
    context: TaskContext,
  ): string {
    return `
# CI/CD Failure Fix

## Build Information

- **Build**: ${failure.buildNumber}
- **Job**: ${failure.jobName}
- **Error**: ${failure.error}

## Failure Logs

\`\`\`
${failure.logs.slice(0, 2000)} ${failure.logs.length > 2000 ? '...(truncated)' : ''}
\`\`\`

## Requirements

- Fix the failing build/test
- Ensure all checks pass
- No breaking changes
- Document the fix

## Technical Context

${this.buildContextSection(context)}

## Priority

**HIGH** - CI/CD failure blocks deployments

## Acceptance Criteria

- All CI/CD checks pass
- Tests are green
- Build succeeds
- No new failures introduced
    `.trim();
  }

  /**
   * Build prompt for Sentry error fix
   */
  buildSentryFixPrompt(
    error: {
      message: string;
      stackTrace: string;
      environment: string;
      count: number;
      usersAffected?: number;
      firstSeen: Date;
    },
    context: TaskContext,
  ): string {
    const severity = error.usersAffected && error.usersAffected > 100 ? 'CRITICAL' : 'HIGH';

    return `
# Production Error Fix

## Error Details

- **Message**: ${error.message}
- **Environment**: ${error.environment}
- **Occurrences**: ${error.count}
${error.usersAffected ? `- **Users Affected**: ${error.usersAffected}` : ''}
- **First Seen**: ${error.firstSeen.toISOString()}

## Stack Trace

\`\`\`
${error.stackTrace.slice(0, 2000)} ${error.stackTrace.length > 2000 ? '...(truncated)' : ''}
\`\`\`

## Requirements

- Fix the root cause of the error
- Add proper error handling
- Add tests for the error case
- Ensure no regression

## Technical Context

${this.buildContextSection(context)}

## Priority

**${severity}** - Production issue affecting ${error.usersAffected || 'unknown number of'} users

## Acceptance Criteria

- Error no longer occurs
- Proper error handling in place
- Tests cover the error scenario
- Error is properly logged
- No new errors introduced
    `.trim();
  }

  /**
   * Build prompt for code review
   */
  buildCodeReviewPrompt(
    prInfo: {
      number: number;
      title: string;
      description?: string;
      filesChanged: string[];
    },
    context: TaskContext,
  ): string {
    return `
# Code Review Task

## Pull Request: #${prInfo.number} - ${prInfo.title}

${prInfo.description || 'No description provided'}

## Files Changed

${prInfo.filesChanged.map((f) => `- ${f}`).join('\n')}

## Review Focus Areas

1. **Security** - Check for vulnerabilities and security best practices
2. **Performance** - Identify potential performance issues
3. **Maintainability** - Code quality, readability, and structure
4. **Test Coverage** - Ensure adequate test coverage
5. **Documentation** - Check for missing or outdated documentation

## Technical Context

${this.buildContextSection(context)}

## Review Guidelines

- Be constructive and specific
- Provide actionable suggestions
- Point out both issues and good practices
- Consider edge cases
- Check for potential bugs

## Deliverables

- Detailed review comments
- Specific improvement suggestions
- Security concerns (if any)
- Performance recommendations
    `.trim();
  }

  /**
   * Build prompt for testing
   */
  buildTestPrompt(issue: Issue, context: TaskContext): string {
    return `
# Testing Task

## Test Coverage for: ${issue.identifier} - ${issue.title}

${issue.description || 'No description provided'}

## Requirements

- Write comprehensive unit tests
- Add integration tests where applicable
- Test edge cases and error conditions
- Achieve 80%+ code coverage
- Use descriptive test names

## Technical Context

${this.buildContextSection(context)}

## Test Categories

1. **Unit Tests** - Test individual functions/methods
2. **Integration Tests** - Test component interactions
3. **Edge Cases** - Boundary conditions, null values, etc.
4. **Error Cases** - Error handling and validation

## Guidelines

- Use Vitest as test framework
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Test both success and failure paths
- Keep tests focused and independent

## Acceptance Criteria

- All tests pass
- Code coverage >= 80%
- Tests are maintainable
- Tests are well-documented
    `.trim();
  }

  /**
   * Build generic prompt for any task type
   */
  buildGenericPrompt(issue: Issue, taskType: TaskType, context: TaskContext): string {
    const typeDescriptions: Record<TaskType, string> = {
      bug_fix: 'Fix the reported bug',
      feature_implementation: 'Implement the requested feature',
      refactoring: 'Refactor the specified code',
      testing: 'Add comprehensive tests',
      documentation: 'Update documentation',
      ci_fix: 'Fix CI/CD pipeline',
      sentry_error: 'Fix production error',
      code_review: 'Review the code',
      optimization: 'Optimize performance',
    };

    return `
# Task: ${issue.identifier} - ${issue.title}

## Type: ${typeDescriptions[taskType] || 'Complete the task'}

${issue.description || 'No description provided'}

## Technical Context

${this.buildContextSection(context)}

## Requirements

- Follow project conventions
- Write tests
- Update documentation
- Ensure quality

## Acceptance Criteria

- Task completed as described
- Tests pass
- Code reviewed
    `.trim();
  }

  /**
   * Build context section for prompts
   */
  private buildContextSection(context: TaskContext): string {
    const sections: string[] = [];

    if (context.repository) {
      sections.push(`- **Repository**: ${context.repository}`);
    }

    if (context.branch) {
      sections.push(`- **Branch**: ${context.branch}`);
    }

    if (context.stack) {
      sections.push(`- **Stack**: ${context.stack}`);
    }

    if (context.architecture) {
      sections.push(`- **Architecture**: ${context.architecture}`);
    }

    if (context.files && context.files.length > 0) {
      sections.push(`- **Related Files**: ${context.files.slice(0, 5).join(', ')}${context.files.length > 5 ? '...' : ''}`);
    }

    if (context.relatedIssues && context.relatedIssues.length > 0) {
      sections.push(`- **Related Issues**: ${context.relatedIssues.join(', ')}`);
    }

    return sections.length > 0 ? sections.join('\n') : '- No additional context provided';
  }

  /**
   * Build prompt based on task type
   */
  build(issue: Issue, taskType: TaskType, context: TaskContext): string {
    switch (taskType) {
      case 'bug_fix':
        return this.buildBugFixPrompt(issue, context);
      case 'feature_implementation':
        return this.buildFeaturePrompt(issue, context);
      case 'refactoring':
        return this.buildRefactorPrompt(issue, context);
      case 'testing':
        return this.buildTestPrompt(issue, context);
      case 'code_review':
        return this.buildGenericPrompt(issue, taskType, context);
      default:
        return this.buildGenericPrompt(issue, taskType, context);
    }
  }
}
