/**
 * GitHub API client for PR comment interactions
 */

import { Octokit } from "@octokit/rest";
import type {
  IntegrationConfig,
  Logger,
  GitHubPullRequest,
  GitHubComment,
} from "../core/types.js";

/**
 * GitHub client wrapper with Claude integration features
 */
export class GitHubClient {
  private octokit: Octokit;
  private config: IntegrationConfig;
  private logger: Logger;

  constructor(config: IntegrationConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;

    if (!config.githubToken) {
      throw new Error("GitHub token is required");
    }

    this.octokit = new Octokit({
      auth: config.githubToken,
    });

    this.logger.info("GitHub client initialized");
  }

  /**
   * Get authenticated user
   */
  async getCurrentUser() {
    try {
      const { data } = await this.octokit.users.getAuthenticated();
      return data;
    } catch (error) {
      this.logger.error("Failed to get authenticated user", error as Error);
      throw error;
    }
  }

  /**
   * Get pull request by number
   */
  async getPullRequest(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<GitHubPullRequest> {
    try {
      const { data } = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      return data as unknown as GitHubPullRequest;
    } catch (error) {
      this.logger.error("Failed to get pull request", error as Error, {
        owner,
        repo,
        prNumber,
      });
      throw error;
    }
  }

  /**
   * Get PR diff/patch
   */
  async getPullRequestDiff(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<string> {
    try {
      const { data } = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
        mediaType: {
          format: "diff",
        },
      });

      return data as unknown as string;
    } catch (error) {
      this.logger.error("Failed to get PR diff", error as Error, {
        owner,
        repo,
        prNumber,
      });
      throw error;
    }
  }

  /**
   * Get files changed in PR
   */
  async getPullRequestFiles(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<any[]> {
    try {
      const { data } = await this.octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
      });

      return data;
    } catch (error) {
      this.logger.error("Failed to get PR files", error as Error, {
        owner,
        repo,
        prNumber,
      });
      throw error;
    }
  }

  /**
   * Create a comment on a PR
   */
  async createPRComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string,
  ): Promise<GitHubComment> {
    try {
      const { data } = await this.octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });

      this.logger.info("Created PR comment", {
        owner,
        repo,
        prNumber,
        commentId: data.id,
      });

      return data as unknown as GitHubComment;
    } catch (error) {
      this.logger.error("Failed to create PR comment", error as Error, {
        owner,
        repo,
        prNumber,
      });
      throw error;
    }
  }

  /**
   * Reply to a specific comment
   */
  async replyToComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string,
    inReplyTo?: number,
  ): Promise<GitHubComment> {
    // GitHub doesn't have native reply threading for PR comments
    // We'll just create a regular comment and mention the original comment
    let replyBody = body;
    if (inReplyTo) {
      replyBody = `> Reply to comment #${inReplyTo}\n\n${body}`;
    }

    return this.createPRComment(owner, repo, prNumber, replyBody);
  }

  /**
   * Update a comment
   */
  async updateComment(
    owner: string,
    repo: string,
    commentId: number,
    body: string,
  ): Promise<GitHubComment> {
    try {
      const { data } = await this.octokit.issues.updateComment({
        owner,
        repo,
        comment_id: commentId,
        body,
      });

      this.logger.info("Updated comment", { owner, repo, commentId });

      return data as unknown as GitHubComment;
    } catch (error) {
      this.logger.error("Failed to update comment", error as Error, {
        owner,
        repo,
        commentId,
      });
      throw error;
    }
  }

  /**
   * Get PR comments
   */
  async getPRComments(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<GitHubComment[]> {
    try {
      const { data } = await this.octokit.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
      });

      return data as unknown as GitHubComment[];
    } catch (error) {
      this.logger.error("Failed to get PR comments", error as Error, {
        owner,
        repo,
        prNumber,
      });
      throw error;
    }
  }

  /**
   * Get PR review comments (inline code comments)
   */
  async getPRReviewComments(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<any[]> {
    try {
      const { data } = await this.octokit.pulls.listReviewComments({
        owner,
        repo,
        pull_number: prNumber,
      });

      return data;
    } catch (error) {
      this.logger.error("Failed to get PR review comments", error as Error, {
        owner,
        repo,
        prNumber,
      });
      throw error;
    }
  }

  /**
   * Get repository information
   */
  async getRepository(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.repos.get({
        owner,
        repo,
      });

      return data;
    } catch (error) {
      this.logger.error("Failed to get repository", error as Error, {
        owner,
        repo,
      });
      throw error;
    }
  }

  /**
   * Add reaction to comment
   */
  async addReactionToComment(
    owner: string,
    repo: string,
    commentId: number,
    reaction: "+1" | "-1" | "laugh" | "confused" | "heart" | "hooray" | "rocket" | "eyes",
  ): Promise<void> {
    try {
      await this.octokit.reactions.createForIssueComment({
        owner,
        repo,
        comment_id: commentId,
        content: reaction,
      });

      this.logger.info("Added reaction to comment", {
        owner,
        repo,
        commentId,
        reaction,
      });
    } catch (error) {
      this.logger.error("Failed to add reaction", error as Error, {
        owner,
        repo,
        commentId,
        reaction,
      });
    }
  }
}
