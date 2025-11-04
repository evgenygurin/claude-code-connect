/**
 * Session manager for Claude Code + Linear integration
 */

import { EventEmitter } from "events";
import { promises as fs } from "fs";
import type {
  ClaudeSession,
  ClaudeExecutionContext,
  ClaudeExecutionResult,
  IntegrationConfig,
  Logger,
  SessionStorage,
  SessionMetadata,
  SessionPermissions,
} from "../core/types.js";
import { ClaudeExecutor } from "../claude/executor.js";
import { createSession } from "./storage.js";
import { GitWorktreeManager } from "../utils/git.js";
import { BossAgentOrchestrator } from "../boss-agent/index.js";
import type { Issue, Comment } from "@linear/sdk";

/**
 * Session manager events
 */
export interface SessionManagerEvents {
  "session:created": (session: ClaudeSession) => void;
  "session:started": (session: ClaudeSession) => void;
  "session:completed": (session: ClaudeSession, result: ClaudeExecutionResult) => void;
  "session:failed": (session: ClaudeSession, error: Error) => void;
  "session:cancelled": (session: ClaudeSession) => void;
}

/**
 * Session manager for Claude Code + Linear integration
 */
export class SessionManager extends EventEmitter {
  protected config: IntegrationConfig;
  protected logger: Logger;
  protected storage: SessionStorage;
  private executor: ClaudeExecutor;
  private gitManager: GitWorktreeManager;
  private bossAgent: BossAgentOrchestrator | null;
  private activeExecutions = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    config: IntegrationConfig,
    logger: Logger,
    storage: SessionStorage
  ) {
    super();
    this.config = config;
    this.logger = logger;
    this.storage = storage;
    this.executor = new ClaudeExecutor(logger);
    this.gitManager = new GitWorktreeManager(config.projectRootDir, logger);

    // Initialize Boss Agent if enabled
    this.bossAgent = config.enableBossAgent
      ? new BossAgentOrchestrator(config, logger, storage)
      : null;

    // Setup Boss Agent event listeners
    if (this.bossAgent) {
      this.setupBossAgentEvents();
    }
  }

  /**
   * Setup Boss Agent event listeners
   */
  private setupBossAgentEvents(): void {
    if (!this.bossAgent) return;

    this.bossAgent.on("delegation:started", (session) => {
      this.logger.info("Boss Agent delegation started", {
        delegationId: session.id,
        issueId: session.issueId,
      });
    });

    this.bossAgent.on("delegation:completed", (session, result) => {
      this.logger.info("Boss Agent delegation completed", {
        delegationId: session.id,
        issueId: session.issueId,
        success: result.success,
      });
    });

    this.bossAgent.on("delegation:failed", (session, error) => {
      this.logger.error("Boss Agent delegation failed", error, {
        delegationId: session.id,
        issueId: session.issueId,
      });
    });
  }

  /**
   * Create a new session for an issue
   */
  async createSession(
    issue: Issue,
    triggerComment?: Comment
  ): Promise<ClaudeSession> {
    this.logger.info("Creating session for issue", {
      issueId: issue.id,
      identifier: issue.identifier,
      title: issue.title,
    });

    try {
      // Check if session already exists for this issue
      const existingSession = await this.storage.loadByIssue(issue.id);
      if (existingSession) {
        if (
          existingSession.status === "created" ||
          existingSession.status === "running"
        ) {
          this.logger.info("Session already exists for issue", {
            issueId: issue.id,
            sessionId: existingSession.id,
            status: existingSession.status,
          });
          return existingSession;
        } else {
          this.logger.info("Creating new session for issue (previous session completed)", {
            issueId: issue.id,
            previousSessionId: existingSession.id,
            previousStatus: existingSession.status,
          });
        }
      }

      // Get creator ID
      const creator = await issue.creator;
      let creatorId = "unknown";
      if (triggerComment) {
        const commentUser = await triggerComment.user;
        creatorId = commentUser?.id || "unknown";
      } else {
        creatorId = creator?.id || "unknown";
      }

      // Create session metadata
      const metadata: SessionMetadata = {
        createdBy: creatorId,
        organizationId: this.config.linearOrganizationId,
        projectScope: [this.config.projectRootDir],
        permissions: this.getDefaultPermissions(),
        triggerCommentId: triggerComment?.id,
        issueTitle: issue.title,
        triggerEventType: triggerComment ? "comment" : "issue",
      };

      // Create session
      const session = createSession(issue.id, issue.identifier, metadata);

      // Create branch name if enabled
      if (this.config.createBranches) {
        session.branchName = await this.createBranchName(issue);
      }

      // Save session
      await this.storage.save(session);

      // Emit event
      this.emit("session:created", session);

      this.logger.info("Session created", {
        issueId: issue.id,
        sessionId: session.id,
        branchName: session.branchName,
      });

      return session;
    } catch (error) {
      this.logger.error("Failed to create session", error as Error, {
        issueId: issue.id,
      });
      throw error;
    }
  }

  /**
   * Start a session
   */
  async startSession(
    sessionId: string,
    issue: Issue,
    triggerComment?: Comment
  ): Promise<void> {
    this.logger.info("Starting session", {
      sessionId,
      issueId: issue.id,
    });

    try {
      // Load session
      const session = await this.storage.load(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Check if session is already running
      if (session.status === "running") {
        this.logger.warn("Session already running", {
          sessionId,
          issueId: session.issueId,
        });
        return;
      }

      // Update session status
      await this.storage.updateStatus(sessionId, "running");

      // Try Boss Agent delegation first if enabled
      if (this.bossAgent) {
        this.logger.info("Attempting Boss Agent delegation", {
          sessionId,
          issueId: issue.id,
        });

        try {
          const delegationResult = await this.bossAgent.handleTask(
            issue,
            triggerComment
          );

          // If Boss Agent handled the task, we're done
          if (delegationResult) {
            this.logger.info("Boss Agent completed task successfully", {
              sessionId,
              issueId: issue.id,
              success: delegationResult.success,
            });

            // Update session status
            await this.storage.updateStatus(
              sessionId,
              delegationResult.success ? "completed" : "failed"
            );

            // Emit event
            const updatedSession = await this.storage.load(sessionId);
            if (updatedSession) {
              if (delegationResult.success) {
                this.emit("session:completed", updatedSession, {
                  success: true,
                  output: delegationResult.summary,
                  filesModified: delegationResult.filesModified,
                  commits: delegationResult.commits,
                  duration: delegationResult.duration,
                  exitCode: 0,
                });
              } else {
                this.emit(
                  "session:failed",
                  updatedSession,
                  new Error("Boss Agent delegation failed")
                );
              }
            }

            return;
          }

          // If Boss Agent returned null, fall through to normal execution
          this.logger.info("Boss Agent declined task, using direct execution", {
            sessionId,
            issueId: issue.id,
          });
        } catch (error) {
          this.logger.warn(
            "Boss Agent delegation failed, falling back to direct execution",
            {
              sessionId,
              issueId: issue.id,
              error: (error as Error).message,
            }
          );
          // Fall through to normal execution
        }
      }

      // Prepare working directory
      await this.prepareWorkingDirectory(session);

      // Create execution context
      const context: ClaudeExecutionContext = {
        session,
        issue,
        triggerComment,
        workingDir: session.workingDir,
        branchName: session.branchName,
        config: this.config,
        context: {},
      };

      // Execute Claude Code
      this.executeClaudeCode(context).catch((error) => {
        this.logger.error("Failed to execute Claude Code", error as Error, {
          sessionId,
          issueId: session.issueId,
        });
      });

      // Set session timeout
      this.setSessionTimeout(sessionId);

      // Emit event
      this.emit("session:started", session);

      this.logger.info("Session started", {
        sessionId,
        issueId: session.issueId,
      });
    } catch (error) {
      this.logger.error("Failed to start session", error as Error, {
        sessionId,
        issueId: issue.id,
      });

      // Update session status to failed
      await this.storage.updateStatus(sessionId, "failed");

      // Emit event
      const session = await this.storage.load(sessionId);
      if (session) {
        this.emit("session:failed", session, error as Error);
      }

      throw error;
    }
  }

  /**
   * Execute Claude Code
   */
  private async executeClaudeCode(
    context: ClaudeExecutionContext
  ): Promise<void> {
    const { session } = context;

    try {
      // Execute Claude Code
      const result = await this.executor.execute(context);

      // Update session status
      if (result.success) {
        await this.storage.updateStatus(session.id, "completed");
        this.logger.info("Session completed successfully", {
          sessionId: session.id,
          issueId: session.issueId,
          duration: result.duration,
        });

        // Emit event
        const updatedSession = await this.storage.load(session.id);
        if (updatedSession) {
          this.emit("session:completed", updatedSession, result);
        }
      } else {
        await this.storage.updateStatus(session.id, "failed");
        this.logger.error("Session failed", new Error(result.error), {
          sessionId: session.id,
          issueId: session.issueId,
          duration: result.duration,
        });

        // Emit event
        const updatedSession = await this.storage.load(session.id);
        if (updatedSession) {
          this.emit("session:failed", updatedSession, new Error(result.error || "Unknown error"));
        }
      }

      // Clear session timeout
      this.clearSessionTimeout(session.id);
    } catch (error) {
      // Update session status
      await this.storage.updateStatus(session.id, "failed");

      this.logger.error("Failed to execute Claude Code", error as Error, {
        sessionId: session.id,
        issueId: session.issueId,
      });

      // Emit event
      const updatedSession = await this.storage.load(session.id);
      if (updatedSession) {
        this.emit("session:failed", updatedSession, error as Error);
      }

      // Clear session timeout
      this.clearSessionTimeout(session.id);
    }
  }

  /**
   * Cancel a session
   */
  async cancelSession(sessionId: string): Promise<void> {
    this.logger.info("Cancelling session", { sessionId });

    try {
      // Load session
      const session = await this.storage.load(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Cancel Claude execution
      await this.executor.cancelSession(sessionId);

      // Update session status
      await this.storage.updateStatus(sessionId, "cancelled");

      // Clear session timeout
      this.clearSessionTimeout(sessionId);

      // Emit event
      const updatedSession = await this.storage.load(sessionId);
      if (updatedSession) {
        this.emit("session:cancelled", updatedSession);
      }

      this.logger.info("Session cancelled", { sessionId });
    } catch (error) {
      this.logger.error("Failed to cancel session", error as Error, {
        sessionId,
      });
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<ClaudeSession | null> {
    return await this.storage.load(sessionId);
  }

  /**
   * Get session by issue ID
   */
  async getSessionByIssue(issueId: string): Promise<ClaudeSession | null> {
    return await this.storage.loadByIssue(issueId);
  }

  /**
   * List all sessions
   */
  async listSessions(): Promise<ClaudeSession[]> {
    return await this.storage.list();
  }

  /**
   * List active sessions
   */
  async listActiveSessions(): Promise<ClaudeSession[]> {
    return await this.storage.listActive();
  }

  /**
   * Clean up old sessions
   */
  async cleanupOldSessions(maxAgeDays: number): Promise<number> {
    return await this.storage.cleanupOldSessions(maxAgeDays);
  }

  /**
   * Get session stats
   */
  async getStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    failedSessions: number;
    cancelledSessions: number;
  }> {
    const sessions = await this.storage.list();
    
    const stats = {
      totalSessions: sessions.length,
      activeSessions: 0,
      completedSessions: 0,
      failedSessions: 0,
      cancelledSessions: 0,
    };
    
    for (const session of sessions) {
      switch (session.status) {
        case "created":
        case "running":
          stats.activeSessions++;
          break;
        case "completed":
          stats.completedSessions++;
          break;
        case "failed":
          stats.failedSessions++;
          break;
        case "cancelled":
          stats.cancelledSessions++;
          break;
      }
    }
    
    return stats;
  }

  /**
   * Set session timeout
   */
  private setSessionTimeout(sessionId: string): void {
    // Clear existing timeout if any
    this.clearSessionTimeout(sessionId);
    
    // Set new timeout
    const timeout = setTimeout(async () => {
      this.logger.warn("Session timeout reached", { sessionId });
      
      try {
        await this.cancelSession(sessionId);
      } catch (error) {
        this.logger.error("Failed to cancel session on timeout", error as Error, {
          sessionId,
        });
      }
    }, this.config.timeoutMinutes * 60 * 1000);
    
    // Store timeout reference
    this.activeExecutions.set(sessionId, timeout);
  }

  /**
   * Clear session timeout
   */
  private clearSessionTimeout(sessionId: string): void {
    const timeout = this.activeExecutions.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeExecutions.delete(sessionId);
    }
  }

  /**
   * Prepare working directory
   */
  private async prepareWorkingDirectory(session: ClaudeSession): Promise<void> {
    try {
      // Create working directory
      await fs.mkdir(session.workingDir, { recursive: true });
      
      // Create git worktree if branch name is set
      if (session.branchName) {
        // Use git worktree manager to create worktree
        const worktreePath = await this.gitManager.createWorktree(
          session.id,
          this.config.defaultBranch,
          session.branchName
        );
        
        // Update session working directory
        session.workingDir = worktreePath;
        await this.storage.save(session);
      }
    } catch (error) {
      this.logger.error("Failed to prepare working directory", error as Error, {
        sessionId: session.id,
        workingDir: session.workingDir,
      });
      throw error;
    }
  }

  /**
   * Create branch name for issue
   */
  private async createBranchName(issue: Issue): Promise<string> {
    // Use the improved method from GitWorktreeManager
    return this.gitManager.createDescriptiveBranchName(
      issue.identifier,
      issue.title
    );
  }

  /**
   * Get default permissions
   */
  private getDefaultPermissions(): SessionPermissions {
    return {
      canRead: true,
      canWrite: true,
      canExecute: true,
      canNetwork: false,
      canModifyFileSystem: true,
    };
  }

  /**
   * On event listener with type checking
   */
  on<K extends keyof SessionManagerEvents>(
    event: K,
    listener: SessionManagerEvents[K]
  ): this {
    return super.on(event, listener);
  }

  /**
   * Once event listener with type checking
   */
  once<K extends keyof SessionManagerEvents>(
    event: K,
    listener: SessionManagerEvents[K]
  ): this {
    return super.once(event, listener);
  }

  /**
   * Emit event with type checking
   */
  emit<K extends keyof SessionManagerEvents>(
    event: K,
    ...args: Parameters<SessionManagerEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}

