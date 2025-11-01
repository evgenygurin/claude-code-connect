/**
 * Claude Code executor for Linear integration
 */

import { spawn, ChildProcess } from "child_process";
import { promises as fs } from "fs";
import { join, resolve } from "path";
import type {
  ClaudeExecutionContext,
  ClaudeExecutionResult,
  GitCommit,
  Logger,
} from "../core/types.js";

/**
 * Claude Code executor
 */
export class ClaudeExecutor {
  private logger: Logger;
  private activeProcesses = new Map<string, ChildProcess>();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Execute Claude Code for issue
   */
  async execute(
    context: ClaudeExecutionContext,
  ): Promise<ClaudeExecutionResult> {
    const { session, issue, config, workingDir } = context;
    const startTime = Date.now();

    this.logger.info("Starting Claude execution", {
      sessionId: session.id,
      issueId: issue.id,
      issueIdentifier: issue.identifier,
      workingDir,
    });

    try {
      // Prepare working directory
      await this.prepareWorkingDirectory(workingDir, config.projectRootDir);

      // Generate prompt for Claude
      const prompt = await this.generatePrompt(context);

      // Write prompt to file
      const promptFile = join(workingDir, ".claude-prompt.md");
      await fs.writeFile(promptFile, prompt, "utf-8");

      // Execute Claude Code
      const claudeResult = await this.executeClaude(context, promptFile);

      // Parse git commits if any
      const commits = await this.parseGitCommits(workingDir);

      // Get modified files
      const filesModified = await this.getModifiedFiles(workingDir);

      const duration = Date.now() - startTime;

      const result: ClaudeExecutionResult = {
        success: claudeResult.exitCode === 0,
        output: claudeResult.output,
        error: claudeResult.error,
        filesModified,
        commits,
        duration,
        exitCode: claudeResult.exitCode,
      };

      this.logger.info("Claude execution completed", {
        sessionId: session.id,
        success: result.success,
        duration: result.duration,
        filesModified: filesModified.length,
        commits: commits.length,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error("Claude execution failed", error as Error, {
        sessionId: session.id,
        duration,
      });

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
   * Execute Claude Code CLI
   */
  private async executeClaude(
    context: ClaudeExecutionContext,
    promptFile: string,
  ): Promise<{ output: string; error?: string; exitCode: number }> {
    const { session, config, workingDir } = context;
    const claudePath = config.claudeExecutablePath || "claude";

    // Read the prompt from file
    const prompt = await fs.readFile(promptFile, "utf-8");

    return new Promise((resolve, reject) => {
      // Use shell to redirect prompt file to stdin
      // This avoids command line length limits and escaping issues
      const shellCommand = `${claudePath} --print < ${promptFile}`;

      this.logger.info("Spawning Claude process", {
        command: shellCommand,
        workingDir,
        promptFile,
        promptLength: prompt.length,
        sessionId: session.id,
      });

      const claudeProcess = spawn("sh", ["-c", shellCommand], {
        cwd: workingDir,
        stdio: "pipe",
        env: {
          ...process.env,
          // Add any Claude-specific environment variables
          CLAUDE_SESSION_ID: session.id,
          CLAUDE_ISSUE_ID: session.issueId,
        },
      });

      // Track process for potential cancellation
      this.activeProcesses.set(session.id, claudeProcess);

      let output = "";
      let errorOutput = "";

      claudeProcess.stdout?.on("data", (data) => {
        const chunk = data.toString();
        output += chunk;
        // Log Claude's output in real-time
        console.log(`[Claude ${session.id.substring(0, 8)}] ${chunk}`);
        this.logger.debug("Claude stdout", { sessionId: session.id, chunk });
      });

      claudeProcess.stderr?.on("data", (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        // Log Claude's errors in real-time
        console.error(`[Claude ${session.id.substring(0, 8)} ERROR] ${chunk}`);
        this.logger.warn("Claude stderr", { sessionId: session.id, chunk });
      });

      claudeProcess.on("close", (code) => {
        this.activeProcesses.delete(session.id);

        this.logger.info("🏁 Claude process finished", {
          sessionId: session.id,
          exitCode: code,
          outputLength: output.length,
          errorLength: errorOutput.length
        });

        resolve({
          output: output.trim(),
          error: errorOutput.trim() || undefined,
          exitCode: code || 0,
        });
      });

      claudeProcess.on("error", (error) => {
        this.activeProcesses.delete(session.id);

        this.logger.error("Claude process error", error, {
          sessionId: session.id,
        });

        reject(error);
      });

      // Set process timeout (e.g., 30 minutes)
      const timeout = setTimeout(
        () => {
          if (this.activeProcesses.has(session.id)) {
            this.logger.warn("Claude process timeout, killing", {
              sessionId: session.id,
            });
            claudeProcess.kill("SIGTERM");

            setTimeout(() => {
              if (this.activeProcesses.has(session.id)) {
                claudeProcess.kill("SIGKILL");
              }
            }, 5000);
          }
        },
        30 * 60 * 1000,
      ); // 30 minutes

      claudeProcess.on("close", () => {
        clearTimeout(timeout);
      });
    });
  }

  /**
   * Generate prompt for Claude based on issue context
   */
  private async generatePrompt(
    context: ClaudeExecutionContext,
  ): Promise<string> {
    const { issue, triggerComment } = context;

    const issueDescription = issue.description || "No description provided";
    const triggerText = triggerComment?.body || "";

    const prompt = `
# ${issue.identifier}: ${issue.title}

${issueDescription}

${triggerComment ? `\n---\n\n${triggerText}` : ""}
    `.trim();

    return prompt;
  }

  /**
   * Prepare working directory for Claude execution
   */
  private async prepareWorkingDirectory(
    workingDir: string,
    projectRoot: string,
  ): Promise<void> {
    this.logger.debug("Preparing working directory", {
      workingDir,
      projectRoot,
    });

    try {
      // Ensure working directory exists
      await fs.mkdir(workingDir, { recursive: true });

      // Check if this is a git worktree (already has .git file)
      const isWorktree = await this.isGitWorktree(workingDir);

      if (!isWorktree) {
        this.logger.debug("Not a git worktree, copying project files");
        // Copy project files if working directory is different from project root
        if (resolve(workingDir) !== resolve(projectRoot)) {
          await this.copyProjectFiles(projectRoot, workingDir);
        }
        // Ensure git is initialized
        await this.ensureGitRepo(workingDir);
      } else {
        this.logger.debug("Using existing git worktree", { workingDir });
      }
    } catch (error) {
      this.logger.error("Failed to prepare working directory", error as Error, {
        workingDir,
      });
      throw error;
    }
  }

  /**
   * Copy project files to working directory
   */
  private async copyProjectFiles(
    source: string,
    target: string,
  ): Promise<void> {
    this.logger.debug("Copying project files", { source, target });

    try {
      // Use git clone for better performance and .gitignore respect
      const { spawn } = await import("child_process");

      return new Promise((resolve, reject) => {
        const gitProcess = spawn("git", ["clone", source, target], {
          stdio: "pipe",
        });

        gitProcess.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Git clone failed with code ${code}`));
          }
        });

        gitProcess.on("error", reject);
      });
    } catch (error) {
      this.logger.error("Failed to copy project files", error as Error, {
        source,
        target,
      });
      throw error;
    }
  }

  /**
   * Check if directory is a git worktree
   */
  private async isGitWorktree(workingDir: string): Promise<boolean> {
    try {
      const gitPath = join(workingDir, ".git");
      const stats = await fs.stat(gitPath);

      // Git worktrees have a .git file (not directory) pointing to the main repo
      if (stats.isFile()) {
        return true;
      }

      // Also check if it's a regular git directory with files
      if (stats.isDirectory()) {
        const headPath = join(gitPath, "HEAD");
        await fs.access(headPath);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Ensure git repository is initialized
   */
  private async ensureGitRepo(workingDir: string): Promise<void> {
    try {
      await fs.access(join(workingDir, ".git"));
      this.logger.debug("Git repository exists", { workingDir });
    } catch {
      this.logger.debug("Initializing git repository", { workingDir });

      const { spawn } = await import("child_process");

      return new Promise((resolve, reject) => {
        const gitProcess = spawn("git", ["init"], {
          cwd: workingDir,
          stdio: "pipe",
        });

        gitProcess.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Git init failed with code ${code}`));
          }
        });

        gitProcess.on("error", reject);
      });
    }
  }

  /**
   * Parse git commits made during execution
   */
  private async parseGitCommits(workingDir: string): Promise<GitCommit[]> {
    try {
      const { spawn } = await import("child_process");

      return new Promise((resolve) => {
        const gitProcess = spawn(
          "git",
          [
            "log",
            "--oneline",
            "--format=%H|%s|%an|%ad|%D",
            "--date=iso",
            "-10", // Last 10 commits
          ],
          {
            cwd: workingDir,
            stdio: "pipe",
          },
        );

        let output = "";
        gitProcess.stdout?.on("data", (data) => {
          output += data.toString();
        });

        gitProcess.on("close", () => {
          const commits: GitCommit[] = [];
          const lines = output
            .trim()
            .split("\n")
            .filter((line) => line.trim());

          for (const line of lines) {
            const [hash, message, author, date] = line.split("|");
            if (hash && message && author && date) {
              commits.push({
                hash: hash.trim(),
                message: message.trim(),
                author: author.trim(),
                timestamp: new Date(date.trim()),
                files: [], // Could be enhanced to get file list
              });
            }
          }

          resolve(commits);
        });

        gitProcess.on("error", () => {
          resolve([]);
        });
      });
    } catch {
      return [];
    }
  }

  /**
   * Get list of modified files
   */
  private async getModifiedFiles(workingDir: string): Promise<string[]> {
    try {
      const { spawn } = await import("child_process");

      return new Promise((resolve) => {
        const gitProcess = spawn("git", ["diff", "--name-only", "HEAD~1"], {
          cwd: workingDir,
          stdio: "pipe",
        });

        let output = "";
        gitProcess.stdout?.on("data", (data) => {
          output += data.toString();
        });

        gitProcess.on("close", () => {
          const files = output
            .trim()
            .split("\n")
            .filter((file) => file.trim());
          resolve(files);
        });

        gitProcess.on("error", () => {
          resolve([]);
        });
      });
    } catch {
      return [];
    }
  }

  /**
   * Cancel running session
   */
  async cancelSession(sessionId: string): Promise<boolean> {
    const process = this.activeProcesses.get(sessionId);
    if (!process) {
      return false;
    }

    this.logger.info("Cancelling Claude session", { sessionId });

    process.kill("SIGTERM");

    // Force kill after 5 seconds
    setTimeout(() => {
      if (this.activeProcesses.has(sessionId)) {
        process.kill("SIGKILL");
      }
    }, 5000);

    return true;
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.activeProcesses.size;
  }

  /**
   * Get active session IDs
   */
  getActiveSessionIds(): string[] {
    return Array.from(this.activeProcesses.keys());
  }
}
