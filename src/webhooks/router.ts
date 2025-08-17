/**
 * Event router for Linear webhook events
 */

import type { 
  ProcessedEvent, 
  LinearEventType, 
  EventHandlers, 
  IntegrationConfig, 
  Logger 
} from "../core/types.js";
import { LinearClient } from "../linear/client.js";
import { AgentSessionManager } from "../sessions/manager.js";

/**
 * Default event handlers implementation
 */
export class DefaultEventHandlers implements EventHandlers {
  private linearClient: LinearClient;
  private sessionManager: AgentSessionManager;
  private config: IntegrationConfig;
  private logger: Logger;

  constructor(
    linearClient: LinearClient,
    sessionManager: AgentSessionManager,
    config: IntegrationConfig,
    logger: Logger
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
      this.onSessionComplete(session, result).catch(error => {
        this.logger.error("Failed to handle session completion event", error as Error, {
          sessionId: session.id
        });
      });
    });
    
    // Listen for session failure
    this.sessionManager.on("session:failed", (session, error) => {
      this.onSessionError(session, error).catch(err => {
        this.logger.error("Failed to handle session error event", err as Error, {
          sessionId: session.id
        });
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
      assignedBy: actor.name
    });

    try {
      // Use the new AgentSessionManager to process issue assignment
      await this.sessionManager.processIssueAssigned(issue, actor);
      
      this.logger.info("Issue assignment handled successfully", {
        issueId: issue.id
      });
    } catch (error) {
      this.logger.error("Failed to handle issue assignment", error as Error, {
        issueId: issue.id
      });

      // Create error comment
      await this.linearClient.createComment(
        issue.id,
        "❌ **Error starting work**\n\nI encountered an error while trying to start work on this issue. Please check the logs or contact an administrator."
      );
    }
  }

  /**
   * Handle comment mention of agent
   */
  async onCommentMention(event: ProcessedEvent): Promise<void> {
    const { issue, comment, actor } = event;
    
    if (!comment) {
      this.logger.warn("Comment mention event missing comment data", { issueId: issue.id });
      return;
    }

    this.logger.info("Handling comment mention", {
      issueId: issue.id,
      commentId: comment.id,
      mentionedBy: actor.name
    });

    try {
      // Use the new AgentSessionManager to process comment mention
      await this.sessionManager.processCommentMention(issue, comment, actor);
      
      this.logger.info("Comment mention handled successfully", {
        issueId: issue.id,
        commentId: comment.id
      });
    } catch (error) {
      this.logger.error("Failed to handle comment mention", error as Error, {
        issueId: issue.id,
        commentId: comment.id
      });

      // Reply with error
      await this.linearClient.createComment(
        issue.id,
        "❌ **Error processing request**\n\nI encountered an error while processing your request. Please try again or contact an administrator."
      );
    }
  }

  /**
   * Handle issue status change
   */
  async onIssueStatusChange(event: ProcessedEvent): Promise<void> {
    const { issue, actor } = event;
    
    this.logger.info("Handling issue status change", {
      issueId: issue.id,
      newStatus: issue.state.name,
      changedBy: actor.name
    });

    // Check if issue was moved to completed/cancelled by someone else
    if (issue.state.type === "completed" || issue.state.type === "canceled") {
      const session = await this.sessionManager.getSessionByIssue(issue.id);
      
      if (session && (session.status === "created" || session.status === "running")) {
        this.logger.info("Cancelling session due to issue status change", {
          issueId: issue.id,
          sessionId: session.id,
          newStatus: issue.state.type
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
      success: result.success
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
      issueId: session.issueId
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
        reason: event.triggerReason
      });
      return;
    }

    this.logger.info("Routing event", {
      type: event.type,
      action: event.action,
      issueId: event.issue.id,
      reason: event.triggerReason
    });

    try {
      switch (event.type) {
        case LinearEventType.ISSUE_UPDATE:
          await this.routeIssueEvent(event);
          break;
          
        case LinearEventType.COMMENT_CREATE:
        case LinearEventType.COMMENT_UPDATE:
          await this.routeCommentEvent(event);
          break;
          
        default:
          this.logger.warn("Unknown event type", { type: event.type });
      }
    } catch (error) {
      this.logger.error("Failed to route event", error as Error, {
        type: event.type,
        issueId: event.issue.id
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
