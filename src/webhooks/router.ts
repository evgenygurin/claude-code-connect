/**
 * Event router for Linear webhook events
 */

import type {
  ProcessedEvent,
  EventHandlers,
  IntegrationConfig,
  Logger,
} from "../core/types.js";
import { LinearEventTypeValues } from "../core/types.js";
import { LinearClient } from "../linear/client.js";
import { SessionManager } from "../sessions/manager.js";
import type { User } from "@linear/sdk";

/**
 * Helper to get actor name safely
 */
function getActorName(
  actor: User | { id: string; name?: string; service?: string; type?: string },
): string {
  if ("name" in actor && actor.name) {
    return actor.name;
  }
  if ("service" in actor && actor.service) {
    return actor.service;
  }
  return "Unknown";
}

/**
 * Default event handlers implementation
 */
export class DefaultEventHandlers implements EventHandlers {
  private linearClient: LinearClient;
  private sessionManager: SessionManager;
  private config: IntegrationConfig;
  private logger: Logger;

  constructor(
    linearClient: LinearClient,
    sessionManager: SessionManager,
    config: IntegrationConfig,
    logger: Logger,
  ) {
    this.linearClient = linearClient;
    this.sessionManager = sessionManager;
    this.config = config;
    this.logger = logger;

    // Set up session event listeners
    this.setupSessionEventListeners();
  }

  /**
   * Set up session event listeners
   */
  private setupSessionEventListeners(): void {
    // Listen for session completion
    this.sessionManager.on("session:completed", (session, result) => {
      this.onSessionComplete(session, result).catch((error) => {
        this.logger.error(
          "Failed to handle session completion event",
          error as Error,
          {
            sessionId: session.id,
          },
        );
      });
    });

    // Listen for session failure
    this.sessionManager.on("session:failed", (session, error) => {
      this.onSessionError(session, error).catch((err) => {
        this.logger.error(
          "Failed to handle session error event",
          err as Error,
          {
            sessionId: session.id,
          },
        );
      });
    });
  }

  /**
   * Handle issue assignment to agent
   */
  async onIssueAssigned(event: ProcessedEvent): Promise<void> {
    const { issue, actor } = event;

    this.logger.info("Handling issue assignment", {
      issueId: issue.id,
      identifier: issue.identifier,
      assignedBy: getActorName(actor),
    });

    try {
      // Create a new session for the assigned issue
      const session = await this.sessionManager.createSession(issue);

      // Start the session and execute Claude Code
      await this.sessionManager.startSession(session.id, issue);

      this.logger.info("Issue assignment handled successfully", {
        issueId: issue.id,
        sessionId: session.id,
      });
    } catch (error) {
      this.logger.error("Failed to handle issue assignment", error as Error, {
        issueId: issue.id,
      });

      // Create error comment
      await this.linearClient.createComment(
        issue.id,
        "❌ **Error starting work**\n\nI encountered an error while trying to start work on this issue. Please check the logs or contact an administrator.",
      );
    }
  }

  /**
   * Handle comment mention of agent
   */
  async onCommentMention(event: ProcessedEvent): Promise<void> {
    const { issue, comment, actor } = event;

    if (!comment) {
      this.logger.warn("Comment mention event missing comment data", {
        issueId: issue.id,
      });
      return;
    }

    this.logger.info("Handling comment mention", {
      issueId: issue.id,
      commentId: comment.id,
      mentionedBy: getActorName(actor),
    });

    try {
      this.logger.info("🔵 Creating session for comment mention...");
      // Create a new session for the comment mention
      const session = await this.sessionManager.createSession(issue, comment);

      this.logger.info("🔵 Starting session...", { sessionId: session.id });
      // Start the session and execute Claude Code
      await this.sessionManager.startSession(session.id, issue, comment);

      this.logger.info("✅ Comment mention handled successfully", {
        issueId: issue.id,
        commentId: comment.id,
        sessionId: session.id,
      });
    } catch (error) {
      this.logger.error("Failed to handle comment mention", error as Error, {
        issueId: issue.id,
        commentId: comment.id,
      });

      // Reply with error
      await this.linearClient.createComment(
        issue.id,
        "❌ **Error processing request**\n\nI encountered an error while processing your request. Please try again or contact an administrator.",
      );
    }
  }

  /**
   * Handle issue status change
   */
  async onIssueStatusChange(event: ProcessedEvent): Promise<void> {
    const { issue, actor } = event;
    const state = await issue.state;

    this.logger.info("Handling issue status change", {
      issueId: issue.id,
      newStatus: state.name,
      changedBy: getActorName(actor),
    });

    // Check if issue was moved to completed/cancelled by someone else
    if (state.type === "completed" || state.type === "canceled") {
      const session = await this.sessionManager.getSessionByIssue(issue.id);

      if (
        session &&
        (session.status === "created" || session.status === "running")
      ) {
        this.logger.info("Cancelling session due to issue status change", {
          issueId: issue.id,
          sessionId: session.id,
          newStatus: state.type,
        });

        await this.sessionManager.cancelSession(session.id);
      }
    }
  }

  /**
   * Handle session completion
   */
  async onSessionComplete(session: any, result: any): Promise<void> {
    this.logger.info("Handling session completion", {
      sessionId: session.id,
      issueId: session.issueId,
      success: result.success,
    });

    // The LinearReporter now handles reporting results to Linear
    // This method is kept for backward compatibility and additional custom logic
  }

  /**
   * Handle session error
   */
  async onSessionError(session: any, error: Error): Promise<void> {
    this.logger.error("Handling session error", error, {
      sessionId: session.id,
      issueId: session.issueId,
    });

    // The LinearReporter now handles reporting errors to Linear
    // This method is kept for backward compatibility and additional custom logic
  }
}

/**
 * Event router routes processed events to appropriate handlers
 */
export class EventRouter {
  private handlers: EventHandlers;
  private logger: Logger;

  constructor(handlers: EventHandlers, logger: Logger) {
    this.handlers = handlers;
    this.logger = logger;
  }

  /**
   * Route event to appropriate handler
   */
  async routeEvent(event: ProcessedEvent): Promise<void> {
    if (!event.shouldTrigger) {
      this.logger.debug("Event does not trigger action", {
        type: event.type,
        reason: event.triggerReason,
      });
      return;
    }

    this.logger.info("Routing event", {
      type: event.type,
      action: event.action,
      issueId: event.issue.id,
      reason: event.triggerReason,
    });

    try {
      switch (event.type) {
        case LinearEventTypeValues.ISSUE_UPDATE:
          await this.routeIssueEvent(event);
          break;

        case LinearEventTypeValues.COMMENT_CREATE:
        case LinearEventTypeValues.COMMENT_UPDATE:
          await this.routeCommentEvent(event);
          break;

        default:
          this.logger.warn("Unknown event type", { type: event.type });
      }
    } catch (error) {
      this.logger.error("Failed to route event", error as Error, {
        type: event.type,
        issueId: event.issue.id,
      });
    }
  }

  /**
   * Route issue events
   */
  private async routeIssueEvent(event: ProcessedEvent): Promise<void> {
    if (event.triggerReason?.includes("assigned")) {
      await this.handlers.onIssueAssigned(event);
    } else if (event.triggerReason?.includes("status")) {
      await this.handlers.onIssueStatusChange(event);
    }
  }

  /**
   * Route comment events
   */
  private async routeCommentEvent(event: ProcessedEvent): Promise<void> {
    if (event.triggerReason?.includes("mention")) {
      await this.handlers.onCommentMention(event);
    }
  }
}
