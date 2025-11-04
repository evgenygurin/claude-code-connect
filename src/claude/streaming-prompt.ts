/**
 * Streaming prompt for Claude Code SDK
 */

import type { SDKUserMessage } from "@anthropic-ai/claude-code";
import type { Issue, Comment } from "@linear/sdk";
import type { ClaudeSession, Logger } from "../core/types.js";

/**
 * Streaming prompt for Claude Code SDK
 * Handles dynamic message construction for Claude sessions
 */
export class StreamingPrompt {
  private logger: Logger;
  private messages: SDKUserMessage[] = [];
  private issue: Issue;
  private session: ClaudeSession;
  private triggerComment?: Comment;

  constructor(
    issue: Issue,
    session: ClaudeSession,
    logger: Logger,
    triggerComment?: Comment
  ) {
    this.issue = issue;
    this.session = session;
    this.logger = logger;
    this.triggerComment = triggerComment;
  }

  /**
   * Get all messages for Claude
   */
  async getMessages(): Promise<SDKUserMessage[]> {
    // If messages already constructed, return them
    if (this.messages.length > 0) {
      return this.messages;
    }

    // Construct initial messages
    await this.constructInitialMessages();
    
    return this.messages;
  }

  /**
   * Construct initial messages for Claude
   */
  private async constructInitialMessages(): Promise<void> {
    // Add main issue message
    this.addIssueMessage();
    
    // Add trigger comment if any
    if (this.triggerComment) {
      this.addTriggerCommentMessage();
    }
    
    this.logger.debug("Initial messages constructed", {
      sessionId: this.session.id,
      messageCount: this.messages.length
    });
  }

  /**
   * Add issue message
   */
  private addIssueMessage(): void {
    const issueDescription = this.issue.description || "No description provided";
    
    const message: SDKUserMessage = {
      role: "user",
      content: `
# Linear Issue: ${this.issue.identifier} - ${this.issue.title}

## Issue Description
${issueDescription}

## Context
- **Issue ID**: ${this.issue.id}
- **Issue URL**: ${this.issue.url}
- **Session ID**: ${this.session.id}
- **Working Directory**: ${this.session.workingDir}
${this.session.branchName ? `- **Git Branch**: ${this.session.branchName}` : ""}

## Instructions

You are Claude, an AI assistant helping with software development tasks in Linear. You have been assigned to work on this issue.

### Your Task
Analyze the issue description and implement the requested changes.

### Guidelines
1. **Read the issue carefully** - Understand what needs to be done
2. **Explore the codebase** - Use file operations to understand the project structure  
3. **Make targeted changes** - Focus on the specific requirements
4. **Test your changes** - Run tests if available
5. **Follow code standards** - Maintain consistency with existing code
6. **Commit your work** - Make clear, descriptive git commits

### Working Directory
You are working in: ${this.session.workingDir}

${this.session.branchName ? `
### Git Branch
A new branch has been created for this work: ${this.session.branchName}
All changes should be committed to this branch.
` : ""}

### Completion
When you're done:
1. Ensure all changes are committed
2. Verify tests pass (if applicable)
3. Provide a summary of what was implemented
4. The system will automatically report back to Linear

---

**Important**: Focus on delivering working, tested code that addresses the issue requirements. Be thorough but efficient.
      `.trim()
    };
    
    this.messages.push(message);
  }

  /**
   * Add trigger comment message
   */
  private addTriggerCommentMessage(): void {
    if (!this.triggerComment) return;
    
    const message: SDKUserMessage = {
      role: "user",
      content: `
## New Instructions from Comment

${this.triggerComment.body}

Please incorporate these instructions into your work on this issue.
      `.trim()
    };
    
    this.messages.push(message);
  }

  /**
   * Add progress update message
   */
  async addProgressUpdate(progress: string): Promise<void> {
    const message: SDKUserMessage = {
      role: "user",
      content: `
## Progress Update

${progress}

Please continue your work with this additional information.
      `.trim()
    };
    
    this.messages.push(message);
    
    this.logger.debug("Progress update added to messages", {
      sessionId: this.session.id,
      messageCount: this.messages.length
    });
  }

  /**
   * Add system message
   */
  async addSystemMessage(content: string): Promise<void> {
    const message: SDKUserMessage = {
      role: "user",
      content: `
## System Message

${content}
      `.trim()
    };
    
    this.messages.push(message);
    
    this.logger.debug("System message added", {
      sessionId: this.session.id,
      messageCount: this.messages.length
    });
  }
}

