/**
 * CLI interface for Testing Agent
 */

import { TestingAgent } from "./agent.js";
import type { IntegrationConfig, Logger } from "../core/types.js";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

/**
 * Simple logger implementation for CLI
 */
class CLILogger implements Logger {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.DEBUG) {
      console.log(
        `[DEBUG] ${message}`,
        meta ? JSON.stringify(meta, null, 2) : "",
      );
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta, null, 2) : "");
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(
      `[WARN] ${message}`,
      meta ? JSON.stringify(meta, null, 2) : "",
    );
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    console.error(
      `[ERROR] ${message}`,
      error?.message || "",
      meta ? JSON.stringify(meta, null, 2) : "",
    );
  }
}

/**
 * CLI commands for Testing Agent
 */
export class TestingAgentCLI {
  private agent: TestingAgent;
  private logger: Logger;

  constructor(config: IntegrationConfig) {
    this.logger = new CLILogger();
    this.agent = new TestingAgent(config, this.logger);
  }

  /**
   * Analyze test coverage and display results
   */
  async analyzeCoverage(): Promise<void> {
    try {
      console.log("🔍 Analyzing test coverage...\n");

      const coverage = await this.agent.analyzeCoverage();

      // Display coverage summary
      console.log("📊 Test Coverage Analysis Results");
      console.log("=====================================");
      console.log(`Total source files: ${coverage.totalSourceFiles}`);
      console.log(`Files with tests: ${coverage.testedFiles}`);
      console.log(`Coverage: ${coverage.coveragePercentage}%`);
      console.log(`Missing tests: ${coverage.missingTests.length}`);
      console.log("");

      // Display missing tests
      if (coverage.missingTests.length > 0) {
        console.log("❌ Files missing tests:");
        coverage.missingTests.forEach((file) => {
          console.log(`  - ${file}`);
        });
        console.log("");
      }

      // Display existing tests
      if (coverage.existingTests.length > 0) {
        console.log("✅ Existing test files:");
        coverage.existingTests.forEach((file) => {
          console.log(`  - ${file}`);
        });
        console.log("");
      }

      // Display top recommendations
      if (coverage.recommendations.length > 0) {
        console.log("🎯 Top Test Recommendations:");
        console.log("============================");

        const topRecommendations = coverage.recommendations.slice(0, 5);
        topRecommendations.forEach((rec, index) => {
          console.log(
            `${index + 1}. ${rec.componentName} (Priority: ${rec.priority}/10)`,
          );
          console.log(`   File: ${rec.targetFile}`);
          console.log(`   Reason: ${rec.reason}`);
          console.log(`   Test scenarios: ${rec.scenarios.length}`);
          console.log(`   Suggested test file: ${rec.suggestedTestFile}`);
          console.log("");
        });
      }

      // Summary advice
      if (coverage.coveragePercentage < 70) {
        console.log(
          "💡 Recommendation: Consider improving test coverage, especially for core components like SessionManager and WebhookHandler.",
        );
      } else if (coverage.coveragePercentage < 90) {
        console.log(
          "💡 Recommendation: Good test coverage! Consider adding tests for remaining utility functions.",
        );
      } else {
        console.log(
          "🎉 Excellent test coverage! Consider adding more integration and edge case tests.",
        );
      }
    } catch (error) {
      console.error("❌ Failed to analyze coverage:", (error as Error).message);
      process.exit(1);
    }
  }

  /**
   * Generate sample test for a specific component
   */
  async generateTest(componentFile: string): Promise<void> {
    try {
      console.log(`🏗️ Generating test for ${componentFile}...\n`);

      const recommendations = await this.agent.generateRecommendations([
        componentFile,
      ]);

      if (recommendations.length === 0) {
        console.log("❌ No testable components found in the specified file.");
        return;
      }

      const recommendation = recommendations[0];
      const testContent = await this.agent.generateSampleTest(recommendation);
      const testFilePath = recommendation.suggestedTestFile;

      // Create directory if it doesn't exist
      await mkdir(dirname(testFilePath), { recursive: true });

      // Write test file
      await writeFile(testFilePath, testContent);

      console.log("✅ Test file generated successfully!");
      console.log(`📄 Test file: ${testFilePath}`);
      console.log(`🧪 Component: ${recommendation.componentName}`);
      console.log(`⭐ Priority: ${recommendation.priority}/10`);
      console.log(`📝 Test scenarios: ${recommendation.scenarios.length}`);
      console.log("");

      // Display scenarios
      if (recommendation.scenarios.length > 0) {
        console.log("🎭 Test scenarios included:");
        recommendation.scenarios.forEach((scenario, index) => {
          console.log(
            `  ${index + 1}. ${scenario.description} (${scenario.type}, ${scenario.complexity})`,
          );
        });
        console.log("");
      }

      console.log("💡 Next steps:");
      console.log("  1. Review the generated test file");
      console.log("  2. Implement the TODO test cases");
      console.log("  3. Add mock data as needed");
      console.log("  4. Run the tests: npm test");
    } catch (error) {
      console.error("❌ Failed to generate test:", (error as Error).message);
      process.exit(1);
    }
  }

  /**
   * Generate tests for all missing components
   */
  async generateAllTests(): Promise<void> {
    try {
      console.log("🏭 Generating tests for all missing components...\n");

      const coverage = await this.agent.analyzeCoverage();

      if (coverage.missingTests.length === 0) {
        console.log("🎉 All components already have tests!");
        return;
      }

      console.log(
        `📝 Generating tests for ${coverage.missingTests.length} components...`,
      );

      const recommendations = await this.agent.generateRecommendations(
        coverage.missingTests,
      );
      let generated = 0;

      for (const recommendation of recommendations) {
        try {
          const testContent =
            await this.agent.generateSampleTest(recommendation);
          const testFilePath = recommendation.suggestedTestFile;

          // Create directory if it doesn't exist
          await mkdir(dirname(testFilePath), { recursive: true });

          // Write test file
          await writeFile(testFilePath, testContent);

          console.log(`✅ Generated: ${testFilePath}`);
          generated++;
        } catch (error) {
          console.warn(
            `⚠️ Failed to generate test for ${recommendation.targetFile}: ${(error as Error).message}`,
          );
        }
      }

      console.log("");
      console.log(`🎉 Generated ${generated} test files!`);
      console.log("");
      console.log("💡 Next steps:");
      console.log("  1. Review all generated test files");
      console.log("  2. Implement the TODO test cases");
      console.log("  3. Add specific mock data and assertions");
      console.log("  4. Run the tests: npm test");
      console.log("  5. Check test coverage: npm run test:coverage");
    } catch (error) {
      console.error("❌ Failed to generate tests:", (error as Error).message);
      process.exit(1);
    }
  }

  /**
   * Display detailed recommendations
   */
  async showRecommendations(): Promise<void> {
    try {
      console.log("📋 Detailed Test Recommendations\n");

      const coverage = await this.agent.analyzeCoverage();

      if (coverage.recommendations.length === 0) {
        console.log(
          "🎉 No test recommendations - all components are well tested!",
        );
        return;
      }

      coverage.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec.componentName}`);
        console.log("   " + "=".repeat(rec.componentName.length + 3));
        console.log(`   📄 File: ${rec.targetFile}`);
        console.log(`   ⭐ Priority: ${rec.priority}/10`);
        console.log(`   💡 Reason: ${rec.reason}`);
        console.log(`   🎯 Suggested test file: ${rec.suggestedTestFile}`);
        console.log("");

        if (rec.scenarios.length > 0) {
          console.log("   🎭 Recommended test scenarios:");
          rec.scenarios.forEach((scenario, scenarioIndex) => {
            console.log(`      ${scenarioIndex + 1}. ${scenario.description}`);
            console.log(
              `         Type: ${scenario.type}, Complexity: ${scenario.complexity}`,
            );
            if (scenario.dependencies.length > 0) {
              console.log(
                `         Dependencies: ${scenario.dependencies.join(", ")}`,
              );
            }
            if (scenario.mocks.length > 0) {
              console.log(
                `         Mocks needed: ${scenario.mocks.join(", ")}`,
              );
            }
          });
        }
        console.log("");
      });
    } catch (error) {
      console.error(
        "❌ Failed to generate recommendations:",
        (error as Error).message,
      );
      process.exit(1);
    }
  }

  /**
   * Interactive CLI mode
   */
  async interactive(): Promise<void> {
    console.log("🤖 Claude Code Testing Agent");
    console.log("============================");
    console.log("");
    console.log("Available commands:");
    console.log("  1. analyze    - Analyze test coverage");
    console.log("  2. generate   - Generate test for specific file");
    console.log(
      "  3. generate-all - Generate tests for all missing components",
    );
    console.log("  4. recommendations - Show detailed recommendations");
    console.log("  5. exit       - Exit the tool");
    console.log("");

    // Simple interactive loop (in a real implementation, you'd use a proper CLI library)
    process.stdout.write("Enter command (1-5): ");

    // This is a simplified example - in practice you'd use readline or a CLI framework
    console.log("💡 This is a demonstration of the CLI interface.");
    console.log("   In a real implementation, this would be interactive.");
    console.log("   Run specific commands directly instead:");
    console.log("");
    console.log("   npm run test:analyze");
    console.log("   npm run test:generate src/sessions/manager.ts");
    console.log("   npm run test:generate-all");
    console.log("   npm run test:recommendations");
  }
}

/**
 * Main CLI entry point
 */
export async function runTestingAgentCLI(): Promise<void> {
  const config: IntegrationConfig = {
    linearApiToken: process.env.LINEAR_API_TOKEN || "",
    linearOrganizationId: process.env.LINEAR_ORGANIZATION_ID || "",
    claudeExecutablePath: process.env.CLAUDE_EXECUTABLE_PATH || "claude",
    webhookPort: parseInt(process.env.WEBHOOK_PORT || "3000"),
    projectRootDir: process.cwd(),
    defaultBranch: "main",
    createBranches: true,
    timeoutMinutes: 30,
  };

  const cli = new TestingAgentCLI(config);
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case "analyze":
      await cli.analyzeCoverage();
      break;
    case "generate":
      if (!arg) {
        console.error("❌ Please specify a file to generate tests for");
        console.error(
          "   Usage: npm run test:generate src/sessions/manager.ts",
        );
        process.exit(1);
      }
      await cli.generateTest(arg);
      break;
    case "generate-all":
      await cli.generateAllTests();
      break;
    case "recommendations":
      await cli.showRecommendations();
      break;
    case "interactive":
      await cli.interactive();
      break;
    default:
      console.log("🤖 Claude Code Testing Agent");
      console.log("============================");
      console.log("");
      console.log("Usage:");
      console.log(
        "  npm run test:analyze              - Analyze test coverage",
      );
      console.log(
        "  npm run test:generate <file>      - Generate test for specific file",
      );
      console.log(
        "  npm run test:generate-all         - Generate tests for all missing components",
      );
      console.log(
        "  npm run test:recommendations      - Show detailed recommendations",
      );
      console.log("  npm run test:interactive          - Interactive mode");
      console.log("");
      console.log("Examples:");
      console.log("  npm run test:analyze");
      console.log("  npm run test:generate src/sessions/manager.ts");
      console.log("  npm run test:generate-all");
  }
}
