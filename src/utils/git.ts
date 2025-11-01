/**
 * Git worktree manager for process isolation
 */

import { spawn } from "child_process";
import { promises as fs } from "fs";
import { join, resolve, isAbsolute } from "path";
import type { Logger, GitCommit } from "../core/types.js";

/**
 * Git worktree manager for process isolation
 */
export class GitWorktreeManager {
  private logger: Logger;
  private projectRoot: string;
  private worktreeBaseDir: string;

  constructor(projectRoot: string, logger: Logger, worktreeBaseDir?: string) {
    this.projectRoot = resolve(projectRoot);
    this.logger = logger;
    // Create worktrees inside the project root, not where the server is running
    this.worktreeBaseDir = worktreeBaseDir || join(this.projectRoot, ".claude-worktrees");
  }

  /**
   * Create a new worktree for an issue
   */
  async createWorktree(
    issueId: string,
    baseBranch: string,
    branchName?: string
  ): Promise<string> {
    // Use provided branch name or create a unique one based on issue ID
    const finalBranchName = branchName || `claude-${issueId}-${Date.now().toString(36)}`;

    // Create a unique worktree path
    const worktreePath = join(this.worktreeBaseDir, finalBranchName.replace(/\//g, '-'));

    // Validate paths to prevent directory traversal
    this.validatePath(worktreePath);

    this.logger.debug("Creating git worktree", {
      issueId,
      branchName: finalBranchName,
      worktreePath,
      baseBranch,
    });

    try {
      // Ensure worktree base directory exists
      await fs.mkdir(this.worktreeBaseDir, { recursive: true });

      // Create worktree
      await this.executeGitCommand(
        ["worktree", "add", "-b", finalBranchName, worktreePath, baseBranch],
        this.projectRoot,
      );

      this.logger.info("Git worktree created successfully", {
        issueId,
        branchName: finalBranchName,
        worktreePath,
      });

      return worktreePath;
    } catch (error) {
      this.logger.error("Failed to create git worktree", error as Error, {
        issueId,
        branchName: finalBranchName,
        worktreePath,
      });
      throw error;
    }
  }

  /**
   * Remove a worktree
   */
  async removeWorktree(worktreePath: string): Promise<void> {
    // Validate path to prevent directory traversal
    this.validatePath(worktreePath);
    
    this.logger.debug("Removing git worktree", { worktreePath });

    try {
      // Remove worktree
      await this.executeGitCommand(
        ["worktree", "remove", "--force", worktreePath],
        this.projectRoot,
      );

      this.logger.info("Git worktree removed successfully", { worktreePath });
    } catch (error) {
      this.logger.error("Failed to remove git worktree", error as Error, {
        worktreePath,
      });
      throw error;
    }
  }

  /**
   * Commit changes in worktree
   */
  async commitResults(
    worktreePath: string,
    message: string,
    author: string = "Claude Agent <claude@anthropic.com>",
  ): Promise<string> {
    // Validate path to prevent directory traversal
    this.validatePath(worktreePath);
    
    this.logger.debug("Committing changes in worktree", {
      worktreePath,
      message,
    });

    try {
      // Add all changes
      await this.executeGitCommand(["add", "."], worktreePath);

      // Check if there are changes to commit
      const statusResult = await this.executeGitCommand(
        ["status", "--porcelain"],
        worktreePath,
      );
      if (!statusResult.trim()) {
        this.logger.debug("No changes to commit", { worktreePath });
        return "";
      }

      // Commit changes
      await this.executeGitCommand(
        ["commit", "-m", message, "--author", author],
        worktreePath,
      );

      // Get commit hash
      const commitHash = await this.executeGitCommand(
        ["rev-parse", "HEAD"],
        worktreePath,
      );

      this.logger.info("Changes committed successfully", {
        worktreePath,
        commitHash: commitHash.trim(),
      });

      return commitHash.trim();
    } catch (error) {
      this.logger.error("Failed to commit changes", error as Error, {
        worktreePath,
      });
      throw error;
    }
  }

  /**
   * Push changes to remote
   */
  async pushChanges(worktreePath: string, branchName: string): Promise<void> {
    // Validate path to prevent directory traversal
    this.validatePath(worktreePath);
    
    this.logger.debug("Pushing changes to remote", {
      worktreePath,
      branchName,
    });

    try {
      await this.executeGitCommand(
        ["push", "origin", branchName],
        worktreePath,
      );

      this.logger.info("Changes pushed to remote successfully", {
        worktreePath,
        branchName,
      });
    } catch (error) {
      this.logger.error("Failed to push changes to remote", error as Error, {
        worktreePath,
        branchName,
      });
      throw error;
    }
  }

  /**
   * Get branch name from worktree path
   */
  async getBranchName(worktreePath: string): Promise<string> {
    // Validate path to prevent directory traversal
    this.validatePath(worktreePath);
    
    try {
      const branchName = await this.executeGitCommand(
        ["rev-parse", "--abbrev-ref", "HEAD"],
        worktreePath,
      );

      return branchName.trim();
    } catch (error) {
      this.logger.error("Failed to get branch name", error as Error, {
        worktreePath,
      });
      throw error;
    }
  }

  /**
   * Get modified files in worktree
   */
  async getModifiedFiles(worktreePath: string): Promise<string[]> {
    // Validate path to prevent directory traversal
    this.validatePath(worktreePath);
    
    try {
      const result = await this.executeGitCommand(
        ["diff", "--name-only", "HEAD~1"],
        worktreePath,
      );

      return result
        .trim()
        .split("\n")
        .filter((file) => file.trim());
    } catch {
      return [];
    }
  }

  /**
   * Get commits in worktree with optimized batch operations
   */
  async getCommits(worktreePath: string, count: number = 10): Promise<GitCommit[]> {
    // Validate path to prevent directory traversal
    this.validatePath(worktreePath);
    
    try {
      // Use a single git command to get commits with files
      const result = await this.executeGitCommand(
        [
          "log",
          "--name-status",
          "--format=%H|%s|%an|%ad",
          "--date=iso",
          `-${count}`,
        ],
        worktreePath,
      );

      const commits: GitCommit[] = [];
      const lines = result.trim().split("\n");
      let currentCommit: GitCommit | null = null;
      let currentFiles: string[] = [];

      for (const line of lines) {
        if (line.includes("|")) {
          // This is a commit header line
          if (currentCommit) {
            // Save the previous commit with its files
            currentCommit.files = currentFiles;
            commits.push(currentCommit);
            currentFiles = [];
          }

          const [hash, message, author, date] = line.split("|");
          if (hash && message && author && date) {
            currentCommit = {
              hash: hash.trim(),
              message: message.trim(),
              author: author.trim(),
              timestamp: new Date(date.trim()),
              files: [],
            };
          }
        } else if (line.trim() && currentCommit) {
          // This is a file line (format: A/M/D filename)
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            // Extract just the filename (second part)
            currentFiles.push(parts[1]);
          }
        }
      }

      // Add the last commit
      if (currentCommit) {
        currentCommit.files = currentFiles;
        commits.push(currentCommit);
      }

      return commits;
    } catch (error) {
      this.logger.error("Failed to get commits", error as Error, {
        worktreePath,
      });
      return [];
    }
  }

  /**
   * Create a descriptive branch name from issue details
   */
  createDescriptiveBranchName(
    issueIdentifier: string, 
    issueTitle: string
  ): string {
    // Sanitize issue title for branch name
    const sanitizedTitle = issueTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50);
    
    // Add timestamp to ensure uniqueness
    const timestamp = Date.now().toString(36);
    
    // Create branch name
    return `claude/${issueIdentifier.toLowerCase()}-${sanitizedTitle}-${timestamp}`;
  }

  /**
   * Validate path to prevent directory traversal
   */
  private validatePath(path: string): void {
    // Ensure path is absolute
    if (!isAbsolute(path)) {
      throw new Error(`Path must be absolute: ${path}`);
    }

    // Ensure path is within allowed directories
    const normalizedPath = resolve(path);
    const normalizedWorktreeBase = resolve(this.worktreeBaseDir);
    const normalizedProjectRoot = resolve(this.projectRoot);

    if (
      !normalizedPath.startsWith(normalizedWorktreeBase) &&
      !normalizedPath.startsWith(normalizedProjectRoot)
    ) {
      throw new Error(
        `Path traversal detected. Path must be within worktree base or project root: ${path}`
      );
    }
  }

  /**
   * Execute git command
   */
  private executeGitCommand(args: string[], cwd: string): Promise<string> {
    // Validate working directory
    this.validatePath(cwd);

    this.logger.debug("Executing git command", {
      command: `git ${args.join(" ")}`,
      cwd
    });

    return new Promise((resolve, reject) => {
      const process = spawn("git", args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      process.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        if (code === 0) {
          this.logger.debug("Git command succeeded", {
            command: `git ${args.join(" ")}`,
            output: stdout.substring(0, 200)
          });
          resolve(stdout);
        } else {
          this.logger.error("Git command failed", new Error(stderr), {
            command: `git ${args.join(" ")}`,
            code,
            cwd,
            stderr: stderr.substring(0, 500)
          });
          reject(new Error(`Git command failed with code ${code}: ${stderr}`));
        }
      });

      process.on("error", (err) => {
        this.logger.error("Git process error", err, {
          command: `git ${args.join(" ")}`,
          cwd
        });
        reject(err);
      });
    });
  }
}

