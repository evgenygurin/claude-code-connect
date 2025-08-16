/**
 * Tests for LinearWebhookHandler
 * Generated and enhanced by TestingAgent
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LinearWebhookHandler } from "./handler.js";
import { LinearEventType } from "../core/types.js";
import type { IntegrationConfig, Logger, LinearWebhookEvent, ProcessedEvent } from "../core/types.js";
import type { Issue, Comment, User } from "@linear/sdk";
import {
  mockIntegrationConfig,
  mockLogger,
  mockUser,
  mockAgentUser,
  mockIssue,
  mockIssueAssignedToAgent,
  mockComment,
  mockCommentNoMention,
  mockWebhookEventIssueCreated,
  mockWebhookEventIssueAssigned,
  mockWebhookEventCommentMention,
  mockWebhookEventCommentNoMention,
  mockWebhookSignature,
  mockWebhookPayloadString,
  createMockWebhookEvent,
  createMockIssue,
  createMockComment,
  createMockLogger
} from "../testing/mocks.js";

import { 
  setupTestEnvironment,
  standardBeforeEach,
  standardAfterEach 
} from "../testing/test-utils.js";

// Setup test environment with crypto mock
const testEnv = setupTestEnvironment({ needsCryptoMock: true });

describe("LinearWebhookHandler", () => {
  let webhookHandler: LinearWebhookHandler;

  beforeEach(standardBeforeEach(() => {
    webhookHandler = new LinearWebhookHandler(testEnv.config, testEnv.logger);
  }));

  afterEach(standardAfterEach());

  describe("instantiation", () => {
    it("should create instance with valid config and logger", () => {
      const handler = new LinearWebhookHandler(testEnv.config, testEnv.logger);
      expect(handler).toBeInstanceOf(LinearWebhookHandler);
    });
  });

  describe("validateWebhook", () => {
    it("should validate correct webhook payload", () => {
      const result = webhookHandler.validateWebhook(mockWebhookEventIssueCreated);

      expect(result).toBeDefined();
      expect(result?.action).toBe("create");
      expect(result?.type).toBe("Issue");
      expect(result?.organizationId).toBe("org-test-123");
    });

    it("should log successful validation", () => {
      webhookHandler.validateWebhook(mockWebhookEventIssueCreated);

      expect(testEnv.logger.debug).toHaveBeenCalledWith("Webhook validation successful", {
        type: "Issue",
        action: "create",
        organizationId: "org-test-123"
      });
    });

    it("should return null for invalid payload", () => {
      const invalidPayload = {
        action: "invalid-action", // Invalid enum value
        type: "Issue"
        // Missing required fields
      };

      const result = webhookHandler.validateWebhook(invalidPayload);

      expect(result).toBeNull();
      expect(testEnv.logger.error).toHaveBeenCalledWith(
        "Webhook validation failed",
        expect.any(Error),
        { payload: invalidPayload }
      );
    });

    it("should handle null payload", () => {
      const result = webhookHandler.validateWebhook(null);

      expect(result).toBeNull();
      expect(testEnv.logger.error).toHaveBeenCalled();
    });

    it("should handle undefined payload", () => {
      const result = webhookHandler.validateWebhook(undefined);

      expect(result).toBeNull();
      expect(testEnv.logger.error).toHaveBeenCalled();
    });

    it("should validate webhook with minimal required fields", () => {
      const minimalPayload = {
        action: "create",
        actor: {
          id: "user-123",
          name: "Test User"
        },
        type: "Issue",
        data: {},
        organizationId: "org-test-123",
        webhookId: "webhook-123",
        createdAt: "2024-01-01T00:00:00Z"
      };

      const result = webhookHandler.validateWebhook(minimalPayload);

      expect(result).toBeDefined();
      expect(result?.action).toBe("create");
    });
  });

  describe("processWebhook", () => {
    it("should process valid webhook event", async () => {
      const result = await webhookHandler.processWebhook(mockWebhookEventIssueAssigned);

      expect(result).toBeDefined();
      expect(result?.type).toBe(LinearEventType.ISSUE_UPDATE);
      expect(result?.action).toBe("update");
      expect(result?.issue.id).toBe(mockIssueAssignedToAgent.id);
    });

    it("should log webhook processing start", async () => {
      await webhookHandler.processWebhook(mockWebhookEventIssueCreated);

      expect(testEnv.logger.info).toHaveBeenCalledWith("Processing webhook event", {
        type: "Issue",
        action: "create",
        organizationId: "org-test-123"
      });
    });

    it("should ignore events from different organizations", async () => {
      const differentOrgEvent = createMockWebhookEvent({
        organizationId: "different-org-id"
      });

      const result = await webhookHandler.processWebhook(differentOrgEvent);

      expect(result).toBeNull();
      expect(testEnv.logger.debug).toHaveBeenCalledWith("Ignoring event from different organization", {
        eventOrg: "different-org-id",
        configOrg: testEnv.config.linearOrganizationId
      });
    });

    it("should handle Issue events", async () => {
      const result = await webhookHandler.processWebhook(mockWebhookEventIssueCreated);

      expect(result).toBeDefined();
      expect(result?.type).toBe(LinearEventType.ISSUE_UPDATE);
    });

    it("should handle Comment events", async () => {
      const result = await webhookHandler.processWebhook(mockWebhookEventCommentMention);

      expect(result).toBeDefined();
      expect(result?.type).toBe(LinearEventType.COMMENT_CREATE);
    });

    it("should ignore unhandled event types", async () => {
      const unknownEvent = createMockWebhookEvent({
        type: "UnknownEventType"
      });

      const result = await webhookHandler.processWebhook(unknownEvent);

      expect(result).toBeNull();
      expect(testEnv.logger.debug).toHaveBeenCalledWith("Unhandled event type", {
        type: "UnknownEventType"
      });
    });

    it("should handle processing errors gracefully", async () => {
      const malformedEvent = createMockWebhookEvent({
        data: "invalid-data-format" // Should be an object
      });

      const result = await webhookHandler.processWebhook(malformedEvent);

      expect(result).toBeNull();
      expect(testEnv.logger.error).toHaveBeenCalledWith(
        "Failed to process webhook event",
        expect.any(Error),
        {
          type: malformedEvent.type,
          action: malformedEvent.action
        }
      );
    });
  });

  describe("processIssueEvent", () => {
    it("should process issue creation event", async () => {
      const result = await webhookHandler.processWebhook(mockWebhookEventIssueCreated);

      expect(result).toBeDefined();
      expect(result?.type).toBe(LinearEventType.ISSUE_UPDATE);
      expect(result?.action).toBe("create");
      expect(result?.issue.id).toBe(mockIssue.id);
      expect(result?.actor.id).toBe(mockUser.id);
      expect(result?.timestamp).toBeInstanceOf(Date);
    });

    it("should trigger on issue assignment to agent", async () => {
      const result = await webhookHandler.processWebhook(mockWebhookEventIssueAssigned);

      expect(result).toBeDefined();
      expect(result?.shouldTrigger).toBe(true);
      expect(result?.triggerReason).toBe("Issue assigned to agent");
    });

    it("should not trigger on self-generated events", async () => {
      const selfTriggeredEvent = createMockWebhookEvent({
        actor: mockAgentUser,
        data: mockIssueAssignedToAgent
      });

      const result = await webhookHandler.processWebhook(selfTriggeredEvent);

      expect(result).toBeDefined();
      expect(result?.shouldTrigger).toBe(false);
      expect(result?.triggerReason).toBe("Self-triggered event");
    });

    it("should trigger on issue creation with agent mention", async () => {
      const issueWithMention = createMockIssue({
        description: "Please @claude help implement this feature"
      });
      const eventWithMention = createMockWebhookEvent({
        action: "create",
        data: issueWithMention
      });

      const result = await webhookHandler.processWebhook(eventWithMention);

      expect(result).toBeDefined();
      expect(result?.shouldTrigger).toBe(true);
      expect(result?.triggerReason).toBe("Issue created with agent mention");
    });

    it("should not trigger when no trigger conditions are met", async () => {
      const normalIssue = createMockIssue({
        assignee: undefined,
        description: "Just a regular issue without agent involvement"
      });
      const normalEvent = createMockWebhookEvent({
        action: "update",
        data: normalIssue
      });

      const result = await webhookHandler.processWebhook(normalEvent);

      expect(result).toBeDefined();
      expect(result?.shouldTrigger).toBe(false);
      expect(result?.triggerReason).toBe("No trigger condition met");
    });

    it("should log issue event processing", async () => {
      await webhookHandler.processWebhook(mockWebhookEventIssueCreated);

      expect(testEnv.logger.debug).toHaveBeenCalledWith("Issue event processed", expect.objectContaining({
        issueId: mockIssue.id,
        identifier: mockIssue.identifier,
        action: "create"
      }));
    });
  });

  describe("processCommentEvent", () => {
    it("should process comment creation event", async () => {
      const result = await webhookHandler.processWebhook(mockWebhookEventCommentMention);

      expect(result).toBeDefined();
      expect(result?.type).toBe(LinearEventType.COMMENT_CREATE);
      expect(result?.action).toBe("create");
      expect(result?.comment?.id).toBe(mockComment.id);
      expect(result?.issue.id).toBe(mockIssue.id);
    });

    it("should trigger on comment with agent mention", async () => {
      const result = await webhookHandler.processWebhook(mockWebhookEventCommentMention);

      expect(result).toBeDefined();
      expect(result?.shouldTrigger).toBe(true);
      expect(result?.triggerReason).toBe("Comment mentions agent");
    });

    it("should not trigger on comment without agent mention", async () => {
      const result = await webhookHandler.processWebhook(mockWebhookEventCommentNoMention);

      expect(result).toBeDefined();
      expect(result?.shouldTrigger).toBe(false);
      expect(result?.triggerReason).toBe("No agent mention found");
    });

    it("should not trigger on self-created comments", async () => {
      const selfCommentEvent = createMockWebhookEvent({
        type: "Comment",
        actor: mockAgentUser,
        data: mockComment
      });

      const result = await webhookHandler.processWebhook(selfCommentEvent);

      expect(result).toBeDefined();
      expect(result?.shouldTrigger).toBe(false);
      expect(result?.triggerReason).toBe("Self-created comment");
    });

    it("should not trigger on comment removal", async () => {
      const removeEvent = createMockWebhookEvent({
        type: "Comment",
        action: "remove",
        data: mockComment
      });

      const result = await webhookHandler.processWebhook(removeEvent);

      expect(result).toBeDefined();
      expect(result?.shouldTrigger).toBe(false);
      expect(result?.triggerReason).toBe("Not a create or update action");
    });

    it("should log comment event processing", async () => {
      await webhookHandler.processWebhook(mockWebhookEventCommentMention);

      expect(testEnv.logger.debug).toHaveBeenCalledWith("Comment event processed", expect.objectContaining({
        commentId: mockComment.id,
        issueId: mockIssue.id,
        issueIdentifier: mockIssue.identifier,
        action: "create"
      }));
    });
  });

  describe("containsAgentMention", () => {
    const testCases = [
      { text: "@claude please help", expected: true, description: "direct @claude mention" },
      { text: "Hey @agent can you fix this?", expected: true, description: "@agent mention" },
      { text: "Claude, implement this feature", expected: true, description: "claude name mention" },
      { text: "Can the AI assistant help here?", expected: true, description: "ai assistant mention" },
      { text: "Please help with this task", expected: true, description: "help with mention" },
      { text: "Need to implement this feature", expected: true, description: "implement mention" },
      { text: "Fix this bug please", expected: true, description: "fix this mention" },
      { text: "Let's work on this together", expected: true, description: "work on mention" },
      { text: "Just a regular comment", expected: false, description: "no mention" },
      { text: "Update the documentation", expected: false, description: "regular instruction" }
    ];

    testCases.forEach(({ text, expected, description }) => {
      it(`should ${expected ? "detect" : "not detect"} agent mention in: ${description}`, async () => {
        const comment = createMockComment({ body: text });
        const event = createMockWebhookEvent({
          type: "Comment",
          data: comment
        });

        const result = await webhookHandler.processWebhook(event);

        expect(result?.shouldTrigger).toBe(expected);
      });
    });

    it("should detect configured agent user ID", async () => {
      testEnv.config.agentUserId = "special-agent-id";
      webhookHandler = new LinearWebhookHandler(testEnv.config, testEnv.logger);

      const comment = createMockComment({ 
        body: "Please have special-agent-id handle this" 
      });
      const event = createMockWebhookEvent({
        type: "Comment",
        data: comment
      });

      const result = await webhookHandler.processWebhook(event);

      expect(result?.shouldTrigger).toBe(true);
    });

    it("should be case insensitive", async () => {
      const comment = createMockComment({ 
        body: "CLAUDE PLEASE HELP WITH THIS" 
      });
      const event = createMockWebhookEvent({
        type: "Comment",
        data: comment
      });

      const result = await webhookHandler.processWebhook(event);

      expect(result?.shouldTrigger).toBe(true);
    });
  });

  describe("verifySignature", () => {
    let crypto: any;

    beforeEach(() => {
      crypto = require("crypto");
    });

    it("should return true when no webhook secret is configured", () => {
      testEnv.config.webhookSecret = undefined;
      webhookHandler = new LinearWebhookHandler(testEnv.config, testEnv.logger);

      const result = webhookHandler.verifySignature("payload", "signature");

      expect(result).toBe(true);
      expect(testEnv.logger.warn).toHaveBeenCalledWith(
        "No webhook secret configured, skipping signature verification"
      );
    });

    it("should verify valid signature", () => {
      testEnv.mockCrypto.timingSafeEqual.mockReturnValue(true);

      const result = webhookHandler.verifySignature(
        mockWebhookPayloadString,
        mockWebhookSignature
      );

      expect(result).toBe(true);
      expect(testEnv.mockCrypto.createHmac).toHaveBeenCalledWith("sha256", testEnv.config.webhookSecret);
    });

    it("should reject invalid signature", () => {
      testEnv.mockCrypto.timingSafeEqual.mockReturnValue(false);

      const result = webhookHandler.verifySignature(
        mockWebhookPayloadString,
        "invalid-signature"
      );

      expect(result).toBe(false);
      expect(testEnv.logger.warn).toHaveBeenCalledWith("Webhook signature verification failed");
    });

    it("should handle signature verification errors", () => {
      testEnv.mockCrypto.createHmac.mockImplementation(() => {
        throw new Error("Crypto error");
      });

      const result = webhookHandler.verifySignature(
        mockWebhookPayloadString,
        mockWebhookSignature
      );

      expect(result).toBe(false);
      expect(testEnv.logger.error).toHaveBeenCalledWith(
        "Webhook signature verification error",
        expect.any(Error)
      );
    });

    it("should strip sha256= prefix from signature", () => {
      testEnv.mockCrypto.timingSafeEqual.mockReturnValue(true);

      webhookHandler.verifySignature(
        mockWebhookPayloadString,
        "sha256=actual-signature-value"
      );

      // The signature should be processed without the sha256= prefix
      expect(crypto.timingSafeEqual).toHaveBeenCalledWith(
        Buffer.from("mocked-signature", "hex"),
        Buffer.from("actual-signature-value", "hex")
      );
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle malformed issue data in webhook", async () => {
      const malformedEvent = createMockWebhookEvent({
        type: "Issue",
        data: {
          id: "issue-123"
          // Missing required fields like identifier, title, etc.
        }
      });

      const result = await webhookHandler.processWebhook(malformedEvent);

      expect(result).toBeNull();
      expect(testEnv.logger.error).toHaveBeenCalled();
    });

    it("should handle malformed comment data in webhook", async () => {
      const malformedEvent = createMockWebhookEvent({
        type: "Comment",
        data: {
          id: "comment-123"
          // Missing required fields like body, user, issue, etc.
        }
      });

      const result = await webhookHandler.processWebhook(malformedEvent);

      expect(result).toBeNull();
      expect(testEnv.logger.error).toHaveBeenCalled();
    });

    it("should handle issues without description", async () => {
      const issueWithoutDescription = createMockIssue({
        description: undefined
      });
      const event = createMockWebhookEvent({
        action: "create",
        data: issueWithoutDescription
      });

      const result = await webhookHandler.processWebhook(event);

      expect(result).toBeDefined();
      expect(result?.shouldTrigger).toBe(false);
      expect(result?.triggerReason).toBe("No trigger condition met");
    });

    it("should handle empty comment body", async () => {
      const emptyComment = createMockComment({
        body: ""
      });
      const event = createMockWebhookEvent({
        type: "Comment",
        data: emptyComment
      });

      const result = await webhookHandler.processWebhook(event);

      expect(result).toBeDefined();
      expect(result?.shouldTrigger).toBe(false);
      expect(result?.triggerReason).toBe("No agent mention found");
    });
  });
});