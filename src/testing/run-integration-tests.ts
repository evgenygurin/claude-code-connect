#!/usr/bin/env tsx

/**
 * Integration Test Runner for Claude Code + Linear Integration
 * 
 * This script provides a command-line interface to run comprehensive integration tests
 * that validate the complete webhook processing pipeline without requiring actual Linear API calls.
 * 
 * Usage:
 *   npm run test:integration
 *   tsx src/testing/run-integration-tests.ts
 *   tsx src/testing/run-integration-tests.ts --scenario=bug-fix
 *   tsx src/testing/run-integration-tests.ts --stress-test --events=500
 */

import {
  MockWebhookServer,
  WebhookTestScenarioBuilder,
  WebhookIntegrationTestRunner,
  WebhookTestValidators
} from "./mock-webhook-server.js";
import { mockIntegrationConfig } from "./mocks.js";

/**
 * Test scenario configurations
 */
const TEST_SCENARIOS = {
  "issue-assignment": {
    name: "Issue Assignment to Agent",
    description: "Tests the complete flow from issue assignment to agent execution",
    generator: () => [WebhookTestScenarioBuilder.createIssueAssignmentScenario().event],
    expected: { triggeredEvents: 1, sessionsCreated: 1 }
  },
  
  "bug-fix": {
    name: "Bug Fix Agent Workflow", 
    description: "Tests comment mention triggering bug fix agent",
    generator: () => [WebhookTestScenarioBuilder.createBugFixScenario().event],
    expected: { triggeredEvents: 1, sessionsCreated: 1 }
  },

  "testing-agent": {
    name: "Testing Agent Workflow",
    description: "Tests testing agent triggered by test requests",
    generator: () => [WebhookTestScenarioBuilder.createTestingScenario().event],
    expected: { triggeredEvents: 1, sessionsCreated: 1 }
  },

  "performance-optimization": {
    name: "Performance Optimization Agent",
    description: "Tests performance optimization agent workflow",
    generator: () => [WebhookTestScenarioBuilder.createPerformanceScenario().event],
    expected: { triggeredEvents: 1, sessionsCreated: 1 }
  },

  "multi-agent": {
    name: "Multi-Agent Coordination",
    description: "Tests coordination between multiple agent types",
    generator: () => WebhookTestScenarioBuilder.createMultiAgentScenario().events,
    expected: { triggeredEvents: 4, sessionsCreated: 4 }
  },

  "concurrent-sessions": {
    name: "Concurrent Sessions",
    description: "Tests handling multiple concurrent sessions",
    generator: () => [
      WebhookTestScenarioBuilder.createBugFixScenario().event,
      WebhookTestScenarioBuilder.createTestingScenario().event,
      WebhookTestScenarioBuilder.createPerformanceScenario().event
    ],
    expected: { triggeredEvents: 3, sessionsCreated: 3 }
  },

  "non-triggering": {
    name: "Non-Triggering Events",
    description: "Tests events that should not trigger agent execution",
    generator: () => {
      const scenario = WebhookTestScenarioBuilder.createCommentMentionScenario(
        "This is just a regular comment without any agent mention"
      );
      return [scenario.event];
    },
    expected: { triggeredEvents: 0, sessionsCreated: 0 }
  },

  "error-handling": {
    name: "Error Handling",
    description: "Tests error handling with malformed events",
    generator: () => {
      const malformed = WebhookTestScenarioBuilder.createIssueAssignmentScenario();
      malformed.event.organizationId = "wrong-org-id";
      return [malformed.event];
    },
    expected: { triggeredEvents: 0, sessionsCreated: 0 }
  }
};

/**
 * Parse command line arguments
 */
function parseArgs(): {
  scenario?: string;
  stressTest: boolean;
  eventCount: number;
  concurrency: number;
  verbose: boolean;
  help: boolean;
} {
  const args = process.argv.slice(2);
  const result = {
    scenario: undefined as string | undefined,
    stressTest: false,
    eventCount: 100,
    concurrency: 10,
    verbose: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--verbose" || arg === "-v") {
      result.verbose = true;
    } else if (arg === "--stress-test") {
      result.stressTest = true;
    } else if (arg.startsWith("--scenario=")) {
      result.scenario = arg.split("=")[1];
    } else if (arg.startsWith("--events=")) {
      result.eventCount = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--concurrency=")) {
      result.concurrency = parseInt(arg.split("=")[1], 10);
    }
  }

  return result;
}

/**
 * Display help information
 */
function displayHelp() {
  console.log(`
Claude Code + Linear Integration Test Runner

Usage:
  tsx src/testing/run-integration-tests.ts [options]

Options:
  --scenario=<name>      Run specific test scenario
  --stress-test          Run performance stress test
  --events=<number>      Number of events for stress test (default: 100)
  --concurrency=<number> Concurrent events for stress test (default: 10)
  --verbose, -v          Enable verbose output
  --help, -h             Show this help message

Available Scenarios:
${Object.entries(TEST_SCENARIOS).map(([key, scenario]) => 
  `  ${key.padEnd(20)} ${scenario.description}`
).join('\n')}

Examples:
  tsx src/testing/run-integration-tests.ts
  tsx src/testing/run-integration-tests.ts --scenario=bug-fix
  tsx src/testing/run-integration-tests.ts --stress-test --events=500
  tsx src/testing/run-integration-tests.ts --scenario=multi-agent --verbose
`);
}

/**
 * Format test results for console output
 */
function formatTestResults(
  scenarioName: string,
  result: any,
  startTime: number,
  verbose: boolean = false
): void {
  const duration = Date.now() - startTime;
  const status = result.success ? "✅ PASS" : "❌ FAIL";
  
  console.log(`\n${status} ${scenarioName} (${duration}ms)`);
  
  if (result.success) {
    console.log(`  Events Processed: ${result.stats.totalEvents}`);
    console.log(`  Events Triggered: ${result.stats.triggeredEvents}`);
    console.log(`  Sessions Created: ${result.stats.completedSessions}`);
  } else {
    console.log(`  ❌ Errors:`);
    result.errors.forEach((error: string) => {
      console.log(`    - ${error}`);
    });
  }

  if (verbose && result.results) {
    console.log(`  📊 Detailed Results:`);
    result.results.forEach((r: any, index: number) => {
      if (r.processed) {
        console.log(`    Event ${index + 1}: ${r.processed.shouldTrigger ? 'Triggered' : 'Ignored'}`);
        if (r.processed.triggerReason) {
          console.log(`      Reason: ${r.processed.triggerReason}`);
        }
        if (r.executionResult) {
          console.log(`      Files Modified: ${r.executionResult.filesModified.length}`);
          console.log(`      Commits: ${r.executionResult.commits.length}`);
          console.log(`      Duration: ${r.executionResult.duration}ms`);
        }
      }
    });
  }
}

/**
 * Format stress test results
 */
function formatStressTestResults(result: any, startTime: number): void {
  const duration = Date.now() - startTime;
  const status = result.success ? "✅ PASS" : "❌ FAIL";
  
  console.log(`\n${status} Stress Test (${duration}ms)`);
  
  if (result.success) {
    console.log(`  Processing Time: ${result.processingTime}ms`);
    console.log(`  Events Per Second: ${result.eventsPerSecond.toFixed(2)}`);
    console.log(`  Total Duration: ${duration}ms`);
  } else {
    console.log(`  ❌ Errors:`);
    result.errors.forEach((error: string) => {
      console.log(`    - ${error}`);
    });
  }
}

/**
 * Run a specific test scenario
 */
async function runScenario(
  runner: WebhookIntegrationTestRunner,
  scenarioKey: string,
  verbose: boolean = false
): Promise<boolean> {
  const scenario = TEST_SCENARIOS[scenarioKey as keyof typeof TEST_SCENARIOS];
  if (!scenario) {
    console.error(`❌ Unknown scenario: ${scenarioKey}`);
    console.log(`Available scenarios: ${Object.keys(TEST_SCENARIOS).join(', ')}`);
    return false;
  }

  console.log(`🚀 Running: ${scenario.name}`);
  console.log(`   ${scenario.description}`);

  const startTime = Date.now();
  const events = scenario.generator();
  const result = await runner.runScenario(
    scenario.name,
    events,
    scenario.expected
  );

  formatTestResults(scenario.name, result, startTime, verbose);
  return result.success;
}

/**
 * Run all test scenarios
 */
async function runAllScenarios(
  runner: WebhookIntegrationTestRunner,
  verbose: boolean = false
): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;

  console.log("🧪 Running all integration test scenarios...\n");

  for (const [key, scenario] of Object.entries(TEST_SCENARIOS)) {
    const success = await runScenario(runner, key, verbose);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  return { passed, failed };
}

/**
 * Run stress test
 */
async function runStressTest(
  runner: WebhookIntegrationTestRunner,
  eventCount: number,
  concurrency: number
): Promise<boolean> {
  console.log(`🔥 Running stress test with ${eventCount} events (concurrency: ${concurrency})`);
  
  const startTime = Date.now();
  const result = await runner.runStressTest(eventCount, concurrency);
  
  formatStressTestResults(result, startTime);
  return result.success;
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    displayHelp();
    return;
  }

  console.log("🤖 Claude Code + Linear Integration Test Runner");
  console.log("=" .repeat(50));

  const runner = new WebhookIntegrationTestRunner(mockIntegrationConfig);

  try {
    if (args.stressTest) {
      // Run stress test
      const success = await runStressTest(runner, args.eventCount, args.concurrency);
      process.exit(success ? 0 : 1);
    } else if (args.scenario) {
      // Run specific scenario
      const success = await runScenario(runner, args.scenario, args.verbose);
      process.exit(success ? 0 : 1);
    } else {
      // Run all scenarios
      const results = await runAllScenarios(runner, args.verbose);
      
      console.log("\n" + "=" .repeat(50));
      console.log(`📊 Test Results: ${results.passed} passed, ${results.failed} failed`);
      
      if (results.failed > 0) {
        console.log(`❌ ${results.failed} test(s) failed`);
        process.exit(1);
      } else {
        console.log(`✅ All ${results.passed} tests passed!`);
        process.exit(0);
      }
    }
  } catch (error) {
    console.error(`💥 Test runner failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * Handle process signals for cleanup
 */
process.on('SIGINT', () => {
  console.log('\n🛑 Test runner interrupted');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test runner terminated');
  process.exit(143);
});

// Run the main function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`💥 Unhandled error: ${error.message}`);
    process.exit(1);
  });
}