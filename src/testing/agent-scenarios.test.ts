/**
 * Agent-Specific Testing Scenarios for Claude Code + Linear Integration
 * 
 * This file contains specialized tests for different types of Claude Code agents:
 * - Code Analysis Agents
 * - Bug Fix Agents  
 * - Testing Agents
 * - Documentation Agents
 * - Performance Optimization Agents
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  LinearWebhookEvent,
  ProcessedEvent,
  ClaudeSession,
  ClaudeExecutionResult,
  IntegrationConfig
} from "../core/types.js";
import { SessionStatus } from "../core/types.js";
import { LinearWebhookHandler } from "../webhooks/handler.js";
import { SessionManager } from "../sessions/manager.js";
import { ClaudeExecutor } from "../claude/executor.js";
import {
  mockIntegrationConfig,
  mockUser,
  mockAgentUser,
  createMockLogger,
  createMockWebhookEvent,
  createMockIssue,
  createMockComment
} from "./mocks.js";

describe("Specialized Claude Code Agent Scenarios", () => {
  let webhookHandler: LinearWebhookHandler;
  let sessionManager: SessionManager;
  let claudeExecutor: ClaudeExecutor;
  let config: IntegrationConfig;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = createMockLogger();
    config = { ...mockIntegrationConfig };
    
    webhookHandler = new LinearWebhookHandler(config, logger);
    sessionManager = new SessionManager(config, logger);
    claudeExecutor = new ClaudeExecutor(logger);
  });

  describe("Code Analysis Agent", () => {
    it("should trigger on 'analyze' or 'review' mentions", async () => {
      const analysisRequests = [
        "@claude analyze the performance bottlenecks in our auth service",
        "Claude, please review the database schema changes",
        "Can you analyze this code for security vulnerabilities?",
        "Review the API design and suggest improvements"
      ];

      for (const request of analysisRequests) {
        const comment = createMockComment({ body: request });
        const event = createMockWebhookEvent({
          type: "Comment",
          data: comment,
          actor: mockUser
        });

        const processed = await webhookHandler.processWebhook(event);
        expect(processed?.shouldTrigger).toBe(true);
        expect(processed?.triggerReason).toBe("Comment mentions agent");
      }
    });

    it("should perform comprehensive code analysis workflow", async () => {
      // 1. Create analysis request issue
      const analysisIssue = createMockIssue({
        title: "Performance Analysis: User Authentication Service",
        description: "@claude please analyze our authentication service for performance bottlenecks. Focus on database queries, caching, and response times.",
        assignee: mockAgentUser
      });

      // 2. Mock analysis execution result
      const analysisResult: ClaudeExecutionResult = {
        success: true,
        output: `Performance Analysis Complete:

        ## Issues Found:
        1. N+1 query problem in user permissions check
        2. Missing Redis cache for JWT token validation
        3. Inefficient password hashing configuration
        
        ## Recommendations:
        1. Implement eager loading for user permissions
        2. Add Redis cache layer for token validation
        3. Optimize bcrypt rounds from 12 to 10
        
        ## Files Analyzed:
        - src/auth/service.ts
        - src/auth/middleware.ts
        - src/user/permissions.ts`,
        filesModified: [
          "analysis/auth-performance-report.md",
          "analysis/performance-recommendations.md",
          "src/auth/service.ts", // Added analysis comments
        ],
        commits: [{
          hash: "analysis123",
          message: "analysis: performance review of authentication service\n\nIdentified N+1 queries, caching gaps, and hash optimization opportunities",
          author: "Claude Analysis Agent",
          timestamp: new Date(),
          files: ["analysis/auth-performance-report.md"]
        }],
        duration: 600000, // 10 minutes
        exitCode: 0
      };

      vi.spyOn(claudeExecutor, 'execute').mockResolvedValue(analysisResult);

      // 3. Execute analysis session
      const session = await sessionManager.createSession(analysisIssue);
      const result = await sessionManager.startSession(session.id, analysisIssue);

      // 4. Verify analysis-specific results
      expect(result.success).toBe(true);
      expect(result.output).toContain("Performance Analysis Complete");
      expect(result.output).toContain("Issues Found");
      expect(result.output).toContain("Recommendations");
      expect(result.filesModified.some(f => f.includes("analysis/"))).toBe(true);
      expect(result.commits[0].message).toContain("analysis:");
    });

    it("should handle complex architecture analysis requests", async () => {
      const architectureComment = createMockComment({
        body: "@claude analyze our microservices architecture. Check for: 1) Service coupling issues, 2) Data consistency patterns, 3) Performance bottlenecks, 4) Security vulnerabilities. Provide detailed recommendations."
      });

      const complexAnalysisResult: ClaudeExecutionResult = {
        success: true,
        output: "Architecture Analysis Report Generated",
        filesModified: [
          "architecture/services-analysis.md",
          "architecture/coupling-matrix.md", 
          "architecture/data-flow-diagram.md",
          "architecture/security-audit.md",
          "architecture/performance-metrics.md"
        ],
        commits: [{
          hash: "arch456",
          message: "analysis: comprehensive microservices architecture review",
          author: "Claude Analysis Agent",
          timestamp: new Date(),
          files: ["architecture/services-analysis.md"]
        }],
        duration: 1800000, // 30 minutes for complex analysis
        exitCode: 0
      };

      vi.spyOn(claudeExecutor, 'execute').mockResolvedValue(complexAnalysisResult);

      const analysisIssue = createMockIssue({
        title: "Architecture Review Q4 2024"
      });

      const session = await sessionManager.createSession(analysisIssue, architectureComment);
      const result = await sessionManager.startSession(session.id, analysisIssue, architectureComment);

      expect(result.filesModified).toHaveLength(5);
      expect(result.filesModified.every(f => f.includes("architecture/"))).toBe(true);
      expect(result.duration).toBeGreaterThan(1000000); // Long analysis time
    });
  });

  describe("Bug Fix Agent", () => {
    it("should trigger on bug-related keywords and labels", async () => {
      const bugKeywords = [
        "@claude fix this authentication bug",
        "Claude, there's a memory leak that needs fixing",
        "Bug in the payment processing - please help",
        "Fix the SQL injection vulnerability"
      ];

      for (const bugReport of bugKeywords) {
        const comment = createMockComment({ body: bugReport });
        const event = createMockWebhookEvent({
          type: "Comment",
          data: comment
        });

        const processed = await webhookHandler.processWebhook(event);
        expect(processed?.shouldTrigger).toBe(true);
      }
    });

    it("should execute systematic bug fix workflow", async () => {
      // 1. Bug report with reproduction steps
      const bugIssue = createMockIssue({
        title: "User login fails with special characters in email",
        description: `
        ## Bug Description
        Users cannot log in when their email contains '+' or '.' characters.
        
        ## Reproduction Steps
        1. Go to /login
        2. Enter email: test+user@example.com
        3. Enter valid password
        4. Click Login
        5. Error: "Invalid email format"
        
        ## Expected Behavior
        User should be able to log in with any valid email format.
        `
      });

      const bugFixComment = createMockComment({
        body: "@claude please fix this email validation bug. The regex pattern seems to be too restrictive.",
        issue: bugIssue
      });

      // 2. Mock bug fix execution
      const bugFixResult: ClaudeExecutionResult = {
        success: true,
        output: `Bug Fix Summary:
        
        ## Root Cause
        Email validation regex pattern was too restrictive, excluding valid RFC 5322 characters.
        
        ## Changes Made
        1. Updated email validation regex in src/auth/validation.ts
        2. Added comprehensive email validation tests
        3. Updated user input sanitization
        
        ## Testing
        - Added 15 new test cases for email validation
        - Verified fix with problematic email formats
        - Regression tested existing functionality`,
        filesModified: [
          "src/auth/validation.ts",
          "tests/auth/email-validation.test.ts",
          "src/utils/sanitize.ts"
        ],
        commits: [
          {
            hash: "bugfix789",
            message: "fix(auth): improve email validation regex for special characters\n\nUpdated regex to support RFC 5322 compliant email addresses including '+' and '.' characters",
            author: "Claude Bug Fix Agent",
            timestamp: new Date(),
            files: ["src/auth/validation.ts"]
          },
          {
            hash: "test123",
            message: "test(auth): add comprehensive email validation tests\n\nAdded 15 test cases covering edge cases and special characters",
            author: "Claude Bug Fix Agent", 
            timestamp: new Date(),
            files: ["tests/auth/email-validation.test.ts"]
          }
        ],
        duration: 900000, // 15 minutes
        exitCode: 0
      };

      vi.spyOn(claudeExecutor, 'execute').mockResolvedValue(bugFixResult);

      // 3. Execute bug fix session
      const session = await sessionManager.createSession(bugIssue, bugFixComment);
      const result = await sessionManager.startSession(session.id, bugIssue, bugFixComment);

      // 4. Verify bug fix workflow
      expect(result.success).toBe(true);
      expect(result.output).toContain("Root Cause");
      expect(result.output).toContain("Changes Made");
      expect(result.output).toContain("Testing");
      expect(result.filesModified.some(f => f.includes("test"))).toBe(true);
      expect(result.commits.some(c => c.message.startsWith("fix("))).toBe(true);
      expect(result.commits.some(c => c.message.startsWith("test("))).toBe(true);
    });

    it("should handle critical security bug fixes", async () => {
      const securityBugIssue = createMockIssue({
        title: "CRITICAL: SQL Injection in user search endpoint",
        description: "Discovered SQL injection vulnerability in /api/users/search endpoint"
      });

      const urgentFixComment = createMockComment({
        body: "@claude URGENT: Fix the SQL injection vulnerability immediately. This is a critical security issue.",
        issue: securityBugIssue
      });

      const securityFixResult: ClaudeExecutionResult = {
        success: true,
        output: "CRITICAL SECURITY FIX APPLIED",
        filesModified: [
          "src/api/users/search.ts",
          "src/database/query-builder.ts",
          "tests/security/sql-injection.test.ts",
          "security/incident-report.md"
        ],
        commits: [{
          hash: "security999",
          message: "SECURITY: fix SQL injection in user search endpoint\n\nImplemented parameterized queries and input validation\nCVE-2024-XXXX",
          author: "Claude Security Agent",
          timestamp: new Date(),
          files: ["src/api/users/search.ts"]
        }],
        duration: 300000, // 5 minutes - urgent fix
        exitCode: 0
      };

      vi.spyOn(claudeExecutor, 'execute').mockResolvedValue(securityFixResult);

      const session = await sessionManager.createSession(securityBugIssue, urgentFixComment);
      const result = await sessionManager.startSession(session.id, securityBugIssue, urgentFixComment);

      expect(result.output).toContain("CRITICAL SECURITY FIX");
      expect(result.commits[0].message).toContain("SECURITY:");
      expect(result.duration).toBeLessThan(600000); // Quick turnaround for security issues
      expect(result.filesModified.some(f => f.includes("security/"))).toBe(true);
    });
  });

  describe("Testing Agent", () => {
    it("should trigger on testing requests and 'needs-testing' labels", async () => {
      const testingRequests = [
        "@claude add tests for the new payment processing feature",
        "Claude, please create comprehensive tests for the API endpoints",
        "Add unit tests for the user authentication service",
        "Generate integration tests for the webhook handlers"
      ];

      for (const request of testingRequests) {
        const comment = createMockComment({ body: request });
        const event = createMockWebhookEvent({
          type: "Comment",
          data: comment
        });

        const processed = await webhookHandler.processWebhook(event);
        expect(processed?.shouldTrigger).toBe(true);
      }
    });

    it("should generate comprehensive test suites", async () => {
      const testingIssue = createMockIssue({
        title: "Add comprehensive tests for user management API",
        description: "New user management API endpoints need thorough testing coverage"
      });

      const testingComment = createMockComment({
        body: "@claude please create comprehensive tests for the user management API. Include unit tests, integration tests, and edge cases.",
        issue: testingIssue
      });

      const testingResult: ClaudeExecutionResult = {
        success: true,
        output: `Test Suite Generation Complete:
        
        ## Tests Created
        - Unit tests: 45 test cases
        - Integration tests: 12 scenarios  
        - Edge case tests: 18 scenarios
        - Performance tests: 8 scenarios
        
        ## Coverage Achieved
        - Line coverage: 98%
        - Branch coverage: 95%
        - Function coverage: 100%
        
        ## Test Categories
        1. CRUD operations
        2. Authentication/authorization
        3. Input validation
        4. Error handling
        5. Rate limiting
        6. Database transactions`,
        filesModified: [
          "tests/unit/user-service.test.ts",
          "tests/integration/user-api.test.ts", 
          "tests/edge-cases/user-validation.test.ts",
          "tests/performance/user-load.test.ts",
          "tests/fixtures/user-data.ts",
          "tests/helpers/test-setup.ts"
        ],
        commits: [{
          hash: "tests456",
          message: "test: add comprehensive user management API test suite\n\nIncludes unit, integration, edge case, and performance tests\nAchieves 98% line coverage",
          author: "Claude Testing Agent",
          timestamp: new Date(),
          files: ["tests/unit/user-service.test.ts"]
        }],
        duration: 1200000, // 20 minutes for comprehensive testing
        exitCode: 0
      };

      vi.spyOn(claudeExecutor, 'execute').mockResolvedValue(testingResult);

      const session = await sessionManager.createSession(testingIssue, testingComment);
      const result = await sessionManager.startSession(session.id, testingIssue, testingComment);

      expect(result.success).toBe(true);
      expect(result.output).toContain("Test Suite Generation Complete");
      expect(result.output).toContain("Coverage Achieved");
      expect(result.filesModified.every(f => f.includes("test"))).toBe(true);
      expect(result.filesModified).toHaveLength(6);
      expect(result.commits[0].message).toContain("test:");
    });

    it("should handle specialized testing scenarios", async () => {
      const specializedTests = [
        {
          type: "load-testing",
          comment: "@claude create load tests for the API gateway. Test up to 10k concurrent requests.",
          expectedFiles: ["tests/load/api-gateway-load.test.ts", "tests/load/config/load-test-config.js"]
        },
        {
          type: "security-testing", 
          comment: "@claude add security tests for authentication endpoints. Include OWASP top 10 scenarios.",
          expectedFiles: ["tests/security/auth-security.test.ts", "tests/security/owasp-scenarios.test.ts"]
        },
        {
          type: "e2e-testing",
          comment: "@claude create end-to-end tests for the complete user registration flow.",
          expectedFiles: ["tests/e2e/user-registration.test.ts", "tests/e2e/helpers/browser-setup.ts"]
        }
      ];

      for (const testScenario of specializedTests) {
        const issue = createMockIssue({
          title: `${testScenario.type} implementation`
        });

        const comment = createMockComment({
          body: testScenario.comment,
          issue
        });

        const mockResult: ClaudeExecutionResult = {
          success: true,
          output: `${testScenario.type} implementation complete`,
          filesModified: testScenario.expectedFiles,
          commits: [{
            hash: `${testScenario.type}123`,
            message: `test: implement ${testScenario.type}`,
            author: "Claude Testing Agent",
            timestamp: new Date(),
            files: testScenario.expectedFiles
          }],
          duration: 600000,
          exitCode: 0
        };

        vi.mocked(claudeExecutor.execute).mockResolvedValueOnce(mockResult);

        const session = await sessionManager.createSession(issue, comment);
        const result = await sessionManager.startSession(session.id, issue, comment);

        expect(result.filesModified).toEqual(testScenario.expectedFiles);
        expect(result.commits[0].message).toContain("test:");
      }
    });
  });

  describe("Documentation Agent", () => {
    it("should trigger on documentation requests", async () => {
      const docRequests = [
        "@claude update the API documentation",
        "Claude, please document the new authentication flow",
        "Generate documentation for the webhook endpoints",
        "Update README with installation instructions"
      ];

      for (const request of docRequests) {
        const comment = createMockComment({ body: request });
        const event = createMockWebhookEvent({
          type: "Comment",
          data: comment
        });

        const processed = await webhookHandler.processWebhook(event);
        expect(processed?.shouldTrigger).toBe(true);
      }
    });

    it("should generate comprehensive documentation", async () => {
      const docIssue = createMockIssue({
        title: "Update API documentation for v2.0 release",
        description: "New API endpoints and breaking changes need documentation"
      });

      const docComment = createMockComment({
        body: "@claude please update all API documentation for the v2.0 release. Include examples, authentication changes, and migration guide.",
        issue: docIssue
      });

      const docResult: ClaudeExecutionResult = {
        success: true,
        output: `Documentation Update Complete:
        
        ## Documentation Generated
        - API Reference: 45 endpoints documented
        - Authentication Guide: Updated for OAuth2
        - Migration Guide: v1 to v2 breaking changes
        - Code Examples: 60+ examples added
        - Webhook Documentation: Complete reference
        
        ## Formats Created
        - Markdown documentation
        - OpenAPI 3.0 specifications
        - Postman collection
        - SDK documentation`,
        filesModified: [
          "docs/api/v2/reference.md",
          "docs/api/v2/authentication.md",
          "docs/migration/v1-to-v2.md",
          "docs/examples/api-examples.md", 
          "docs/webhooks/webhook-reference.md",
          "api/openapi-v2.yaml",
          "collections/postman-v2.json",
          "README.md"
        ],
        commits: [{
          hash: "docs789",
          message: "docs: comprehensive API v2.0 documentation update\n\nIncludes API reference, migration guide, and code examples\nUpdated OpenAPI specs and Postman collection",
          author: "Claude Documentation Agent",
          timestamp: new Date(),
          files: ["docs/api/v2/reference.md"]
        }],
        duration: 1500000, // 25 minutes for comprehensive docs
        exitCode: 0
      };

      vi.spyOn(claudeExecutor, 'execute').mockResolvedValue(docResult);

      const session = await sessionManager.createSession(docIssue, docComment);
      const result = await sessionManager.startSession(session.id, docIssue, docComment);

      expect(result.success).toBe(true);
      expect(result.output).toContain("Documentation Update Complete");
      expect(result.filesModified.some(f => f.includes("docs/"))).toBe(true);
      expect(result.filesModified.some(f => f.includes("openapi"))).toBe(true);
      expect(result.commits[0].message).toContain("docs:");
    });
  });

  describe("Performance Optimization Agent", () => {
    it("should trigger on performance-related requests", async () => {
      const perfRequests = [
        "@claude optimize the database queries in user service",
        "Claude, please improve API response times",
        "Optimize memory usage in the image processing service",
        "Performance bottlenecks need fixing in the search feature"
      ];

      for (const request of perfRequests) {
        const comment = createMockComment({ body: request });
        const event = createMockWebhookEvent({
          type: "Comment",
          data: comment
        });

        const processed = await webhookHandler.processWebhook(event);
        expect(processed?.shouldTrigger).toBe(true);
      }
    });

    it("should execute systematic performance optimization", async () => {
      const perfIssue = createMockIssue({
        title: "Optimize API response times - currently 2s average",
        description: "API response times have degraded. Target: <500ms average response time"
      });

      const perfComment = createMockComment({
        body: "@claude optimize our API performance. Current average response time is 2 seconds, we need to get it under 500ms.",
        issue: perfIssue
      });

      const perfResult: ClaudeExecutionResult = {
        success: true,
        output: `Performance Optimization Complete:
        
        ## Improvements Implemented
        1. Database Query Optimization
           - Added missing indexes: 40% query time reduction
           - Implemented connection pooling
           - Query optimization: removed N+1 queries
        
        2. Caching Strategy
           - Added Redis cache for frequently accessed data
           - Implemented cache warming
           - 80% cache hit rate achieved
        
        3. Code Optimizations
           - Async processing for heavy operations
           - Memory usage reduced by 35%
           - CPU usage optimized
        
        ## Results
        - Average response time: 2000ms → 380ms (81% improvement)
        - 95th percentile: 5000ms → 800ms (84% improvement)
        - Memory usage: -35%
        - Database load: -60%`,
        filesModified: [
          "src/api/middleware/cache.ts",
          "src/database/connection-pool.ts",
          "src/database/indexes.sql",
          "src/services/user-service.ts",
          "src/utils/async-processor.ts",
          "performance/benchmarks.md",
          "performance/optimization-report.md"
        ],
        commits: [{
          hash: "perf123",
          message: "perf: optimize API response times by 81%\n\nAdded Redis caching, database indexes, and async processing\nReduced average response time from 2000ms to 380ms",
          author: "Claude Performance Agent",
          timestamp: new Date(),
          files: ["src/api/middleware/cache.ts"]
        }],
        duration: 2100000, // 35 minutes for thorough optimization
        exitCode: 0
      };

      vi.spyOn(claudeExecutor, 'execute').mockResolvedValue(perfResult);

      const session = await sessionManager.createSession(perfIssue, perfComment);
      const result = await sessionManager.startSession(session.id, perfIssue, perfComment);

      expect(result.success).toBe(true);
      expect(result.output).toContain("Performance Optimization Complete");
      expect(result.output).toContain("81% improvement");
      expect(result.filesModified.some(f => f.includes("performance/"))).toBe(true);
      expect(result.commits[0].message).toContain("perf:");
    });
  });

  describe("Multi-Agent Coordination", () => {
    it("should coordinate different agent types for complex features", async () => {
      // 1. Large feature requiring multiple agent types
      const complexFeature = createMockIssue({
        title: "Implement real-time notification system",
        description: "Build complete real-time notification system with WebSocket support, database optimizations, comprehensive testing, and documentation"
      });

      // 2. Sequential agent requests
      const agentRequests = [
        {
          agent: "analysis",
          comment: "@claude analyze the current notification system and design the real-time architecture",
          expectedFiles: ["analysis/notification-architecture.md", "analysis/websocket-design.md"]
        },
        {
          agent: "implementation", 
          comment: "@claude implement the real-time notification system based on the analysis",
          expectedFiles: ["src/notifications/websocket-server.ts", "src/notifications/notification-service.ts"]
        },
        {
          agent: "testing",
          comment: "@claude add comprehensive tests for the notification system including WebSocket testing",
          expectedFiles: ["tests/notifications/websocket.test.ts", "tests/notifications/service.test.ts"]
        },
        {
          agent: "performance",
          comment: "@claude optimize the notification system for high throughput and low latency",
          expectedFiles: ["src/notifications/optimized-handler.ts", "performance/notification-benchmarks.md"]
        },
        {
          agent: "documentation",
          comment: "@claude document the notification system API and WebSocket events",
          expectedFiles: ["docs/notifications/api-reference.md", "docs/notifications/websocket-events.md"]
        }
      ];

      // 3. Execute coordinated workflow
      const sessions: ClaudeSession[] = [];
      const results: ClaudeExecutionResult[] = [];

      for (const request of agentRequests) {
        const comment = createMockComment({
          body: request.comment,
          issue: complexFeature
        });

        const mockResult: ClaudeExecutionResult = {
          success: true,
          output: `${request.agent} agent completed successfully`,
          filesModified: request.expectedFiles,
          commits: [{
            hash: `${request.agent}123`,
            message: `${request.agent}: notification system work`,
            author: `Claude ${request.agent} Agent`,
            timestamp: new Date(),
            files: request.expectedFiles
          }],
          duration: 900000,
          exitCode: 0
        };

        vi.mocked(claudeExecutor.execute).mockResolvedValueOnce(mockResult);

        const session = await sessionManager.createSession(complexFeature, comment);
        sessions.push(session);

        const result = await sessionManager.startSession(session.id, complexFeature, comment);
        results.push(result);
      }

      // 4. Verify coordinated execution
      expect(sessions).toHaveLength(5);
      expect(results.every(r => r.success)).toBe(true);

      // Verify each agent type produced expected artifacts
      const allFiles = results.flatMap(r => r.filesModified);
      expect(allFiles.some(f => f.includes("analysis/"))).toBe(true);
      expect(allFiles.some(f => f.includes("src/notifications/"))).toBe(true);
      expect(allFiles.some(f => f.includes("tests/"))).toBe(true);
      expect(allFiles.some(f => f.includes("performance/"))).toBe(true);
      expect(allFiles.some(f => f.includes("docs/"))).toBe(true);

      // 5. Verify session management handled multiple concurrent agents
      const sessionStats = await sessionManager.getStats();
      expect(sessionStats.completed).toBeGreaterThanOrEqual(5);
    });
  });
});