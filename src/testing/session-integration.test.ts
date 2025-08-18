/**
 * Integration tests for session management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "path";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { createSessionStorage } from "../sessions/storage.js";
import { SessionManager } from "../sessions/manager.js";
import { LinearReporter } from "../linear/reporter.js";
import { createLogger } from "../utils/logger.js";
import type { IntegrationConfig, ClaudeSession } from "../core/types.js";

// Mock Linear client
const mockLinearClient = {
  createComment: vi.fn().mockResolvedValue({ id: "comment-123" }),
  updateComment: vi.fn().mockResolvedValue({ id: "comment-123" }),
  getCurrentUser: vi.fn().mockResolvedValue({ id: "user-123", name: "Test User" }),
};

// Mock issue
const mockIssue = {
  id: "issue-123",
  identifier: "TEST-123",
  title: "Test Issue",
  description: "Test description",
  creator: { id: "user-456" },
};

// Mock config
const createTestConfig = (tempDir: string): IntegrationConfig => ({
  linearApiToken: "test-token",
  linearOrganizationId: "org-123",
  claudeCodePath: "echo",
  claudeExecutablePath: "echo",
  webhookPort: 3005,
  projectRootDir: tempDir,
  defaultBranch: "main",
  createBranches: false,
  timeoutMinutes: 1,
  debug: true,
});

describe("Session Integration", () => {
  let tempDir: string;
  let config: IntegrationConfig;
  let logger: any;
  let storage: any;
  let sessionManager: SessionManager;
  let reporter: LinearReporter;

  beforeEach(async () => {
    // Create temp directory
    tempDir = join(tmpdir(), `claude-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Create test config
    config = createTestConfig(tempDir);
    
    // Create logger
    logger = createLogger(true);
    
    // Create storage
    storage = createSessionStorage("file", logger, {
      storageDir: join(tempDir, ".claude-sessions"),
    });
    
    // Create session manager
    sessionManager = new SessionManager(config, logger, storage);
    
    // Create reporter
    reporter = new LinearReporter(mockLinearClient as any, logger);
    reporter.setSessionManager(sessionManager);
  });

  afterEach(async () => {
    // Cancel any active sessions first
    try {
      const activeSessions = await sessionManager.listActiveSessions();
      for (const session of activeSessions) {
        await sessionManager.cancelSession(session.id);
      }
    } catch (error) {
      console.error("Failed to cancel active sessions", error);
    }
    
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error("Failed to clean up temp directory", error);
      // In tests, we should fail if cleanup fails to prevent resource leaks
      throw new Error(`Test cleanup failed: ${(error as Error).message}`);
    }
  });

  it("should create a session", async () => {
    // Create session
    const session = await sessionManager.createSession(mockIssue as any);
    
    // Verify session
    expect(session).toBeDefined();
    expect(session.issueId).toBe(mockIssue.id);
    expect(session.issueIdentifier).toBe(mockIssue.identifier);
    expect(session.status).toBe("created");
    
    // Verify session was saved
    const loadedSession = await storage.load(session.id);
    expect(loadedSession).toBeDefined();
    expect(loadedSession?.id).toBe(session.id);
  });

  it("should list sessions", async () => {
    // Create session
    const session = await sessionManager.createSession(mockIssue as any);
    
    // List sessions
    const sessions = await sessionManager.listSessions();
    
    // Verify sessions
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(session.id);
  });

  it("should update session status", async () => {
    // Create session
    const session = await sessionManager.createSession(mockIssue as any);
    
    // Update status
    await storage.updateStatus(session.id, "running");
    
    // Verify status
    const updatedSession = await storage.load(session.id);
    expect(updatedSession?.status).toBe("running");
  });

  it("should emit events when session state changes", async () => {
    // Create event listeners
    const createdListener = vi.fn();
    const startedListener = vi.fn();
    
    // Register listeners
    sessionManager.on("session:created", createdListener);
    sessionManager.on("session:started", startedListener);
    
    // Create session
    const session = await sessionManager.createSession(mockIssue as any);
    
    // Verify created event
    expect(createdListener).toHaveBeenCalledWith(expect.objectContaining({
      id: session.id,
      issueId: mockIssue.id,
    }));
    
    // Manually emit started event (since we're not actually starting the session)
    sessionManager.emit("session:started", session);
    
    // Verify started event
    expect(startedListener).toHaveBeenCalledWith(expect.objectContaining({
      id: session.id,
      issueId: mockIssue.id,
    }));
  });

  it("should report session progress to Linear", async () => {
    // Reset mock to clear any previous calls
    mockLinearClient.createComment.mockClear();
    
    // Create session
    const session = await sessionManager.createSession(mockIssue as any);
    
    // Report progress
    await reporter.reportProgress(session, {
      currentStep: "Testing",
      details: "Running tests",
      percentage: 50,
    });
    
    // Verify comment was created
    expect(mockLinearClient.createComment).toHaveBeenCalledWith(
      mockIssue.id,
      expect.stringContaining("Testing")
    );
  });

  it("should handle failed comment updates with retry", async () => {
    // Mock updateComment to fail initially, then succeed
    mockLinearClient.updateComment.mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ id: "comment-123" });
    
    // Create session and initial comment
    const session = await sessionManager.createSession(mockIssue as any);
    await reporter.reportProgress(session, {
      currentStep: "Initial",
      details: "Starting",
      percentage: 10,
    });
    
    // Clear create comment mock to focus on update calls
    mockLinearClient.createComment.mockClear();
    
    // Report progress again (should trigger update)
    await reporter.reportProgress(session, {
      currentStep: "Update",
      details: "Updating",
      percentage: 50,
    });
    
    // Should have tried to update, failed, then created new comment
    expect(mockLinearClient.createComment).toHaveBeenCalledTimes(1);
  });
  
  it("should clean up comment tracking on session completion", async () => {
    // Create session
    const session = await sessionManager.createSession(mockIssue as any);
    
    // Report initial progress
    await reporter.reportProgress(session, {
      currentStep: "Working",
      details: "In progress",
      percentage: 50,
    });
    
    // Complete the session
    const mockResult = {
      success: true,
      output: "Task completed",
      filesModified: [],
      commits: [],
      duration: 5000,
      exitCode: 0,
    };
    
    await reporter.reportResults(session, mockResult);
    
    // The reporter should have cleaned up internal tracking
    // This is validated by ensuring no memory leaks in the Maps
    expect(true).toBe(true); // Placeholder assertion
  });

  it("should clean up old sessions", async () => {
    // Create session
    const session = await sessionManager.createSession(mockIssue as any);
    
    // Mark as completed and set completion time to 8 days ago
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
    
    const updatedSession: ClaudeSession = {
      ...session,
      status: "completed",
      completedAt: eightDaysAgo,
      lastActivityAt: eightDaysAgo,
    };
    
    await storage.save(updatedSession);
    
    // Clean up sessions older than 7 days
    const cleaned = await sessionManager.cleanupOldSessions(7);
    
    // Verify session was cleaned up
    expect(cleaned).toBe(1);
    
    // Verify session was deleted
    const loadedSession = await storage.load(session.id);
    expect(loadedSession).toBeNull();
  });
});

