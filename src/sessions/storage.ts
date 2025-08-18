/**
 * Session storage for Claude Code + Linear integration
 */

import { promises as fs } from "fs";
import { join } from "path";
import { nanoid } from "nanoid";
import type {
  ClaudeSession,
  SessionStatus,
  Logger,
  SessionStorage,
} from "../core/types.js";

/**
 * Storage options
 */
export interface StorageOptions {
  /** Storage directory */
  storageDir: string;
  /** File extension */
  fileExtension?: string;
}

/**
 * File-based session storage
 */
export class FileSessionStorage implements SessionStorage {
  private storageDir: string;
  private fileExtension: string;
  private logger: Logger;

  constructor(options: StorageOptions, logger: Logger) {
    this.storageDir = options.storageDir;
    this.fileExtension = options.fileExtension || ".json";
    this.logger = logger;
  }

  /**
   * Initialize storage
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      this.logger.debug("Session storage initialized", {
        storageDir: this.storageDir,
      });
    } catch (error) {
      this.logger.error("Failed to initialize session storage", error as Error, {
        storageDir: this.storageDir,
      });
      throw error;
    }
  }

  /**
   * Save session
   */
  async save(session: ClaudeSession): Promise<void> {
    const filePath = this.getFilePath(session.id);
    
    try {
      // Ensure directory exists
      await fs.mkdir(this.storageDir, { recursive: true });
      
      // Write session to file
      await fs.writeFile(
        filePath,
        JSON.stringify(session, null, 2),
        "utf-8"
      );
      
      this.logger.debug("Session saved", {
        sessionId: session.id,
        filePath,
      });
    } catch (error) {
      this.logger.error("Failed to save session", error as Error, {
        sessionId: session.id,
        filePath,
      });
      throw error;
    }
  }

  /**
   * Load session by ID
   */
  async load(sessionId: string): Promise<ClaudeSession | null> {
    const filePath = this.getFilePath(sessionId);
    
    try {
      const data = await fs.readFile(filePath, "utf-8");
      const session = JSON.parse(data) as ClaudeSession;
      
      // Convert date strings to Date objects
      session.startedAt = new Date(session.startedAt);
      session.lastActivityAt = new Date(session.lastActivityAt);
      if (session.completedAt) {
        session.completedAt = new Date(session.completedAt);
      }
      
      this.logger.debug("Session loaded", {
        sessionId,
        filePath,
      });
      
      return session;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.logger.debug("Session not found", { sessionId, filePath });
        return null;
      }
      
      this.logger.error("Failed to load session", error as Error, {
        sessionId,
        filePath,
      });
      return null;
    }
  }

  /**
   * Load session by issue ID
   */
  async loadByIssue(issueId: string): Promise<ClaudeSession | null> {
    try {
      const sessions = await this.list();
      const session = sessions.find((s) => s.issueId === issueId);
      
      if (session) {
        this.logger.debug("Session found by issue ID", {
          issueId,
          sessionId: session.id,
        });
      } else {
        this.logger.debug("No session found for issue ID", { issueId });
      }
      
      return session || null;
    } catch (error) {
      this.logger.error("Failed to load session by issue ID", error as Error, {
        issueId,
      });
      return null;
    }
  }

  /**
   * List all sessions
   */
  async list(): Promise<ClaudeSession[]> {
    try {
      // Ensure directory exists
      await fs.mkdir(this.storageDir, { recursive: true });
      
      // Get all session files
      const files = await fs.readdir(this.storageDir);
      const sessionFiles = files.filter((file) =>
        file.endsWith(this.fileExtension)
      );
      
      // Load all sessions
      const sessions: ClaudeSession[] = [];
      for (const file of sessionFiles) {
        const sessionId = file.replace(this.fileExtension, "");
        const session = await this.load(sessionId);
        if (session) {
          sessions.push(session);
        }
      }
      
      this.logger.debug("Sessions listed", {
        count: sessions.length,
      });
      
      return sessions;
    } catch (error) {
      this.logger.error("Failed to list sessions", error as Error);
      return [];
    }
  }

  /**
   * List active sessions
   */
  async listActive(): Promise<ClaudeSession[]> {
    try {
      const sessions = await this.list();
      const activeSessions = sessions.filter(
        (session) =>
          session.status === "created" || session.status === "running"
      );
      
      this.logger.debug("Active sessions listed", {
        count: activeSessions.length,
      });
      
      return activeSessions;
    } catch (error) {
      this.logger.error("Failed to list active sessions", error as Error);
      return [];
    }
  }

  /**
   * Delete session
   */
  async delete(sessionId: string): Promise<void> {
    const filePath = this.getFilePath(sessionId);
    
    try {
      await fs.unlink(filePath);
      
      this.logger.debug("Session deleted", {
        sessionId,
        filePath,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.logger.debug("Session not found for deletion", {
          sessionId,
          filePath,
        });
        return;
      }
      
      this.logger.error("Failed to delete session", error as Error, {
        sessionId,
        filePath,
      });
      throw error;
    }
  }

  /**
   * Update session status
   */
  async updateStatus(sessionId: string, status: SessionStatus): Promise<void> {
    try {
      const session = await this.load(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      
      // Update status and last activity time
      session.status = status;
      session.lastActivityAt = new Date();
      
      // If completed or failed, set completion time
      if (status === "completed" || status === "failed" || status === "cancelled") {
        session.completedAt = new Date();
      }
      
      await this.save(session);
      
      this.logger.debug("Session status updated", {
        sessionId,
        status,
      });
    } catch (error) {
      this.logger.error("Failed to update session status", error as Error, {
        sessionId,
        status,
      });
      throw error;
    }
  }

  /**
   * Get file path for session
   */
  private getFilePath(sessionId: string): string {
    return join(this.storageDir, `${sessionId}${this.fileExtension}`);
  }

  /**
   * Clean up old sessions
   */
  async cleanupOldSessions(maxAgeDays: number): Promise<number> {
    try {
      const sessions = await this.list();
      const now = new Date();
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
      
      let deletedCount = 0;
      
      for (const session of sessions) {
        // Skip active sessions
        if (session.status === "created" || session.status === "running") {
          continue;
        }
        
        // Check if session is older than max age
        const completedAt = session.completedAt || session.lastActivityAt;
        const ageMs = now.getTime() - completedAt.getTime();
        
        if (ageMs > maxAgeMs) {
          await this.delete(session.id);
          deletedCount++;
        }
      }
      
      this.logger.debug("Old sessions cleaned up", {
        deletedCount,
        maxAgeDays,
      });
      
      return deletedCount;
    } catch (error) {
      this.logger.error("Failed to clean up old sessions", error as Error, {
        maxAgeDays,
      });
      return 0;
    }
  }
}

/**
 * In-memory session storage (for testing)
 */
export class InMemorySessionStorage implements SessionStorage {
  private sessions = new Map<string, ClaudeSession>();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Save session
   */
  async save(session: ClaudeSession): Promise<void> {
    this.sessions.set(session.id, { ...session });
    this.logger.debug("Session saved in memory", { sessionId: session.id });
  }

  /**
   * Load session by ID
   */
  async load(sessionId: string): Promise<ClaudeSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.debug("Session not found in memory", { sessionId });
      return null;
    }
    
    this.logger.debug("Session loaded from memory", { sessionId });
    return { ...session };
  }

  /**
   * Load session by issue ID
   */
  async loadByIssue(issueId: string): Promise<ClaudeSession | null> {
    for (const session of this.sessions.values()) {
      if (session.issueId === issueId) {
        this.logger.debug("Session found by issue ID in memory", {
          issueId,
          sessionId: session.id,
        });
        return { ...session };
      }
    }
    
    this.logger.debug("No session found for issue ID in memory", { issueId });
    return null;
  }

  /**
   * List all sessions
   */
  async list(): Promise<ClaudeSession[]> {
    const sessions = Array.from(this.sessions.values()).map((session) => ({
      ...session,
    }));
    
    this.logger.debug("Sessions listed from memory", {
      count: sessions.length,
    });
    
    return sessions;
  }

  /**
   * List active sessions
   */
  async listActive(): Promise<ClaudeSession[]> {
    const sessions = Array.from(this.sessions.values())
      .filter(
        (session) =>
          session.status === "created" || session.status === "running"
      )
      .map((session) => ({ ...session }));
    
    this.logger.debug("Active sessions listed from memory", {
      count: sessions.length,
    });
    
    return sessions;
  }

  /**
   * Delete session
   */
  async delete(sessionId: string): Promise<void> {
    const deleted = this.sessions.delete(sessionId);
    
    if (deleted) {
      this.logger.debug("Session deleted from memory", { sessionId });
    } else {
      this.logger.debug("Session not found for deletion in memory", {
        sessionId,
      });
    }
  }

  /**
   * Update session status
   */
  async updateStatus(sessionId: string, status: SessionStatus): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    // Update status and last activity time
    session.status = status;
    session.lastActivityAt = new Date();
    
    // If completed or failed, set completion time
    if (status === "completed" || status === "failed" || status === "cancelled") {
      session.completedAt = new Date();
    }
    
    this.logger.debug("Session status updated in memory", {
      sessionId,
      status,
    });
  }

  /**
   * Clean up old sessions
   */
  async cleanupOldSessions(maxAgeDays: number): Promise<number> {
    const now = new Date();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    
    let deletedCount = 0;
    
    for (const session of this.sessions.values()) {
      // Skip active sessions
      if (session.status === "created" || session.status === "running") {
        continue;
      }
      
      // Check if session is older than max age
      const completedAt = session.completedAt || session.lastActivityAt;
      const ageMs = now.getTime() - completedAt.getTime();
      
      if (ageMs > maxAgeMs) {
        this.sessions.delete(session.id);
        deletedCount++;
      }
    }
    
    this.logger.debug("Old sessions cleaned up from memory", {
      deletedCount,
      maxAgeDays,
    });
    
    return deletedCount;
  }
}

/**
 * Create session storage factory
 */
export function createSessionStorage(
  type: "file" | "memory",
  logger: Logger,
  options?: StorageOptions
): SessionStorage {
  if (type === "file") {
    if (!options?.storageDir) {
      throw new Error("Storage directory is required for file storage");
    }
    
    const storage = new FileSessionStorage(options, logger);
    storage.initialize().catch((error) => {
      logger.error("Failed to initialize file session storage", error);
    });
    
    return storage;
  } else {
    return new InMemorySessionStorage(logger);
  }
}

/**
 * Create a new session
 */
export function createSession(
  issueId: string,
  issueIdentifier: string,
  metadata: any
): ClaudeSession {
  const sessionId = nanoid();
  const now = new Date();
  
  return {
    id: sessionId,
    issueId,
    issueIdentifier,
    status: "created",
    workingDir: `/tmp/claude-sessions/${sessionId}`,
    startedAt: now,
    lastActivityAt: now,
    metadata,
    securityContext: {
      allowedPaths: [],
      maxMemoryMB: 1024,
      maxExecutionTimeMs: 30 * 60 * 1000, // 30 minutes
      isolatedEnvironment: true,
    },
  };
}

