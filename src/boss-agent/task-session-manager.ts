/**
 * Task Session Manager
 * Manages mapping between Codegen task IDs and Linear issues
 */

import type { Logger } from '../core/types.js';
import type { Issue } from '@linear/sdk';

/**
 * Task session data
 */
export interface TaskSession {
  /** Codegen task ID */
  taskId: string;
  /** Linear issue ID */
  issueId: string;
  /** Linear issue identifier (e.g., "BUG-123") */
  issueIdentifier: string;
  /** Issue title */
  issueTitle: string;
  /** Session start time */
  startedAt: Date;
  /** Session status */
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  /** Delegated to */
  delegatedTo: 'codegen' | 'claude' | 'manual';
  /** Delegation strategy */
  strategy?: string;
  /** Last update time */
  lastUpdatedAt: Date;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current step */
  currentStep?: string;
  /** Result data */
  result?: {
    prUrl?: string;
    prNumber?: number;
    filesChanged?: string[];
    duration?: number;
  };
  /** Error data */
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Task session storage interface
 */
export interface TaskSessionStorage {
  /** Save task session */
  save(session: TaskSession): Promise<void>;
  /** Get task session by task ID */
  getByTaskId(taskId: string): Promise<TaskSession | null>;
  /** Get task session by issue ID */
  getByIssueId(issueId: string): Promise<TaskSession | null>;
  /** Get all active sessions */
  getActiveSessions(): Promise<TaskSession[]>;
  /** Get all sessions */
  getAll(): Promise<TaskSession[]>;
  /** Update session status */
  updateStatus(taskId: string, status: TaskSession['status']): Promise<void>;
  /** Update session progress */
  updateProgress(taskId: string, progress: number, currentStep?: string): Promise<void>;
  /** Update session result */
  updateResult(taskId: string, result: TaskSession['result']): Promise<void>;
  /** Update session error */
  updateError(taskId: string, error: TaskSession['error']): Promise<void>;
  /** Delete session */
  delete(taskId: string): Promise<void>;
  /** Clean up old sessions */
  cleanup(maxAgeHours: number): Promise<number>;
}

/**
 * In-memory task session storage
 */
export class InMemoryTaskSessionStorage implements TaskSessionStorage {
  private sessions = new Map<string, TaskSession>();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async save(session: TaskSession): Promise<void> {
    this.sessions.set(session.taskId, session);
    this.logger.debug('Task session saved', {
      taskId: session.taskId,
      issueId: session.issueId,
      status: session.status,
    });
  }

  async getByTaskId(taskId: string): Promise<TaskSession | null> {
    return this.sessions.get(taskId) || null;
  }

  async getByIssueId(issueId: string): Promise<TaskSession | null> {
    for (const session of this.sessions.values()) {
      if (session.issueId === issueId) {
        return session;
      }
    }
    return null;
  }

  async getActiveSessions(): Promise<TaskSession[]> {
    return Array.from(this.sessions.values()).filter(
      (session) => session.status === 'active'
    );
  }

  async getAll(): Promise<TaskSession[]> {
    return Array.from(this.sessions.values());
  }

  async updateStatus(taskId: string, status: TaskSession['status']): Promise<void> {
    const session = this.sessions.get(taskId);
    if (session) {
      session.status = status;
      session.lastUpdatedAt = new Date();
      this.logger.debug('Task session status updated', {
        taskId,
        status,
      });
    }
  }

  async updateProgress(taskId: string, progress: number, currentStep?: string): Promise<void> {
    const session = this.sessions.get(taskId);
    if (session) {
      session.progress = progress;
      session.currentStep = currentStep;
      session.lastUpdatedAt = new Date();
      this.logger.debug('Task session progress updated', {
        taskId,
        progress,
        currentStep,
      });
    }
  }

  async updateResult(taskId: string, result: TaskSession['result']): Promise<void> {
    const session = this.sessions.get(taskId);
    if (session) {
      session.result = result;
      session.lastUpdatedAt = new Date();
      this.logger.debug('Task session result updated', {
        taskId,
        result,
      });
    }
  }

  async updateError(taskId: string, error: TaskSession['error']): Promise<void> {
    const session = this.sessions.get(taskId);
    if (session) {
      session.error = error;
      session.lastUpdatedAt = new Date();
      this.logger.debug('Task session error updated', {
        taskId,
        error,
      });
    }
  }

  async delete(taskId: string): Promise<void> {
    this.sessions.delete(taskId);
    this.logger.debug('Task session deleted', { taskId });
  }

  async cleanup(maxAgeHours: number): Promise<number> {
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    const now = Date.now();
    let deleted = 0;

    for (const [taskId, session] of this.sessions.entries()) {
      const age = now - session.lastUpdatedAt.getTime();
      if (age > maxAgeMs && session.status !== 'active') {
        this.sessions.delete(taskId);
        deleted++;
      }
    }

    if (deleted > 0) {
      this.logger.info('Cleaned up old task sessions', {
        deleted,
        maxAgeHours,
      });
    }

    return deleted;
  }
}

/**
 * Task Session Manager
 */
export class TaskSessionManager {
  private storage: TaskSessionStorage;
  private logger: Logger;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(storage: TaskSessionStorage, logger: Logger) {
    this.storage = storage;
    this.logger = logger;
  }

  /**
   * Create new task session
   */
  async createSession(
    taskId: string,
    issue: Issue,
    delegatedTo: 'codegen' | 'claude' | 'manual',
    strategy?: string,
    metadata?: Record<string, any>
  ): Promise<TaskSession> {
    const session: TaskSession = {
      taskId,
      issueId: issue.id,
      issueIdentifier: issue.identifier,
      issueTitle: issue.title,
      startedAt: new Date(),
      status: 'active',
      delegatedTo,
      strategy,
      lastUpdatedAt: new Date(),
      progress: 0,
      metadata,
    };

    await this.storage.save(session);

    this.logger.info('Task session created', {
      taskId,
      issueId: issue.id,
      issueIdentifier: issue.identifier,
      delegatedTo,
      strategy,
    });

    return session;
  }

  /**
   * Get session by task ID
   */
  async getSessionByTaskId(taskId: string): Promise<TaskSession | null> {
    return await this.storage.getByTaskId(taskId);
  }

  /**
   * Get session by issue ID
   */
  async getSessionByIssueId(issueId: string): Promise<TaskSession | null> {
    return await this.storage.getByIssueId(issueId);
  }

  /**
   * Get all active sessions
   */
  async getActiveSessions(): Promise<TaskSession[]> {
    return await this.storage.getActiveSessions();
  }

  /**
   * Get all sessions (active, completed, failed, cancelled)
   */
  async getAllSessions(): Promise<TaskSession[]> {
    return await this.storage.getAll();
  }

  /**
   * Update session progress
   */
  async updateProgress(
    taskId: string,
    progress: number,
    currentStep?: string
  ): Promise<void> {
    await this.storage.updateProgress(taskId, progress, currentStep);

    this.logger.info('Task session progress updated', {
      taskId,
      progress,
      currentStep,
    });
  }

  /**
   * Mark session as completed
   */
  async markCompleted(
    taskId: string,
    result?: TaskSession['result']
  ): Promise<void> {
    await this.storage.updateStatus(taskId, 'completed');
    if (result) {
      await this.storage.updateResult(taskId, result);
    }

    this.logger.info('Task session marked as completed', {
      taskId,
      result,
    });
  }

  /**
   * Mark session as failed
   */
  async markFailed(
    taskId: string,
    error: TaskSession['error']
  ): Promise<void> {
    await this.storage.updateStatus(taskId, 'failed');
    await this.storage.updateError(taskId, error);

    this.logger.error('Task session marked as failed', undefined, {
      taskId,
      error,
    });
  }

  /**
   * Mark session as cancelled
   */
  async markCancelled(taskId: string): Promise<void> {
    await this.storage.updateStatus(taskId, 'cancelled');

    this.logger.warn('Task session marked as cancelled', {
      taskId,
    });
  }

  /**
   * Delete session
   */
  async deleteSession(taskId: string): Promise<void> {
    await this.storage.delete(taskId);

    this.logger.info('Task session deleted', { taskId });
  }

  /**
   * Start automatic cleanup
   */
  startAutoCleanup(intervalHours: number = 24, maxAgeHours: number = 168): void {
    if (this.cleanupInterval) {
      this.logger.warn('Auto cleanup already started');
      return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;

    this.cleanupInterval = setInterval(async () => {
      try {
        const deleted = await this.storage.cleanup(maxAgeHours);
        if (deleted > 0) {
          this.logger.info('Auto cleanup completed', {
            deleted,
            maxAgeHours,
          });
        }
      } catch (error) {
        this.logger.error('Auto cleanup failed', error as Error);
      }
    }, intervalMs);

    this.logger.info('Auto cleanup started', {
      intervalHours,
      maxAgeHours,
    });
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
      this.logger.info('Auto cleanup stopped');
    }
  }

  /**
   * Get session statistics
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    const activeSessions = await this.storage.getActiveSessions();

    // Note: This is a simplified implementation
    // In production, you'd want to store all sessions and calculate properly
    return {
      total: activeSessions.length,
      active: activeSessions.length,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };
  }
}
