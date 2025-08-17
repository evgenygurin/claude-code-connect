/**
 * Linear webhook handlers
 */

import { z } from "zod";
import type {
  LinearWebhookEvent,
  ProcessedEvent,
  IntegrationConfig,
  Logger,
} from "../core/types.js";
import { LinearEventType } from "../core/types.js";
import type { Issue, Comment, User } from "@linear/sdk";

/**
 * Webhook validation schema
 */
const WebhookEventSchema = z.object({
  action: z.enum(["create", "update", "remove"]),
  actor: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional(),
    displayName: z.string().optional(),
  }),
  type: z.string(),
  data: z.any(), // Will be validated based on type
  url: z.string().optional(),
  organizationId: z.string(),
  webhookId: z.string(),
  createdAt: z.string(),
});

/**
 * Issue data schema - very flexible to handle both webhook payloads and SDK objects
 */
const IssueSchema = z.any().refine(
  (data) => {
    return (
      data &&
      typeof data === "object" &&
      data.id &&
      data.identifier &&
      data.title
    );
  },
  {
    message: "Issue must have id, identifier, and title",
  },
);

/**
 * Comment data schema - very flexible to handle both webhook payloads and SDK objects
 */
const CommentSchema = z.any().refine(
  (data) => {
    return (
      data && typeof data === "object" && data.id && data.body && data.user
    );
  },
  {
    message: "Comment must have id, body, and user",
  },
);

/**
 * Linear webhook handler
 */
export class LinearWebhookHandler {
  private config: IntegrationConfig;
  private logger: Logger;

  constructor(config: IntegrationConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Validate webhook payload
   */
  validateWebhook(payload: unknown): LinearWebhookEvent | null {
    try {
      const result = WebhookEventSchema.parse(payload);

      this.logger.debug("Webhook validation successful", {
        type: result.type,
        action: result.action,
        organizationId: result.organizationId,
      });

      return result as LinearWebhookEvent;
    } catch (error) {
      this.logger.error("Webhook validation failed", error as Error, {
        payload,
      });
      return null;
    }
  }

  /**
   * Process webhook event
   */
  async processWebhook(
    event: LinearWebhookEvent,
  ): Promise<ProcessedEvent | null> {
    this.logger.info("Processing webhook event", {
      type: event.type,
      action: event.action,
      organizationId: event.organizationId,
    });

    // Filter by organization
    if (event.organizationId !== this.config.linearOrganizationId) {
      this.logger.debug("Ignoring event from different organization", {
        eventOrg: event.organizationId,
        configOrg: this.config.linearOrganizationId,
      });
      return null;
    }

    try {
      switch (event.type) {
        case "Issue":
          return await this.processIssueEvent(event);
        case "Comment":
          return await this.processCommentEvent(event);
        default:
          this.logger.debug("Unhandled event type", { type: event.type });
          return null;
      }
    } catch (error) {
      this.logger.error("Failed to process webhook event", error as Error, {
        type: event.type,
        action: event.action,
      });
      return null;
    }
  }

  /**
   * Process issue events (created, updated, assigned)
   */
  private async processIssueEvent(
    event: LinearWebhookEvent,
  ): Promise<ProcessedEvent | null> {
    try {
      const issue = IssueSchema.parse(event.data) as unknown as Issue;

      const processedEvent: ProcessedEvent = {
        type: LinearEventType.ISSUE_UPDATE,
        action: event.action,
        issue,
        actor: event.actor as User,
        shouldTrigger: false,
        timestamp: new Date(event.createdAt),
      };

      // Determine if we should trigger based on the event
      const triggerResult = await this.shouldTriggerForIssue(
        issue,
        event.action,
        event.actor as User,
      );
      processedEvent.shouldTrigger = triggerResult.should;
      processedEvent.triggerReason = triggerResult.reason;

      this.logger.debug("Issue event processed", {
        issueId: issue.id,
        identifier: issue.identifier,
        action: event.action,
        shouldTrigger: processedEvent.shouldTrigger,
        reason: processedEvent.triggerReason,
      });

      return processedEvent;
    } catch (error) {
      this.logger.error("Failed to process issue event", error as Error);
      return null;
    }
  }

  /**
   * Process comment events (created, updated)
   */
  private async processCommentEvent(
    event: LinearWebhookEvent,
  ): Promise<ProcessedEvent | null> {
    try {
      const comment = CommentSchema.parse(event.data) as unknown as Comment;

      const processedEvent: ProcessedEvent = {
        type: LinearEventType.COMMENT_CREATE,
        action: event.action,
        issue: comment.issue as Issue,
        comment: comment,
        actor: event.actor as User,
        shouldTrigger: false,
        timestamp: new Date(event.createdAt),
      };

      // Determine if we should trigger based on the comment
      const triggerResult = await this.shouldTriggerForComment(
        comment,
        event.action,
        event.actor as User,
      );
      processedEvent.shouldTrigger = triggerResult.should;
      processedEvent.triggerReason = triggerResult.reason;

      this.logger.debug("Comment event processed", {
        commentId: comment.id,
        issueId: comment.issue.id,
        issueIdentifier: comment.issue.identifier,
        action: event.action,
        shouldTrigger: processedEvent.shouldTrigger,
        reason: processedEvent.triggerReason,
      });

      return processedEvent;
    } catch (error) {
      this.logger.error("Failed to process comment event", error as Error);
      return null;
    }
  }

  /**
   * Determine if issue event should trigger Claude
   */
  private async shouldTriggerForIssue(
    issue: Issue,
    action: string,
    actor: User,
  ): Promise<{ should: boolean; reason?: string }> {
    // Don't trigger for our own actions
    if (this.config.agentUserId && actor.id === this.config.agentUserId) {
      return { should: false, reason: "Self-triggered event" };
    }

    // Issue assignment to agent
    if (action === "update" && issue.assignee?.id === this.config.agentUserId) {
      return { should: true, reason: "Issue assigned to agent" };
    }

    // Issue creation with agent mention in description
    if (action === "create" && issue.description) {
      const mentionsAgent = await this.containsAgentMention(issue.description);
      if (mentionsAgent) {
        return { should: true, reason: "Issue created with agent mention" };
      }
    }

    return { should: false, reason: "No trigger condition met" };
  }

  /**
   * Determine if comment event should trigger Claude
   */
  private async shouldTriggerForComment(
    comment: Comment,
    action: string,
    actor: User,
  ): Promise<{ should: boolean; reason?: string }> {
    // Don't trigger for our own comments
    if (this.config.agentUserId && actor.id === this.config.agentUserId) {
      return { should: false, reason: "Self-created comment" };
    }

    // Only trigger on comment creation or update
    if (action !== "create" && action !== "update") {
      return { should: false, reason: "Not a create or update action" };
    }

    // Check if comment mentions the agent
    const mentionsAgent = await this.containsAgentMention(comment.body);
    if (mentionsAgent) {
      return { should: true, reason: "Comment mentions agent" };
    }

    return { should: false, reason: "No agent mention found" };
  }

  /**
   * Check if text contains agent mention
   */
  private async containsAgentMention(text: string): Promise<boolean> {
    const lowercaseText = text.toLowerCase();

    // Common agent mention patterns
    const patterns = [
      "@claude",
      "@agent",
      "claude",
      "ai assistant",
      "help with",
      "implement",
      "fix this",
      "work on",
    ];

    // Check for user ID mention if configured
    if (this.config.agentUserId) {
      patterns.push(this.config.agentUserId);
    }

    return patterns.some((pattern) => lowercaseText.includes(pattern));
  }

  /**
   * Verify webhook signature (if secret is configured)
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      this.logger.warn(
        "No webhook secret configured, skipping signature verification",
      );
      return true;
    }

    try {
      const crypto = require("crypto");
      const expectedSignature = crypto
        .createHmac("sha256", this.config.webhookSecret)
        .update(payload)
        .digest("hex");

      const actualSignature = signature.replace("sha256=", "");

      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(actualSignature, "hex"),
      );

      if (!isValid) {
        this.logger.warn("Webhook signature verification failed");
      }

      return isValid;
    } catch (error) {
      this.logger.error("Webhook signature verification error", error as Error);
      return false;
    }
  }
}
