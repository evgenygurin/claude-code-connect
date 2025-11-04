/**
 * Comprehensive Mem0 Integration Test
 * Tests all memory functionality without requiring actual API key
 */

import { createLogger } from "../utils/logger.js";
import type { IntegrationConfig } from "../core/types.js";
import { Mem0MemoryManager } from "./manager.js";
import { Mem0ClientWrapper } from "./client.js";

// Mock configuration
const mockConfig: IntegrationConfig = {
  linearApiToken: "test-token",
  linearOrganizationId: "test-org",
  projectRootDir: process.cwd(),
  claudeExecutablePath: "claude",
  defaultBranch: "main",
  createBranches: true,
  webhookPort: 3005,
  timeoutMinutes: 30,
  mem0Enabled: false, // Start disabled
  mem0ApiKey: undefined,
  mem0VerboseLogging: false,
};

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string) {
  results.push({ name, passed, error });
  const icon = passed ? "✓" : "✗";
  const color = passed ? "\x1b[32m" : "\x1b[31m";
  console.log(`  ${color}${icon}\x1b[0m ${name}`);
  if (error) {
    console.log(`    Error: ${error}`);
  }
}

async function runTests() {
  console.log("\n🧪 Comprehensive Mem0 Integration Test\n");
  console.log("=" .repeat(60));

  const logger = createLogger(false);

  // Test 1: Memory Manager initialization (disabled state)
  console.log("\n📦 Test 1: Memory Manager Initialization (Disabled)\n");
  try {
    const memoryManager = new Mem0MemoryManager(mockConfig, logger);
    logTest("Manager initializes with disabled config", true);
    logTest("isEnabled() returns false when disabled", !memoryManager.isEnabled());
  } catch (error) {
    logTest("Manager initialization", false, (error as Error).message);
  }

  // Test 2: Memory Manager initialization (enabled but no API key)
  console.log("\n📦 Test 2: Memory Manager Initialization (Enabled, No API Key)\n");
  try {
    const configNoKey = { ...mockConfig, mem0Enabled: true };
    const memoryManager = new Mem0MemoryManager(configNoKey, logger);
    logTest("Manager handles missing API key gracefully", true);
    logTest("isEnabled() returns false when API key missing", !memoryManager.isEnabled());
  } catch (error) {
    logTest("Manager with missing API key", false, (error as Error).message);
  }

  // Test 3: Memory Manager initialization (fully configured)
  console.log("\n📦 Test 3: Memory Manager Initialization (Fully Configured)\n");
  try {
    const configWithKey = {
      ...mockConfig,
      mem0Enabled: true,
      mem0ApiKey: "test-key-for-init",
    };
    const memoryManager = new Mem0MemoryManager(configWithKey, logger);
    // Note: This might fail if the API key is invalid, but that's expected
    logTest("Manager initializes with API key", true);
  } catch (error) {
    logTest("Manager with API key", false, (error as Error).message);
  }

  // Test 4: Client wrapper structure
  console.log("\n📦 Test 4: Client Wrapper Structure\n");
  try {
    // Check that the client wrapper exports correct types
    const hasAddMemory = typeof Mem0ClientWrapper.prototype.addMemory === "function";
    const hasSearchMemory = typeof Mem0ClientWrapper.prototype.searchMemory === "function";
    const hasGetAllMemories = typeof Mem0ClientWrapper.prototype.getAllMemories === "function";
    const hasDeleteMemory = typeof Mem0ClientWrapper.prototype.deleteMemory === "function";

    logTest("addMemory method exists", hasAddMemory);
    logTest("searchMemory method exists", hasSearchMemory);
    logTest("getAllMemories method exists", hasGetAllMemories);
    logTest("deleteMemory method exists", hasDeleteMemory);
  } catch (error) {
    logTest("Client wrapper structure", false, (error as Error).message);
  }

  // Test 5: Memory Manager methods exist
  console.log("\n📦 Test 5: Memory Manager Methods\n");
  try {
    const configWithKey = {
      ...mockConfig,
      mem0Enabled: true,
      mem0ApiKey: "test-key",
    };
    const memoryManager = new Mem0MemoryManager(configWithKey, logger);

    const hasStoreIssue = typeof memoryManager.storeIssueContext === "function";
    const hasStoreComment = typeof memoryManager.storeCommentContext === "function";
    const hasStoreSession = typeof memoryManager.storeSessionResult === "function";
    const hasSearch = typeof memoryManager.searchMemories === "function";
    const hasGetIssue = typeof memoryManager.getIssueContext === "function";

    logTest("storeIssueContext method exists", hasStoreIssue);
    logTest("storeCommentContext method exists", hasStoreComment);
    logTest("storeSessionResult method exists", hasStoreSession);
    logTest("searchMemories method exists", hasSearch);
    logTest("getIssueContext method exists", hasGetIssue);
  } catch (error) {
    logTest("Memory Manager methods", false, (error as Error).message);
  }

  // Test 6: Configuration validation
  console.log("\n📦 Test 6: Configuration Validation\n");
  try {
    const configs = [
      { enabled: false, key: undefined, expected: false },
      { enabled: true, key: undefined, expected: false },
      { enabled: false, key: "test-key", expected: false },
      { enabled: true, key: "test-key", expected: true },
    ];

    for (const { enabled, key, expected } of configs) {
      const config = {
        ...mockConfig,
        mem0Enabled: enabled,
        mem0ApiKey: key,
      };
      const manager = new Mem0MemoryManager(config, logger);
      const actual = manager.isEnabled();
      const configDesc = `enabled=${enabled}, key=${key ? "set" : "unset"}`;
      logTest(
        `Config (${configDesc}) → isEnabled=${expected}`,
        actual === expected,
      );
    }
  } catch (error) {
    logTest("Configuration validation", false, (error as Error).message);
  }

  // Test 7: Graceful degradation when disabled
  console.log("\n📦 Test 7: Graceful Degradation When Disabled\n");
  try {
    const disabledConfig = { ...mockConfig, mem0Enabled: false };
    const memoryManager = new Mem0MemoryManager(disabledConfig, logger);

    // These should not throw errors, just return early
    await memoryManager.storeIssueContext(
      { id: "test", identifier: "TEST-1", title: "Test" } as any,
      "test",
    );
    logTest("storeIssueContext doesn't throw when disabled", true);

    const results = await memoryManager.searchMemories("test query");
    logTest("searchMemories returns empty array when disabled", results.length === 0);

    const context = await memoryManager.getIssueContext("TEST-1");
    logTest("getIssueContext returns empty array when disabled", context.length === 0);
  } catch (error) {
    logTest("Graceful degradation", false, (error as Error).message);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("\n📊 Test Summary\n");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`\x1b[32m✓ Passed: ${passed}\x1b[0m`);
  if (failed > 0) {
    console.log(`\x1b[31m✗ Failed: ${failed}\x1b[0m`);
  }
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log("\n❌ Failed Tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}`);
        if (r.error) {
          console.log(`    ${r.error}`);
        }
      });
  }

  console.log("\n" + "=".repeat(60));

  // Configuration guide
  console.log("\n📖 Configuration Guide\n");
  console.log("To enable Mem0 integration in production:");
  console.log("  1. Get API key from https://app.mem0.ai/");
  console.log("  2. Add to .env:");
  console.log("     MEM0_ENABLED=true");
  console.log("     MEM0_API_KEY=your_actual_api_key");
  console.log("  3. Optional: MEM0_VERBOSE_LOGGING=true");
  console.log("\nMemory will be stored automatically when:");
  console.log("  ✓ Issues are assigned to the agent");
  console.log("  ✓ Comments mention the agent (@claude)");
  console.log("  ✓ Claude sessions complete");
  console.log();

  return failed === 0;
}

// Run tests
runTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("\n💥 Unexpected error:", error);
    process.exit(1);
  });
