/**
 * Mem0 Memory Manager
 * Integrates Mem0 memory storage with Linear webhook events
 */

import type { Issue, Comment } from "@linear/sdk";
import type { IntegrationConfig, Logger } from "../core/types.js";
import { Mem0ClientWrapper, type MemoryContext } from "./client.js";

/**
 * Manages Mem0 memory storage for Linear issues and Claude sessions
 */
export class Mem0MemoryManager {
  private client: Mem0ClientWrapper | null = null;
  private config: IntegrationConfig;
  private logger: Logger;
  private enabled: boolean;

  constructor(config: IntegrationConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.enabled = config.mem0Enabled || false;

    // Initialize Mem0 client if enabled and API key is provided
    if (this.enabled && config.mem0ApiKey) {
      try {
        this.client = new Mem0ClientWrapper(
          {
            apiKey: config.mem0ApiKey,
            debug: config.mem0VerboseLogging || false,
          },
          logger,
        );
        this.logger.info("Mem0 memory manager initialized successfully");
      } catch (error) {
        this.logger.error(
          "Failed to initialize Mem0 client",
          error instanceof Error ? error : new Error(String(error)),
        );
        this.enabled = false;
      }
    } else if (this.enabled && !config.mem0ApiKey) {
      this.logger.warn(
        "Mem0 integration is enabled but MEM0_API_KEY is not configured",
      );
      this.enabled = false;
    }
  }

  /**
   * Check if Mem0 is enabled and initialized
   */
  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  /**
   * Store issue context in memory
   * @param issue - Linear issue data
   * @param triggerReason - Reason why this issue triggered action
   */
  async storeIssueContext(issue: Issue, triggerReason?: string): Promise<void> {
    if (!this.isEnabled() || !this.client) {
      this.logger.debug("Mem0 not enabled, skipping issue context storage");
      return;
    }

    try {
      const description = await issue.description;
      const team = await issue.team;
      const assignee = await issue.assignee;

      const messages = [
        {
          role: "user" as const,
          content: `Linear Issue: ${issue.identifier} - ${issue.title}

Description: ${description || "No description provided"}

Status: ${(await issue.state)?.name || "Unknown"}
Priority: ${issue.priority || "None"}
${assignee ? `Assigned to: ${assignee.name || assignee.email}` : "Unassigned"}
${triggerReason ? `Trigger Reason: ${triggerReason}` : ""}`,
        },
      ];

      const creator = await issue.creator;

      const context: MemoryContext = {
        user_id: creator?.id,
        metadata: {
          issue_id: issue.id,
          issue_identifier: issue.identifier,
          team_id: team?.id,
          trigger_reason: triggerReason,
          timestamp: new Date().toISOString(),
        },
      };

      await this.client.addMemory(messages, context);

      this.logger.info("Stored issue context in Mem0", {
        issueId: issue.id,
        identifier: issue.identifier,
      });
    } catch (error) {
      this.logger.error(
        "Failed to store issue context in Mem0",
        error instanceof Error ? error : new Error(String(error)),
        {
          issueId: issue.id,
        },
      );
    }
  }

  /**
   * Store comment context in memory
   * @param comment - Linear comment data
   * @param issue - Associated Linear issue
   */
  async storeCommentContext(comment: Comment, issue: Issue): Promise<void> {
    if (!this.isEnabled() || !this.client) {
      this.logger.debug("Mem0 not enabled, skipping comment context storage");
      return;
    }

    try {
      const user = await comment.user;

      const messages = [
        {
          role: "user" as const,
          content: `Comment on ${issue.identifier} - ${issue.title}

Author: ${user?.name || user?.email || "Unknown"}
Comment: ${comment.body}

Context: This comment was made on issue ${issue.identifier}`,
        },
      ];

      const context: MemoryContext = {
        user_id: user?.id,
        metadata: {
          comment_id: comment.id,
          issue_id: issue.id,
          issue_identifier: issue.identifier,
          timestamp: new Date().toISOString(),
        },
      };

      await this.client.addMemory(messages, context);

      this.logger.info("Stored comment context in Mem0", {
        commentId: comment.id,
        issueId: issue.id,
      });
    } catch (error) {
      this.logger.error(
        "Failed to store comment context in Mem0",
        error instanceof Error ? error : new Error(String(error)),
        {
          commentId: comment.id,
        },
      );
    }
  }

  /**
   * Store session result in memory
   * @param sessionId - Claude session ID
   * @param issue - Associated Linear issue
   * @param success - Whether session completed successfully
   * @param output - Session output or error message
   */
  async storeSessionResult(
    sessionId: string,
    issue: Issue,
    success: boolean,
    output?: string,
  ): Promise<void> {
    if (!this.isEnabled() || !this.client) {
      this.logger.debug("Mem0 not enabled, skipping session result storage");
      return;
    }

    try {
      const messages = [
        {
          role: "assistant" as const,
          content: `Claude Session Result for ${issue.identifier}

Session ID: ${sessionId}
Status: ${success ? "Completed Successfully" : "Failed"}
${output ? `Output: ${output.substring(0, 1000)}` : ""}

Summary: Claude ${success ? "successfully completed" : "failed to complete"} work on issue "${issue.title}"`,
        },
      ];

      const context: MemoryContext = {
        agent_id: "claude",
        run_id: sessionId,
        metadata: {
          session_id: sessionId,
          issue_id: issue.id,
          issue_identifier: issue.identifier,
          success,
          timestamp: new Date().toISOString(),
        },
      };

      await this.client.addMemory(messages, context);

      this.logger.info("Stored session result in Mem0", {
        sessionId,
        issueId: issue.id,
        success,
      });
    } catch (error) {
      this.logger.error(
        "Failed to store session result in Mem0",
        error instanceof Error ? error : new Error(String(error)),
        {
          sessionId,
        },
      );
    }
  }

  /**
   * Search for relevant memories
   * @param query - Search query
   * @param userId - Optional user ID to filter by
   * @param limit - Maximum number of results
   */
  async searchMemories(
    query: string,
    userId?: string,
    limit: number = 10,
  ): Promise<any[]> {
    if (!this.isEnabled() || !this.client) {
      this.logger.debug("Mem0 not enabled, returning empty search results");
      return [];
    }

    try {
      const context: MemoryContext = userId ? { user_id: userId } : {};
      const results = await this.client.searchMemory(query, context, limit);

      this.logger.info("Searched Mem0 memories", {
        query,
        resultsCount: results.length,
      });

      return results;
    } catch (error) {
      this.logger.error(
        "Failed to search Mem0 memories",
        error instanceof Error ? error : new Error(String(error)),
        {
          query,
        },
      );
      return [];
    }
  }

  /**
   * Get context for a Linear issue from memory
   * Retrieves previous conversations and outcomes related to the issue
   */
  async getIssueContext(issueIdentifier: string): Promise<any[]> {
    if (!this.isEnabled() || !this.client) {
      return [];
    }

    try {
      return await this.searchMemories(
        `issue ${issueIdentifier} context history`,
        undefined,
        5,
      );
    } catch (error) {
      this.logger.error(
        "Failed to get issue context from Mem0",
        error instanceof Error ? error : new Error(String(error)),
        {
          issueIdentifier,
        },
      );
      return [];
    }
  }
}
