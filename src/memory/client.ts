/**
 * Mem0 client wrapper for managing AI memory storage
 * Provides persistent memory across Claude sessions for better context retention
 */

import MemoryClient from "mem0ai";
import type { Logger } from "../core/types.js";

/**
 * Mem0 message format for adding memories
 * Note: Mem0 only supports 'user' and 'assistant' roles
 */
export interface Mem0Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * Mem0 search result
 */
export interface Mem0SearchResult {
  id: string;
  memory?: string;
  hash: string;
  metadata: Record<string, any> | null;
  score: number;
  created_at: Date;
  updated_at: Date;
  user_id: string | null;
  categories: string[];
}

/**
 * Mem0 memory entry
 */
export interface Mem0Memory {
  id: string;
  memory?: string;
  hash: string;
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
  user_id: string | null;
  categories: string[];
}

/**
 * Mem0 client configuration
 */
export interface Mem0Config {
  /** Mem0 API key */
  apiKey: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Context for adding memories
 */
export interface MemoryContext {
  /** User ID for scoping memories */
  user_id?: string;
  /** Agent ID for scoping memories */
  agent_id?: string;
  /** Run ID for tracking session */
  run_id?: string;
  /** Custom metadata */
  metadata?: Record<string, any>;
}

/**
 * Mem0 client wrapper with error handling and logging
 */
export class Mem0ClientWrapper {
  private client: MemoryClient;
  private logger: Logger;
  private debug: boolean;

  constructor(config: Mem0Config, logger: Logger) {
    this.client = new MemoryClient({ apiKey: config.apiKey });
    this.logger = logger;
    this.debug = config.debug || false;
  }

  /**
   * Add memories from conversation messages
   * @param messages - Array of conversation messages
   * @param context - Context for memory scoping (user_id, agent_id, etc.)
   * @returns Promise resolving when memories are added
   */
  async addMemory(
    messages: Mem0Message[],
    context: MemoryContext = {},
  ): Promise<void> {
    try {
      if (this.debug) {
        this.logger.debug("Adding memory to Mem0", {
          messageCount: messages.length,
          context,
        });
      }

      await this.client.add(messages, context);

      this.logger.info("Successfully added memory to Mem0", {
        messageCount: messages.length,
        userId: context.user_id,
        agentId: context.agent_id,
      });
    } catch (error) {
      this.logger.error(
        "Failed to add memory to Mem0",
        error instanceof Error ? error : new Error(String(error)),
        {
          messageCount: messages.length,
          context,
        },
      );
      throw error;
    }
  }

  /**
   * Search memories by query string
   * @param query - Search query
   * @param context - Context for filtering results (user_id, agent_id, etc.)
   * @param limit - Maximum number of results (default: 10)
   * @returns Array of search results with relevance scores
   */
  async searchMemory(
    query: string,
    context: MemoryContext = {},
    limit: number = 10,
  ): Promise<any[]> {
    try {
      if (this.debug) {
        this.logger.debug("Searching Mem0 memories", {
          query,
          context,
          limit,
        });
      }

      const filters = this.buildFilters(context);
      const results = await this.client.search(query, {
        api_version: "v2",
        filters,
        limit,
      });

      this.logger.info("Successfully searched Mem0 memories", {
        query,
        resultsCount: results.length,
        userId: context.user_id,
        agentId: context.agent_id,
      });

      return results;
    } catch (error) {
      this.logger.error(
        "Failed to search Mem0 memories",
        error instanceof Error ? error : new Error(String(error)),
        {
          query,
          context,
        },
      );
      throw error;
    }
  }

  /**
   * Get all memories for a specific context
   * @param context - Context for filtering memories (user_id, agent_id, etc.)
   * @returns Array of all memories matching the context
   */
  async getAllMemories(context: MemoryContext = {}): Promise<any[]> {
    try {
      if (this.debug) {
        this.logger.debug("Getting all Mem0 memories", { context });
      }

      const memories = await this.client.getAll(context);

      this.logger.info("Successfully retrieved all Mem0 memories", {
        count: memories.length,
        userId: context.user_id,
        agentId: context.agent_id,
      });

      return memories;
    } catch (error) {
      this.logger.error(
        "Failed to get all Mem0 memories",
        error instanceof Error ? error : new Error(String(error)),
        {
          context,
        },
      );
      throw error;
    }
  }

  /**
   * Delete a specific memory by ID
   * @param memoryId - ID of the memory to delete
   * @returns Promise resolving when memory is deleted
   */
  async deleteMemory(memoryId: string): Promise<void> {
    try {
      if (this.debug) {
        this.logger.debug("Deleting Mem0 memory", { memoryId });
      }

      await this.client.delete(memoryId);

      this.logger.info("Successfully deleted Mem0 memory", { memoryId });
    } catch (error) {
      this.logger.error(
        "Failed to delete Mem0 memory",
        error instanceof Error ? error : new Error(String(error)),
        {
          memoryId,
        },
      );
      throw error;
    }
  }

  /**
   * Build filter object from context
   * Used for v2 API search filtering
   */
  private buildFilters(context: MemoryContext): Record<string, any> {
    const filters: Record<string, any> = { OR: [] };

    if (context.user_id) {
      filters.OR.push({ user_id: context.user_id });
    }

    if (context.agent_id) {
      filters.OR.push({ agent_id: context.agent_id });
    }

    // If no filters specified, return empty object to get all results
    if (filters.OR.length === 0) {
      return {};
    }

    return filters;
  }

  /**
   * Format conversation for memory storage
   * Helper method to convert issue/comment data into Mem0 message format
   */
  static formatConversation(
    issueTitle: string,
    issueDescription: string,
    comments?: Array<{ body: string; author: string }>,
  ): Mem0Message[] {
    const messages: Mem0Message[] = [
      {
        role: "user",
        content: `Issue: ${issueTitle}\n\nDescription: ${issueDescription}`,
      },
    ];

    if (comments && comments.length > 0) {
      comments.forEach((comment) => {
        messages.push({
          role: comment.author === "claude" ? "assistant" : "user",
          content: comment.body,
        });
      });
    }

    return messages;
  }
}
