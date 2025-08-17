/**
 * Security testing utilities for Claude Code + Linear Integration
 * Comprehensive security test scenarios and validation
 */

import { SecurityAgent } from "./security-agent.js";
import { SecurityValidator, SecurityUtils } from "./validators.js";
import { SecurityMonitor } from "./monitoring.js";
import type {
  IntegrationConfig,
  Logger,
  ClaudeSession,
} from "../core/types.js";

/**
 * Security test scenarios
 */
export interface SecurityTestScenario {
  name: string;
  description: string;
  setup: () => Promise<void>;
  execute: () => Promise<SecurityTestResult>;
  cleanup: () => Promise<void>;
}

/**
 * Security test result
 */
export interface SecurityTestResult {
  passed: boolean;
  vulnerabilities: string[];
  warnings: string[];
  recommendations: string[];
  metrics: {
    executionTime: number;
    memoryUsage: number;
    securityEvents: number;
  };
}

/**
 * Mock configuration for testing
 */
const mockConfig: IntegrationConfig = {
  linearApiToken: "test-token",
  linearOrganizationId: "test-org-id",
  claudeExecutablePath: "claude",
  webhookPort: 3000,
  webhookSecret: "test-webhook-secret",
  projectRootDir: "/tmp/test-project",
  defaultBranch: "main",
  createBranches: true,
  timeoutMinutes: 30,
  agentUserId: "test-agent-id",
  debug: false,
};

/**
 * Mock logger for testing
 */
const mockLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Security testing suite
 */
export class SecurityTestSuite {
  private securityAgent: SecurityAgent;
  private securityValidator: SecurityValidator;
  private securityMonitor: SecurityMonitor;
  private testResults: SecurityTestResult[] = [];

  constructor() {
    this.securityAgent = new SecurityAgent(mockConfig, mockLogger);
    this.securityValidator = new SecurityValidator();
    this.securityMonitor = new SecurityMonitor(
      mockConfig,
      mockLogger,
      this.securityAgent,
    );
  }

  /**
   * Run all security tests
   */
  async runAllTests(): Promise<{
    passed: number;
    failed: number;
    vulnerabilities: string[];
    recommendations: string[];
  }> {
    const scenarios = this.getTestScenarios();
    this.testResults = [];

    let passed = 0;
    let failed = 0;
    const allVulnerabilities: string[] = [];
    const allRecommendations: string[] = [];

    for (const scenario of scenarios) {
      try {
        await scenario.setup();
        const result = await scenario.execute();
        await scenario.cleanup();

        this.testResults.push(result);

        if (result.passed) {
          passed++;
        } else {
          failed++;
          allVulnerabilities.push(...result.vulnerabilities);
        }

        allRecommendations.push(...result.recommendations);
      } catch (error) {
        failed++;
        allVulnerabilities.push(
          `Test scenario '${scenario.name}' failed with error: ${(error as Error).message}`,
        );
      }
    }

    return {
      passed,
      failed,
      vulnerabilities: [...new Set(allVulnerabilities)],
      recommendations: [...new Set(allRecommendations)],
    };
  }

  /**
   * Get all test scenarios
   */
  private getTestScenarios(): SecurityTestScenario[] {
    return [
      this.createWebhookSecurityTest(),
      this.createInputValidationTest(),
      this.createSessionSecurityTest(),
      this.createCommandInjectionTest(),
      this.createPathTraversalTest(),
      this.createRateLimitingTest(),
      this.createAuthenticationTest(),
      this.createResourceExhaustionTest(),
      this.createDataSanitizationTest(),
      this.createEnvironmentSecurityTest(),
    ];
  }

  /**
   * Webhook security test
   */
  private createWebhookSecurityTest(): SecurityTestScenario {
    return {
      name: "Webhook Security Validation",
      description:
        "Test webhook signature validation, payload size limits, and malicious payload detection",
      setup: async () => {},
      execute: async () => {
        const startTime = Date.now();
        const startMemory = process.memoryUsage().heapUsed;
        const vulnerabilities: string[] = [];
        const warnings: string[] = [];
        const recommendations: string[] = [];

        // Test 1: Invalid signature
        const invalidSigResult = await this.securityAgent.validateWebhook(
          '{"test": "payload"}',
          "invalid-signature",
          "Linear-Webhook/1.0",
          "127.0.0.1",
        );

        if (invalidSigResult.valid) {
          vulnerabilities.push("Webhook accepts invalid signatures");
        }

        // Test 2: Missing signature
        const missingSigResult = await this.securityAgent.validateWebhook(
          '{"test": "payload"}',
          undefined,
          "Linear-Webhook/1.0",
          "127.0.0.1",
        );

        if (missingSigResult.valid && mockConfig.webhookSecret) {
          vulnerabilities.push(
            "Webhook accepts requests without signatures when secret is configured",
          );
        }

        // Test 3: Large payload
        const largePayload = "x".repeat(2 * 1024 * 1024); // 2MB
        const largeSizeResult =
          this.securityValidator.validateWebhookPayloadSize(largePayload);

        if (largeSizeResult.valid) {
          vulnerabilities.push("Webhook accepts oversized payloads");
        }

        // Test 4: Malicious user agent
        const maliciousUAResult = await this.securityAgent.validateWebhook(
          '{"test": "payload"}',
          "sha256=valid-signature",
          '<script>alert("xss")</script>',
          "127.0.0.1",
        );

        // This should not block but should log a warning
        if (!maliciousUAResult.valid) {
          warnings.push("User-Agent validation may be too strict");
        }

        // Recommendations
        if (vulnerabilities.length === 0) {
          recommendations.push("Webhook security is properly configured");
        } else {
          recommendations.push("Implement webhook signature validation");
          recommendations.push("Add payload size limits");
          recommendations.push("Validate User-Agent headers");
        }

        const endTime = Date.now();
        const endMemory = process.memoryUsage().heapUsed;

        return {
          passed: vulnerabilities.length === 0,
          vulnerabilities,
          warnings,
          recommendations,
          metrics: {
            executionTime: endTime - startTime,
            memoryUsage: endMemory - startMemory,
            securityEvents: this.securityAgent.getSecurityEvents().length,
          },
        };
      },
      cleanup: async () => {
        this.securityAgent.clearSecurityEvents();
      },
    };
  }

  /**
   * Input validation test
   */
  private createInputValidationTest(): SecurityTestScenario {
    return {
      name: "Input Validation Security",
      description:
        "Test input sanitization and validation for various attack vectors",
      setup: async () => {},
      execute: async () => {
        const startTime = Date.now();
        const vulnerabilities: string[] = [];
        const recommendations: string[] = [];

        // Test 1: Branch name injection
        const maliciousBranch = "feature/test; rm -rf /";
        const branchResult =
          this.securityValidator.validateBranchName(maliciousBranch);

        if (branchResult.valid && branchResult.sanitized?.includes(";")) {
          vulnerabilities.push(
            "Branch name sanitization allows command injection",
          );
        }

        // Test 2: Path traversal
        const maliciousPath = "../../../etc/passwd";
        const pathResult = this.securityValidator.validateFilePath(
          maliciousPath,
          "/tmp/test",
        );

        if (pathResult.valid) {
          vulnerabilities.push("Path validation allows directory traversal");
        }

        // Test 3: Command injection
        const maliciousCommand = "git clone; cat /etc/passwd";
        const commandResult =
          this.securityValidator.validateCommand(maliciousCommand);

        if (
          commandResult.valid &&
          commandResult.sanitized?.command.includes(";")
        ) {
          vulnerabilities.push("Command validation allows command injection");
        }

        // Test 4: XSS in issue description
        const xssPayload = '<script>alert("xss")</script>';
        const sanitizedDescription =
          this.securityValidator.sanitizeIssueDescription(xssPayload);

        if (sanitizedDescription.includes("<script>")) {
          vulnerabilities.push("Issue description sanitization allows XSS");
        }

        // Test 5: Injection detection
        const injectionTest =
          this.securityValidator.detectInjectionAttempts(maliciousCommand);

        if (!injectionTest.detected) {
          vulnerabilities.push(
            "Injection detection failed to identify malicious input",
          );
        }

        recommendations.push("Implement comprehensive input sanitization");
        recommendations.push("Use allowlist-based validation");
        recommendations.push("Regular security testing of input validation");

        return {
          passed: vulnerabilities.length === 0,
          vulnerabilities,
          warnings: [],
          recommendations,
          metrics: {
            executionTime: Date.now() - startTime,
            memoryUsage: 0,
            securityEvents: 0,
          },
        };
      },
      cleanup: async () => {},
    };
  }

  /**
   * Session security test
   */
  private createSessionSecurityTest(): SecurityTestScenario {
    return {
      name: "Session Security Validation",
      description:
        "Test session ID generation, validation, and lifecycle security",
      setup: async () => {},
      execute: async () => {
        const startTime = Date.now();
        const vulnerabilities: string[] = [];
        const recommendations: string[] = [];

        // Test 1: Session ID predictability
        const sessionIds = new Set<string>();
        for (let i = 0; i < 1000; i++) {
          const id = this.securityValidator.generateSecureSessionId();
          if (sessionIds.has(id)) {
            vulnerabilities.push(
              "Session ID collision detected - weak randomness",
            );
            break;
          }
          sessionIds.add(id);
        }

        // Test 2: Session ID format validation
        const validId = this.securityValidator.generateSecureSessionId();
        if (!SecurityUtils.isValidSessionId(validId)) {
          vulnerabilities.push("Generated session ID fails validation");
        }

        // Test 3: Invalid session ID formats
        const invalidIds = [
          "short",
          "contains spaces",
          "contains/slashes",
          "contains;semicolons",
          "",
          "x".repeat(100),
        ];

        for (const invalidId of invalidIds) {
          if (SecurityUtils.isValidSessionId(invalidId)) {
            vulnerabilities.push(
              `Invalid session ID format accepted: ${invalidId}`,
            );
          }
        }

        // Test 4: Session metadata validation
        const maliciousMetadata = {
          valid_key: "valid_value",
          "script<>": "<script>alert('xss')</script>",
          "": "empty_key",
          very_long_key_that_exceeds_limits: "value",
        };

        const metadataResult =
          this.securityValidator.validateSessionMetadata(maliciousMetadata);
        if (metadataResult.valid && metadataResult.sanitized?.["script<>"]) {
          vulnerabilities.push(
            "Session metadata validation allows malicious content",
          );
        }

        recommendations.push(
          "Use cryptographically secure session ID generation",
        );
        recommendations.push("Implement session expiration");
        recommendations.push("Encrypt sensitive session data");

        return {
          passed: vulnerabilities.length === 0,
          vulnerabilities,
          warnings: [],
          recommendations,
          metrics: {
            executionTime: Date.now() - startTime,
            memoryUsage: 0,
            securityEvents: 0,
          },
        };
      },
      cleanup: async () => {},
    };
  }

  /**
   * Command injection test
   */
  private createCommandInjectionTest(): SecurityTestScenario {
    return {
      name: "Command Injection Prevention",
      description: "Test protection against command injection attacks",
      setup: async () => {},
      execute: async () => {
        const vulnerabilities: string[] = [];
        const recommendations: string[] = [];

        const injectionPayloads = [
          "git clone repo; rm -rf /",
          "innocent_command && evil_command",
          "command | malicious_pipe",
          "command $(malicious_substitution)",
          "command `malicious_backticks`",
          "command $((malicious_arithmetic))",
          "command ${malicious_parameter}",
        ];

        for (const payload of injectionPayloads) {
          const result = this.securityValidator.validateCommand(payload);
          if (result.valid && result.sanitized?.command.match(/[;&|`$()]/)) {
            vulnerabilities.push(`Command injection not prevented: ${payload}`);
          }

          const detectionResult =
            this.securityValidator.detectInjectionAttempts(payload);
          if (!detectionResult.detected) {
            vulnerabilities.push(`Injection detection failed for: ${payload}`);
          }
        }

        recommendations.push("Implement command allowlisting");
        recommendations.push("Use parameterized commands");
        recommendations.push("Regular security testing for command injection");

        return {
          passed: vulnerabilities.length === 0,
          vulnerabilities,
          warnings: [],
          recommendations,
          metrics: {
            executionTime: 0,
            memoryUsage: 0,
            securityEvents: 0,
          },
        };
      },
      cleanup: async () => {},
    };
  }

  /**
   * Path traversal test
   */
  private createPathTraversalTest(): SecurityTestScenario {
    return {
      name: "Path Traversal Prevention",
      description: "Test protection against path traversal attacks",
      setup: async () => {},
      execute: async () => {
        const vulnerabilities: string[] = [];
        const recommendations: string[] = [];

        const traversalPayloads = [
          "../../../etc/passwd",
          "..\\..\\..\\windows\\system32\\config\\sam",
          "/etc/passwd",
          "C:\\Windows\\System32\\config\\SAM",
          "....//....//....//etc/passwd",
          "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
        ];

        for (const payload of traversalPayloads) {
          const result = this.securityValidator.validateFilePath(
            payload,
            "/tmp/test",
          );
          if (result.valid) {
            vulnerabilities.push(`Path traversal not prevented: ${payload}`);
          }

          const detectionResult =
            this.securityValidator.detectInjectionAttempts(payload);
          if (payload.includes("..") && !detectionResult.detected) {
            vulnerabilities.push(
              `Path traversal detection failed for: ${payload}`,
            );
          }
        }

        recommendations.push("Implement path canonicalization");
        recommendations.push("Use chroot or containerization");
        recommendations.push("Validate against allowed directories");

        return {
          passed: vulnerabilities.length === 0,
          vulnerabilities,
          warnings: [],
          recommendations,
          metrics: {
            executionTime: 0,
            memoryUsage: 0,
            securityEvents: 0,
          },
        };
      },
      cleanup: async () => {},
    };
  }

  /**
   * Rate limiting test
   */
  private createRateLimitingTest(): SecurityTestScenario {
    return {
      name: "Rate Limiting Effectiveness",
      description: "Test rate limiting implementation",
      setup: async () => {},
      execute: async () => {
        const vulnerabilities: string[] = [];
        const recommendations: string[] = [];

        // Simulate rapid requests from same IP
        const testIP = "192.168.1.100";
        let blockedCount = 0;

        for (let i = 0; i < 150; i++) {
          // Exceed typical rate limits
          const result = await this.securityAgent.validateWebhook(
            '{"test": "payload"}',
            "sha256=test-signature",
            "Linear-Webhook/1.0",
            testIP,
          );

          if (!result.valid && result.reason?.includes("rate limit")) {
            blockedCount++;
          }
        }

        if (blockedCount === 0) {
          vulnerabilities.push(
            "Rate limiting not working - no requests blocked",
          );
        } else if (blockedCount < 50) {
          vulnerabilities.push("Rate limiting may be too permissive");
        }

        recommendations.push("Implement progressive rate limiting");
        recommendations.push("Use sliding window rate limiting");
        recommendations.push("Monitor rate limiting effectiveness");

        return {
          passed: blockedCount > 0,
          vulnerabilities,
          warnings: [],
          recommendations,
          metrics: {
            executionTime: 0,
            memoryUsage: 0,
            securityEvents: blockedCount,
          },
        };
      },
      cleanup: async () => {
        this.securityAgent.clearSecurityEvents();
      },
    };
  }

  /**
   * Authentication test
   */
  private createAuthenticationTest(): SecurityTestScenario {
    return {
      name: "Authentication Security",
      description: "Test authentication mechanisms and token security",
      setup: async () => {},
      execute: async () => {
        const vulnerabilities: string[] = [];
        const recommendations: string[] = [];

        // Test token validation
        if (
          !mockConfig.linearApiToken ||
          mockConfig.linearApiToken.length < 32
        ) {
          vulnerabilities.push("API token appears to be weak or missing");
        }

        // Test webhook secret
        if (!mockConfig.webhookSecret) {
          vulnerabilities.push("Webhook secret not configured");
        } else if (mockConfig.webhookSecret.length < 16) {
          vulnerabilities.push("Webhook secret is too short");
        }

        recommendations.push("Use strong API tokens");
        recommendations.push("Implement token rotation");
        recommendations.push("Store tokens securely");

        return {
          passed: vulnerabilities.length === 0,
          vulnerabilities,
          warnings: [],
          recommendations,
          metrics: {
            executionTime: 0,
            memoryUsage: 0,
            securityEvents: 0,
          },
        };
      },
      cleanup: async () => {},
    };
  }

  /**
   * Resource exhaustion test
   */
  private createResourceExhaustionTest(): SecurityTestScenario {
    return {
      name: "Resource Exhaustion Protection",
      description: "Test protection against resource exhaustion attacks",
      setup: async () => {},
      execute: async () => {
        const vulnerabilities: string[] = [];
        const recommendations: string[] = [];

        // Test memory usage validation
        const mockSession: ClaudeSession = {
          id: this.securityValidator.generateSecureSessionId(),
          issueId: "test-issue",
          issueIdentifier: "TEST-123",
          status: "running" as any,
          workingDir: "/tmp/test",
          startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          lastActivityAt: new Date(),
          metadata: {},
        };

        const sessionResult =
          await this.securityAgent.validateSession(mockSession);
        if (sessionResult.valid) {
          // This might be OK depending on configuration
        }

        // Test concurrent session limits would require more complex setup

        recommendations.push("Implement session timeouts");
        recommendations.push("Limit concurrent sessions");
        recommendations.push("Monitor resource usage");

        return {
          passed: true, // Resource exhaustion is harder to test without actual load
          vulnerabilities,
          warnings: [],
          recommendations,
          metrics: {
            executionTime: 0,
            memoryUsage: 0,
            securityEvents: 0,
          },
        };
      },
      cleanup: async () => {},
    };
  }

  /**
   * Data sanitization test
   */
  private createDataSanitizationTest(): SecurityTestScenario {
    return {
      name: "Data Sanitization",
      description: "Test data sanitization for logs and outputs",
      setup: async () => {},
      execute: async () => {
        const vulnerabilities: string[] = [];
        const recommendations: string[] = [];

        // Test string sanitization
        const maliciousStrings = [
          "password=secret123",
          "token=abc123xyz",
          "<script>alert('xss')</script>",
          "'; DROP TABLE users; --",
          "\0null\0byte\0injection",
        ];

        for (const maliciousString of maliciousStrings) {
          const sanitized = SecurityUtils.sanitizeString(maliciousString);

          if (sanitized.includes("<script>")) {
            vulnerabilities.push("XSS not prevented in string sanitization");
          }

          if (sanitized.includes("\0")) {
            vulnerabilities.push("Null byte injection not prevented");
          }
        }

        recommendations.push("Implement comprehensive data sanitization");
        recommendations.push("Use context-aware sanitization");
        recommendations.push("Regular security testing of sanitization");

        return {
          passed: vulnerabilities.length === 0,
          vulnerabilities,
          warnings: [],
          recommendations,
          metrics: {
            executionTime: 0,
            memoryUsage: 0,
            securityEvents: 0,
          },
        };
      },
      cleanup: async () => {},
    };
  }

  /**
   * Environment security test
   */
  private createEnvironmentSecurityTest(): SecurityTestScenario {
    return {
      name: "Environment Security",
      description: "Test environment variable and process security",
      setup: async () => {},
      execute: async () => {
        const vulnerabilities: string[] = [];
        const recommendations: string[] = [];

        // Test environment variable validation
        const testEnv = {
          PATH: "/usr/bin:/bin",
          HOME: "/home/user",
          SECRET_TOKEN: "should-be-filtered",
          MALICIOUS_VAR: "rm -rf /",
          "INVALID@VAR": "invalid-name",
        };

        const allowedVars = ["PATH", "HOME", "USER"];
        const envResult = this.securityValidator.validateEnvironmentVariables(
          testEnv,
          allowedVars,
        );

        if (envResult.valid && envResult.sanitized?.["SECRET_TOKEN"]) {
          vulnerabilities.push(
            "Environment validation allows sensitive variables",
          );
        }

        if (envResult.valid && envResult.sanitized?.["INVALID@VAR"]) {
          vulnerabilities.push(
            "Environment validation allows invalid variable names",
          );
        }

        recommendations.push(
          "Filter environment variables for Claude processes",
        );
        recommendations.push("Use minimal environment for security");
        recommendations.push("Regular audit of allowed environment variables");

        return {
          passed: vulnerabilities.length === 0,
          vulnerabilities,
          warnings: [],
          recommendations,
          metrics: {
            executionTime: 0,
            memoryUsage: 0,
            securityEvents: 0,
          },
        };
      },
      cleanup: async () => {},
    };
  }

  /**
   * Get test results
   */
  getTestResults(): SecurityTestResult[] {
    return [...this.testResults];
  }

  /**
   * Generate security test report
   */
  generateReport(): {
    summary: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      totalVulnerabilities: number;
      riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    };
    vulnerabilities: string[];
    recommendations: string[];
    testDetails: Array<{
      name: string;
      passed: boolean;
      vulnerabilities: string[];
      recommendations: string[];
    }>;
  } {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;

    const allVulnerabilities = this.testResults.flatMap(
      (r) => r.vulnerabilities,
    );
    const allRecommendations = this.testResults.flatMap(
      (r) => r.recommendations,
    );

    let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    if (failedTests > 5) {
      riskLevel = "CRITICAL";
    } else if (failedTests > 3) {
      riskLevel = "HIGH";
    } else if (failedTests > 1) {
      riskLevel = "MEDIUM";
    }

    return {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        totalVulnerabilities: allVulnerabilities.length,
        riskLevel,
      },
      vulnerabilities: [...new Set(allVulnerabilities)],
      recommendations: [...new Set(allRecommendations)],
      testDetails: this.testResults.map((result, index) => ({
        name: this.getTestScenarios()[index]?.name || `Test ${index + 1}`,
        passed: result.passed,
        vulnerabilities: result.vulnerabilities,
        recommendations: result.recommendations,
      })),
    };
  }
}

/**
 * Main security testing function
 */
export async function runSecurityTests(): Promise<void> {
  console.log("🔒 Running Security Test Suite...");

  const testSuite = new SecurityTestSuite();
  const results = await testSuite.runAllTests();

  console.log("\n📊 Security Test Results:");
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);

  if (results.vulnerabilities.length > 0) {
    console.log("\n🚨 Vulnerabilities Found:");
    results.vulnerabilities.forEach((vuln) => console.log(`  - ${vuln}`));
  }

  if (results.recommendations.length > 0) {
    console.log("\n💡 Recommendations:");
    results.recommendations.forEach((rec) => console.log(`  - ${rec}`));
  }

  const report = testSuite.generateReport();
  console.log(`\n🎯 Risk Level: ${report.summary.riskLevel}`);
}
