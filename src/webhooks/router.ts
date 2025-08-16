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
import { SessionManager } from "../sessions/manager.js";

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
    logger: Logger
  ) {
    this.linearClient = linearClient;
    this.sessionManager = sessionManager;
    this.config = config;
    this.logger = logger;
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
      // Check if already has active session
      const existingSession = await this.sessionManager.getSessionByIssue(issue.id);
      if (existingSession) {
        this.logger.info("Issue already has active session", {
          issueId: issue.id,
          sessionId: existingSession.id,
          status: existingSession.status
        });
        return;
      }

      // Move issue to "started" status
      await this.linearClient.moveIssueToStarted(issue);

      // Create progress comment
      const progressComment = await this.linearClient.createProgressComment(
        {
          id: "temp",
          issueId: issue.id,
          issueIdentifier: issue.identifier,
          status: "created" as any,
          workingDir: "",
          startedAt: new Date(),
          lastActivityAt: new Date(),
          metadata: {}
        },
        "🚀 **Starting work on this issue**\n\nI've been assigned to work on this issue and will begin analysis shortly."
      );

      // Create session
      const session = await this.sessionManager.createSession(issue);

      // Start session execution
      await this.sessionManager.startSession(session.id, issue);

      this.logger.info("Issue assignment handled successfully", {
        issueId: issue.id,
        sessionId: session.id
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
      // Check if has existing session
      let session = await this.sessionManager.getSessionByIssue(issue.id);
      
      if (!session) {
        // Create new session
        session = await this.sessionManager.createSession(issue, comment);
        
        // Create acknowledgment comment
        await this.linearClient.createProgressComment(
          session,
          "👋 **Acknowledged**\n\nI see you've mentioned me! Let me analyze your request and get started."
        );
      } else {
        // Update existing session with new comment context
        await this.linearClient.createProgressComment(
          session,
          "💬 **New instructions received**\n\nI'll incorporate your latest comment into my work."
        );
      }

      // Start or restart session with comment context
      await this.sessionManager.startSession(session.id, issue, comment);

      this.logger.info("Comment mention handled successfully", {
        issueId: issue.id,
        commentId: comment.id,
        sessionId: session.id
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
      
      if (session && session.status === "running") {
        this.logger.info("Cancelling session due to issue status change", {
          issueId: issue.id,
          sessionId: session.id,
          newStatus: issue.state.type
        });

        await this.sessionManager.cancelSession(session.id);
        
        await this.linearClient.createProgressComment(
          session,
          `⏹️ **Session cancelled**\n\nWork was stopped because the issue was moved to "${issue.state.name}" status.`
        );
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

    try {
      if (result.success) {
        // Move issue to completed
        const issue = await this.linearClient.getIssue(session.issueId);
        if (issue) {
          await this.linearClient.moveIssueToCompleted(issue);
        }

        // Create completion comment
        let completionMessage = "✅ **Work completed successfully!**\n\n";
        
        if (result.commits.length > 0) {
          completionMessage += "**Changes made:**\n";
          for (const commit of result.commits) {
            completionMessage += `- ${commit.message}\n`;
          }
          completionMessage += "\n";
        }

        if (result.filesModified.length > 0) {
          completionMessage += "**Files modified:**\n";
          for (const file of result.filesModified) {
            completionMessage += `- \`${file}\`\n`;
          }
          completionMessage += "\n";
        }

        if (session.branchName) {
          completionMessage += `**Branch:** \`${session.branchName}\`\n\n`;
        }

        completionMessage += `**Duration:** ${Math.round(result.duration / 1000)}s`;

        await this.linearClient.createProgressComment(session, completionMessage);
      } else {
        // Create error comment
        await this.linearClient.createProgressComment(
          session,
          `❌ **Work failed**\n\n**Error:** ${result.error || "Unknown error"}\n\n**Duration:** ${Math.round(result.duration / 1000)}s`
        );
      }
    } catch (error) {
      this.logger.error("Failed to handle session completion", error as Error, {
        sessionId: session.id
      });
    }
  }

  /**
   * Handle session error
   */
  async onSessionError(session: any, error: Error): Promise<void> {
    this.logger.error("Handling session error", error, {
      sessionId: session.id,
      issueId: session.issueId
    });

    try {
      await this.linearClient.createProgressComment(
        session,
        `💥 **Session error**\n\n**Error:** ${error.message}\n\nPlease check the logs for more details.`
      );
    } catch (commentError) {
      this.logger.error("Failed to create error comment", commentError as Error, {
        sessionId: session.id
      });
    }
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