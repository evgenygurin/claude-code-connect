/**
 * Enhanced webhook handler with integrated security features
 * Replaces the existing webhook handler with comprehensive security
 */

import { z } from "zod";
import type {
  LinearWebhookEvent,
  ProcessedEvent,
  IntegrationConfig,
  Logger,
} from "../core/types.js";
import { LinearEventTypeValues } from "../core/types.js";
import type { Issue, Comment, User } from "@linear/sdk";
import { SecurityAgent, SecuritySeverity } from "./security-agent.js";
import { SecurityValidator, SecurityUtils } from "./validators.js";
import { SecurityMonitor } from "./monitoring.js";

/**
 * Enhanced webhook validation schema with security constraints
 */
const SecureWebhookEventSchema = z.object({
  action: z.enum(["create", "update", "remove"]),
  actor: z.object({
    id: z.string().uuid("Actor ID must be a valid UUID"),
    name: z
      .string()
      .min(1)
      .max(100)
      .refine(
        (name) => SecurityUtils.sanitizeString(name) === name,
        "Actor name contains invalid characters",
      ),
    email: z.string().email().max(255).optional(),
    displayName: z.string().max(100).optional(),
  }),
  type: z.string().min(1).max(50),
  data: z.any(),
  url: z.string().url().max(2048).optional(),
  organizationId: z.string().uuid("Organization ID must be a valid UUID"),
  webhookId: z.string().uuid("Webhook ID must be a valid UUID"),
  createdAt: z.string().datetime("Created at must be a valid ISO datetime"),
});

/**
 * Enhanced issue validation with security checks
 */
const SecureIssueSchema = z.object({
  id: z.string().uuid("Issue ID must be a valid UUID"),
  identifier: z
    .string()
    .regex(
      /^[A-Z]{2,10}-\d{1,6}$/,
      "Issue identifier must follow format ABC-123",
    ),
  title: z
    .string()
    .min(1)
    .max(500)
    .refine(
      (title) => !/<script|javascript:|on\w+=/i.test(title),
      "Issue title contains potentially dangerous content",
    ),
  description: z
    .string()
    .max(50000)
    .optional()
    .refine(
      (desc) => !desc || !/<script|javascript:|on\w+=/i.test(desc),
      "Issue description contains potentially dangerous content",
    ),
  url: z.string().url().max(2048),
  state: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    type: z.string().min(1).max(50),
  }),
  assignee: z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1).max(100),
    })
    .optional(),
  creator: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
  }),
  team: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    key: z.string().min(1).max(20),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Enhanced comment validation with security checks
 */
const SecureCommentSchema = z.object({
  id: z.string().uuid("Comment ID must be a valid UUID"),
  body: z
    .string()
    .min(1)
    .max(10000)
    .refine(
      (body) => !/<script|javascript:|on\w+=/i.test(body),
      "Comment body contains potentially dangerous content",
    ),
  user: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
  }),
  issue: SecureIssueSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Enhanced webhook handler with comprehensive security
 */
export class EnhancedLinearWebhookHandler {
  private config: IntegrationConfig;
  private logger: Logger;
  private securityAgent: SecurityAgent;
  private securityValidator: SecurityValidator;
  private securityMonitor: SecurityMonitor;
  private requestCounter = new Map<string, number>();

  constructor(
    config: IntegrationConfig,
    logger: Logger,
    securityAgent?: SecurityAgent,
    securityMonitor?: SecurityMonitor,
  ) {
    this.config = config;
    this.logger = logger;
    this.securityAgent = securityAgent || new SecurityAgent(config, logger);
    this.securityValidator = new SecurityValidator();
    this.securityMonitor =
      securityMonitor ||
      new SecurityMonitor(config, logger, this.securityAgent);
  }

  /**
   * Validate webhook with comprehensive security checks
   */
  async validateWebhook(
    payload: unknown,
    signature: string | undefined,
    userAgent: string | undefined,
    sourceIp: string,
  ): Promise<LinearWebhookEvent | null> {
    const requestId = `${sourceIp}-${Date.now()}`;

    try {
      // Convert payload to string for security validation
      const payloadString = JSON.stringify(payload);

      // Security validation
      const securityResult = await this.securityAgent.validateWebhook(
        payloadString,
        signature,
        userAgent,
        sourceIp,
      );

      if (!securityResult.valid) {
        this.logger.warn("Webhook security validation failed", {
          sourceIp,
          reason: securityResult.reason,
          blocked: securityResult.blocked,
        });

        // Emit security event for monitoring
        this.securityMonitor.emit("security-event", {
          id: `webhook-${requestId}`,
          type: "WEBHOOK_VALIDATION_FAILURE",
          severity: securityResult.severity || SecuritySeverity.MEDIUM,
          timestamp: new Date(),
          source: sourceIp,
          message: securityResult.reason || "Webhook validation failed",
          details: { userAgent, payloadSize: payloadString.length },
          blocked: securityResult.blocked || false,
        });

        return null;
      }

      // Schema validation with enhanced security
      const schemaResult = SecureWebhookEventSchema.safeParse(payload);
      if (!schemaResult.success) {
        this.logger.error(
          "Webhook schema validation failed",
          schemaResult.error,
          {
            sourceIp,
            userAgent,
          },
        );

        // Emit security event
        this.securityMonitor.emit("security-event", {
          id: `schema-${requestId}`,
          type: "INPUT_VALIDATION_FAILURE",
          severity: SecuritySeverity.MEDIUM,
          timestamp: new Date(),
          source: sourceIp,
          message: "Webhook schema validation failed",
          details: {
            errors: schemaResult.error.issues,
            userAgent,
          },
          blocked: true,
        });

        return null;
      }

      const event = schemaResult.data as LinearWebhookEvent;

      // Additional security checks
      await this.performAdditionalSecurityChecks(event, sourceIp, userAgent);

      this.logger.debug("Webhook validation successful", {
        type: event.type,
        action: event.action,
        organizationId: event.organizationId,
        sourceIp,
      });

      return event;
    } catch (error) {
      this.logger.error("Webhook validation error", error as Error, {
        sourceIp,
        userAgent,
      });

      // Emit security event
      this.securityMonitor.emit("security-event", {
        id: `error-${requestId}`,
        type: "WEBHOOK_SIGNATURE_INVALID",
        severity: SecuritySeverity.HIGH,
        timestamp: new Date(),
        source: sourceIp,
        message: "Webhook validation error",
        details: {
          error: (error as Error).message,
          userAgent,
        },
        blocked: true,
      });

      return null;
    }
  }

  /**
   * Process webhook event with security monitoring
   */
  async processWebhook(
    event: LinearWebhookEvent,
    sourceIp: string,
  ): Promise<ProcessedEvent | null> {
    this.logger.info("Processing webhook event", {
      type: event.type,
      action: event.action,
      organizationId: event.organizationId,
      sourceIp,
    });

    // Organization validation
    if (event.organizationId !== this.config.linearOrganizationId) {
      this.logger.debug("Ignoring event from different organization", {
        eventOrg: event.organizationId,
        configOrg: this.config.linearOrganizationId,
        sourceIp,
      });

      // This could be a security concern if happening frequently
      this.securityMonitor.emit("security-event", {
        id: `org-mismatch-${Date.now()}`,
        type: "AUTHORIZATION_VIOLATION",
        severity: SecuritySeverity.LOW,
        timestamp: new Date(),
        source: sourceIp,
        message: "Event from unauthorized organization",
        details: {
          eventOrg: event.organizationId,
          expectedOrg: this.config.linearOrganizationId,
        },
        blocked: true,
      });

      return null;
    }

    try {
      switch (event.type) {
        case "Issue":
          return await this.processIssueEvent(event, sourceIp);
        case "Comment":
          return await this.processCommentEvent(event, sourceIp);
        default:
          this.logger.debug("Unhandled event type", {
            type: event.type,
            sourceIp,
          });
          return null;
      }
    } catch (error) {
      this.logger.error("Failed to process webhook event", error as Error, {
        type: event.type,
        action: event.action,
        sourceIp,
      });

      // Emit security event for processing failures
      this.securityMonitor.emit("security-event", {
        id: `processing-error-${Date.now()}`,
        type: "SUSPICIOUS_ACTIVITY",
        severity: SecuritySeverity.MEDIUM,
        timestamp: new Date(),
        source: sourceIp,
        message: "Webhook processing failed",
        details: {
          type: event.type,
          action: event.action,
          error: (error as Error).message,
        },
        blocked: false,
      });

      return null;
    }
  }

  /**
   * Process issue events with security validation
   */
  private async processIssueEvent(
    event: LinearWebhookEvent,
    sourceIp: string,
  ): Promise<ProcessedEvent | null> {
    try {
      // Validate issue data with enhanced security schema
      const issueResult = SecureIssueSchema.safeParse(event.data);
      if (!issueResult.success) {
        this.logger.error("Issue validation failed", issueResult.error, {
          sourceIp,
        });

        this.securityMonitor.emit("security-event", {
          id: `issue-validation-${Date.now()}`,
          type: "INPUT_VALIDATION_FAILURE",
          severity: SecuritySeverity.MEDIUM,
          timestamp: new Date(),
          source: sourceIp,
          message: "Issue data validation failed",
          details: { errors: issueResult.error.issues },
          blocked: true,
        });

        return null;
      }

      const issue = issueResult.data as unknown as Issue;

      // Sanitize issue content
      if (issue.description) {
        const sanitizedDescription =
          this.securityValidator.sanitizeIssueDescription(issue.description);
        if (sanitizedDescription !== issue.description) {
          this.logger.warn("Issue description sanitized", {
            issueId: issue.id,
            sourceIp,
          });
        }
      }

      // Check for injection attempts in issue content
      const contentToCheck = `${issue.title} ${issue.description || ""}`;
      const injectionCheck =
        this.securityValidator.detectInjectionAttempts(contentToCheck);

      if (injectionCheck.detected) {
        this.logger.warn("Potential injection attempt in issue content", {
          issueId: issue.id,
          threats: injectionCheck.threats,
          severity: injectionCheck.severity,
          sourceIp,
        });

        this.securityMonitor.emit("security-event", {
          id: `injection-attempt-${Date.now()}`,
          type: "COMMAND_INJECTION_ATTEMPT",
          severity:
            injectionCheck.severity === "high"
              ? SecuritySeverity.HIGH
              : SecuritySeverity.MEDIUM,
          timestamp: new Date(),
          source: sourceIp,
          message: "Injection attempt detected in issue content",
          details: {
            issueId: (issue as any).id,
            threats: injectionCheck.threats,
          },
          blocked: false,
        });
      }

      const processedEvent: ProcessedEvent = {
        type: LinearEventTypeValues.ISSUE_UPDATE,
        action: event.action,
        issue: issue as any, // Type assertion needed for Linear SDK compatibility
        actor: event.actor as User,
        shouldTrigger: false,
        timestamp: new Date(event.createdAt),
      };

      // Determine if we should trigger based on the event
      const triggerResult = await this.shouldTriggerForIssue(
        issue,
        event.action,
        event.actor as User,
        sourceIp,
      );
      processedEvent.shouldTrigger = triggerResult.should;
      processedEvent.triggerReason = triggerResult.reason;

      this.logger.debug("Issue event processed", {
        issueId: (issue as any).id,
        identifier: (issue as any).identifier,
        action: event.action,
        shouldTrigger: processedEvent.shouldTrigger,
        reason: processedEvent.triggerReason,
        sourceIp,
      });

      return processedEvent;
    } catch (error) {
      this.logger.error("Failed to process issue event", error as Error, {
        sourceIp,
      });
      return null;
    }
  }

  /**
   * Process comment events with security validation
   */
  private async processCommentEvent(
    event: LinearWebhookEvent,
    sourceIp: string,
  ): Promise<ProcessedEvent | null> {
    try {
      // Validate comment data with enhanced security schema
      const commentResult = SecureCommentSchema.safeParse(event.data);
      if (!commentResult.success) {
        this.logger.error("Comment validation failed", commentResult.error, {
          sourceIp,
        });

        this.securityMonitor.emit("security-event", {
          id: `comment-validation-${Date.now()}`,
          type: "INPUT_VALIDATION_FAILURE",
          severity: SecuritySeverity.MEDIUM,
          timestamp: new Date(),
          source: sourceIp,
          message: "Comment data validation failed",
          details: { errors: commentResult.error.issues },
          blocked: true,
        });

        return null;
      }

      const comment = commentResult.data as unknown as Comment;

      // Check for injection attempts in comment content
      const injectionCheck = this.securityValidator.detectInjectionAttempts(
        comment.body,
      );

      if (injectionCheck.detected) {
        const issue = await comment.issue;

        this.logger.warn("Potential injection attempt in comment", {
          commentId: comment.id,
          issueId: issue.id,
          threats: injectionCheck.threats,
          severity: injectionCheck.severity,
          sourceIp,
        });

        this.securityMonitor.emit("security-event", {
          id: `comment-injection-${Date.now()}`,
          type: "COMMAND_INJECTION_ATTEMPT",
          severity:
            injectionCheck.severity === "high"
              ? SecuritySeverity.HIGH
              : SecuritySeverity.MEDIUM,
          timestamp: new Date(),
          source: sourceIp,
          message: "Injection attempt detected in comment",
          details: {
            commentId: (comment as any).id,
            issueId: (comment.issue as any).id,
            threats: injectionCheck.threats,
          },
          blocked: false,
        });
      }

      const processedEvent: ProcessedEvent = {
        type: LinearEventTypeValues.COMMENT_CREATE,
        action: event.action,
        issue: comment.issue as any, // Type assertion needed for Linear SDK compatibility
        comment: comment as any, // Type assertion needed for Linear SDK compatibility
        actor: event.actor as User,
        shouldTrigger: false,
        timestamp: new Date(event.createdAt),
      };

      // Determine if we should trigger based on the comment
      const triggerResult = await this.shouldTriggerForComment(
        comment,
        event.action,
        event.actor as User,
        sourceIp,
      );
      processedEvent.shouldTrigger = triggerResult.should;
      processedEvent.triggerReason = triggerResult.reason;

      this.logger.debug("Comment event processed", {
        commentId: (comment as any).id,
        issueId: (comment.issue as any).id,
        issueIdentifier: (comment.issue as any).identifier,
        action: event.action,
        shouldTrigger: processedEvent.shouldTrigger,
        reason: processedEvent.triggerReason,
        sourceIp,
      });

      return processedEvent;
    } catch (error) {
      this.logger.error("Failed to process comment event", error as Error, {
        sourceIp,
      });
      return null;
    }
  }

  /**
   * Perform additional security checks on webhook events
   */
  private async performAdditionalSecurityChecks(
    event: LinearWebhookEvent,
    sourceIp: string,
    userAgent?: string,
  ): Promise<void> {
    // Check event timestamp for replay attacks
    const eventTime = new Date(event.createdAt);
    const now = new Date();
    const timeDiff = now.getTime() - eventTime.getTime();

    // Allow events up to 5 minutes old
    if (timeDiff > 5 * 60 * 1000) {
      this.securityMonitor.emit("security-event", {
        id: `stale-event-${Date.now()}`,
        type: "SUSPICIOUS_ACTIVITY",
        severity: SecuritySeverity.MEDIUM,
        timestamp: new Date(),
        source: sourceIp,
        message: "Stale webhook event received",
        details: {
          eventTime: event.createdAt,
          timeDiff,
          userAgent,
        },
        blocked: false,
      });
    }

    // Track request frequency per IP
    const currentCount = this.requestCounter.get(sourceIp) || 0;
    this.requestCounter.set(sourceIp, currentCount + 1);

    // Reset counters every minute
    setTimeout(() => {
      this.requestCounter.delete(sourceIp);
    }, 60000);

    // Check for abnormal request patterns
    if (currentCount > 50) {
      // More than 50 requests per minute from single IP
      this.securityMonitor.emit("security-event", {
        id: `high-frequency-${Date.now()}`,
        type: "RATE_LIMIT_EXCEEDED",
        severity: SecuritySeverity.HIGH,
        timestamp: new Date(),
        source: sourceIp,
        message: "High frequency requests detected",
        details: {
          requestCount: currentCount,
          userAgent,
        },
        blocked: false,
      });
    }
  }

  /**
   * Determine if issue event should trigger Claude with security context
   */
  private async shouldTriggerForIssue(
    issue: Issue,
    action: string,
    actor: User,
    sourceIp: string,
  ): Promise<{ should: boolean; reason?: string }> {
    // Don't trigger for our own actions
    if (this.config.agentUserId && actor.id === this.config.agentUserId) {
      return { should: false, reason: "Self-triggered event" };
    }

    // Additional security check: verify actor is legitimate
    if (!SecurityUtils.isValidUUID(actor.id)) {
      this.logger.warn("Invalid actor ID in webhook", {
        actorId: actor.id,
        issueId: issue.id,
        sourceIp,
      });
      return { should: false, reason: "Invalid actor ID" };
    }

    // Issue assignment to agent
    if (
      action === "update" &&
      (issue as any).assignee?.id === this.config.agentUserId
    ) {
      return { should: true, reason: "Issue assigned to agent" };
    }

    // Issue creation with agent mention in description
    if (action === "create" && (issue as any).description) {
      const mentionsAgent = await this.containsAgentMention(
        (issue as any).description,
      );
      if (mentionsAgent) {
        return { should: true, reason: "Issue created with agent mention" };
      }
    }

    return { should: false, reason: "No trigger condition met" };
  }

  /**
   * Determine if comment event should trigger Claude with security context
   */
  private async shouldTriggerForComment(
    comment: Comment,
    action: string,
    actor: User,
    sourceIp: string,
  ): Promise<{ should: boolean; reason?: string }> {
    // Don't trigger for our own comments
    if (this.config.agentUserId && actor.id === this.config.agentUserId) {
      return { should: false, reason: "Self-created comment" };
    }

    // Additional security check: verify actor is legitimate
    if (!SecurityUtils.isValidUUID(actor.id)) {
      this.logger.warn("Invalid actor ID in comment webhook", {
        actorId: actor.id,
        commentId: comment.id,
        sourceIp,
      });
      return { should: false, reason: "Invalid actor ID" };
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
   * Check if text contains agent mention with security validation
   */
  private async containsAgentMention(text: string): Promise<boolean> {
    // Sanitize text first to prevent injection
    const sanitizedText = SecurityUtils.sanitizeString(text).toLowerCase();

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

    return patterns.some((pattern) => sanitizedText.includes(pattern));
  }

  /**
   * Get security metrics for this handler
   */
  getSecurityMetrics(): {
    totalRequests: number;
    blockedRequests: number;
    securityEvents: number;
    requestsByIP: Map<string, number>;
  } {
    const securityEvents = this.securityAgent.getSecurityEvents();

    return {
      totalRequests: Array.from(this.requestCounter.values()).reduce(
        (sum, count) => sum + count,
        0,
      ),
      blockedRequests: securityEvents.filter((event) => event.blocked).length,
      securityEvents: securityEvents.length,
      requestsByIP: new Map(this.requestCounter),
    };
  }

  /**
   * Clear security metrics and reset counters
   */
  clearSecurityMetrics(): void {
    this.requestCounter.clear();
    this.securityAgent.clearSecurityEvents();
  }
}
