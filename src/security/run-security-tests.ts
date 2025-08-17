#!/usr/bin/env node
/**
 * Security testing runner for Claude Code + Linear Integration
 * Comprehensive security testing suite with reporting
 */

import { SecurityTestSuite, runSecurityTests } from "./security-tests.js";
import { SecurityAgent } from "./security-agent.js";
import { SecurityValidator } from "./validators.js";
import { SecurityMonitor } from "./monitoring.js";
import type { IntegrationConfig, Logger } from "../core/types.js";

/**
 * CLI options for security testing
 */
interface SecurityTestOptions {
  verbose?: boolean;
  outputFormat?: "console" | "json" | "html";
  outputFile?: string;
  testCategory?: "all" | "validation" | "injection" | "auth" | "monitoring";
  severity?: "low" | "medium" | "high" | "critical";
}

/**
 * Mock configuration for testing
 */
const mockConfig: IntegrationConfig = {
  linearApiToken: "test-token-" + Math.random().toString(36),
  linearOrganizationId: "test-org-" + Math.random().toString(36),
  claudeExecutablePath: "claude",
  webhookPort: 3000,
  webhookSecret: "test-webhook-secret-" + Math.random().toString(36),
  projectRootDir: "/tmp/test-project",
  defaultBranch: "main",
  createBranches: true,
  timeoutMinutes: 30,
  agentUserId: "test-agent-" + Math.random().toString(36),
  debug: false,
};

/**
 * Mock logger for testing
 */
const mockLogger: Logger = {
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.VERBOSE) {
      console.log(`[DEBUG] ${message}`, meta || "");
    }
  },
  info: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.VERBOSE) {
      console.log(`[INFO] ${message}`, meta || "");
    }
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(`[WARN] ${message}`, meta || "");
  },
  error: (message: string, error?: Error, meta?: Record<string, unknown>) => {
    console.error(`[ERROR] ${message}`, error?.message || "", meta || "");
  },
};

/**
 * Security test runner
 */
class SecurityTestRunner {
  private options: SecurityTestOptions;

  constructor(options: SecurityTestOptions = {}) {
    this.options = {
      verbose: false,
      outputFormat: "console",
      testCategory: "all",
      ...options,
    };

    // Set verbose environment for logger
    if (this.options.verbose) {
      process.env.VERBOSE = "true";
    }
  }

  /**
   * Run security tests
   */
  async run(): Promise<void> {
    console.log("🔒 Claude Code + Linear Integration Security Test Suite");
    console.log("=".repeat(60));
    console.log("");

    const startTime = Date.now();

    try {
      // Initialize security components
      const securityAgent = new SecurityAgent(mockConfig, mockLogger);
      const securityValidator = new SecurityValidator();
      const securityMonitor = new SecurityMonitor(
        mockConfig,
        mockLogger,
        securityAgent,
      );

      // Start monitoring for test duration
      await securityMonitor.startMonitoring();

      console.log("📋 Test Configuration:");
      console.log(`  Category: ${this.options.testCategory}`);
      console.log(`  Output Format: ${this.options.outputFormat}`);
      console.log(`  Verbose: ${this.options.verbose}`);
      console.log("");

      // Run basic security tests
      await this.runBasicSecurityTests();

      // Run comprehensive test suite
      const testSuite = new SecurityTestSuite();
      const results = await testSuite.runAllTests();

      // Generate and display report
      const report = testSuite.generateReport();
      await this.displayResults(report, results);

      // Run component-specific tests
      await this.runComponentTests(
        securityAgent,
        securityValidator,
        securityMonitor,
      );

      // Stop monitoring
      await securityMonitor.stopMonitoring();

      const duration = Date.now() - startTime;
      console.log(`\n⏱️  Total execution time: ${duration}ms`);

      // Exit with appropriate code
      if (results.failed > 0 || report.summary.riskLevel === "CRITICAL") {
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Security test suite failed:", (error as Error).message);
      process.exit(1);
    }
  }

  /**
   * Run basic security validation tests
   */
  private async runBasicSecurityTests(): Promise<void> {
    console.log("🔍 Running Basic Security Validation Tests...");

    const tests = [
      {
        name: "Session ID Generation",
        test: () => {
          const validator = new SecurityValidator();
          const sessionId = validator.generateSecureSessionId();
          return sessionId.length >= 32 && /^[a-zA-Z0-9_-]+$/.test(sessionId);
        },
      },
      {
        name: "Input Sanitization",
        test: () => {
          const validator = new SecurityValidator();
          const maliciousInput = '<script>alert("xss")</script>';
          const sanitized = validator.sanitizeIssueDescription(maliciousInput);
          return !sanitized.includes("<script>");
        },
      },
      {
        name: "Path Validation",
        test: () => {
          const validator = new SecurityValidator();
          const result = validator.validateFilePath(
            "../../../etc/passwd",
            "/tmp/test",
          );
          return !result.valid;
        },
      },
      {
        name: "Command Validation",
        test: () => {
          const validator = new SecurityValidator();
          const result = validator.validateCommand("rm -rf /");
          return !result.valid;
        },
      },
      {
        name: "Injection Detection",
        test: () => {
          const validator = new SecurityValidator();
          const result = validator.detectInjectionAttempts(
            "$(malicious_command)",
          );
          return result.detected && result.severity === "high";
        },
      },
    ];

    for (const test of tests) {
      try {
        const passed = test.test();
        console.log(`  ${passed ? "✅" : "❌"} ${test.name}`);
      } catch (error) {
        console.log(`  ❌ ${test.name} (Error: ${(error as Error).message})`);
      }
    }

    console.log("");
  }

  /**
   * Display test results
   */
  private async displayResults(
    report: any,
    results: {
      passed: number;
      failed: number;
      vulnerabilities: string[];
      recommendations: string[];
    },
  ): Promise<void> {
    console.log("📊 Security Test Results:");
    console.log("=".repeat(40));

    // Summary
    console.log(`\n🎯 Summary:`);
    console.log(`  Total Tests: ${report.summary.totalTests}`);
    console.log(`  Passed: ${report.summary.passedTests} ✅`);
    console.log(`  Failed: ${report.summary.failedTests} ❌`);
    console.log(
      `  Risk Level: ${this.getRiskLevelEmoji(report.summary.riskLevel)} ${report.summary.riskLevel}`,
    );

    // Vulnerabilities
    if (results.vulnerabilities.length > 0) {
      console.log(
        `\n🚨 Vulnerabilities Found (${results.vulnerabilities.length}):`,
      );
      results.vulnerabilities.forEach((vuln, index) => {
        console.log(`  ${index + 1}. ${vuln}`);
      });
    }

    // Recommendations
    if (results.recommendations.length > 0) {
      console.log(
        `\n💡 Security Recommendations (${results.recommendations.length}):`,
      );
      results.recommendations.slice(0, 10).forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });

      if (results.recommendations.length > 10) {
        console.log(`  ... and ${results.recommendations.length - 10} more`);
      }
    }

    // Detailed test results
    if (this.options.verbose && report.testDetails) {
      console.log(`\n📋 Detailed Test Results:`);
      report.testDetails.forEach((test: any) => {
        const status = test.passed ? "✅" : "❌";
        console.log(`  ${status} ${test.name}`);

        if (!test.passed && test.vulnerabilities.length > 0) {
          test.vulnerabilities.forEach((vuln: string) => {
            console.log(`    - ${vuln}`);
          });
        }
      });
    }

    // Save results if output file specified
    if (this.options.outputFile) {
      await this.saveResults(report, results);
    }
  }

  /**
   * Run component-specific tests
   */
  private async runComponentTests(
    securityAgent: SecurityAgent,
    securityValidator: SecurityValidator,
    securityMonitor: SecurityMonitor,
  ): Promise<void> {
    console.log("\n🧪 Running Component-Specific Tests...");

    // Security Agent Tests
    console.log("  Testing Security Agent...");
    const webhookResult = await securityAgent.validateWebhook(
      '{"test": "payload"}',
      undefined,
      "Linear-Webhook/1.0",
      "127.0.0.1",
    );
    console.log(`    Webhook validation: ${webhookResult.valid ? "✅" : "❌"}`);

    // Security Validator Tests
    console.log("  Testing Security Validator...");
    const branchResult = securityValidator.validateBranchName(
      "feature/test-branch",
    );
    console.log(`    Branch validation: ${branchResult.valid ? "✅" : "❌"}`);

    // Security Monitor Tests
    console.log("  Testing Security Monitor...");
    const monitorStatus = securityMonitor.getStatus();
    console.log(
      `    Monitor status: ${monitorStatus.isMonitoring ? "✅" : "❌"}`,
    );

    // Performance Tests
    console.log("  Running Performance Tests...");
    const performanceResults =
      await this.runPerformanceTests(securityValidator);
    console.log(
      `    Performance: ${performanceResults.passed ? "✅" : "❌"} (${performanceResults.avgTime}ms avg)`,
    );
  }

  /**
   * Run performance tests
   */
  private async runPerformanceTests(validator: SecurityValidator): Promise<{
    passed: boolean;
    avgTime: number;
    maxTime: number;
  }> {
    const times: number[] = [];
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      validator.validateBranchName(`feature/test-branch-${i}`);
      validator.validateFilePath(`/tmp/test/file-${i}.txt`, "/tmp/test");
      validator.detectInjectionAttempts(`test input ${i}`);
      times.push(Date.now() - start);
    }

    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const maxTime = Math.max(...times);

    return {
      passed: avgTime < 10 && maxTime < 50, // Performance thresholds
      avgTime: Math.round(avgTime * 100) / 100,
      maxTime,
    };
  }

  /**
   * Get emoji for risk level
   */
  private getRiskLevelEmoji(riskLevel: string): string {
    switch (riskLevel) {
      case "LOW":
        return "🟢";
      case "MEDIUM":
        return "🟡";
      case "HIGH":
        return "🟠";
      case "CRITICAL":
        return "🔴";
      default:
        return "⚪";
    }
  }

  /**
   * Save results to file
   */
  private async saveResults(report: any, results: any): Promise<void> {
    const fs = await import("fs/promises");

    try {
      const output = {
        timestamp: new Date().toISOString(),
        summary: report.summary,
        vulnerabilities: results.vulnerabilities,
        recommendations: results.recommendations,
        testDetails: report.testDetails,
      };

      await fs.writeFile(
        this.options.outputFile!,
        JSON.stringify(output, null, 2),
      );

      console.log(`\n💾 Results saved to: ${this.options.outputFile}`);
    } catch (error) {
      console.error(`Failed to save results: ${(error as Error).message}`);
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): SecurityTestOptions {
  const args = process.argv.slice(2);
  const options: SecurityTestOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--verbose":
      case "-v":
        options.verbose = true;
        break;
      case "--output-format":
        options.outputFormat = args[++i] as "console" | "json" | "html";
        break;
      case "--output-file":
      case "-o":
        options.outputFile = args[++i];
        break;
      case "--category":
      case "-c":
        options.testCategory = args[++i] as any;
        break;
      case "--severity":
      case "-s":
        options.severity = args[++i] as any;
        break;
      case "--help":
      case "-h":
        console.log(`
Security Test Runner for Claude Code + Linear Integration

Usage: tsx src/security/run-security-tests.ts [options]

Options:
  -v, --verbose          Enable verbose output
  -o, --output-file      Save results to file
  --output-format        Output format (console, json, html)
  -c, --category         Test category (all, validation, injection, auth, monitoring)
  -s, --severity         Filter by severity (low, medium, high, critical)
  -h, --help             Show this help message

Examples:
  tsx src/security/run-security-tests.ts --verbose
  tsx src/security/run-security-tests.ts -o security-report.json
  tsx src/security/run-security-tests.ts --category validation
        `);
        process.exit(0);
    }
  }

  return options;
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const options = parseArgs();
  const runner = new SecurityTestRunner(options);
  await runner.run();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Security test runner failed:", error);
    process.exit(1);
  });
}

export { SecurityTestRunner, main as runSecurityTestRunner };
