/**
 * GitHub webhook handler for PR comments
 */

import { z } from "zod";
import * as crypto from "crypto";
import type {
  GitHubWebhookEvent,
  ProcessedGitHubEvent,
  IntegrationConfig,
  Logger,
  GitHubComment,
  GitHubPullRequest,
  GitHubRepository,
  GitHubUser,
} from "../core/types.js";

/**
 * GitHub webhook validation schema
 */
const GitHubWebhookSchema = z.object({
  action: z.string(),
  comment: z
    .object({
      id: z.number(),
      body: z.string(),
      user: z.object({
        id: z.number(),
        login: z.string(),
        name: z.string().optional(),
        email: z.string().optional(),
      }),
      created_at: z.string(),
      updated_at: z.string(),
      html_url: z.string(),
    })
    .optional(),
  pull_request: z
    .object({
      id: z.number(),
      number: z.number(),
      title: z.string(),
      body: z.string().optional(),
      state: z.enum(["open", "closed"]),
      user: z.object({
        id: z.number(),
        login: z.string(),
      }),
      html_url: z.string(),
      head: z.object({
        ref: z.string(),
        sha: z.string(),
      }),
      base: z.object({
        ref: z.string(),
        sha: z.string(),
      }),
    })
    .optional(),
  issue: z
    .object({
      id: z.number(),
      number: z.number(),
      title: z.string(),
      body: z.string().optional(),
      user: z.object({
        id: z.number(),
        login: z.string(),
      }),
    })
    .optional(),
  repository: z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    owner: z.object({
      id: z.number(),
      login: z.string(),
    }),
  }),
  sender: z.object({
    id: z.number(),
    login: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
  }),
});

/**
 * GitHub webhook handler
 */
export class GitHubWebhookHandler {
  private config: IntegrationConfig;
  private logger: Logger;

  constructor(config: IntegrationConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Validate webhook signature
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!this.config.githubWebhookSecret) {
      this.logger.warn(
        "No GitHub webhook secret configured, skipping signature verification",
      );
      return true;
    }

    try {
      const expectedSignature = crypto
        .createHmac("sha256", this.config.githubWebhookSecret)
        .update(payload)
        .digest("hex");

      const actualSignature = signature.replace("sha256=", "");

      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(actualSignature, "hex"),
      );

      if (!isValid) {
        this.logger.warn("GitHub webhook signature verification failed");
      }

      return isValid;
    } catch (error) {
      this.logger.error(
        "GitHub webhook signature verification error",
        error as Error,
      );
      return false;
    }
  }

  /**
   * Validate webhook payload
   */
  validateWebhook(payload: unknown): GitHubWebhookEvent | null {
    try {
      const result = GitHubWebhookSchema.parse(payload);

      this.logger.debug("GitHub webhook validation successful", {
        action: result.action,
        repository: result.repository.full_name,
        hasPullRequest: !!result.pull_request,
        hasComment: !!result.comment,
      });

      return result as GitHubWebhookEvent;
    } catch (error) {
      this.logger.error("GitHub webhook validation failed", error as Error, {
        payload,
      });
      return null;
    }
  }

  /**
   * Process webhook event
   */
  async processWebhook(
    event: GitHubWebhookEvent,
    eventType: string,
  ): Promise<ProcessedGitHubEvent | null> {
    this.logger.info("Processing GitHub webhook event", {
      type: eventType,
      action: event.action,
      repository: event.repository.full_name,
    });

    try {
      // Handle PR comment events
      if (eventType === "issue_comment" && event.pull_request && event.comment) {
        return await this.processPRCommentEvent(event);
      }

      // Handle PR review comment events
      if (eventType === "pull_request_review_comment" && event.comment) {
        return await this.processPRReviewCommentEvent(event);
      }

      this.logger.debug("Unhandled GitHub event type", { type: eventType });
      return null;
    } catch (error) {
      this.logger.error("Failed to process GitHub webhook event", error as Error, {
        type: eventType,
        action: event.action,
      });
      return null;
    }
  }

  /**
   * Process PR comment events
   */
  private async processPRCommentEvent(
    event: GitHubWebhookEvent,
  ): Promise<ProcessedGitHubEvent | null> {
    if (!event.comment || !event.pull_request) {
      this.logger.warn("PR comment event missing comment or pull_request data");
      return null;
    }

    const processedEvent: ProcessedGitHubEvent = {
      type: "pr_comment",
      action: event.action,
      comment: event.comment as GitHubComment,
      pullRequest: event.pull_request as GitHubPullRequest,
      repository: event.repository as GitHubRepository,
      sender: event.sender as GitHubUser,
      shouldTrigger: false,
      timestamp: new Date(),
    };

    // Determine if we should trigger based on the comment
    const triggerResult = await this.shouldTriggerForComment(
      event.comment,
      event.sender,
    );
    processedEvent.shouldTrigger = triggerResult.should;
    processedEvent.triggerReason = triggerResult.reason;

    this.logger.debug("PR comment event processed", {
      commentId: event.comment.id,
      prNumber: event.pull_request.number,
      action: event.action,
      shouldTrigger: processedEvent.shouldTrigger,
      reason: processedEvent.triggerReason,
    });

    return processedEvent;
  }

  /**
   * Process PR review comment events
   */
  private async processPRReviewCommentEvent(
    event: GitHubWebhookEvent,
  ): Promise<ProcessedGitHubEvent | null> {
    if (!event.comment) {
      this.logger.warn("PR review comment event missing comment data");
      return null;
    }

    const processedEvent: ProcessedGitHubEvent = {
      type: "pr_comment",
      action: event.action,
      comment: event.comment as GitHubComment,
      pullRequest: event.pull_request as GitHubPullRequest | undefined,
      repository: event.repository as GitHubRepository,
      sender: event.sender as GitHubUser,
      shouldTrigger: false,
      timestamp: new Date(),
    };

    // Determine if we should trigger based on the comment
    const triggerResult = await this.shouldTriggerForComment(
      event.comment,
      event.sender,
    );
    processedEvent.shouldTrigger = triggerResult.should;
    processedEvent.triggerReason = triggerResult.reason;

    this.logger.debug("PR review comment event processed", {
      commentId: event.comment.id,
      action: event.action,
      shouldTrigger: processedEvent.shouldTrigger,
      reason: processedEvent.triggerReason,
    });

    return processedEvent;
  }

  /**
   * Determine if comment should trigger agent
   */
  private async shouldTriggerForComment(
    comment: any,
    sender: any,
  ): Promise<{ should: boolean; reason?: string }> {
    // Don't trigger on our own comments
    const currentUser = await this.getCurrentBotUser();
    if (currentUser && sender.login === currentUser.login) {
      return { should: false, reason: "Self-created comment" };
    }

    // Check if comment mentions the agent
    const mentionsAgent = this.containsAgentMention(comment.body);
    if (mentionsAgent) {
      return { should: true, reason: "Comment mentions agent" };
    }

    return { should: false, reason: "No agent mention found" };
  }

  /**
   * Check if text contains agent mention
   */
  private containsAgentMention(text: string): boolean {
    const lowercaseText = text.toLowerCase();

    // Agent mention patterns
    const patterns = [
      "@claude",
      "@agent",
      "@bot",
      "claude",
      "hey claude",
      "claude, ",
      "please help",
      "help with",
      "can you",
      "could you",
    ];

    return patterns.some((pattern) => lowercaseText.includes(pattern));
  }

  /**
   * Get current bot user (cached)
   */
  private async getCurrentBotUser(): Promise<GitHubUser | null> {
    // This would typically be cached or retrieved from config
    // For now, return null to allow all comments
    return null;
  }
}
