/**
 * Linear API client for Claude Code integration
 */

import { LinearClient as LinearSDK, Issue, Comment, Team, User, WorkflowState } from "@linear/sdk";
import type { IntegrationConfig, Logger, ClaudeSession } from "../core/types.js";

/**
 * Linear client wrapper for Claude Code integration
 */
export class LinearClient {
  private client: LinearSDK;
  private logger: Logger;
  private config: IntegrationConfig;

  constructor(config: IntegrationConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    
    this.client = new LinearSDK({
      apiKey: config.linearApiToken
    });
  }

  /**
   * Get current user (agent)
   */
  async getCurrentUser(): Promise<User> {
    this.logger.debug("Getting current user");
    const viewer = await this.client.viewer;
    return viewer;
  }

  /**
   * Get issue by ID
   */
  async getIssue(issueId: string): Promise<Issue | null> {
    this.logger.debug("Getting issue", { issueId });
    
    try {
      const issue = await this.client.issue(issueId);
      return issue;
    } catch (error) {
      this.logger.error("Failed to get issue", error as Error, { issueId });
      return null;
    }
  }

  /**
   * Get issue by identifier (e.g., DEV-123)
   */
  async getIssueByIdentifier(identifier: string): Promise<Issue | null> {
    this.logger.debug("Getting issue by identifier", { identifier });
    
    try {
      const issues = await this.client.issues({
        filter: {
          id: {
            eq: identifier
          }
        },
        first: 1
      });

      const issue = issues.nodes[0];
      return issue || null;
    } catch (error) {
      this.logger.error("Failed to get issue by identifier", error as Error, { identifier });
      return null;
    }
  }

  /**
   * Get issues assigned to a specific user
   */
  async getAssignedIssues(userId?: string): Promise<Issue[]> {
    const targetUserId = userId || this.config.agentUserId;
    this.logger.debug("Getting assigned issues", { userId: targetUserId });

    if (!targetUserId) {
      // Get current user if no user specified
      const viewer = await this.getCurrentUser();
      return await this.getAssignedIssues(viewer.id);
    }

    try {
      const issues = await this.client.issues({
        filter: {
          assignee: {
            id: {
              eq: targetUserId
            }
          },
          state: {
            type: {
              nin: ["completed", "canceled"]
            }
          }
        },
        orderBy: "updatedAt"
      });

      return issues.nodes;
    } catch (error) {
      this.logger.error("Failed to get assigned issues", error as Error, { userId: targetUserId });
      return [];
    }
  }

  /**
   * Update issue status
   */
  async updateIssueStatus(issueId: string, statusId: string): Promise<boolean> {
    this.logger.debug("Updating issue status", { issueId, statusId });

    try {
      await this.client.updateIssue(issueId, {
        stateId: statusId
      });

      this.logger.info("Issue status updated", { issueId, statusId });
      return true;
    } catch (error) {
      this.logger.error("Failed to update issue status", error as Error, { issueId, statusId });
      return false;
    }
  }

  /**
   * Move issue to "started" status
   */
  async moveIssueToStarted(issue: Issue): Promise<boolean> {
    this.logger.debug("Moving issue to started status", { issueId: issue.id });

    try {
      // Get team workflow states
      const team = await issue.team;
      const states = await team.states();

      // Find "started" type state
      const startedState = states.nodes.find(state => state.type === "started");
      if (!startedState) {
        this.logger.warn("No 'started' state found for team", { teamId: team.id });
        return false;
      }

      return await this.updateIssueStatus(issue.id, startedState.id);
    } catch (error) {
      this.logger.error("Failed to move issue to started", error as Error, { issueId: issue.id });
      return false;
    }
  }

  /**
   * Move issue to "completed" status
   */
  async moveIssueToCompleted(issue: Issue): Promise<boolean> {
    this.logger.debug("Moving issue to completed status", { issueId: issue.id });

    try {
      // Get team workflow states
      const team = await issue.team;
      const states = await team.states();

      // Find "completed" type state
      const completedState = states.nodes.find(state => state.type === "completed");
      if (!completedState) {
        this.logger.warn("No 'completed' state found for team", { teamId: team.id });
        return false;
      }

      return await this.updateIssueStatus(issue.id, completedState.id);
    } catch (error) {
      this.logger.error("Failed to move issue to completed", error as Error, { issueId: issue.id });
      return false;
    }
  }

  /**
   * Create comment on issue
   */
  async createComment(issueId: string, body: string): Promise<Comment | null> {
    this.logger.debug("Creating comment", { issueId, bodyLength: body.length });

    try {
      const comment = await this.client.createComment({
        issueId,
        body
      });

      this.logger.info("Comment created", { issueId, commentId: (await comment.comment)?.id });
      return await comment.comment || null;
    } catch (error) {
      this.logger.error("Failed to create comment", error as Error, { issueId });
      return null;
    }
  }

  /**
   * Update existing comment
   */
  async updateComment(commentId: string, body: string): Promise<Comment | null> {
    this.logger.debug("Updating comment", { commentId, bodyLength: body.length });

    try {
      const comment = await this.client.updateComment(commentId, {
        body
      });

      this.logger.info("Comment updated", { commentId });
      return comment.comment || null;
    } catch (error) {
      this.logger.error("Failed to update comment", error as Error, { commentId });
      return null;
    }
  }

  /**
   * Get comments for issue
   */
  async getIssueComments(issueId: string): Promise<Comment[]> {
    this.logger.debug("Getting issue comments", { issueId });

    try {
      const issue = await this.client.issue(issueId);
      const comments = await issue.comments();
      
      return comments.nodes;
    } catch (error) {
      this.logger.error("Failed to get issue comments", error as Error, { issueId });
      return [];
    }
  }

  /**
   * Check if user is assigned to issue
   */
  async isUserAssignedToIssue(issueId: string, userId?: string): Promise<boolean> {
    const targetUserId = userId || this.config.agentUserId;
    
    if (!targetUserId) {
      const viewer = await this.getCurrentUser();
      return await this.isUserAssignedToIssue(issueId, viewer.id);
    }

    try {
      const issue = await this.getIssue(issueId);
      if (!issue) return false;

      const assignee = await issue.assignee;
      return assignee?.id === targetUserId;
    } catch (error) {
      this.logger.error("Failed to check issue assignment", error as Error, { issueId, userId: targetUserId });
      return false;
    }
  }

  /**
   * Check if comment mentions the agent
   */
  async isAgentMentioned(comment: Comment, agentUserId?: string): Promise<boolean> {
    const targetUserId = agentUserId || this.config.agentUserId;
    
    if (!targetUserId) {
      const viewer = await this.getCurrentUser();
      return await this.isAgentMentioned(comment, viewer.id);
    }

    // Check if comment body contains @mention or user ID
    const body = comment.body.toLowerCase();
    
    // Get user details for mention checking
    try {
      const user = await this.client.user(targetUserId);
      const username = user.name.toLowerCase();
      const displayName = user.displayName?.toLowerCase() || "";
      
      // Check various mention patterns
      const patterns = [
        `@${username}`,
        `@${displayName}`,
        `@claude`,
        `@agent`,
        targetUserId
      ];

      return patterns.some(pattern => pattern && body.includes(pattern));
    } catch (error) {
      this.logger.error("Failed to check agent mention", error as Error, { commentId: comment.id });
      return false;
    }
  }

  /**
   * Get team workflow states
   */
  async getTeamStates(teamId: string): Promise<WorkflowState[]> {
    this.logger.debug("Getting team states", { teamId });

    try {
      const team = await this.client.team(teamId);
      const states = await team.states();
      
      return states.nodes;
    } catch (error) {
      this.logger.error("Failed to get team states", error as Error, { teamId });
      return [];
    }
  }

  /**
   * Create a progress comment for session
   */
  async createProgressComment(session: ClaudeSession, message: string): Promise<Comment | null> {
    const progressMessage = `
🤖 **Claude Agent - ${session.issueIdentifier}**

${message}

---
*Session ID: ${session.id}*  
*Started: ${session.startedAt.toISOString()}*  
${session.branchName ? `*Branch: \`${session.branchName}\`*` : ""}
    `.trim();

    return await this.createComment(session.issueId, progressMessage);
  }

  /**
   * Update progress comment for session
   */
  async updateProgressComment(commentId: string, session: ClaudeSession, message: string): Promise<Comment | null> {
    const progressMessage = `
🤖 **Claude Agent - ${session.issueIdentifier}**

${message}

---
*Session ID: ${session.id}*  
*Started: ${session.startedAt.toISOString()}*  
${session.branchName ? `*Branch: \`${session.branchName}\`*` : ""}
${session.completedAt ? `*Completed: ${session.completedAt.toISOString()}*` : ""}
    `.trim();

    return await this.updateComment(commentId, progressMessage);
  }
}