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
  private maxRetries = 3; // Maximum number of retries for API calls
  private retryDelay = 1000; // Initial delay in ms (will be increased exponentially)

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
      // Clean up progress comment reference
      this.cleanupProgressComment(session.id);
    });

    this.sessionManager.on("session:failed", async (session, error) => {
      await this.reportError(session, error);
      // Clean up progress comment reference
      this.cleanupProgressComment(session.id);
    });

    this.sessionManager.on("session:cancelled", async (session) => {
      await this.reportCancelled(session);
      // Clean up progress comment reference
      this.cleanupProgressComment(session.id);
    });

    this.logger.debug("Linear reporter event listeners setup");
  }

  /**
   * Clean up progress comment reference
   */
  private cleanupProgressComment(sessionId: string): void {
    this.progressComments.delete(sessionId);
    this.logger.debug("Cleaned up progress comment reference", { sessionId });
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
      const comment = await this.retryApiCall(() =>
        this.linearClient.createComment(session.issueId, message),
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

    try {
      // Check if we already have a progress comment
      const existingCommentId = this.progressComments.get(session.id);

      if (existingCommentId) {
        // Update existing comment with retry logic
        const comment = await this.retryApiCall(() =>
          this.linearClient.updateComment(existingCommentId, message),
        );
        return comment;
      } else {
        // Create new comment with retry logic
        const comment = await this.retryApiCall(() =>
          this.linearClient.createComment(session.issueId, message),
        );

        if (comment) {
          this.progressComments.set(session.id, comment.id);
        }

        return comment;
      }
    } catch (error) {
      this.logger.error("Failed to report session progress", error as Error, {
        sessionId: session.id,
      });
      return null;
    }
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

    try {
      // Check if we already have a progress comment
      const existingCommentId = this.progressComments.get(session.id);

      if (existingCommentId) {
        // Update existing comment with retry logic
        const comment = await this.retryApiCall(() =>
          this.linearClient.updateComment(existingCommentId, message),
        );
        return comment;
      } else {
        // Create new comment with retry logic
        const comment = await this.retryApiCall(() =>
          this.linearClient.createComment(session.issueId, message),
        );
        return comment;
      }
    } catch (error) {
      this.logger.error("Failed to report session results", error as Error, {
        sessionId: session.id,
      });
      return null;
    }
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

    try {
      // Check if we already have a progress comment
      const existingCommentId = this.progressComments.get(session.id);

      if (existingCommentId) {
        // Update existing comment with retry logic
        const comment = await this.retryApiCall(() =>
          this.linearClient.updateComment(existingCommentId, message),
        );
        return comment;
      } else {
        // Create new comment with retry logic
        const comment = await this.retryApiCall(() =>
          this.linearClient.createComment(session.issueId, message),
        );
        return comment;
      }
    } catch (commentError) {
      this.logger.error(
        "Failed to report session error",
        commentError as Error,
        { sessionId: session.id },
      );
      return null;
    }
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

    try {
      // Check if we already have a progress comment
      const existingCommentId = this.progressComments.get(session.id);

      if (existingCommentId) {
        // Update existing comment with retry logic
        const comment = await this.retryApiCall(() =>
          this.linearClient.updateComment(existingCommentId, message),
        );
        return comment;
      } else {
        // Create new comment with retry logic
        const comment = await this.retryApiCall(() =>
          this.linearClient.createComment(session.issueId, message),
        );
        return comment;
      }
    } catch (error) {
      this.logger.error("Failed to report session cancelled", error as Error, {
        sessionId: session.id,
      });
      return null;
    }
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

  /**
   * Retry API call with exponential backoff
   * @param apiCall Function that makes the API call
   * @returns Result of the API call
   */
  private async retryApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.retryDelay;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `API call failed (attempt ${attempt}/${this.maxRetries})`,
          {
            error: lastError.message,
            retryIn: `${delay}ms`,
          },
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Exponential backoff
        delay *= 2;
      }
    }

    // If we get here, all retries failed
    throw lastError || new Error("API call failed after retries");
  }

  /**
   * Report delegation started to Linear
   */
  async reportDelegationStarted(
    issue: any,
    options: {
      delegateTo: string;
      message: string;
    }
  ): Promise<void> {
    try {
      await this.withRetry(async () => {
        await this.linearClient.createComment(issue.id, options.message);
      });

      this.logger.info("Reported delegation started to Linear", {
        issueId: issue.id,
        delegateTo: options.delegateTo,
      });
    } catch (error) {
      this.logger.error("Failed to report delegation started", error as Error, {
        issueId: issue.id,
      });
    }
  }

  /**
   * Report delegation success to Linear
   */
  async reportDelegationSuccess(
    issue: any,
    options: {
      delegateTo: string;
      prUrl?: string;
      prNumber?: number;
      filesChanged?: string[];
      message: string;
    }
  ): Promise<void> {
    try {
      await this.withRetry(async () => {
        await this.linearClient.createComment(issue.id, options.message);
      });

      this.logger.info("Reported delegation success to Linear", {
        issueId: issue.id,
        delegateTo: options.delegateTo,
        prUrl: options.prUrl,
      });
    } catch (error) {
      this.logger.error("Failed to report delegation success", error as Error, {
        issueId: issue.id,
      });
    }
  }

  /**
   * Report delegation failure to Linear
   */
  async reportDelegationFailure(
    issue: any,
    options: {
      delegateTo: string;
      error: string;
      message: string;
    }
  ): Promise<void> {
    try {
      await this.withRetry(async () => {
        await this.linearClient.createComment(issue.id, options.message);
      });

      this.logger.error("Reported delegation failure to Linear", undefined, {
        issueId: issue.id,
        delegateTo: options.delegateTo,
        error: options.error,
      });
    } catch (error) {
      this.logger.error("Failed to report delegation failure", error as Error, {
        issueId: issue.id,
      });
    }
  }
}
