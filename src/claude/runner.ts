/**
 * Claude Code SDK runner
 */

import { query } from "@anthropic-ai/claude-code";
import { EventEmitter } from "events";
import type {
  ClaudeSession,
  ClaudeExecutionContext,
  ClaudeExecutionResult,
  IntegrationConfig,
  Logger,
} from "../core/types.js";
import { StreamingPrompt } from "./streaming-prompt.js";
import {
  createLinearMCPConfig,
  getLinearAllowedTools,
} from "../mcp/linear-config.js";
import { GitWorktreeManager } from "../utils/git.js";

/**
 * Claude Code SDK runner
 * Replaces the previous ClaudeExecutor with direct SDK integration
 */
export class ClaudeRunner extends EventEmitter {
  private logger: Logger;
  private config: IntegrationConfig;
  private activeSessions = new Map<
    string,
    {
      prompt: StreamingPrompt;
      abortController?: AbortController;
    }
  >();
  private gitManager: GitWorktreeManager;

  constructor(config: IntegrationConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.gitManager = new GitWorktreeManager(config.projectRootDir, logger);
  }

  /**
   * Start Claude execution for issue
   */
  async execute(
    context: ClaudeExecutionContext,
  ): Promise<ClaudeExecutionResult> {
    const { session, issue, triggerComment, workingDir } = context;
    const startTime = Date.now();

    this.logger.info("Starting Claude execution", {
      sessionId: session.id,
      issueId: issue.id,
      issueIdentifier: issue.identifier,
      workingDir,
    });

    try {
      // Create streaming prompt
      const streamingPrompt = new StreamingPrompt(
        issue,
        session,
        this.logger,
        triggerComment,
      );

      // Store session for potential cancellation
      this.activeSessions.set(session.id, { prompt: streamingPrompt });

      // Create abort controller for cancellation
      const abortController = new AbortController();
      this.activeSessions.get(session.id)!.abortController = abortController;

      // Get MCP configuration
      const mcpConfig = createLinearMCPConfig(this.config);

      // Get allowed tools
      const allowedTools = getLinearAllowedTools();

      // Execute Claude Code SDK query
      const claudeResult = await this.executeClaudeSDK(
        session,
        streamingPrompt,
        mcpConfig,
        allowedTools,
        abortController.signal,
      );

      // Parse git commits if any
      const commits = await this.gitManager.getCommits(workingDir);

      // Get modified files
      const filesModified = await this.gitManager.getModifiedFiles(workingDir);

      const duration = Date.now() - startTime;

      const result: ClaudeExecutionResult = {
        success: true,
        output: claudeResult.output || "",
        filesModified,
        commits,
        duration,
        exitCode: 0,
      };

      this.logger.info("Claude execution completed", {
        sessionId: session.id,
        success: result.success,
        duration: result.duration,
        filesModified: filesModified.length,
        commits: commits.length,
      });

      // Clean up
      this.activeSessions.delete(session.id);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error("Claude execution failed", error as Error, {
        sessionId: session.id,
        duration,
      });

      // Clean up
      this.activeSessions.delete(session.id);

      return {
        success: false,
        error: (error as Error).message,
        filesModified: [],
        commits: [],
        duration,
        exitCode: 1,
      };
    }
  }

  /**
   * Execute Claude Code SDK query
   */
  private async executeClaudeSDK(
    session: ClaudeSession,
    streamingPrompt: StreamingPrompt,
    mcpConfig: any,
    allowedTools: string[],
    _signal: AbortSignal,
  ): Promise<{ output: string }> {
    try {
      this.logger.debug("Starting Claude Code SDK query", {
        sessionId: session.id,
        mcpConfig: Object.keys(mcpConfig),
        allowedTools: allowedTools.length,
      });

      // Get messages from streaming prompt
      const messages = await streamingPrompt.getMessages();

      // Set up system prompt
      const systemPrompt = `
You are Claude, an AI assistant helping with software development tasks in Linear.
You have been assigned to work on a Linear issue and should focus on implementing
the requested changes efficiently and correctly.

You are working in a git worktree specifically created for this task, so you can
make changes without affecting the main codebase. All your changes will be committed
to a dedicated branch.

You have access to Linear tools through MCP, which allows you to interact with the
Linear API directly. Use these tools to get information about the issue, create comments,
and update the issue status as needed.
      `.trim();

      // Convert messages to async iterable
      const messageIterable = async function* () {
        for (const message of messages) {
          yield message;
        }
      };

      // Execute Claude Code SDK query
      const response = query({
        prompt: messageIterable(),
        options: {
          customSystemPrompt: systemPrompt,
          mcpServers: mcpConfig,
          allowedTools,
          abortController: new AbortController(),
        },
      });

      // Collect output from response stream
      const outputParts: string[] = [];
      let messageCount = 0;

      for await (const message of response) {
        messageCount++;
        if (message.type === "assistant" && message.message.content) {
          if (typeof message.message.content === "string") {
            outputParts.push(message.message.content);
          } else if (Array.isArray(message.message.content)) {
            for (const block of message.message.content) {
              if (block.type === "text") {
                outputParts.push(block.text);
              }
            }
          }
        }
      }

      const output = outputParts.join("\n\n");

      this.logger.debug("Claude Code SDK query completed", {
        sessionId: session.id,
        responseMessages: messageCount,
        outputLength: output.length,
      });

      return { output };
    } catch (error) {
      this.logger.error("Claude Code SDK query failed", error as Error, {
        sessionId: session.id,
      });
      throw error;
    }
  }

  /**
   * Cancel running session
   */
  async cancelSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.abortController) {
      return false;
    }

    this.logger.info("Cancelling Claude session", { sessionId });

    try {
      // Abort the query
      session.abortController.abort();

      // Remove from active sessions
      this.activeSessions.delete(sessionId);

      return true;
    } catch (error) {
      this.logger.error("Failed to cancel Claude session", error as Error, {
        sessionId,
      });
      return false;
    }
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Get active session IDs
   */
  getActiveSessionIds(): string[] {
    return Array.from(this.activeSessions.keys());
  }
}
