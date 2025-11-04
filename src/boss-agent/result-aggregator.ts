/**
 * Result Aggregator - Combines results from multiple sub-agents
 */

import type {
  SubtaskResult,
  DelegationResult,
  Subtask,
  GitCommit,
  Logger,
} from "../core/types.js";

/**
 * Result Aggregator
 */
export class ResultAggregator {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Aggregate results from multiple subtasks
   */
  async aggregate(
    subtasks: Subtask[],
    results: SubtaskResult[]
  ): Promise<DelegationResult> {
    this.logger.info("Aggregating results", {
      subtaskCount: subtasks.length,
      resultCount: results.length,
    });

    // Calculate overall success
    const successCount = results.filter((r) => r.success).length;
    const success = successCount === results.length;

    // Collect all files modified
    const filesModified = this.deduplicateFiles(
      results.flatMap((r) => r.filesModified)
    );

    // Collect all commits
    const commits = this.deduplicateCommits(
      results.flatMap((r) => r.commits)
    );

    // Calculate total duration
    const duration = results.reduce((sum, r) => sum + r.duration, 0);

    // Find failed subtasks
    const failedSubtasks = subtasks
      .filter((st, idx) => !results[idx]?.success)
      .map((st) => st.id);

    // Generate summary
    const summary = this.generateSummary(
      subtasks,
      results,
      success,
      filesModified,
      commits
    );

    const delegationResult: DelegationResult = {
      success,
      summary,
      filesModified,
      commits,
      duration,
      subtaskResults: results,
      failedSubtasks,
    };

    this.logger.info("Results aggregated", {
      success,
      filesModified: filesModified.length,
      commits: commits.length,
      duration,
      failedSubtasks: failedSubtasks.length,
    });

    return delegationResult;
  }

  /**
   * Deduplicate file paths
   */
  private deduplicateFiles(files: string[]): string[] {
    return Array.from(new Set(files));
  }

  /**
   * Deduplicate commits by hash
   */
  private deduplicateCommits(commits: GitCommit[]): GitCommit[] {
    const seen = new Set<string>();
    const deduplicated: GitCommit[] = [];

    for (const commit of commits) {
      if (!seen.has(commit.hash)) {
        seen.add(commit.hash);
        deduplicated.push(commit);
      }
    }

    return deduplicated;
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(
    subtasks: Subtask[],
    results: SubtaskResult[],
    success: boolean,
    filesModified: string[],
    commits: GitCommit[]
  ): string {
    const sections: string[] = [];

    // Overall status
    if (success) {
      sections.push("✅ **All subtasks completed successfully**");
    } else {
      const successCount = results.filter((r) => r.success).length;
      sections.push(
        `⚠️ **${successCount}/${results.length} subtasks completed successfully**`
      );
    }

    sections.push(""); // Blank line

    // Subtask breakdown
    sections.push("## Subtask Results");
    sections.push("");

    for (let i = 0; i < subtasks.length; i++) {
      const subtask = subtasks[i];
      const result = results[i];

      if (!result) continue;

      const statusIcon = result.success ? "✅" : "❌";
      const duration = this.formatDuration(result.duration);

      sections.push(
        `${statusIcon} **${subtask.title}** (${subtask.agentType}) - ${duration}`
      );

      if (result.error) {
        sections.push(`   - Error: ${result.error}`);
      }

      if (result.filesModified.length > 0) {
        sections.push(
          `   - Modified ${result.filesModified.length} file(s)`
        );
      }

      if (result.commits.length > 0) {
        sections.push(`   - Made ${result.commits.length} commit(s)`);
      }
    }

    sections.push(""); // Blank line

    // Files changed
    if (filesModified.length > 0) {
      sections.push("## Files Modified");
      sections.push("");
      const displayFiles = filesModified.slice(0, 20);
      for (const file of displayFiles) {
        sections.push(`- \`${file}\``);
      }
      if (filesModified.length > 20) {
        sections.push(`- ... and ${filesModified.length - 20} more`);
      }
      sections.push("");
    }

    // Commits
    if (commits.length > 0) {
      sections.push("## Commits");
      sections.push("");
      const displayCommits = commits.slice(0, 10);
      for (const commit of displayCommits) {
        sections.push(`- \`${commit.hash.slice(0, 7)}\` ${commit.message}`);
      }
      if (commits.length > 10) {
        sections.push(`- ... and ${commits.length - 10} more`);
      }
      sections.push("");
    }

    // Summary stats
    sections.push("## Summary");
    sections.push("");
    sections.push(`- **Total Duration**: ${this.formatDuration(results.reduce((sum, r) => sum + r.duration, 0))}`);
    sections.push(`- **Files Modified**: ${filesModified.length}`);
    sections.push(`- **Commits Made**: ${commits.length}`);
    sections.push(`- **Subtasks Completed**: ${results.filter(r => r.success).length}/${results.length}`);

    return sections.join("\n");
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Generate markdown report
   */
  async generateReport(result: DelegationResult): Promise<string> {
    return result.summary;
  }
}
