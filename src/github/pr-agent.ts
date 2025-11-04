/**
 * GitHub PR Comment Agent - analyzes comments and generates responses
 */

import type {
  IntegrationConfig,
  Logger,
  ProcessedGitHubEvent,
  GitHubComment,
  GitHubPullRequest,
} from "../core/types.js";
import { GitHubClient } from "./client.js";
import { spawn } from "child_process";

/**
 * PR Agent for handling comment responses
 */
export class GitHubPRAgent {
  private config: IntegrationConfig;
  private logger: Logger;
  private githubClient: GitHubClient;

  constructor(
    config: IntegrationConfig,
    logger: Logger,
    githubClient: GitHubClient,
  ) {
    this.config = config;
    this.logger = logger;
    this.githubClient = githubClient;
  }

  /**
   * Handle PR comment event
   */
  async handlePRComment(event: ProcessedGitHubEvent): Promise<void> {
    const { comment, pullRequest, repository } = event;

    if (!pullRequest) {
      this.logger.warn("PR comment event missing pull request data");
      return;
    }

    this.logger.info("Handling PR comment", {
      commentId: comment.id,
      prNumber: pullRequest.number,
      repository: repository.full_name,
    });

    try {
      // Add "eyes" reaction to show we're processing
      await this.githubClient.addReactionToComment(
        repository.owner.login,
        repository.name,
        comment.id,
        "eyes",
      );

      // Get PR context
      const prContext = await this.getPRContext(
        repository.owner.login,
        repository.name,
        pullRequest.number,
      );

      // Analyze comment and generate response
      const response = await this.analyzeCommentWithClaude(
        comment,
        pullRequest,
        prContext,
      );

      if (response) {
        // Post response
        await this.githubClient.createPRComment(
          repository.owner.login,
          repository.name,
          pullRequest.number,
          response,
        );

        // Add success reaction
        await this.githubClient.addReactionToComment(
          repository.owner.login,
          repository.name,
          comment.id,
          "+1",
        );

        this.logger.info("Successfully responded to PR comment", {
          commentId: comment.id,
          prNumber: pullRequest.number,
        });
      }
    } catch (error) {
      this.logger.error("Failed to handle PR comment", error as Error, {
        commentId: comment.id,
        prNumber: pullRequest.number,
      });

      // Add confused reaction on error
      await this.githubClient.addReactionToComment(
        repository.owner.login,
        repository.name,
        comment.id,
        "confused",
      );

      // Post error message
      await this.githubClient.createPRComment(
        repository.owner.login,
        repository.name,
        pullRequest.number,
        `❌ I encountered an error while processing your comment: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get PR context (diff, files, comments)
   */
  private async getPRContext(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<{
    diff: string;
    files: any[];
    comments: GitHubComment[];
  }> {
    try {
      const [diff, files, comments] = await Promise.all([
        this.githubClient.getPullRequestDiff(owner, repo, prNumber),
        this.githubClient.getPullRequestFiles(owner, repo, prNumber),
        this.githubClient.getPRComments(owner, repo, prNumber),
      ]);

      return { diff, files, comments };
    } catch (error) {
      this.logger.error("Failed to get PR context", error as Error, {
        owner,
        repo,
        prNumber,
      });
      throw error;
    }
  }

  /**
   * Analyze comment with Claude and generate response
   */
  private async analyzeCommentWithClaude(
    comment: GitHubComment,
    pullRequest: GitHubPullRequest,
    prContext: {
      diff: string;
      files: any[];
      comments: GitHubComment[];
    },
  ): Promise<string | null> {
    try {
      // Build prompt for Claude
      const prompt = this.buildAnalysisPrompt(comment, pullRequest, prContext);

      // Execute Claude
      const claudeResponse = await this.executeClaude(prompt);

      return claudeResponse;
    } catch (error) {
      this.logger.error(
        "Failed to analyze comment with Claude",
        error as Error,
        {
          commentId: comment.id,
          prNumber: pullRequest.number,
        },
      );
      throw error;
    }
  }

  /**
   * Build analysis prompt for Claude
   */
  private buildAnalysisPrompt(
    comment: GitHubComment,
    pullRequest: GitHubPullRequest,
    prContext: {
      diff: string;
      files: any[];
      comments: GitHubComment[];
    },
  ): string {
    const filesChanged = prContext.files.map((f) => f.filename).join(", ");
    const commentCount = prContext.comments.length;

    return `You are a helpful code review assistant analyzing a GitHub Pull Request comment.

**Pull Request Context:**
- Title: ${pullRequest.title}
- Description: ${pullRequest.body || "No description"}
- State: ${pullRequest.state}
- Number: #${pullRequest.number}
- Files changed: ${filesChanged}
- Total comments: ${commentCount}

**PR Diff (first 5000 chars):**
\`\`\`diff
${prContext.diff.substring(0, 5000)}
${prContext.diff.length > 5000 ? "... (truncated)" : ""}
\`\`\`

**Comment to analyze:**
From: @${comment.user.login}
${comment.body}

**Your task:**
1. Analyze the comment in the context of the PR changes
2. If it's a question, provide a clear, helpful answer
3. If it's a suggestion, evaluate it and provide feedback
4. If it's a request for changes, explain what needs to be done
5. Be concise, professional, and helpful

**Response guidelines:**
- Use markdown formatting
- Reference specific files or lines when relevant
- Provide code examples if helpful
- Be encouraging and constructive

Generate your response:`;
  }

  /**
   * Execute Claude CLI with prompt
   */
  private async executeClaude(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const claudePath = this.config.claudeExecutablePath || "claude";

      this.logger.debug("Executing Claude", { claudePath });

      const claudeProcess = spawn(claudePath, ["--prompt", prompt], {
        cwd: this.config.projectRootDir,
        env: {
          ...process.env,
        },
      });

      let stdout = "";
      let stderr = "";

      claudeProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      claudeProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      claudeProcess.on("close", (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          this.logger.error("Claude execution failed", new Error(stderr), {
            exitCode: code,
            stderr,
          });
          reject(new Error(`Claude execution failed: ${stderr}`));
        }
      });

      claudeProcess.on("error", (error) => {
        this.logger.error("Failed to spawn Claude process", error);
        reject(error);
      });
    });
  }
}
