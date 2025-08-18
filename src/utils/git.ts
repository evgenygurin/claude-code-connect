/**
 * Git worktree manager for process isolation
 */

import { spawn } from "child_process";
import { promises as fs } from "fs";
import { join, resolve } from "path";
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
    this.worktreeBaseDir = worktreeBaseDir || join(process.cwd(), "worktrees");
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
   * Get commits in worktree with optimized file lookup
   */
  async getCommits(worktreePath: string, count: number = 10): Promise<GitCommit[]> {
    try {
      // Use single command to get commits with file changes
      const result = await this.executeGitCommand(
        [
          "log",
          "--name-status",
          "--format=%H|%s|%an|%ad|%D",
          "--date=iso",
          `-${count}`,
        ],
        worktreePath,
      );

      const commits: GitCommit[] = [];
      const lines = result.trim().split("\n").filter((line) => line.trim());
      
      let currentCommit: Partial<GitCommit> | null = null;
      let currentFiles: string[] = [];

      for (const line of lines) {
        if (line.includes("|")) {
          // This is a commit line
          if (currentCommit) {
            // Save previous commit
            commits.push({
              ...currentCommit,
              files: currentFiles,
            } as GitCommit);
          }
          
          // Parse new commit
          const [hash, message, author, date] = line.split("|");
          if (hash && message && author && date) {
            currentCommit = {
              hash: hash.trim(),
              message: message.trim(),
              author: author.trim(),
              timestamp: new Date(date.trim()),
            };
            currentFiles = [];
          }
        } else if (currentCommit && line.match(/^[AMDRC]\s+/)) {
          // This is a file change line (A=added, M=modified, D=deleted, R=renamed, C=copied)
          const filename = line.substring(2).trim();
          if (filename) {
            currentFiles.push(filename);
          }
        }
      }
      
      // Don't forget the last commit
      if (currentCommit) {
        commits.push({
          ...currentCommit,
          files: currentFiles,
        } as GitCommit);
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
   * Get files changed in a commit (kept for backward compatibility)
   */
  private async getFilesInCommit(worktreePath: string, commitHash: string): Promise<string[]> {
    try {
      const result = await this.executeGitCommand(
        ["diff-tree", "--no-commit-id", "--name-only", "-r", commitHash],
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
   * Create a descriptive branch name from issue details with uniqueness check
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
    
    // Create base branch name
    const baseName = `claude/${issueIdentifier.toLowerCase()}-${sanitizedTitle}`;
    
    // Add timestamp suffix for uniqueness
    const timestamp = Date.now().toString(36);
    
    return `${baseName}-${timestamp}`;
  }

  /**
   * Validate and sanitize working directory path
   */
  private validatePath(path: string): string {
    const resolvedPath = resolve(path);
    const projectRoot = resolve(this.projectRoot);
    
    // Ensure path is within project root or worktree directory
    if (!resolvedPath.startsWith(projectRoot) && !resolvedPath.startsWith(resolve(this.worktreeBaseDir))) {
      throw new Error(`Path traversal detected: ${path}`);
    }
    
    return resolvedPath;
  }

  /**
   * Execute git command with path validation and timeout
   */
  private executeGitCommand(args: string[], cwd: string, timeoutMs: number = 30000): Promise<string> {
    return new Promise((resolve, reject) => {
      // Validate the working directory path
      let validatedCwd: string;
      try {
        validatedCwd = this.validatePath(cwd);
      } catch (error) {
        reject(error);
        return;
      }

      const process = spawn("git", args, {
        cwd: validatedCwd,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          // Remove potentially dangerous env vars
          GIT_DIR: undefined,
          GIT_WORK_TREE: undefined,
        },
      });

      let stdout = "";
      let stderr = "";
      let isTimedOut = false;

      // Set timeout
      const timeout = setTimeout(() => {
        isTimedOut = true;
        process.kill('SIGTERM');
        reject(new Error(`Git command timed out after ${timeoutMs}ms: git ${args.join(' ')}`));
      }, timeoutMs);

      process.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        clearTimeout(timeout);
        if (isTimedOut) return; // Already handled by timeout
        
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Git command failed with code ${code}: ${stderr}`));
        }
      });

      process.on("error", (error) => {
        clearTimeout(timeout);
        if (!isTimedOut) {
          reject(error);
        }
      });
    });
  }
}

