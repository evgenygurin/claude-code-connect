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
    const claudePath = config.claudeCodePath || "claude-code";

    return new Promise((resolve, reject) => {
      const args = ["--prompt-file", promptFile, "--working-dir", workingDir];

      this.logger.debug("Spawning Claude process", {
        command: claudePath,
        args,
        sessionId: session.id,
      });

      const claudeProcess = spawn(claudePath, args, {
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
        this.logger.debug("Claude stdout", { sessionId: session.id, chunk });
      });

      claudeProcess.stderr?.on("data", (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        this.logger.debug("Claude stderr", { sessionId: session.id, chunk });
      });

      claudeProcess.on("close", (code) => {
        this.activeProcesses.delete(session.id);

        this.logger.debug("Claude process finished", {
          sessionId: session.id,
          exitCode: code,
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
    const { issue, triggerComment, session } = context;

    const issueDescription = issue.description || "No description provided";
    const triggerText = triggerComment?.body || "";

    const prompt = `
# Linear Issue: ${issue.identifier} - ${issue.title}

## Issue Description
${issueDescription}

${
  triggerComment
    ? `
## Trigger Comment
${triggerText}
`
    : ""
}

## Context
- **Issue ID**: ${issue.id}
- **Issue URL**: ${issue.url}
- **Session ID**: ${session.id}
- **Working Directory**: ${session.workingDir}
${session.branchName ? `- **Git Branch**: ${session.branchName}` : ""}

## Instructions

You are Claude, an AI assistant helping with software development tasks in Linear. You have been assigned to work on this issue.

### Your Task
${
  triggerComment
    ? "Analyze the trigger comment above and follow the instructions provided there."
    : "Analyze the issue description and implement the requested changes."
}

### Guidelines
1. **Read the issue carefully** - Understand what needs to be done
2. **Explore the codebase** - Use file operations to understand the project structure  
3. **Make targeted changes** - Focus on the specific requirements
4. **Test your changes** - Run tests if available
5. **Follow code standards** - Maintain consistency with existing code
6. **Commit your work** - Make clear, descriptive git commits

### Available Tools
You have access to all standard Claude Code tools:
- File operations (Read, Write, Edit, etc.)
- Git operations (via Bash tool)
- Code analysis and search tools
- Testing and build tools

### Working Directory
You are working in: ${session.workingDir}

${
  session.branchName
    ? `
### Git Branch
A new branch has been created for this work: ${session.branchName}
All changes should be committed to this branch.
`
    : ""
}

### Completion
When you're done:
1. Ensure all changes are committed
2. Verify tests pass (if applicable)
3. Provide a summary of what was implemented
4. The system will automatically report back to Linear

---

**Important**: Focus on delivering working, tested code that addresses the issue requirements. Be thorough but efficient.
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

      // Copy project files if working directory is different from project root
      if (resolve(workingDir) !== resolve(projectRoot)) {
        await this.copyProjectFiles(projectRoot, workingDir);
      }

      // Ensure git is initialized
      await this.ensureGitRepo(workingDir);
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
