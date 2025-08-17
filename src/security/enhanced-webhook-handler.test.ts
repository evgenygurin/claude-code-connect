/**
 * Tests for EnhancedLinearWebhookHandler
 * Enhanced security webhook handler tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Note: crypto module is NOT mocked - using real crypto for signature verification tests
import { EnhancedLinearWebhookHandler } from "./enhanced-webhook-handler.js";
import { SecurityAgent } from "./security-agent.js";
import { SecurityMonitor } from "./monitoring.js";
import { LinearEventTypeValues } from "../core/types.js";
import {
  mockWebhookEventIssueCreated,
  mockWebhookEventIssueAssigned,
  mockWebhookEventCommentMention,
  mockWebhookEventCommentNoMention,
  mockWebhookSignature,
  mockWebhookPayloadString,
  createMockWebhookEvent,
  createMockIssue,
  createMockComment,
  mockIssue,
  mockUser,
  mockAgentUser,
  mockIssueAssignedToAgent,
  mockComment,
} from "../testing/mocks.js";

import {
  setupTestEnvironment,
  standardBeforeEach,
  standardAfterEach,
} from "../testing/test-utils.js";

// Setup test environment
const testEnv = setupTestEnvironment();

describe("EnhancedLinearWebhookHandler", () => {
  let webhookHandler: EnhancedLinearWebhookHandler;
  let securityAgent: SecurityAgent;
  let securityMonitor: SecurityMonitor;

  beforeEach(
    standardBeforeEach(() => {
      securityAgent = new SecurityAgent(testEnv.config, testEnv.logger);
      securityMonitor = new SecurityMonitor(testEnv.config, testEnv.logger, securityAgent);
      webhookHandler = new EnhancedLinearWebhookHandler(
        testEnv.config, 
        testEnv.logger,
        securityAgent,
        securityMonitor
      );
    }),
  );

  afterEach(standardAfterEach());

  describe("instantiation", () => {
    it("should create instance with valid config and logger", () => {
      const handler = new EnhancedLinearWebhookHandler(
        testEnv.config, 
        testEnv.logger,
        securityAgent,
        securityMonitor
      );
      expect(handler).toBeInstanceOf(EnhancedLinearWebhookHandler);
    });

    it("should create instance without explicit security components", () => {
      const handler = new EnhancedLinearWebhookHandler(
        testEnv.config, 
        testEnv.logger
      );
      expect(handler).toBeInstanceOf(EnhancedLinearWebhookHandler);
    });
  });

  describe("validateWebhook", () => {
    it("should validate correct webhook payload", async () => {
      const result = await webhookHandler.validateWebhook(
        mockWebhookEventIssueCreated,
        "valid-signature",
        "127.0.0.1",
        "test-user-agent"
      );

      expect(result).toBeDefined();
      expect(result?.action).toBe("create");
      expect(result?.type).toBe("Issue");
      expect(result?.organizationId).toBe("test-org-id");
    });

    it("should log successful validation", async () => {
      await webhookHandler.validateWebhook(
        mockWebhookEventIssueCreated,
        "valid-signature",
        "127.0.0.1",
        "test-user-agent"
      );

      expect(testEnv.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Webhook validation successful"),
        expect.any(Object)
      );
    });

    it("should return null for invalid payload", async () => {
      const invalidPayload = {
        action: "invalid-action", // Invalid enum value
        type: "Issue",
        // Missing required fields
      };

      const result = await webhookHandler.validateWebhook(
        invalidPayload,
        "valid-signature",
        "127.0.0.1",
        "test-user-agent"
      );

      expect(result).toBeNull();
      expect(testEnv.logger.error).toHaveBeenCalled();
    });

    it("should handle null payload", async () => {
      const result = await webhookHandler.validateWebhook(
        null,
        "valid-signature",
        "127.0.0.1",
        "test-user-agent"
      );

      expect(result).toBeNull();
      expect(testEnv.logger.error).toHaveBeenCalled();
    });

    it("should validate webhook with minimal required fields", async () => {
      const minimalPayload = {
        action: "create",
        actor: {
          id: "user-123",
          name: "Test User",
        },
        type: "Issue",
        data: {},
        organizationId: "test-org-id",
        webhookId: "webhook-123",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = await webhookHandler.validateWebhook(
        minimalPayload,
        "valid-signature",
        "127.0.0.1",
        "test-user-agent"
      );

      expect(result).toBeDefined();
      expect(result?.action).toBe("create");
    });
  });

  describe("processWebhook", () => {
    it("should process valid webhook event", async () => {
      const result = await webhookHandler.processWebhook(
        mockWebhookEventIssueAssigned,
      );

      expect(result).toBeDefined();
      expect(result?.type).toBe(LinearEventTypeValues.ISSUE_UPDATE);
      expect(result?.action).toBe("update");
      expect(result?.issue.id).toBe(mockIssueAssignedToAgent.id);
    });

    it("should log webhook processing start", async () => {
      await webhookHandler.processWebhook(mockWebhookEventIssueCreated);

      expect(testEnv.logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Processing webhook event"),
        expect.any(Object)
      );
    });

    it("should ignore events from different organizations", async () => {
      const differentOrgEvent = createMockWebhookEvent({
        organizationId: "different-org-id",
      });

      const result = await webhookHandler.processWebhook(differentOrgEvent);

      expect(result).toBeNull();
      expect(testEnv.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Ignoring event from different organization"),
        expect.any(Object)
      );
    });

    it("should handle Issue events", async () => {
      const result = await webhookHandler.processWebhook(
        mockWebhookEventIssueCreated,
      );

      expect(result).toBeDefined();
      expect(result?.type).toBe(LinearEventTypeValues.ISSUE_UPDATE);
    });

    it("should handle Comment events", async () => {
      const result = await webhookHandler.processWebhook(
        mockWebhookEventCommentMention,
      );

      expect(result).toBeDefined();
      expect(result?.type).toBe(LinearEventTypeValues.COMMENT_CREATE);
    });

    it("should ignore unhandled event types", async () => {
      const unknownEvent = createMockWebhookEvent({
        type: "UnknownEventType",
      });

      const result = await webhookHandler.processWebhook(unknownEvent);

      expect(result).toBeNull();
      expect(testEnv.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Unhandled event type"),
        expect.any(Object)
      );
    });
  });

  describe("security features", () => {
    it("should validate payload size", async () => {
      // Create a very large payload
      const largePayload = {
        ...mockWebhookEventIssueCreated,
        data: {
          ...mockWebhookEventIssueCreated.data,
          description: "a".repeat(1000000) // 1MB of data
        }
      };

      const result = await webhookHandler.validateWebhook(
        largePayload,
        "valid-signature",
        "127.0.0.1",
        "test-user-agent"
      );

      expect(result).toBeNull();
      expect(testEnv.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("payload"),
        expect.any(Object)
      );
    });

    it("should sanitize input data", async () => {
      // Create payload with potentially dangerous content
      const maliciousPayload = {
        ...mockWebhookEventIssueCreated,
        actor: {
          ...mockWebhookEventIssueCreated.actor,
          name: "<script>alert('XSS')</script>"
        }
      };

      const result = await webhookHandler.validateWebhook(
        maliciousPayload,
        "valid-signature",
        "127.0.0.1",
        "test-user-agent"
      );

      expect(result).toBeNull();
      expect(testEnv.logger.warn).toHaveBeenCalled();
    });

    it("should log security events", async () => {
      // Mock securityAgent.logSecurityEvent
      const logSecurityEventSpy = vi.spyOn(securityAgent, 'logSecurityEvent');
      
      await webhookHandler.validateWebhook(
        mockWebhookEventIssueCreated,
        "valid-signature",
        "127.0.0.1",
        "test-user-agent"
      );

      expect(logSecurityEventSpy).toHaveBeenCalled();
    });
  });
});

