/**
 * Example integration demonstrating Testing Agent capabilities
 */

import { TestingAgent } from "./agent.js";
import type { IntegrationConfig, Logger } from "../core/types.js";

/**
 * Example logger implementation
 */
class ExampleLogger implements Logger {
  debug(message: string, meta?: Record<string, unknown>): void {
    console.log(`[DEBUG] ${message}`, meta || "");
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.log(`[INFO] ${message}`, meta || "");
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, meta || "");
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, error?.message || "", meta || "");
  }
}

/**
 * Demonstration of Testing Agent usage
 */
export async function demonstrateTestingAgent(): Promise<void> {
  console.log("🤖 Claude Code Testing Agent Demonstration");
  console.log("==========================================\n");

  // Configuration
  const config: IntegrationConfig = {
    linearApiToken: "demo-token",
    linearOrganizationId: "demo-org",
    claudeExecutablePath: "claude",
    webhookPort: 3000,
    projectRootDir: process.cwd(),
    defaultBranch: "main",
    createBranches: true,
    timeoutMinutes: 30,
  };

  const logger = new ExampleLogger();
  const testingAgent = new TestingAgent(config, logger);

  try {
    // 1. Analyze current test coverage
    console.log("1️⃣ Analyzing Test Coverage");
    console.log("==========================");

    const coverage = await testingAgent.analyzeCoverage();

    console.log(`📊 Coverage Summary:`);
    console.log(`   Total files: ${coverage.totalSourceFiles}`);
    console.log(`   Tested files: ${coverage.testedFiles}`);
    console.log(`   Coverage: ${coverage.coveragePercentage}%`);
    console.log(`   Missing tests: ${coverage.missingTests.length}`);
    console.log("");

    // 2. Show top recommendations
    console.log("2️⃣ Top Test Recommendations");
    console.log("============================");

    const topRecommendations = coverage.recommendations.slice(0, 3);
    topRecommendations.forEach((rec, index) => {
      console.log(
        `${index + 1}. ${rec.componentName} (Priority: ${rec.priority}/10)`,
      );
      console.log(`   📄 File: ${rec.targetFile}`);
      console.log(`   💡 Reason: ${rec.reason}`);
      console.log(`   🎯 Test scenarios: ${rec.scenarios.length}`);

      // Show first few scenarios
      if (rec.scenarios.length > 0) {
        console.log(`   🎭 Key scenarios:`);
        rec.scenarios.slice(0, 2).forEach((scenario, sIndex) => {
          console.log(`      • ${scenario.description} (${scenario.type})`);
        });
      }
      console.log("");
    });

    // 3. Generate sample test for highest priority component
    if (coverage.recommendations.length > 0) {
      console.log("3️⃣ Sample Test Generation");
      console.log("=========================");

      const highestPriority = coverage.recommendations[0];
      console.log(`Generating test for: ${highestPriority.componentName}`);

      const sampleTest = await testingAgent.generateSampleTest(highestPriority);

      console.log("📝 Generated test preview (first 20 lines):");
      const lines = sampleTest.split("\n").slice(0, 20);
      lines.forEach((line, index) => {
        console.log(`${String(index + 1).padStart(3)}: ${line}`);
      });

      if (sampleTest.split("\n").length > 20) {
        console.log("     ... (truncated)");
      }
      console.log("");
    }

    // 4. Coverage analysis breakdown
    console.log("4️⃣ Detailed Analysis");
    console.log("====================");

    console.log("✅ Files with existing tests:");
    coverage.existingTests.forEach((file) => {
      console.log(`   • ${file}`);
    });
    console.log("");

    console.log("❌ Files missing tests:");
    coverage.missingTests.forEach((file) => {
      console.log(`   • ${file}`);
    });
    console.log("");

    // 5. Testing strategy recommendations
    console.log("5️⃣ Testing Strategy Recommendations");
    console.log("===================================");

    if (coverage.coveragePercentage < 50) {
      console.log("🚨 Critical: Very low test coverage");
      console.log("   Priority actions:");
      console.log(
        "   1. Start with core components (SessionManager, WebhookHandler)",
      );
      console.log(
        "   2. Focus on integration tests for Linear SDK interactions",
      );
      console.log("   3. Add unit tests for business logic validation");
    } else if (coverage.coveragePercentage < 80) {
      console.log("⚠️ Warning: Moderate test coverage");
      console.log("   Priority actions:");
      console.log("   1. Add tests for remaining utility functions");
      console.log("   2. Improve edge case coverage in existing tests");
      console.log("   3. Add integration tests for webhook processing");
    } else {
      console.log("🎉 Excellent: High test coverage");
      console.log("   Enhancement suggestions:");
      console.log("   1. Add end-to-end tests for complete workflows");
      console.log("   2. Improve error handling test scenarios");
      console.log("   3. Add performance and load testing");
    }
    console.log("");

    // 6. Implementation roadmap
    console.log("6️⃣ Implementation Roadmap");
    console.log("=========================");

    const prioritizedComponents = coverage.recommendations
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);

    console.log("Suggested implementation order:");
    prioritizedComponents.forEach((rec, index) => {
      const urgency =
        rec.priority >= 8
          ? "🔥 High"
          : rec.priority >= 6
            ? "⚡ Medium"
            : "📝 Low";
      console.log(`${index + 1}. ${rec.componentName} - ${urgency} priority`);
      console.log(`   📁 ${rec.targetFile}`);
      console.log(
        `   ⏱️ Estimated effort: ${getEffortEstimate(rec.scenarios.length)} hours`,
      );
      console.log(`   🎯 Focus: ${rec.reason}`);
      console.log("");
    });

    console.log("🚀 Getting Started:");
    console.log("1. Run: npm run test:generate src/sessions/manager.ts");
    console.log("2. Implement the generated test cases");
    console.log("3. Run: npm test to verify implementation");
    console.log("4. Repeat for next highest priority component");
    console.log("");
  } catch (error) {
    console.error("❌ Demo failed:", (error as Error).message);
  }
}

/**
 * Helper function to estimate testing effort
 */
function getEffortEstimate(scenarioCount: number): number {
  const baseHours = 2; // Base test setup time
  const scenarioHours = scenarioCount * 0.5; // 30 minutes per scenario
  return Math.ceil(baseHours + scenarioHours);
}

/**
 * Example of using Testing Agent in CI/CD pipeline
 */
export async function cicdIntegration(): Promise<void> {
  console.log("🔄 CI/CD Integration Example");
  console.log("============================\n");

  const config: IntegrationConfig = {
    linearApiToken: process.env.LINEAR_API_TOKEN || "",
    linearOrganizationId: process.env.LINEAR_ORGANIZATION_ID || "",
    claudeExecutablePath: "claude",
    webhookPort: 3000,
    projectRootDir: process.cwd(),
    defaultBranch: "main",
    createBranches: true,
    timeoutMinutes: 30,
  };

  const logger = new ExampleLogger();
  const testingAgent = new TestingAgent(config, logger);

  try {
    const coverage = await testingAgent.analyzeCoverage();

    // Set coverage thresholds for CI/CD
    const minimumCoverage = 70; // 70% minimum coverage
    const targetCoverage = 85; // 85% target coverage

    console.log(`📊 Current coverage: ${coverage.coveragePercentage}%`);
    console.log(`🎯 Target coverage: ${targetCoverage}%`);
    console.log(`⚠️ Minimum coverage: ${minimumCoverage}%`);
    console.log("");

    if (coverage.coveragePercentage < minimumCoverage) {
      console.log("❌ FAIL: Coverage below minimum threshold");
      console.log(`Missing tests for ${coverage.missingTests.length} files:`);
      coverage.missingTests.forEach((file) => {
        console.log(`   • ${file}`);
      });

      // In real CI/CD, this would exit with code 1
      console.log("\n🚨 CI/CD Pipeline should FAIL");
      console.log("Action required: Add tests before merging");
    } else if (coverage.coveragePercentage < targetCoverage) {
      console.log("⚠️ PASS: Coverage meets minimum but below target");
      console.log("Recommendation: Consider adding more tests");

      // Show what's missing to reach target
      const filesToTarget = Math.ceil(
        ((targetCoverage - coverage.coveragePercentage) *
          coverage.totalSourceFiles) /
          100,
      );
      console.log(
        `\n📈 To reach ${targetCoverage}%, add tests for ${filesToTarget} more files`,
      );
    } else {
      console.log("✅ PASS: Excellent test coverage!");
      console.log("🎉 Coverage exceeds target threshold");
    }

    // Generate quality gates report
    console.log("\n📋 Quality Gates Report:");
    console.log(
      `• Test Coverage: ${coverage.coveragePercentage >= minimumCoverage ? "✅" : "❌"} (${coverage.coveragePercentage}%)`,
    );
    console.log(
      `• Core Components: ${getCoreComponentsCoverage(coverage) ? "✅" : "❌"}`,
    );
    console.log(
      `• Critical Paths: ${getCriticalPathsCoverage(coverage) ? "✅" : "❌"}`,
    );
  } catch (error) {
    console.error("❌ CI/CD Integration failed:", (error as Error).message);
  }
}

/**
 * Check if core components have test coverage
 */
function getCoreComponentsCoverage(coverage: any): boolean {
  const coreFiles = [
    "src/sessions/manager.ts",
    "src/webhooks/handler.ts",
    "src/claude/executor.ts",
  ];

  return coreFiles.every((file) =>
    coverage.existingTests.some((test: string) =>
      test.includes(file.replace(".ts", "")),
    ),
  );
}

/**
 * Check if critical paths have test coverage
 */
function getCriticalPathsCoverage(coverage: any): boolean {
  const criticalFiles = ["src/sessions/manager.ts", "src/webhooks/handler.ts"];

  return criticalFiles.every((file) =>
    coverage.existingTests.some((test: string) =>
      test.includes(file.replace(".ts", "")),
    ),
  );
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateTestingAgent()
    .then(() => {
      console.log("\n" + "=".repeat(50));
      return cicdIntegration();
    })
    .catch(console.error);
}
