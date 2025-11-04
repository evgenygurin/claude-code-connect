# Sentry Integration Setup Guide

Comprehensive guide to setting up Sentry error monitoring with Codegen AI agent integration.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Sentry MCP Server](#sentry-mcp-server)
- [Sentry API Setup](#sentry-api-setup)
- [Codegen Integration](#codegen-integration)
- [GitHub Workflow](#github-workflow)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Overview

This project integrates **Sentry** for production error monitoring with **Codegen** for automatic error fixing. The integration includes:

- ✅ **Sentry MCP Server**: AI agents can query Sentry errors directly
- ✅ **Automatic Issue Creation**: Sentry errors → GitHub issues
- ✅ **AI-Powered Fixes**: Codegen analyzes and fixes production errors
- ✅ **Webhook Integration**: Real-time error notifications
- ✅ **Priority-Based Handling**: High/critical errors only

---

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# 1. Set environment variables
export SENTRY_AUTH_TOKEN="your_sentry_token"
export SENTRY_ORG_SLUG="your-org"
export SENTRY_PROJECT_SLUG="claude-code-connect"

# 2. Run setup script
npx tsx scripts/setup-sentry.ts

# 3. Complete Codegen OAuth
open https://codegen.com/settings/integrations
```

### Option 2: Manual Setup

See [Manual Setup](#manual-setup) section below.

---

## Sentry MCP Server

**What is Sentry MCP Server?**

Sentry's Model Context Protocol (MCP) server enables AI agents (like Claude Code) to access real-time error monitoring data directly. This allows:

- 🔍 Query Sentry errors from AI chat
- 🤖 Analyze stack traces with AI
- 🛠️ Get fix recommendations from Sentry's AI (Seer)
- 📊 Monitor error trends and patterns

### Setup Sentry MCP Server

#### For Claude Code CLI

```bash
# Add Sentry MCP server
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

# Verify installation
claude mcp list

# Test the connection
claude mcp test sentry
```

#### For Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sentry": {
      "command": "node",
      "args": ["-e", "require('@sentry/mcp').start()"],
      "env": {
        "SENTRY_AUTH_TOKEN": "your_sentry_token",
        "SENTRY_ORG_SLUG": "your-org"
      }
    }
  }
}
```

#### For Cursor IDE

Add to Cursor settings:

```json
{
  "mcp.servers": {
    "sentry": {
      "url": "https://mcp.sentry.dev/mcp",
      "auth": {
        "token": "your_sentry_token"
      }
    }
  }
}
```

### MCP Server Features

The Sentry MCP server provides **16+ tool calls**:

```typescript
// Available MCP tools (examples)
sentry.getProjects()              // List all projects
sentry.getIssues(filters)         // Query issues
sentry.getIssueDetails(issueId)   // Get issue details
sentry.getSeerAnalysis(issueId)   // Trigger Seer AI analysis
sentry.getStackTrace(eventId)     // Get full stack trace
sentry.searchEvents(query)        // Search events
sentry.getMetrics(project)        // Get error metrics
// ... and more
```

### Using Sentry MCP in AI Chat

Once configured, you can query Sentry directly:

```text
User: Show me the latest production errors from Sentry

AI: [Uses sentry.getIssues(filters) MCP tool]
    Here are the 5 most recent errors:
    1. TypeError in user.service.ts (10 occurrences)
    2. Database timeout in payment.controller.ts (5 occurrences)
    ...

User: Analyze the TypeError and suggest a fix

AI: [Uses sentry.getSeerAnalysis() MCP tool]
    Sentry's AI (Seer) analysis:
    - Root cause: Null reference to user.email
    - Suggested fix: Add null check before accessing properties
    - Here's the recommended code change...
```

### MCP Authentication

```bash
# Get Sentry auth token
open https://sentry.io/settings/account/api/auth-tokens/

# Required scopes for MCP:
# - project:read
# - event:read
# - org:read

# Set token in environment
export SENTRY_AUTH_TOKEN="your_token"
```

---

## Sentry API Setup

### Step 1: Create Sentry Account & Organization

1. Sign up at [sentry.io](https://sentry.io)
2. Create organization (or use existing)
3. Note your organization slug (e.g., `my-company`)

### Step 2: Get API Token

1. Visit [sentry.io/settings/account/api/auth-tokens/](https://sentry.io/settings/account/api/auth-tokens/)
2. Click "Create New Token"
3. Name: `Codegen Integration`
4. Scopes required:
   - ✅ `project:read` - Read project information
   - ✅ `project:write` - Create projects
   - ✅ `project:admin` - Manage project settings
   - ✅ `event:read` - Read error events
   - ✅ `event:write` - Create events (testing)
   - ✅ `org:read` - Read organization info
   - ✅ `org:integrations` - Manage integrations
5. Copy the token (starts with `sntrys_...`)

### Step 3: Create Project

#### Option A: Via Setup Script

```bash
export SENTRY_AUTH_TOKEN="sntrys_..."
export SENTRY_ORG_SLUG="my-company"
export SENTRY_PROJECT_SLUG="claude-code-connect"

npx tsx scripts/setup-sentry.ts
```

#### Option B: Manual via Sentry Console

1. Go to [sentry.io/organizations/your-org/projects/new/](https://sentry.io/organizations/your-org/projects/new/)
2. Platform: **Node.js** or **TypeScript**
3. Project name: `Claude Code Connect`
4. Team: Select your team
5. Alert frequency: **On every new issue**

#### Option C: Via API

```bash
curl -X POST https://sentry.io/api/0/teams/my-company/my-team/projects/ \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Claude Code Connect",
    "slug": "claude-code-connect",
    "platform": "node-typescript"
  }'
```

### Step 4: Get DSN

```bash
# Visit project settings
open https://sentry.io/settings/my-company/projects/claude-code-connect/keys/

# Copy DSN (looks like):
# https://abc123@o123.ingest.sentry.io/456
```

### Step 5: Configure Environment

```bash
# Add to .env
cat >> .env <<EOF
# Sentry Configuration
SENTRY_DSN=https://abc123@o123.ingest.sentry.io/456
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG_SLUG=my-company
SENTRY_PROJECT_SLUG=claude-code-connect
SENTRY_ENVIRONMENT=production
EOF
```

---

## Codegen Integration

### Step 1: Enable in Configuration

Already done! ✅ See `.codegen/config.yml`:

```yaml
integrations:
  sentry:
    enabled: true               # ✅ Enabled
    auto_create_issues: true    # Create GitHub issues from errors
    auto_fix: true              # Auto-fix production errors
    priority_threshold: "high"  # Only high/critical errors
```

### Step 2: Connect via Codegen Dashboard

#### OAuth Method (Recommended)

1. Visit [codegen.com/settings/integrations](https://codegen.com/settings/integrations)
2. Find **Sentry** integration
3. Click **"Connect with OAuth"**
4. Authorize Codegen to access your Sentry organization
5. Select which projects to monitor
6. Save configuration

#### API Token Method

1. Visit [codegen.com/settings/integrations/sentry](https://codegen.com/settings/integrations/sentry)
2. Choose **"Manual Configuration"**
3. Enter:
   - **Auth Token**: Your Sentry auth token
   - **Organization**: Your org slug
   - **Projects**: Select projects to monitor
4. Click **"Test Connection"**
5. Save if test passes

### Step 3: Configure Webhooks

#### Option A: Automatic (via setup script)

```bash
npx tsx scripts/setup-sentry.ts
```

#### Option B: Manual

1. Go to [sentry.io/settings/your-org/developer-settings/](https://sentry.io/settings/your-org/developer-settings/)
2. Click **"New Internal Integration"**
3. Name: `Codegen`
4. Webhook URL: `https://api.codegen.com/webhooks/sentry`
5. Permissions:
   - Issues: **Read & Write**
   - Projects: **Read**
   - Events: **Read**
6. Webhooks (select events):
   - ✅ `error.created`
   - ✅ `issue.created`
   - ✅ `issue.resolved`
   - ✅ `issue.assigned`
   - ✅ `event.alert`
7. Save integration

### Step 4: Test Integration

```bash
# Trigger a test error in your app
curl -X POST https://sentry.io/api/0/projects/my-company/claude-code-connect/events/ \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "test-'$(uuidgen)'",
    "message": "Test error from Codegen integration",
    "level": "error",
    "platform": "node",
    "environment": "staging"
  }'

# Check Codegen dashboard for received event
open https://codegen.com/runs
```

---

## GitHub Workflow

The GitHub workflow is already configured in `.github/workflows/sentry.yml`.

### Features

- ✅ **Auto-create Issues**: Sentry errors → GitHub issues
- ✅ **Trigger Codegen**: Auto-fix production errors
- ✅ **Label Management**: Auto-label with `sentry`, `production-bug`
- ✅ **Manual Triggers**: Create issues via workflow dispatch

### Workflow Triggers

#### Automatic (via webhook)

Sentry → Codegen → GitHub repository_dispatch → Create issue

#### Manual

```bash
# Trigger workflow manually
gh workflow run sentry.yml \
  --field sentry_issue_id="PROJ-123" \
  --field error_message="TypeError in user.service.ts"
```

#### Label-based

Add `sentry` label to any issue to trigger Codegen analysis.

### Workflow Outputs

**Created Issue Example:**

```markdown
## 🚨 Sentry Error Report

**Issue ID**: PROJ-123
**Severity**: `error`
**Environment**: `production`
**Sentry URL**: [View in Sentry](https://sentry.io/...)

### Error Message

TypeError: Cannot read property 'email' of undefined

### Stack Trace

at UserService.getEmail (src/services/user.ts:45)
at AuthController.login (src/controllers/auth.ts:23)
```

---

## Testing

### Test 1: MCP Server Connection

```bash
# Add MCP server
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

# Test connection
claude mcp test sentry

# Query issues
claude chat "Show me Sentry errors from the last 24 hours"
```

### Test 2: API Integration

```bash
# Verify authentication
npx tsx scripts/setup-sentry.ts --verify-only

# Test webhook
curl -X POST https://api.codegen.com/webhooks/sentry \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Test 3: Error Flow

```bash
# 1. Create test error in Sentry
npm run test:sentry-error

# 2. Check GitHub for auto-created issue
gh issue list --label sentry

# 3. Verify Codegen triggered
open https://codegen.com/runs

# 4. Check for PR with fix
gh pr list --label sentry
```

### Test 4: Workflow Dispatch

```bash
# Trigger manual workflow
gh workflow run sentry.yml \
  --field sentry_issue_id="TEST-001" \
  --field error_message="Manual test error"

# Check issue created
gh issue list --limit 1
```

---

## Troubleshooting

### MCP Server Not Working

**Problem**: AI can't connect to Sentry MCP server

**Solutions**:

```bash
# 1. Check MCP server status
curl https://mcp.sentry.dev/health

# 2. Verify auth token
export SENTRY_AUTH_TOKEN="sntrys_..."
claude mcp test sentry

# 3. Check token scopes
curl https://sentry.io/api/0/api-tokens/introspect/ \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN"

# 4. Re-add MCP server
claude mcp remove sentry
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
```

### Webhook Not Triggering

**Problem**: Sentry errors not creating GitHub issues

**Solutions**:

1. Check webhook status:
   ```bash
   curl https://sentry.io/api/0/organizations/my-org/webhooks/ \
     -H "Authorization: Bearer $SENTRY_AUTH_TOKEN"
   ```

2. Test webhook manually:
   ```bash
   curl -X POST https://api.codegen.com/webhooks/sentry \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

3. Check Codegen webhook logs:
   ```bash
   open https://codegen.com/settings/webhooks
   ```

### Codegen Not Fixing Errors

**Problem**: Issues created but no PRs

**Check**:

1. Codegen configuration:
   ```yaml
   # .codegen/config.yml
   integrations:
     sentry:
       enabled: true
       auto_fix: true  # Must be true
   ```

2. Issue labels:
   ```bash
   gh issue view 123 --json labels
   # Should include: sentry, codegen
   ```

3. Agent runs:
   ```bash
   open https://codegen.com/runs
   # Check for errors or failures
   ```

### API Authentication Errors

**Problem**: `401 Unauthorized` or `403 Forbidden`

**Solutions**:

```bash
# 1. Verify token is valid
curl https://sentry.io/api/0/organizations/my-org/ \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN"

# 2. Check token scopes
# Token must have: project:read, project:write, event:read, org:read

# 3. Regenerate token
open https://sentry.io/settings/account/api/auth-tokens/

# 4. Update .env
sed -i '' "s/SENTRY_AUTH_TOKEN=.*/SENTRY_AUTH_TOKEN=new_token/" .env
```

---

## Documentation

- **Sentry MCP Server**: [docs.sentry.io/product/sentry-mcp/](https://docs.sentry.io/product/sentry-mcp/)
- **Sentry API**: [docs.sentry.io/api/](https://docs.sentry.io/api/)
- **Codegen Integration**: [docs.codegen.com/integrations/sentry](https://docs.codegen.com/integrations/sentry)
- **Sentry Node SDK**: [docs.sentry.io/platforms/node/](https://docs.sentry.io/platforms/node/)

---

## Support

Need help?

- 📖 [Sentry Documentation](https://docs.sentry.io)
- 💬 [Sentry Discord](https://discord.gg/sentry)
- 📧 [support@sentry.io](mailto:support@sentry.io)
- 🐛 [GitHub Issues](https://github.com/getsentry/sentry/issues)

For Codegen support:

- 📖 [Codegen Docs](https://docs.codegen.com)
- 💬 [Discord Community](https://discord.gg/codegen)
- 📧 [support@codegen.com](mailto:support@codegen.com)
