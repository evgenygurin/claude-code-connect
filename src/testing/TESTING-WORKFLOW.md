# Claude Code + Linear Integration Testing Workflow

This document provides a comprehensive guide to testing the Claude Code + Linear integration without requiring actual Linear API calls or Claude Code installations.

## Overview

The testing framework provides:

- **Mock Linear webhook events** that simulate real webhook deliveries
- **Complete event processing pipeline** testing from webhook → session → execution
- **Agent-specific scenarios** for different types of Claude Code agents
- **Multi-agent coordination** testing for complex workflows
- **Session management validation** including lifecycle and cleanup
- **Performance and stress testing** for high-volume scenarios

## Architecture

### Testing Components

```text
src/testing/
├── workflow.test.ts              # Complete end-to-end workflow tests
├── agent-scenarios.test.ts       # Agent-specific behavior tests
├── integration-workflow.test.ts  # Integration validation tests
├── mock-webhook-server.ts        # Mock server and test framework
├── run-integration-tests.ts      # CLI test runner
├── mocks.ts                      # Mock data structures
└── TESTING-WORKFLOW.md          # This documentation
```

### Key Classes

- **`MockWebhookServer`**: Simulates Linear webhook delivery and processing
- **`WebhookTestScenarioBuilder`**: Generates common test scenarios
- **`WebhookIntegrationTestRunner`**: Orchestrates complete test workflows
- **`WebhookTestValidators`**: Validates test results and assertions

## Quick Start

### Run All Integration Tests

```bash
# Run all test scenarios
npm run test:integration

# Run with verbose output
npm run test:integration -- --verbose
```

### Run Specific Scenarios

```bash
# Bug fix agent workflow
npm run test:integration:bug-fix

# Multi-agent coordination
npm run test:integration:multi-agent

# Performance stress test
npm run test:integration:stress
```

### Run Unit Tests

```bash
# Complete workflow tests
npm run test:workflow

# Agent-specific scenarios
npm run test:agents

# All tests with coverage
npm test
```

## Test Scenarios

### 1. Single Agent Workflows

#### Issue Assignment → Code Analysis

```typescript
// Tests: Issue assigned to agent → Analysis agent execution
const { issue, event } = WebhookTestScenarioBuilder.createIssueAssignmentScenario();
// Expected: 1 triggered event, 1 session created, analysis artifacts generated
```

#### Comment Mention → Bug Fix

```typescript
// Tests: Comment mentioning @claude for bug fix → Bug fix agent execution
const { issue, comment, event } = WebhookTestScenarioBuilder.createBugFixScenario();
// Expected: Bug fix with validation tests and commit messages starting with "fix:"
```

#### Testing Agent Activation

```typescript
// Tests: Request for comprehensive testing → Testing agent execution
const { issue, comment, event } = WebhookTestScenarioBuilder.createTestingScenario();
// Expected: Test files created with unit, integration, and edge case tests
```

#### Performance Optimization

```typescript
// Tests: Performance optimization request → Performance agent execution
const { issue, comment, event } = WebhookTestScenarioBuilder.createPerformanceScenario();
// Expected: Caching, query optimization, and performance benchmarks
```

### 2. Multi-Agent Coordination

#### Complex Feature Development

```typescript
// Tests: Analysis → Implementation → Testing → Documentation
const { issue, comments, events } = WebhookTestScenarioBuilder.createMultiAgentScenario();
// Expected: 4 sessions, each agent type producing appropriate artifacts
```

#### Concurrent Session Management

```typescript
// Tests: Multiple different issues processed simultaneously
// Expected: Independent sessions, no interference, proper cleanup
```

### 3. Error Handling and Edge Cases

#### Non-Triggering Events

```typescript
// Tests: Comments without agent mentions should not trigger
// Expected: 0 triggered events, 0 sessions created
```

#### Malformed Webhook Events

```typescript
// Tests: Invalid webhook payloads handled gracefully
// Expected: No crashes, proper error logging
```

#### Wrong Organization Events

```typescript
// Tests: Events from different organizations ignored
// Expected: 0 triggered events, organization validation working
```

## Agent Type Detection

The testing framework automatically determines agent types based on content:

| Content Keywords | Agent Type | Expected Artifacts |
|-----------------|------------|-------------------|
| "analyze", "review" | `analysis` | `analysis/*.md` files |
| "test", "testing" | `testing` | `tests/*.test.ts` files |
| "fix", "bug" | `bugfix` | Fixed code + tests |
| "document", "docs" | `documentation` | `docs/*.md` files |
| "optimize", "performance" | `performance` | Optimized code + benchmarks |
| "implement", "create" | `implementation` | New feature code |

## Test Data Validation

### Session Validation

```typescript
expect(WebhookTestValidators.validateSession(session, expectedIssueId)).toBe(true);
```

### Execution Result Validation

```typescript
expect(WebhookTestValidators.validateExecutionResult(result)).toBe(true);
```

### Event Processing Validation

```typescript
expect(WebhookTestValidators.validateProcessedEvent(event, shouldTrigger)).toBe(true);
```

## Performance Testing

### Stress Test

```bash
# Test with 500 events, 20 concurrent
npm run test:integration -- --stress-test --events=500 --concurrency=20
```

### Expected Performance Metrics

- **Events per second**: > 10 events/sec
- **Memory usage**: Stable (no leaks)
- **Concurrent sessions**: Up to 100 without issues

## Mock Data Structure

### Linear Objects

```typescript
// Complete mock Linear objects with all required fields
mockUser, mockAgentUser, mockTeam, mockWorkflowState
mockIssue, mockIssueAssignedToAgent
mockComment, mockCommentNoMention
```

### Webhook Events

```typescript
// Various webhook event types
mockWebhookEventIssueCreated
mockWebhookEventIssueAssigned
mockWebhookEventCommentMention
mockWebhookEventCommentNoMention
```

### Claude Execution Results

```typescript
// Different execution outcomes
mockExecutionResultSuccess
mockExecutionResultFailure
mockSessionCreated, mockSessionRunning, mockSessionCompleted, mockSessionFailed
```

## CLI Test Runner Usage

### Basic Usage

```bash
# Run all scenarios
tsx src/testing/run-integration-tests.ts

# Run specific scenario
tsx src/testing/run-integration-tests.ts --scenario=bug-fix

# Stress test
tsx src/testing/run-integration-tests.ts --stress-test --events=200

# Verbose output
tsx src/testing/run-integration-tests.ts --verbose
```

### Available Scenarios

- `issue-assignment`: Issue assigned to agent workflow
- `bug-fix`: Bug fix agent triggered by comment
- `testing-agent`: Testing agent workflow
- `performance-optimization`: Performance agent workflow
- `multi-agent`: Multi-agent coordination
- `concurrent-sessions`: Multiple concurrent sessions
- `non-triggering`: Events that should not trigger
- `error-handling`: Error handling validation

### Example Output

```text
🤖 Claude Code + Linear Integration Test Runner
==================================================

🚀 Running: Bug Fix Agent Workflow
   Tests comment mention triggering bug fix agent

✅ PASS Bug Fix Agent Workflow (156ms)
  Events Processed: 1
  Events Triggered: 1
  Sessions Created: 1

📊 Test Results: 8 passed, 0 failed
✅ All 8 tests passed!
```

## Integration with Existing Test Suite

### Vitest Integration

```typescript
// Tests integrate with existing Vitest setup
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MockWebhookServer } from "./mock-webhook-server.js";
```

### CI/CD Integration

```yaml
# Add to GitHub Actions or other CI
- name: Run Integration Tests
  run: npm run test:integration

- name: Run Stress Tests
  run: npm run test:integration:stress
```

## Debugging and Troubleshooting

### Enable Debug Logging

```typescript
const server = new MockWebhookServer({
  ...mockIntegrationConfig,
  debug: true
});
```

### Common Issues

**"No events triggered"**

- Check agent mention patterns in webhook content
- Verify organization ID matches configuration
- Ensure webhook event structure is valid

**"Session creation failed"**

- Verify issue object has required fields
- Check session storage mock setup
- Validate integration configuration

**"Test timeouts"**

- Reduce event count for stress tests
- Check for infinite loops in mock execution
- Verify cleanup in afterEach hooks

### Test Development Guidelines

1. **Use scenario builders** for consistent test data
2. **Validate all outputs** with provided validators
3. **Test both success and failure paths**
4. **Include performance considerations**
5. **Cleanup resources** in test teardown

## Future Enhancements

### Planned Features

- **Real webhook delivery simulation** with HTTP server
- **Database integration testing** with mock database
- **Git operations mocking** for branch management
- **Linear API response simulation** for bidirectional testing
- **Performance regression testing** with baseline comparisons

### Extension Points

- **Custom agent types** with specialized behavior
- **Webhook signature verification testing**
- **Session persistence testing** with real storage
- **Load balancing simulation** for multiple webhook servers

---

This testing framework provides comprehensive validation of the Claude Code + Linear integration without external dependencies, ensuring reliable behavior in production environments.
