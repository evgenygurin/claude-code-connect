/**
 * GitHub client for PR creation
 */

import { Octokit } from "@octokit/rest";
import type { Logger } from "../core/types.js";

export interface GitHubPROptions {
  owner: string;
  repo: string;
  head: string;
  base: string;
  title: string;
  body: string;
  draft?: boolean;
}

export class GitHubClient {
  private octokit: Octokit;
  private logger: Logger;

  constructor(token: string, logger: Logger) {
    this.octokit = new Octokit({ auth: token });
    this.logger = logger;
  }

  /**
   * Create a draft pull request
   */
  async createDraftPR(options: GitHubPROptions): Promise<{ url: string; number: number } | null> {
    try {
      this.logger.info("Creating draft PR", {
        repo: `${options.owner}/${options.repo}`,
        head: options.head,
        base: options.base,
      });

      const { data } = await this.octokit.pulls.create({
        owner: options.owner,
        repo: options.repo,
        head: options.head,
        base: options.base,
        title: options.title,
        body: options.body,
        draft: options.draft ?? true,
      });

      this.logger.info("Draft PR created", {
        url: data.html_url,
        number: data.number,
      });

      return {
        url: data.html_url,
        number: data.number,
      };
    } catch (error) {
      this.logger.error("Failed to create draft PR", error as Error, {
        repo: `${options.owner}/${options.repo}`,
        head: options.head,
      });
      return null;
    }
  }

  /**
   * Push branch to remote
   */
  async pushBranch(cwd: string, branchName: string): Promise<boolean> {
    const { spawn } = await import("child_process");

    return new Promise((resolve) => {
      this.logger.info("Pushing branch to remote", { branchName, cwd });

      const gitProcess = spawn("git", ["push", "-u", "origin", branchName], {
        cwd,
        stdio: "pipe",
      });

      let stderr = "";

      gitProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      gitProcess.on("close", (code) => {
        if (code === 0) {
          this.logger.info("Branch pushed successfully", { branchName });
          resolve(true);
        } else {
          this.logger.error("Failed to push branch", new Error(stderr), {
            branchName,
            code,
          });
          resolve(false);
        }
      });

      gitProcess.on("error", (error) => {
        this.logger.error("Git push error", error, { branchName });
        resolve(false);
      });
    });
  }
}
