/**
 * Integration tests for security components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "path";
import { tmpdir } from "os";
import { promises as fs } from "fs";
import { v4 as uuidv4 } from "uuid";
import { SecurityValidator, SecurityUtils } from "../security/validators.js";
import { SecurityAgent, SecuritySeverity, SecurityEventType } from "../security/security-agent.js";
import { SecurityMonitor } from "../security/monitoring.js";
import { EnhancedLinearWebhookHandler } from "../security/enhanced-webhook-handler.js";
import { IntegrationServer } from "../server/integration.js";
import { createLogger } from "../utils/logger.js";
import { setupTestEnvironment, standardBeforeEach, standardAfterEach } from "./test-utils.js";

// Setup test environment
const testEnv = setupTestEnvironment();

describe("Security Integration Tests", () => {
  let securityValidator: SecurityValidator;
  let securityAgent: SecurityAgent;
  let securityMonitor: SecurityMonitor;
  let webhookHandler: EnhancedLinearWebhookHandler;
  let tempDir: string;
  
  beforeEach(
    standardBeforeEach(async () => {
      // Create temporary directory for tests
      tempDir = join(tmpdir(), `security-integration-${uuidv4()}`);
      await fs.mkdir(tempDir, { recursive: true });
      
      // Initialize security components
      securityValidator = new SecurityValidator({
        maxPathDepth: 10,
        blockedCommands: ["rm", "rmdir", "del", "deltree"],
        blockedPaths: ["/etc", "/var", "/usr"],
        maxPayloadSize: 5 * 1024 * 1024 // 5MB
      });
      
      securityAgent = new SecurityAgent(testEnv.config, testEnv.logger, {
        enableWebhookSignatureValidation: true,
        enableRateLimiting: true,
        enableInputSanitization: true,
        enableAuditLogging: true,
        maxSessionDuration: 60 * 60 * 1000, // 1 hour
        maxConcurrentSessions: 10
      });
      
      securityMonitor = new SecurityMonitor(testEnv.config, testEnv.logger, securityAgent, {
        enableRealTimeAlerts: true,
        enableMetricsCollection: true,
        metricsRetentionDays: 30,
        thresholds: {
          maxFailedAuthPerMinute: 5,
          maxCriticalEventsPerHour: 3,
          maxSessionDurationMinutes: 60,
          maxConcurrentSessions: 10,
          maxMemoryUsageMB: 1024,
          maxCpuUsagePercent: 80
        }
      });

      const mockLinearClient = {
        getIssue: vi.fn().mockResolvedValue(null),
      };

      webhookHandler = new EnhancedLinearWebhookHandler(
        testEnv.config,
        testEnv.logger,
        mockLinearClient as any,
        securityAgent,
        securityMonitor
      );

      // Start security monitoring
      await securityMonitor.startMonitoring();
    }),
  );
  
  afterEach(
    standardAfterEach(async () => {
      // Stop security monitoring
      await securityMonitor.stopMonitoring();
      
      // Clean up temporary directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.error("Failed to clean up temp directory", error);
        throw new Error(`Test cleanup failed: ${(error as Error).message}`);
      }
    }),
  );
  
  describe("End-to-End Security Flow", () => {
    it("should validate and process webhook with security checks", async () => {
      // Create mock webhook payload
      const webhookPayload = {
        action: "create",
        type: "Issue",
        data: {
          id: "test-issue-123",
          title: "Test Issue",
          description: "Test description",
          creator: {
            id: "user-123",
            name: "Test User"
          }
        },
        organizationId: testEnv.config.linearOrganizationId,
        webhookId: "webhook-123",
        createdAt: new Date().toISOString(),
        actor: {
          id: "user-123",
          name: "Test User"
        }
      };
      
      // Generate mock signature
      const payloadString = JSON.stringify(webhookPayload);
      const signature = "mock-signature";
      const sourceIp = "127.0.0.1";
      const userAgent = "test-user-agent";
      
      // Mock security agent validateWebhook to return valid result
      const validateWebhookSpy = vi.spyOn(securityAgent, 'validateWebhook');
      validateWebhookSpy.mockResolvedValue({ valid: true });
      
      // Mock security agent logSecurityEvent
      const logSecurityEventSpy = vi.spyOn(securityAgent, 'logSecurityEvent');
      logSecurityEventSpy.mockResolvedValue(undefined);
      
      // Process webhook through handler
      const validatedEvent = await webhookHandler.validateWebhook(
        webhookPayload,
        signature,
        sourceIp,
        userAgent
      );
      
      // Verify webhook validation
      expect(validatedEvent).toBeDefined();
      expect(validateWebhookSpy).toHaveBeenCalledWith(
        expect.any(String),
        signature,
        sourceIp,
        userAgent
      );
      
      // Process webhook
      const processedEvent = await webhookHandler.processWebhook(webhookPayload);
      
      // Verify webhook processing
      expect(processedEvent).toBeDefined();
      expect(processedEvent?.type).toBe("issue_update");
      
      // Verify security event logging
      expect(logSecurityEventSpy).toHaveBeenCalled();
      
      // Get security metrics
      const metrics = await securityMonitor.getMetrics();
      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics)).toBe(true);
    });
    
    it("should detect and block malicious webhook payloads", async () => {
      // Create oversized webhook payload
      const largeString = "a".repeat(10 * 1024 * 1024); // 10MB
      const largePayload = {
        action: "create",
        type: "Issue",
        data: {
          id: "test-issue-123",
          title: "Test Issue",
          description: largeString
        },
        organizationId: testEnv.config.linearOrganizationId
      };
      
      // Mock security agent validateWebhook to return invalid result
      const validateWebhookSpy = vi.spyOn(securityAgent, 'validateWebhook');
      validateWebhookSpy.mockResolvedValue({ 
        valid: false, 
        reason: "Payload too large",
        severity: SecuritySeverity.MEDIUM
      });
      
      // Mock security agent logSecurityEvent
      const logSecurityEventSpy = vi.spyOn(securityAgent, 'logSecurityEvent');
      logSecurityEventSpy.mockResolvedValue(undefined);
      
      // Process webhook through handler
      const validatedEvent = await webhookHandler.validateWebhook(
        largePayload,
        "mock-signature",
        "127.0.0.1",
        "test-user-agent"
      );
      
      // Verify webhook validation
      expect(validatedEvent).toBeNull();
      expect(validateWebhookSpy).toHaveBeenCalled();
      
      // Verify security event logging
      expect(logSecurityEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: expect.any(String),
          message: expect.stringContaining("validation failed")
        })
      );
    });
    
    it("should validate session IDs correctly", async () => {
      // Valid session ID
      const validSessionId = "session_" + uuidv4().replace(/-/g, "");
      expect(SecurityUtils.isValidSessionId(validSessionId)).toBe(true);
      
      // Invalid session IDs
      expect(SecurityUtils.isValidSessionId("")).toBe(false);
      expect(SecurityUtils.isValidSessionId("invalid-id")).toBe(false);
      expect(SecurityUtils.isValidSessionId("<script>alert(1)</script>")).toBe(false);
      expect(SecurityUtils.isValidSessionId("../../../etc/passwd")).toBe(false);
    });
    
    it("should validate commands and paths correctly", async () => {
      // Valid commands
      expect(securityValidator.validateCommand("git status").valid).toBe(true);
      expect(securityValidator.validateCommand("ls -la").valid).toBe(true);
      
      // Invalid commands
      expect(securityValidator.validateCommand("rm -rf /").valid).toBe(false);
      expect(securityValidator.validateCommand("sudo rm -rf /").valid).toBe(false);
      
      // Valid paths
      expect(securityValidator.validatePath("./src/app.js").valid).toBe(true);
      expect(securityValidator.validatePath("/home/user/project/src/app.js").valid).toBe(true);
      
      // Invalid paths
      expect(securityValidator.validatePath("/etc/passwd").valid).toBe(false);
      expect(securityValidator.validatePath("../../../etc/passwd").valid).toBe(false);
    });
    
    it("should integrate with IntegrationServer correctly", async () => {
      // Create test config
      const testConfig = {
        ...testEnv.config,
        projectRootDir: tempDir,
        webhookPort: 3099,
        linearApiToken: "test-token",
        linearOrganizationId: "test-org-id",
        webhookSecret: "test-secret",
        debug: true
      };
      
      // Create logger
      const logger = createLogger(true);
      
      // Mock LinearClient
      vi.mock("../linear/client.js", () => ({
        LinearClient: vi.fn().mockImplementation(() => ({
          getCurrentUser: vi.fn().mockResolvedValue({
            id: "user-123",
            name: "Test User"
          })
        }))
      }));
      
      // Create server instance
      const server = new IntegrationServer(testConfig);
      
      // Mock server.app.listen to prevent actual server start
      server.app = {
        ...server.app,
        listen: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined)
      } as any;
      
      // Start server
      await server.start();
      
      // Verify server started
      expect(server.getInfo().isStarted).toBe(true);
      
      // Stop server
      await server.stop();
      
      // Verify server stopped
      expect(server.getInfo().isStarted).toBe(false);
    });
  });
});
