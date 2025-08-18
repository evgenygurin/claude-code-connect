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
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error("Failed to clean up temp directory", error);
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

