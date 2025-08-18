/**
 * Linear reporter for Claude sessions
 */

import type { Comment } from "@linear/sdk";
import type {
  ClaudeSession,
  ClaudeExecutionResult,
  Logger,
} from "../core/types.js";
import { LinearClient } from "./client.js";
import { SessionManager } from "../sessions/manager.js";

/**
 * Session progress information
 */
export interface SessionProgress {
  currentStep: string;
  details: string;
  percentage?: number;
}

/**
 * Linear reporter for Claude sessions
 * Handles reporting session progress and results to Linear
 */
export class LinearReporter {
  private linearClient: LinearClient;
  private logger: Logger;
  private sessionManager?: SessionManager;
  private progressComments = new Map<string, string>(); // sessionId -> commentId
  private commentRetryAttempts = new Map<string, number>(); // Track retry attempts per session

  constructor(linearClient: LinearClient, logger: Logger) {
    this.linearClient = linearClient;
    this.logger = logger;
  }

  /**
   * Set session manager
   */
  setSessionManager(sessionManager: SessionManager): void {
    this.sessionManager = sessionManager;
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.sessionManager) {
      this.logger.warn("Cannot setup event listeners: session manager not set");
      return;
    }

    // Listen for session events
    this.sessionManager.on("session:created", async (session) => {
      await this.reportSessionStarted(session);
    });

    this.sessionManager.on("session:started", async (session) => {
      await this.reportProgress(session, {
        currentStep: "Starting execution",
        details: "Preparing environment and analyzing issue...",
        percentage: 10,
      });
    });

    this.sessionManager.on("session:completed", async (session, result) => {
      await this.reportResults(session, result);
      this.cleanupProgressComment(session.id);
    });

    this.sessionManager.on("session:failed", async (session, error) => {
      await this.reportError(session, error);
      this.cleanupProgressComment(session.id);
    });

    this.sessionManager.on("session:cancelled", async (session) => {
      await this.reportCancelled(session);
      this.cleanupProgressComment(session.id);
    });

    this.logger.debug("Linear reporter event listeners setup");
  }

  /**
   * Report session started
   */
  async reportSessionStarted(session: ClaudeSession): Promise<Comment | null> {
    this.logger.debug("Reporting session started", { sessionId: session.id });

    const message = `
🚀 **Claude Agent - ${session.issueIdentifier}**

I've been assigned to work on this issue and am starting analysis now.

${session.branchName ? `I'll be working in branch \`${session.branchName}\`.` : ""}

---
*Session ID: ${session.id}*  
*Started: ${session.startedAt.toISOString()}*
    `.trim();

    try {
      const comment = await this.linearClient.createComment(
        session.issueId,
        message,
      );

      if (comment) {
        this.progressComments.set(session.id, comment.id);
      }

      return comment;
    } catch (error) {
      this.logger.error("Failed to report session started", error as Error, {
        sessionId: session.id,
      });
      return null;
    }
  }

  /**
   * Report session progress
   */
  async reportProgress(
    session: ClaudeSession,
    progress: SessionProgress,
  ): Promise<Comment | null> {
    this.logger.debug("Reporting session progress", {
      sessionId: session.id,
      currentStep: progress.currentStep,
      percentage: progress.percentage,
    });

    const progressBar = this.createProgressBar(progress.percentage);

    const message = `
⏳ **Claude Agent - ${session.issueIdentifier}**

**Current Step**: ${progress.currentStep}
${progressBar ? `${progressBar}\n` : ""}

${progress.details}

---
*Session ID: ${session.id}*  
*Started: ${session.startedAt.toISOString()}*  
${session.branchName ? `*Branch: \`${session.branchName}\`*` : ""}
    `.trim();

    return this.updateOrCreateComment(session.id, session.issueId, message);
  }

  /**
   * Report session results
   */
  async reportResults(
    session: ClaudeSession,
    result: ClaudeExecutionResult,
  ): Promise<Comment | null> {
    this.logger.debug("Reporting session results", {
      sessionId: session.id,
      success: result.success,
      filesModified: result.filesModified.length,
      commits: result.commits.length,
    });

    let message: string;

    if (result.success) {
      message = `
✅ **Claude Agent - ${session.issueIdentifier}**

**Task Completed Successfully**

${
  result.commits.length > 0
    ? `
**Changes Made:**
${result.commits.map((commit) => `- ${commit.message}`).join("\n")}
`
    : ""
}

${
  result.filesModified.length > 0
    ? `
**Files Modified:**
${result.filesModified.map((file) => `- \`${file}\``).join("\n")}
`
    : ""
}

${session.branchName ? `**Branch:** \`${session.branchName}\`` : ""}

**Duration:** ${Math.round(result.duration / 1000)}s

---
*Session ID: ${session.id}*  
*Started: ${session.startedAt.toISOString()}*  
*Completed: ${session.completedAt?.toISOString() || new Date().toISOString()}*
      `.trim();
    } else {
      message = `
❌ **Claude Agent - ${session.issueIdentifier}**

**Task Failed**

**Error:** ${result.error || "Unknown error"}

**Duration:** ${Math.round(result.duration / 1000)}s

---
*Session ID: ${session.id}*  
*Started: ${session.startedAt.toISOString()}*  
*Failed: ${session.completedAt?.toISOString() || new Date().toISOString()}*
      `.trim();
    }

    return this.updateOrCreateComment(session.id, session.issueId, message);
  }

  /**
   * Report session error
   */
  async reportError(
    session: ClaudeSession,
    error: Error,
  ): Promise<Comment | null> {
    this.logger.debug("Reporting session error", {
      sessionId: session.id,
      error: error.message,
    });

    const message = `
💥 **Claude Agent - ${session.issueIdentifier}**

**Session Error**

**Error:** ${error.message}

Please check the logs for more details.

---
*Session ID: ${session.id}*  
*Started: ${session.startedAt.toISOString()}*  
*Error: ${new Date().toISOString()}*
    `.trim();

    return this.updateOrCreateComment(session.id, session.issueId, message);
  }

  /**
   * Report session cancelled
   */
  async reportCancelled(session: ClaudeSession): Promise<Comment | null> {
    this.logger.debug("Reporting session cancelled", {
      sessionId: session.id,
    });

    const message = `
🛑 **Claude Agent - ${session.issueIdentifier}**

**Session Cancelled**

The session was cancelled, possibly due to timeout or manual intervention.

---
*Session ID: ${session.id}*  
*Started: ${session.startedAt.toISOString()}*  
*Cancelled: ${session.completedAt?.toISOString() || new Date().toISOString()}*
    `.trim();

    return this.updateOrCreateComment(session.id, session.issueId, message);
  }

  /**
   * Update or create comment with retry logic
   */
  private async updateOrCreateComment(
    sessionId: string,
    issueId: string,
    message: string,
    maxRetries: number = 3
  ): Promise<Comment | null> {
    const existingCommentId = this.progressComments.get(sessionId);
    let attempt = this.commentRetryAttempts.get(sessionId) || 0;

    try {
      if (existingCommentId) {
        // Try to update existing comment with retry logic
        for (let retry = 0; retry <= maxRetries; retry++) {
          try {
            const comment = await this.linearClient.updateComment(
              existingCommentId,
              message,
            );
            // Reset retry counter on success
            this.commentRetryAttempts.delete(sessionId);
            return comment;
          } catch (error) {
            if (retry === maxRetries) {
              // If update fails after retries, fall back to creating new comment
              this.logger.warn(
                "Failed to update comment after retries, creating new one",
                { sessionId, error: (error as Error).message }
              );
              this.progressComments.delete(sessionId);
              break;
            }
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retry) * 1000));
          }
        }
      }

      // Create new comment
      const comment = await this.linearClient.createComment(issueId, message);
      if (comment) {
        this.progressComments.set(sessionId, comment.id);
        this.commentRetryAttempts.delete(sessionId);
      }
      return comment;
    } catch (error) {
      this.commentRetryAttempts.set(sessionId, attempt + 1);
      this.logger.error(
        "Failed to update or create comment",
        error as Error,
        { sessionId, attempt: attempt + 1 }
      );
      return null;
    }
  }

  /**
   * Clean up progress comment tracking
   */
  private cleanupProgressComment(sessionId: string): void {
    this.progressComments.delete(sessionId);
    this.commentRetryAttempts.delete(sessionId);
    this.logger.debug("Cleaned up progress comment tracking", { sessionId });
  }

  /**
   * Create progress bar
   */
  private createProgressBar(percentage?: number): string {
    if (percentage === undefined) {
      return "";
    }

    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    const filledBlocks = Math.round(clampedPercentage / 10);
    const emptyBlocks = 10 - filledBlocks;

    const filled = "█".repeat(filledBlocks);
    const empty = "░".repeat(emptyBlocks);

    return `\`${filled}${empty}\` ${clampedPercentage}%`;
  }
}

