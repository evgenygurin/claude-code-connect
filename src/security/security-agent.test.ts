/**
 * Tests for SecurityAgent
 * Security agent and event handling tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SecurityAgent, SecuritySeverity, SecurityEventType } from "./security-agent.js";
import { setupTestEnvironment, standardBeforeEach, standardAfterEach } from "../testing/test-utils.js";

// Setup test environment
const testEnv = setupTestEnvironment();

describe("SecurityAgent", () => {
  let securityAgent: SecurityAgent;

  beforeEach(
    standardBeforeEach(() => {
      securityAgent = new SecurityAgent(testEnv.config, testEnv.logger);
    }),
  );

  afterEach(standardAfterEach());

  describe("instantiation", () => {
    it("should create instance with default options", () => {
      const agent = new SecurityAgent(testEnv.config, testEnv.logger);
      expect(agent).toBeInstanceOf(SecurityAgent);
    });

    it("should create instance with custom options", () => {
      const agent = new SecurityAgent(testEnv.config, testEnv.logger, {
        enableWebhookSignatureValidation: true,
        enableRateLimiting: true,
        enableInputSanitization: true,
        enableAuditLogging: true,
        maxSessionDuration: 30 * 60 * 1000, // 30 minutes
        maxConcurrentSessions: 5,
      });
      expect(agent).toBeInstanceOf(SecurityAgent);
    });
  });

  describe("logSecurityEvent", () => {
    it("should log security events", async () => {
      const event = {
        type: SecurityEventType.AUTHENTICATION_FAILURE,
        severity: SecuritySeverity.HIGH,
        source: "test",
        message: "Test security event",
        details: { test: "data" },
      };

      await securityAgent.logSecurityEvent(event);

      expect(testEnv.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Security event"),
        expect.objectContaining({
          type: SecurityEventType.AUTHENTICATION_FAILURE,
          severity: SecuritySeverity.HIGH,
        }),
      );
    });

    it("should store security events", async () => {
      const event = {
        type: SecurityEventType.AUTHENTICATION_FAILURE,
        severity: SecuritySeverity.HIGH,
        source: "test",
        message: "Test security event",
      };

      await securityAgent.logSecurityEvent(event);
      
      const events = await securityAgent.getSecurityEvents();
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe(SecurityEventType.AUTHENTICATION_FAILURE);
    });

    it("should handle critical events", async () => {
      const event = {
        type: SecurityEventType.COMMAND_INJECTION_ATTEMPT,
        severity: SecuritySeverity.CRITICAL,
        source: "test",
        message: "Critical security event",
      };

      await securityAgent.logSecurityEvent(event);

      expect(testEnv.logger.error).toHaveBeenCalled();
    });
  });

  describe("validateWebhook", () => {
    it("should validate webhook with valid signature", async () => {
      // Mock config with webhook secret
      testEnv.config.webhookSecret = "test-secret";
      securityAgent = new SecurityAgent(testEnv.config, testEnv.logger);

      // Create a real signature using Node.js crypto
      const payload = '{"test":"data"}';
      const crypto = require("crypto");
      const signature = "sha256=" + crypto
        .createHmac("sha256", "test-secret")
        .update(payload)
        .digest("hex");

      const result = await securityAgent.validateWebhook(
        payload,
        signature,
        "127.0.0.1",
        "test-user-agent"
      );

      expect(result.valid).toBe(true);
    });

    it("should reject webhook with invalid signature", async () => {
      // Mock config with webhook secret
      testEnv.config.webhookSecret = "test-secret";
      securityAgent = new SecurityAgent(testEnv.config, testEnv.logger);

      const payload = '{"test":"data"}';
      const invalidSignature = "sha256=invalid-signature";

      const result = await securityAgent.validateWebhook(
        payload,
        invalidSignature,
        "127.0.0.1",
        "test-user-agent"
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("signature");
    });

    it("should validate payload size", async () => {
      const largePayload = "a".repeat(10 * 1024 * 1024); // 10MB
      
      const result = await securityAgent.validateWebhook(
        largePayload,
        "signature",
        "127.0.0.1",
        "test-user-agent"
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("payload");
    });

    it("should handle rate limiting", async () => {
      // Configure agent with rate limiting
      securityAgent = new SecurityAgent(testEnv.config, testEnv.logger, {
        enableRateLimiting: true,
        rateLimitConfig: {
          windowMs: 1000, // 1 second
          maxRequests: 1,
          skipSuccessfulRequests: false,
          skipFailedRequests: false,
        },
      });

      // First request should pass
      const firstResult = await securityAgent.validateWebhook(
        '{"test":"data"}',
        "signature",
        "127.0.0.1",
        "test-user-agent"
      );

      // Second request should be rate limited
      const secondResult = await securityAgent.validateWebhook(
        '{"test":"data"}',
        "signature",
        "127.0.0.1",
        "test-user-agent"
      );

      expect(firstResult.valid).toBe(true);
      expect(secondResult.valid).toBe(false);
      expect(secondResult.reason).toContain("Rate limit");
    });
  });

  describe("validateSession", () => {
    it("should validate valid session", async () => {
      const session = {
        id: "session-123",
        startedAt: new Date(Date.now() - 1000 * 60), // 1 minute ago
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
        status: "active",
        userId: "user-123",
        metadata: {},
      };

      const result = await securityAgent.validateSession(session);

      expect(result.valid).toBe(true);
    });

    it("should reject expired session", async () => {
      const session = {
        id: "session-123",
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        expiresAt: new Date(Date.now() - 1000 * 60), // 1 minute ago
        status: "expired",
        userId: "user-123",
        metadata: {},
      };

      const result = await securityAgent.validateSession(session);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("expired");
    });

    it("should reject session exceeding max duration", async () => {
      // Configure agent with short max session duration
      securityAgent = new SecurityAgent(testEnv.config, testEnv.logger, {
        maxSessionDuration: 1000 * 60 * 30, // 30 minutes
      });

      const session = {
        id: "session-123",
        startedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
        status: "active",
        userId: "user-123",
        metadata: {},
      };

      const result = await securityAgent.validateSession(session);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("duration");
    });
  });

  describe("getSecurityEvents", () => {
    it("should return security events", async () => {
      // Log some events
      await securityAgent.logSecurityEvent({
        type: SecurityEventType.AUTHENTICATION_FAILURE,
        severity: SecuritySeverity.HIGH,
        source: "test",
        message: "Test event 1",
      });

      await securityAgent.logSecurityEvent({
        type: SecurityEventType.WEBHOOK_SIGNATURE_INVALID,
        severity: SecuritySeverity.MEDIUM,
        source: "test",
        message: "Test event 2",
      });

      const events = await securityAgent.getSecurityEvents();
      
      expect(events.length).toBe(2);
      expect(events[0].type).toBe(SecurityEventType.AUTHENTICATION_FAILURE);
      expect(events[1].type).toBe(SecurityEventType.WEBHOOK_SIGNATURE_INVALID);
    });

    it("should filter events by type", async () => {
      // Log some events
      await securityAgent.logSecurityEvent({
        type: SecurityEventType.AUTHENTICATION_FAILURE,
        severity: SecuritySeverity.HIGH,
        source: "test",
        message: "Auth failure",
      });

      await securityAgent.logSecurityEvent({
        type: SecurityEventType.WEBHOOK_SIGNATURE_INVALID,
        severity: SecuritySeverity.MEDIUM,
        source: "test",
        message: "Signature invalid",
      });

      const events = await securityAgent.getSecurityEvents({
        type: SecurityEventType.AUTHENTICATION_FAILURE,
      });
      
      expect(events.length).toBe(1);
      expect(events[0].type).toBe(SecurityEventType.AUTHENTICATION_FAILURE);
    });

    it("should filter events by severity", async () => {
      // Log some events
      await securityAgent.logSecurityEvent({
        type: SecurityEventType.AUTHENTICATION_FAILURE,
        severity: SecuritySeverity.HIGH,
        source: "test",
        message: "High severity",
      });

      await securityAgent.logSecurityEvent({
        type: SecurityEventType.WEBHOOK_SIGNATURE_INVALID,
        severity: SecuritySeverity.MEDIUM,
        source: "test",
        message: "Medium severity",
      });

      const events = await securityAgent.getSecurityEvents({
        severity: SecuritySeverity.HIGH,
      });
      
      expect(events.length).toBe(1);
      expect(events[0].severity).toBe(SecuritySeverity.HIGH);
    });
  });
});

