/**
 * Git worktree manager for process isolation
 */

import { spawn } from "child_process";
import { promises as fs } from "fs";
import { join, resolve } from "path";
import type { Logger } from "../core/types.js";

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
  async createWorktree(issueId: string, baseBranch: string): Promise<string> {
    // Create a unique branch name based on issue ID
    const branchName = `claude-${issueId}-${Date.now().toString(36)}`;
    
    // Create a unique worktree path
    const worktreePath = join(this.worktreeBaseDir, branchName);
    
    this.logger.debug("Creating git worktree", {
      issueId,
      branchName,
      worktreePath,
      baseBranch
    });

    try {
      // Ensure worktree base directory exists
      await fs.mkdir(this.worktreeBaseDir, { recursive: true });
      
      // Create worktree
      await this.executeGitCommand(
        ["worktree", "add", "-b", branchName, worktreePath, baseBranch],
        this.projectRoot
      );
      
      this.logger.info("Git worktree created successfully", {
        issueId,
        branchName,
        worktreePath
      });
      
      return worktreePath;
    } catch (error) {
      this.logger.error("Failed to create git worktree", error as Error, {
        issueId,
        branchName,
        worktreePath
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
        this.projectRoot
      );
      
      this.logger.info("Git worktree removed successfully", { worktreePath });
    } catch (error) {
      this.logger.error("Failed to remove git worktree", error as Error, { worktreePath });
      throw error;
    }
  }

  /**
   * Commit changes in worktree
   */
  async commitResults(
    worktreePath: string, 
    message: string, 
    author: string = "Claude Agent <claude@anthropic.com>"
  ): Promise<string> {
    this.logger.debug("Committing changes in worktree", {
      worktreePath,
      message
    });

    try {
      // Add all changes
      await this.executeGitCommand(["add", "."], worktreePath);
      
      // Check if there are changes to commit
      const statusResult = await this.executeGitCommand(["status", "--porcelain"], worktreePath);
      if (!statusResult.trim()) {
        this.logger.debug("No changes to commit", { worktreePath });
        return "";
      }
      
      // Commit changes
      await this.executeGitCommand(
        ["commit", "-m", message, "--author", author],
        worktreePath
      );
      
      // Get commit hash
      const commitHash = await this.executeGitCommand(
        ["rev-parse", "HEAD"],
        worktreePath
      );
      
      this.logger.info("Changes committed successfully", {
        worktreePath,
        commitHash: commitHash.trim()
      });
      
      return commitHash.trim();
    } catch (error) {
      this.logger.error("Failed to commit changes", error as Error, { worktreePath });
      throw error;
    }
  }

  /**
   * Push changes to remote
   */
  async pushChanges(worktreePath: string, branchName: string): Promise<void> {
    this.logger.debug("Pushing changes to remote", {
      worktreePath,
      branchName
    });

    try {
      await this.executeGitCommand(
        ["push", "origin", branchName],
        worktreePath
      );
      
      this.logger.info("Changes pushed to remote successfully", {
        worktreePath,
        branchName
      });
    } catch (error) {
      this.logger.error("Failed to push changes to remote", error as Error, {
        worktreePath,
        branchName
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
        worktreePath
      );
      
      return branchName.trim();
    } catch (error) {
      this.logger.error("Failed to get branch name", error as Error, { worktreePath });
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
        worktreePath
      );
      
      return result.trim().split("\n").filter(file => file.trim());
    } catch {
      return [];
    }
  }

  /**
   * Get commits in worktree
   */
  async getCommits(worktreePath: string, count: number = 10): Promise<any[]> {
    try {
      const result = await this.executeGitCommand(
        [
          "log",
          "--oneline",
          "--format=%H|%s|%an|%ad|%D",
          "--date=iso",
          `-${count}`
        ],
        worktreePath
      );
      
      const commits: any[] = [];
      const lines = result.trim().split("\n").filter(line => line.trim());
      
      for (const line of lines) {
        const [hash, message, author, date] = line.split("|");
        if (hash && message && author && date) {
          commits.push({
            hash: hash.trim(),
            message: message.trim(),
            author: author.trim(),
            timestamp: new Date(date.trim()),
            files: [] // Could be enhanced to get file list
          });
        }
      }
      
      return commits;
    } catch {
      return [];
    }
  }

  /**
   * Execute git command
   */
  private executeGitCommand(args: string[], cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn("git", args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"]
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
          resolve(stdout);
        } else {
          reject(new Error(`Git command failed with code ${code}: ${stderr}`));
        }
      });
      
      process.on("error", reject);
    });
  }
}

