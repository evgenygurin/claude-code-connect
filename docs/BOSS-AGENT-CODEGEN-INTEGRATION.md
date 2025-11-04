# Boss Agent + Codegen Integration Plan

**Created:** 2025-01-23  
**Status:** 🎯 Design Phase  
**Target:** Phase 2 - Full Codegen Delegation  
**Timeline:** 4 weeks

---

## 🎯 Executive Summary

**Boss Agent** is a strategic coordination layer that **NEVER codes directly**. Instead, it delegates ALL development work to **Codegen agents** via the Codegen API, while maintaining high-level oversight, monitoring, and reporting.

### Core Principle

> **Boss Agent = Engineering Manager, NOT Developer**

```text
┌─────────────────────────────────────────────────────────┐
│                     BOSS AGENT                          │
│  (Strategic Coordinator - NO Direct Coding)             │
│                                                         │
│  ✅ Analyzes tasks                                      │
│  ✅ Delegates to Codegen                                │
│  ✅ Monitors execution                                  │
│  ✅ Reports outcomes                                    │
│  ✅ Learns from decisions                               │
│  ❌ NEVER writes code itself                            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   CODEGEN API         │
              │  (Development Layer)  │
              └───────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┏━━━━━━━━━┓   ┏━━━━━━━━━┓   ┏━━━━━━━━━┓
    ┃ Agent 1 ┃   ┃ Agent 2 ┃   ┃ Agent 3 ┃
    ┃ Feature ┃   ┃ Bug Fix ┃   ┃  Tests  ┃
    ┗━━━━━━━━━┛   ┗━━━━━━━━━┛   ┗━━━━━━━━━┛
```

---

## 📊 Architecture Overview

### Current State (Phase 1 - ✅ Complete)

```typescript
// Current: Boss Agent DOES coding itself
Linear Issue → Boss Agent → Claude Code Executor → Git/PR
```

### Target State (Phase 2 - 🚧 In Progress)

```typescript
// Target: Boss Agent DELEGATES to Codegen
Linear Issue → Boss Agent → Codegen API → Codegen Agent(s) → Git/PR
                    ↓
              Monitor & Report
```

### System Components

#### 1. Boss Agent (Coordinator Layer)

**Location:** `src/boss-agent/`

**Responsibilities:**

- 🧠 **Task Analysis** - Classifies complexity, priority, type
- 🎯 **Delegation** - Creates Codegen agent runs via API
- 👀 **Monitoring** - Tracks agent execution progress
- 📊 **Reporting** - Updates stakeholders (Linear/Slack)
- 💾 **Learning** - Stores decisions in Mem0

**Key Files:**

- `agent.ts` - Main Boss Agent coordinator
- `decision-engine.ts` - Task analysis and routing logic
- `task-classifier.ts` - Complexity/type detection
- `workflows/orchestrator.ts` - End-to-end workflow management
- `monitoring/task-monitor.ts` - Progress tracking
- `reporter.ts` - Stakeholder communication

#### 2. Codegen Integration Layer

**Location:** `src/codegen/` (NEW)

**Components:**

- `client.ts` - Codegen API wrapper
- `prompt-builder.ts` - Context-rich prompt generation
- `webhook-handler.ts` - Codegen event processing
- `task-mapper.ts` - Boss task → Codegen prompt mapping
- `status-monitor.ts` - Agent run status tracking

#### 3. Existing Infrastructure (Reuse)

**Integration Server** (`src/server/integration.ts`)

- Handles Linear/GitHub webhooks
- Routes events to Boss Agent
- Provides management API

**Session Management** (`src/sessions/manager.ts`)

- Will track Codegen agent runs (not Claude sessions)
- Links Linear issues → Codegen agent run IDs

**Event Router** (`src/webhooks/router.ts`)

- Processes incoming webhooks
- Triggers Boss Agent workflows

---

## 🔌 Codegen API Integration

### API Architecture

Codegen provides three integration methods:

1. **REST API** - Direct programmatic control ✅ **PRIMARY**
2. **Python SDK** - Python wrapper (not applicable)
3. **GitHub App** - Webhook-based (supplementary)

### REST API Endpoints

**Base URL:** `https://api.codegen.com/v1`

#### Core Endpoints

```typescript
// 1. Create Agent Run
POST /organizations/{org_id}/agent/run
Headers: { Authorization: "Bearer <token>" }
Body: {
  prompt: string,           // Task description
  repo_id?: number,         // GitHub repo ID
  base_branch?: string,     // Base branch name
  linear_issue_id?: string, // Link to Linear issue
}
Response: {
  id: number,               // Agent run ID
  status: "queued" | "in_progress" | "completed" | "failed",
  result?: string,          // Result when completed
  web_url: string,          // View in Codegen UI
}

// 2. Get Agent Run Status
GET /organizations/{org_id}/agent/run/{agent_run_id}
Response: {
  id: number,
  status: string,
  result?: string,
  web_url: string,
  created_at: string,
  updated_at: string,
}

// 3. Resume Agent Run (Follow-up)
POST /organizations/{org_id}/agent/run/resume
Body: {
  agent_run_id: number,
  prompt: string,           // Follow-up instruction
}

// 4. Get Agent Run Logs (Detailed Trace)
GET /organizations/{org_id}/agent/run/{agent_run_id}/logs
Response: {
  logs: Array<{
    timestamp: string,
    level: "info" | "warning" | "error",
    message: string,
    metadata?: object,
  }>
}
```

#### Authentication

```typescript
// Required credentials
const config = {
  apiToken: process.env.CODEGEN_API_TOKEN,    // From codegen.com/token
  orgId: process.env.CODEGEN_ORG_ID,          // From codegen.com/token
  baseUrl: "https://api.codegen.com/v1",
};

// All requests require Bearer token
headers: {
  "Authorization": `Bearer ${config.apiToken}`,
  "Content-Type": "application/json"
}
```

#### Rate Limits

```text
Standard endpoints:    60 requests / 30 seconds
Agent creation:        10 requests / minute
Setup commands:        5 requests / minute
Log analysis:          5 requests / minute
```

### Integration Features

#### 1. Linear Integration

Codegen has **native Linear integration**:

- Agents can read/write Linear issues
- Automatically link PRs to Linear issues
- Post progress updates as comments
- Create sub-issues for complex tasks
- **Multi-agent systems** via sub-issue assignment

**Boss Agent Strategy:**

```typescript
// When delegating to Codegen:
1. Pass Linear issue context in prompt
2. Let Codegen handle Linear updates directly
3. Boss monitors via Codegen status API
4. Boss reports high-level milestones only
```

#### 2. GitHub Integration

Codegen has **full GitHub access** via GitHub App:

- Create branches and PRs
- Commit code changes
- Run CI/CD checks
- Perform code reviews
- Auto-fix failing tests

**Boss Agent Strategy:**

```typescript
// GitHub operations fully delegated:
1. Codegen creates branches automatically
2. Codegen manages PR lifecycle
3. Boss tracks PR URLs for reporting
4. Boss never touches git directly
```

#### 3. Automatic Capabilities

Codegen provides **automatic features**:

- **Checks Auto-fixer** - Fixes failing CI/CD (up to 3 attempts)
- **PR Review** - Instant code review on all PRs
- **Multi-agent Systems** - Parent/child agent coordination

**Boss Agent Role:**

```typescript
// Boss monitors these automatic features:
1. Track auto-fix attempts
2. Escalate if fixes fail repeatedly
3. Report completion to stakeholders
4. Learn patterns for future routing
```

---

## 🏗️ Implementation Plan

### Phase 1: Foundation (Week 1) ✅ COMPLETE

**Status:** Complete - Boss Agent foundation exists

- ✅ Boss Agent core structure (`src/boss-agent/`)
- ✅ Linear webhook integration
- ✅ Session management
- ✅ Event routing
- ✅ Configuration management
- ✅ Logging infrastructure

### Phase 2: Codegen Integration (Week 2) 🚧 IN PROGRESS

**Goal:** Replace Claude Code execution with Codegen API delegation

#### Step 1: Codegen API Client

**File:** `src/codegen/client.ts`

```typescript
export class CodegenClient {
  private apiToken: string;
  private orgId: string;
  private baseUrl: string;

  constructor(config: CodegenConfig) {
    this.apiToken = config.apiToken;
    this.orgId = config.orgId;
    this.baseUrl = config.baseUrl || "https://api.codegen.com/v1";
  }

  /**
   * Create a new Codegen agent run
   */
  async createAgentRun(params: {
    prompt: string;
    repoId?: number;
    baseBranch?: string;
    linearIssueId?: string;
  }): Promise<AgentRun> {
    const response = await fetch(
      `${this.baseUrl}/organizations/${this.orgId}/agent/run`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      throw new CodegenAPIError(`Agent creation failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get agent run status
   */
  async getAgentRun(agentRunId: number): Promise<AgentRun> {
    const response = await fetch(
      `${this.baseUrl}/organizations/${this.orgId}/agent/run/${agentRunId}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new CodegenAPIError(`Failed to get agent status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Resume agent run with follow-up
   */
  async resumeAgentRun(agentRunId: number, prompt: string): Promise<AgentRun> {
    const response = await fetch(
      `${this.baseUrl}/organizations/${this.orgId}/agent/run/resume`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ agent_run_id: agentRunId, prompt }),
      }
    );

    if (!response.ok) {
      throw new CodegenAPIError(`Failed to resume agent: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get detailed agent run logs
   */
  async getAgentLogs(agentRunId: number): Promise<AgentLog[]> {
    const response = await fetch(
      `${this.baseUrl}/organizations/${this.orgId}/agent/run/${agentRunId}/logs`,
      {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new CodegenAPIError(`Failed to get logs: ${response.statusText}`);
    }

    const data = await response.json();
    return data.logs;
  }
}
```

#### Step 2: Prompt Builder

**File:** `src/codegen/prompt-builder.ts`

```typescript
export class PromptBuilder {
  /**
   * Build context-rich prompt from Linear issue
   */
  static buildFromLinearIssue(issue: LinearIssue): string {
    const sections = [
      `# Task: ${issue.title}`,
      "",
      "## Description",
      issue.description || "(No description provided)",
      "",
    ];

    // Add context sections
    if (issue.labels?.length) {
      sections.push("## Labels");
      sections.push(issue.labels.map((l) => `- ${l.name}`).join("\n"));
      sections.push("");
    }

    if (issue.assignee) {
      sections.push(`## Assigned To: @${issue.assignee.name}`);
      sections.push("");
    }

    // Add project context
    if (issue.project) {
      sections.push(`## Project: ${issue.project.name}`);
      sections.push("");
    }

    // Add related issues/PRs
    if (issue.relations?.length) {
      sections.push("## Related Issues");
      sections.push(
        issue.relations.map((r) => `- ${r.identifier}: ${r.title}`).join("\n")
      );
      sections.push("");
    }

    // Add implementation instructions
    sections.push("## Implementation Requirements");
    sections.push("1. Create a feature branch");
    sections.push("2. Implement the changes with proper error handling");
    sections.push("3. Add comprehensive tests");
    sections.push("4. Update documentation if needed");
    sections.push("5. Create a PR with detailed description");
    sections.push("6. Ensure all CI/CD checks pass");
    sections.push("");

    sections.push("## Linear Issue");
    sections.push(`Linear URL: ${issue.url}`);
    sections.push(`Identifier: ${issue.identifier}`);

    return sections.join("\n");
  }

  /**
   * Build follow-up prompt for feedback/iterations
   */
  static buildFollowUp(
    originalPrompt: string,
    feedback: string,
    context?: string
  ): string {
    return [
      "## Follow-up Request",
      "",
      "### Original Task",
      originalPrompt,
      "",
      "### Feedback",
      feedback,
      "",
      context ? `### Additional Context\n${context}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  /**
   * Build error recovery prompt
   */
  static buildErrorRecovery(
    error: string,
    attemptNumber: number,
    previousAttempts?: string[]
  ): string {
    return [
      `## Error Recovery (Attempt ${attemptNumber})`,
      "",
      "### Error",
      error,
      "",
      previousAttempts?.length
        ? [
            "### Previous Attempts",
            ...previousAttempts.map((a, i) => `${i + 1}. ${a}`),
            "",
          ].join("\n")
        : "",
      "### Instructions",
      "- Analyze the error carefully",
      "- Try a different approach than previous attempts",
      "- Add defensive error handling",
      "- Verify the fix with tests",
    ]
      .filter(Boolean)
      .join("\n");
  }
}
```

#### Step 3: Boss Agent Integration

**File:** `src/boss-agent/workflows/orchestrator.ts`

**MODIFY:** Replace Claude Code execution with Codegen delegation

```typescript
export class WorkflowOrchestrator {
  private codegenClient: CodegenClient;
  private linearClient: LinearClient;
  private reporter: Reporter;
  private monitor: TaskMonitor;

  async executeWorkflow(event: LinearEvent): Promise<WorkflowResult> {
    // 1. Analyze task
    const analysis = await this.analyzeTask(event);

    // 2. DELEGATE to Codegen (NEW)
    const agentRun = await this.delegateToCodegen(event, analysis);

    // 3. Monitor execution (NEW)
    await this.monitorExecution(agentRun, event);

    // 4. Report results
    return this.reportResults(agentRun, event);
  }

  /**
   * CRITICAL: Boss Agent NEVER codes - always delegates
   */
  private async delegateToCodegen(
    event: LinearEvent,
    analysis: TaskAnalysis
  ): Promise<AgentRun> {
    logger.info("Boss Agent delegating to Codegen", {
      issueId: event.data.id,
      complexity: analysis.complexity,
    });

    // Build context-rich prompt
    const prompt = PromptBuilder.buildFromLinearIssue(event.data);

    // Create Codegen agent run
    const agentRun = await this.codegenClient.createAgentRun({
      prompt,
      linearIssueId: event.data.id,
      repoId: this.getRepoId(),
      baseBranch: "main",
    });

    // Store agent run ID in session
    await this.sessionManager.updateSession(event.data.id, {
      codegenAgentRunId: agentRun.id,
      codegenWebUrl: agentRun.web_url,
      status: "delegated",
    });

    // Report delegation to Linear
    await this.reporter.reportDelegation(event.data.id, agentRun);

    return agentRun;
  }

  /**
   * Monitor Codegen agent execution
   */
  private async monitorExecution(
    agentRun: AgentRun,
    event: LinearEvent
  ): Promise<void> {
    const issueId = event.data.id;

    // Poll for status updates
    const statusInterval = setInterval(async () => {
      const status = await this.codegenClient.getAgentRun(agentRun.id);

      // Update session
      await this.sessionManager.updateSession(issueId, {
        codegenStatus: status.status,
        lastUpdate: new Date(),
      });

      // Report major milestones
      if (this.isMilestone(status)) {
        await this.reporter.reportMilestone(issueId, status);
      }

      // Handle completion
      if (status.status === "completed" || status.status === "failed") {
        clearInterval(statusInterval);
        await this.handleCompletion(status, issueId);
      }
    }, 30000); // Poll every 30 seconds

    // Store interval ID for cleanup
    await this.sessionManager.updateSession(issueId, {
      monitoringIntervalId: statusInterval,
    });
  }

  /**
   * Handle agent completion (success or failure)
   */
  private async handleCompletion(
    status: AgentRun,
    issueId: string
  ): Promise<void> {
    if (status.status === "completed") {
      // Success path
      await this.reporter.reportSuccess(issueId, status);

      // Store learning
      await this.storeLearning(issueId, status, "success");

      // Update Linear issue status
      await this.linearClient.updateIssueStatus(issueId, "completed");
    } else {
      // Failure path
      await this.reporter.reportFailure(issueId, status);

      // Store learning
      await this.storeLearning(issueId, status, "failure");

      // Decide on recovery strategy
      await this.handleFailure(issueId, status);
    }
  }

  /**
   * Handle failures with intelligent recovery
   */
  private async handleFailure(
    issueId: string,
    failedRun: AgentRun
  ): Promise<void> {
    const session = await this.sessionManager.getSession(issueId);

    // Check retry limit
    if (session.retryCount >= 3) {
      logger.warn("Max retries reached", { issueId });
      await this.escalateToHuman(issueId, failedRun);
      return;
    }

    // Get failure details
    const logs = await this.codegenClient.getAgentLogs(failedRun.id);
    const errorSummary = this.extractErrorSummary(logs);

    // Build recovery prompt
    const recoveryPrompt = PromptBuilder.buildErrorRecovery(
      errorSummary,
      session.retryCount + 1,
      session.previousAttempts
    );

    // Create new agent run with recovery instructions
    const retryRun = await this.codegenClient.createAgentRun({
      prompt: recoveryPrompt,
      linearIssueId: issueId,
      repoId: this.getRepoId(),
      baseBranch: "main",
    });

    // Update session
    await this.sessionManager.updateSession(issueId, {
      retryCount: session.retryCount + 1,
      previousAttempts: [...(session.previousAttempts || []), errorSummary],
      codegenAgentRunId: retryRun.id,
    });

    // Monitor retry
    await this.monitorExecution(retryRun, { data: { id: issueId } } as LinearEvent);
  }

  /**
   * Check if status represents a reportable milestone
   */
  private isMilestone(status: AgentRun): boolean {
    // Report on major status transitions
    return ["in_progress", "completed", "failed"].includes(status.status);
  }

  /**
   * Store learning for future task routing
   */
  private async storeLearning(
    issueId: string,
    status: AgentRun,
    outcome: "success" | "failure"
  ): Promise<void> {
    // This would integrate with Mem0 for long-term learning
    logger.info("Storing learning", { issueId, outcome });
    // TODO: Implement Mem0 integration
  }

  /**
   * Escalate to human when automated recovery fails
   */
  private async escalateToHuman(
    issueId: string,
    failedRun: AgentRun
  ): Promise<void> {
    await this.reporter.reportEscalation(issueId, failedRun);
    await this.linearClient.addComment(
      issueId,
      "❌ Automated resolution failed after 3 attempts. Human intervention required."
    );
  }
}
```

#### Step 4: Reporter Updates

**File:** `src/boss-agent/reporter.ts`

**ADD:** Codegen-specific reporting methods

```typescript
export class Reporter {
  /**
   * Report delegation to Codegen
   */
  async reportDelegation(issueId: string, agentRun: AgentRun): Promise<void> {
    const message = [
      "🤖 **Boss Agent:** Task delegated to Codegen",
      "",
      `**Agent Run ID:** ${agentRun.id}`,
      `**Status:** ${agentRun.status}`,
      `**View Progress:** ${agentRun.web_url}`,
      "",
      "I'll monitor the execution and provide updates on major milestones.",
    ].join("\n");

    await this.linearClient.addComment(issueId, message);
  }

  /**
   * Report milestone progress
   */
  async reportMilestone(issueId: string, status: AgentRun): Promise<void> {
    let emoji = "🔄";
    let statusText = status.status;

    if (status.status === "completed") {
      emoji = "✅";
      statusText = "Completed Successfully";
    } else if (status.status === "failed") {
      emoji = "❌";
      statusText = "Failed";
    } else if (status.status === "in_progress") {
      emoji = "⚙️";
      statusText = "In Progress";
    }

    const message = [
      `${emoji} **Status Update:** ${statusText}`,
      "",
      `**Agent Run:** ${status.web_url}`,
      "",
      status.result ? `**Result:**\n${status.result}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await this.linearClient.addComment(issueId, message);
  }

  /**
   * Report successful completion
   */
  async reportSuccess(issueId: string, status: AgentRun): Promise<void> {
    const message = [
      "✅ **Task Completed Successfully**",
      "",
      `**Agent Run:** ${status.web_url}`,
      "",
      "**Summary:**",
      status.result || "Task completed as requested.",
      "",
      "Please review the PR and merge when ready.",
    ].join("\n");

    await this.linearClient.addComment(issueId, message);
  }

  /**
   * Report failure
   */
  async reportFailure(issueId: string, status: AgentRun): Promise<void> {
    const message = [
      "❌ **Task Failed**",
      "",
      `**Agent Run:** ${status.web_url}`,
      "",
      "**Error:**",
      status.result || "Unknown error occurred.",
      "",
      "Analyzing the issue and attempting recovery...",
    ].join("\n");

    await this.linearClient.addComment(issueId, message);
  }

  /**
   * Report escalation to human
   */
  async reportEscalation(issueId: string, failedRun: AgentRun): Promise<void> {
    const message = [
      "⚠️ **Human Intervention Required**",
      "",
      "After 3 automated attempts, I'm escalating this task for human review.",
      "",
      `**Last Agent Run:** ${failedRun.web_url}`,
      "",
      "**Recommended Actions:**",
      "1. Review the agent run logs for error details",
      "2. Adjust the task requirements if needed",
      "3. Try manual implementation if automation isn't suitable",
      "",
      "@assignee - Please take a look when you have time.",
    ].join("\n");

    await this.linearClient.addComment(issueId, message);
  }
}
```

### Phase 3: Advanced Features (Week 3)

#### Multi-Agent Coordination

**Feature:** Boss Agent leverages Codegen's multi-agent system

```typescript
/**
 * For complex tasks, Boss creates parent-child agent hierarchy
 */
async handleComplexTask(issue: LinearIssue): Promise<void> {
  // 1. Boss analyzes complexity
  const analysis = await this.analyzeTaskComplexity(issue);

  if (analysis.complexity === "high") {
    // 2. Boss instructs Codegen to break down task
    const prompt = [
      PromptBuilder.buildFromLinearIssue(issue),
      "",
      "## Multi-Agent Strategy",
      "This is a complex task. Please:",
      "1. Break it down into manageable sub-issues",
      "2. Create Linear sub-issues for each piece",
      "3. Assign yourself to each sub-issue (spawns child agents)",
      "4. Coordinate the work across child agents",
      "5. Integrate results when children complete",
    ].join("\n");

    // 3. Single delegation - Codegen handles the rest
    const parentAgent = await this.codegenClient.createAgentRun({
      prompt,
      linearIssueId: issue.id,
    });

    // 4. Boss monitors parent agent (which monitors children)
    await this.monitorExecution(parentAgent, { data: issue });
  }
}
```

#### Intelligent Task Routing

**Feature:** Boss learns which types of tasks succeed/fail

```typescript
interface TaskPattern {
  type: string;
  complexity: "low" | "medium" | "high";
  successRate: number;
  avgDuration: number;
  commonFailures: string[];
}

/**
 * Boss maintains task pattern database (Mem0)
 */
async routeIntelligently(issue: LinearIssue): Promise<void> {
  // 1. Classify task
  const classification = await this.classifier.classify(issue);

  // 2. Retrieve similar past tasks
  const patterns = await this.mem0.searchPatterns(classification);

  // 3. Adjust prompt based on learnings
  let prompt = PromptBuilder.buildFromLinearIssue(issue);

  if (patterns.successRate < 0.5) {
    // Low success rate - add guidance
    prompt += "\n\n## Boss Agent Guidance\n";
    prompt += "Previous similar tasks had issues with:\n";
    patterns.commonFailures.forEach((f) => {
      prompt += `- ${f}\n`;
    });
    prompt += "\nPlease pay special attention to these areas.\n";
  }

  // 4. Delegate with enhanced prompt
  await this.codegenClient.createAgentRun({ prompt });
}
```

#### Proactive Monitoring

**Feature:** Boss detects issues before they cause failures

```typescript
/**
 * Boss monitors agent logs for warning signs
 */
async proactiveMonitoring(agentRunId: number): Promise<void> {
  const logs = await this.codegenClient.getAgentLogs(agentRunId);

  // Analyze logs for warning patterns
  const warnings = this.analyzeLogsForWarnings(logs);

  if (warnings.length > 0) {
    // Boss intervenes with guidance
    const guidance = this.generateGuidance(warnings);

    // Send follow-up to agent
    await this.codegenClient.resumeAgentRun(agentRunId, guidance);

    // Report intervention
    await this.reporter.reportIntervention(issueId, warnings, guidance);
  }
}
```

### Phase 4: Production Hardening (Week 4)

#### Error Handling

```typescript
// Retry logic with exponential backoff
// Rate limit handling
// Webhook delivery guarantees
// Transaction rollback on failures
```

#### Observability

```typescript
// Structured logging for all Boss decisions
// Metrics for delegation/completion rates
// Alerts for high failure rates
// Dashboard for Boss Agent performance
```

#### Security

```typescript
// Secure credential storage
// API token rotation
// Audit logging for all delegations
// Permission boundaries
```

---

## 📋 Configuration

### Environment Variables

**File:** `.env`

```bash
# Codegen API Configuration
CODEGEN_API_TOKEN=your_token_from_codegen_com_token
CODEGEN_ORG_ID=your_org_id
CODEGEN_BASE_URL=https://api.codegen.com/v1

# Boss Agent Configuration
BOSS_AGENT_MODE=codegen  # "codegen" | "claude" (legacy)
BOSS_AGENT_MAX_RETRIES=3
BOSS_AGENT_MONITORING_INTERVAL=30000  # 30 seconds

# Linear Integration (existing)
LINEAR_API_TOKEN=your_linear_token
LINEAR_ORGANIZATION_ID=your_org_id
LINEAR_WEBHOOK_SECRET=your_webhook_secret

# GitHub Configuration (for repo ID lookup)
GITHUB_REPO_ID=your_github_repo_id
GITHUB_BASE_BRANCH=main
```

### Boss Agent Config

**File:** `src/boss-agent/config.ts`

```typescript
export interface BossAgentConfig {
  mode: "codegen" | "claude"; // Execution mode
  maxRetries: number; // Max retry attempts
  monitoringInterval: number; // Status polling interval (ms)
  escalationThreshold: number; // Failures before human escalation

  codegen: {
    apiToken: string;
    orgId: string;
    baseUrl: string;
  };

  reporting: {
    milestones: boolean; // Report milestone updates
    detailedLogs: boolean; // Include detailed logs in reports
  };

  learning: {
    enabled: boolean; // Enable Mem0 learning
    minSuccessRate: number; // Threshold for pattern detection
  };
}
```

---

## 🔄 Workflow Examples

### Example 1: Simple Feature Request

**Trigger:** Linear issue assigned to Codegen

```text
1. Linear webhook → Boss Agent
2. Boss analyzes task → "Feature: Add user profile page" (Medium complexity)
3. Boss builds context-rich prompt with Linear issue details
4. Boss delegates to Codegen via API → Agent Run created
5. Boss monitors status every 30 seconds
6. Codegen agent:
   - Creates branch: feature/user-profile-page
   - Implements React component
   - Adds tests
   - Creates PR
   - Links PR to Linear issue
7. Boss detects "completed" status
8. Boss reports to Linear: "✅ Task completed - PR #123 ready for review"
9. Boss stores learning: "User profile requests → 95% success rate"
```

**Key Points:**

- Boss NEVER writes code
- Boss monitors at strategic level only
- Codegen handles ALL technical implementation
- Boss reports outcomes to stakeholders

### Example 2: Complex Task with Multi-Agent

**Trigger:** Linear issue: "Refactor authentication system"

```text
1. Boss analyzes task → High complexity detected
2. Boss builds prompt instructing Codegen to use multi-agent approach
3. Boss delegates to Codegen parent agent
4. Codegen parent agent:
   - Creates sub-issues in Linear:
     a. "Extract JWT logic to service"
     b. "Add OAuth2 support"
     c. "Update API endpoints"
     d. "Migrate tests"
   - Assigns itself to each sub-issue (spawns child agents)
5. Boss monitors ONLY parent agent status
6. Codegen coordinates 4 child agents working in parallel
7. Child agents complete and notify parent
8. Parent agent integrates all work
9. Boss detects parent completion
10. Boss reports: "✅ Complex refactor completed via 4 coordinated agents"
```

**Key Points:**

- Boss delegates complexity to Codegen's multi-agent system
- Boss doesn't micromanage child agents
- Codegen handles coordination internally
- Boss tracks only top-level progress

### Example 3: Failure Recovery

**Trigger:** Codegen agent fails on first attempt

```text
1. Boss monitors agent run → Status: "failed"
2. Boss retrieves error logs from Codegen API
3. Boss analyzes error: "TypeScript compilation error in auth.service.ts"
4. Boss builds recovery prompt with error details
5. Boss creates NEW agent run (Attempt 2) with recovery instructions
6. New agent fixes the issue
7. Boss detects completion
8. Boss reports: "✅ Completed after 2 attempts"
9. Boss stores learning: "Auth service changes → Watch for type errors"
```

**Escalation Path (3 failures):**

```text
1. Boss attempts automated recovery 3 times
2. All attempts fail
3. Boss escalates to human:
   - Posts detailed failure summary to Linear
   - Tags human assignee
   - Provides links to all 3 agent run logs
4. Boss marks task as "requires-human-intervention"
```

---

## 🧪 Testing Strategy

### Unit Tests

**Test Boss Agent decision-making logic:**

```typescript
describe("BossAgent", () => {
  it("should delegate task to Codegen instead of executing itself", async () => {
    const boss = new BossAgent(config);
    const result = await boss.handleLinearIssue(mockIssue);

    expect(result.executionMode).toBe("delegated");
    expect(result.codegenAgentRunId).toBeDefined();
    expect(boss.executedCodeDirectly).toBe(false); // ✅ CRITICAL
  });

  it("should build context-rich prompts from Linear issues", () => {
    const prompt = PromptBuilder.buildFromLinearIssue(mockIssue);

    expect(prompt).toContain(mockIssue.title);
    expect(prompt).toContain(mockIssue.description);
    expect(prompt).toContain("Implementation Requirements");
  });

  it("should monitor agent status and report milestones", async () => {
    const boss = new BossAgent(config);
    const agentRun = await boss.delegateToCodegen(mockIssue);

    await boss.monitorExecution(agentRun, mockIssue);

    expect(mockReporter.reportMilestone).toHaveBeenCalledTimes(2); // in_progress, completed
  });

  it("should retry failed agents up to 3 times", async () => {
    const boss = new BossAgent(config);

    // Mock 2 failures, 1 success
    mockCodegenClient.createAgentRun
      .mockRejectedValueOnce(new Error("Failed"))
      .mockRejectedValueOnce(new Error("Failed"))
      .mockResolvedValueOnce({ id: 123, status: "completed" });

    const result = await boss.handleWithRetry(mockIssue);

    expect(result.attempts).toBe(3);
    expect(result.status).toBe("completed");
  });

  it("should escalate to human after 3 failures", async () => {
    const boss = new BossAgent(config);

    // Mock 3 failures
    mockCodegenClient.createAgentRun.mockRejectedValue(new Error("Failed"));

    const result = await boss.handleWithRetry(mockIssue);

    expect(result.escalated).toBe(true);
    expect(mockReporter.reportEscalation).toHaveBeenCalled();
  });
});
```

### Integration Tests

**Test Boss Agent → Codegen API integration:**

```typescript
describe("BossAgent + Codegen Integration", () => {
  it("should successfully delegate and monitor real Codegen agent", async () => {
    const boss = new BossAgent(realConfig);

    const result = await boss.handleLinearIssue({
      id: "test-issue-123",
      title: "Add hello world endpoint",
      description: "Create GET /hello that returns 'Hello World'",
    });

    expect(result.codegenAgentRunId).toBeDefined();
    expect(result.webUrl).toContain("codegen.com/agents");

    // Wait for completion (with timeout)
    await boss.waitForCompletion(result.codegenAgentRunId, { timeout: 600000 }); // 10 min

    const finalStatus = await boss.getAgentStatus(result.codegenAgentRunId);
    expect(finalStatus.status).toBe("completed");
  });
});
```

### E2E Tests

**Test full workflow from Linear webhook to completion:**

```bash
# 1. Trigger Linear webhook (simulate issue assignment)
curl -X POST http://localhost:3005/webhooks/linear \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update",
    "type": "Issue",
    "data": {
      "id": "e2e-test-123",
      "identifier": "TEST-1",
      "title": "E2E Test: Add health check endpoint",
      "description": "Create GET /health that returns {status: ok}",
      "assignee": { "id": "codegen-bot" }
    }
  }'

# 2. Verify Boss Agent delegated to Codegen
# Check logs for "Boss Agent delegating to Codegen"

# 3. Check session created
curl http://localhost:3005/sessions | jq '.sessions[] | select(.issueId == "e2e-test-123")'

# Expected:
# {
#   "issueId": "e2e-test-123",
#   "status": "delegated",
#   "codegenAgentRunId": 456,
#   "codegenWebUrl": "https://codegen.com/agents/456"
# }

# 4. Wait for completion (up to 10 minutes)
# Boss will poll Codegen API and update session

# 5. Verify Linear comment posted with results
# Check Linear issue for "✅ Task Completed Successfully"

# 6. Verify PR created and linked
# Check GitHub for new PR with Linear issue reference
```

---

## 📊 Success Metrics

### Boss Agent Performance

**Key Metrics to Track:**

```typescript
interface BossMetrics {
  // Delegation metrics
  totalDelegations: number;
  successfulDelegations: number;
  failedDelegations: number;
  delegationRate: number; // delegations / total tasks

  // Completion metrics
  avgCompletionTime: number; // milliseconds
  successRate: number; // completed / total
  retryRate: number; // retries / total
  escalationRate: number; // escalated / total

  // Efficiency metrics
  avgResponseTime: number; // time to delegate
  monitoringOverhead: number; // time spent monitoring
  reportingLatency: number; // time to report results

  // Learning metrics
  patternRecognitionRate: number; // patterns identified / tasks
  learningImpact: number; // success rate improvement over time
}
```

### Success Criteria

**Phase 2 Complete When:**

- ✅ Boss Agent delegates 100% of tasks to Codegen (NEVER codes itself)
- ✅ 90%+ of delegations create Codegen agent runs successfully
- ✅ Boss monitors agent status with <5% error rate
- ✅ Boss reports milestones to Linear with <10 second latency
- ✅ Retry mechanism recovers from 70%+ of failures
- ✅ Human escalation path works for remaining failures

**Production Ready When:**

- ✅ All success criteria from Phase 2 met
- ✅ Multi-agent coordination working for complex tasks
- ✅ Learning system improving success rate over time
- ✅ Observability dashboard deployed
- ✅ Security audit passed
- ✅ Documentation complete

---

## 🚨 Critical Requirements

### Boss Agent MUST

1. **NEVER execute code itself** - All coding delegated to Codegen
2. **Monitor at strategic level** - Track agent runs, not individual commits
3. **Report to stakeholders** - Keep Linear/Slack updated on progress
4. **Handle failures gracefully** - Retry, escalate, learn
5. **Maintain context** - Link Codegen runs to Linear issues/sessions
6. **Learn from outcomes** - Improve routing decisions over time

### Boss Agent MUST NOT

1. ❌ **Run Claude Code locally** - That's the old way
2. ❌ **Write code directly** - Boss is a manager, not a developer
3. ❌ **Micromanage Codegen** - Trust the agent to handle implementation
4. ❌ **Duplicate Codegen features** - Use native Linear/GitHub integrations
5. ❌ **Block on agent completion** - Monitor asynchronously
6. ❌ **Ignore failures** - Always retry or escalate

---

## 📚 References

### Codegen Documentation

- **API Reference:** https://docs.codegen.com/api-reference/overview
- **Authentication:** https://docs.codegen.com/api-reference/authentication
- **Agent Runs:** https://docs.codegen.com/agents/create-agent-run
- **Linear Integration:** https://docs.codegen.com/integrations/linear
- **GitHub Integration:** https://docs.codegen.com/integrations/github
- **Claude Code Integration:** https://docs.codegen.com/capabilities/claude-code

### Codegen Resources

- **Get API Token:** https://codegen.com/token
- **View Agent Runs:** https://codegen.com/agents
- **Community Slack:** https://community.codegen.com
- **GitHub App:** https://github.com/apps/codegen-sh

### Internal Documentation

- **Boss Agent Architecture:** `docs/ARCHITECTURE.md`
- **Phase 1 Completion:** `docs/PHASE-1-COMPLETE.md`
- **Linear Integration:** `docs/LINEAR-WEBHOOK-SETUP.md`
- **Project Instructions:** `CLAUDE.md`

---

## ✅ Next Steps

### Immediate Actions (This Week)

1. **Review & Approve Plan** - Stakeholder sign-off
2. **Create Development Branch** - `feature/boss-agent-codegen-integration`
3. **Implement Codegen Client** - `src/codegen/client.ts`
4. **Add Prompt Builder** - `src/codegen/prompt-builder.ts`
5. **Update Orchestrator** - Replace Claude execution with Codegen delegation
6. **Write Unit Tests** - Ensure Boss never codes directly

### Week 2 Deliverables

- ✅ Codegen API integration working
- ✅ Boss Agent delegating tasks successfully
- ✅ Monitoring and reporting in place
- ✅ Basic retry logic implemented
- ✅ Unit tests passing

### Week 3 Deliverables

- ✅ Multi-agent coordination
- ✅ Intelligent task routing
- ✅ Proactive monitoring
- ✅ Learning system (Mem0 integration)
- ✅ Integration tests passing

### Week 4 Deliverables

- ✅ Production hardening complete
- ✅ Security audit passed
- ✅ Observability dashboard
- ✅ Documentation finalized
- ✅ E2E tests passing
- ✅ Ready for production deployment

---

**Status:** 🎯 Ready for Implementation  
**Approval Required:** Yes  
**Timeline:** 4 weeks  
**Risk Level:** Medium (API integration dependencies)

**Key Success Factor:** Boss Agent NEVER codes - only coordinates! 🎯
