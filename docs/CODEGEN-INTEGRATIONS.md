# Codegen Integrations Setup

Comprehensive guide to setting up Codegen integrations with CircleCI, Sentry, Linear, and other services.

## Table of Contents

- [Overview](#overview)
- [GitHub App Installation](#github-app-installation)
- [CircleCI Integration](#circleci-integration)
- [Sentry Integration](#sentry-integration)
- [Linear Integration](#linear-integration)
- [Slack Integration](#slack-integration)
- [Additional Integrations](#additional-integrations)
- [Configuration](#configuration)

---

## Overview

Codegen provides **native integrations** with popular development tools. These integrations work through the **Codegen GitHub App** and don't require custom workflow files.

### Key Benefits

✅ **No SDK Required**: Integrations work through OAuth and webhooks
✅ **Automatic Event Processing**: No manual workflow configuration
✅ **Unified Dashboard**: Manage all integrations at [codegen.com/settings/integrations](https://codegen.com/settings/integrations)
✅ **Real-time Sync**: Bi-directional sync with connected services

---

## GitHub App Installation

**REQUIRED**: Install the Codegen GitHub App first.

### Step 1: Install GitHub App

1. Visit [github.com/apps/codegen-sh](https://github.com/apps/codegen-sh)
2. Click "Install"
3. Select repositories:
   - Choose "All repositories" or
   - Select specific repositories (including this one)
4. Grant permissions:
   - ✅ Read access to code
   - ✅ Write access to pull requests
   - ✅ Write access to issues
   - ✅ Read access to checks
   - ✅ Write access to commit statuses

### Step 2: Verify Installation

```bash
# Check installation status
gh api /repos/{owner}/{repo}/installations

# Or visit
https://github.com/settings/installations
```

### What the GitHub App Handles

Once installed, the Codegen GitHub App automatically:

- ✅ **PR Reviews**: Reviews PRs on creation, update, or request
- ✅ **Check Suite Auto-fixer**: Fixes failing CI/CD checks (up to 3 attempts)
- ✅ **@codegen Mentions**: Responds to @codegen in comments
- ✅ **Label Triggers**: Activates on labels like `codegen:bug-fix`
- ✅ **Webhook Processing**: Receives events from GitHub, CircleCI, Sentry, etc.

---

## CircleCI Integration

Connect Codegen to your CircleCI builds for automatic error detection and fixing.

### Features

- ✅ Auto-fix failing CI/CD builds
- ✅ Analyze test failures
- ✅ Fix linting and type errors
- ✅ Optimize slow builds
- ✅ Update dependencies causing failures

### Setup

#### Step 1: Get CircleCI API Token

1. Visit [app.circleci.com/settings/user/tokens](https://app.circleci.com/settings/user/tokens)
2. Click "Create New Token"
3. Name: `Codegen Integration`
4. Scope: `All` (required for webhook access)
5. Copy the token

#### Step 2: Add to Codegen

1. Visit [codegen.com/settings/integrations](https://codegen.com/settings/integrations)
2. Find "CircleCI"
3. Click "Connect"
4. Paste your API token
5. Click "Save"

#### Step 3: Configure CircleCI Webhooks

1. Go to CircleCI project settings
2. Navigate to "Webhooks"
3. Add webhook:
   - **URL**: `https://api.codegen.com/webhooks/circleci`
   - **Events**: Select all (workflow completed, job failed, etc.)
   - **Signing Secret**: (provided by Codegen dashboard)

### Usage

Once configured, Codegen automatically:

1. **Monitors CircleCI Builds**: Watches for failures
2. **Analyzes Logs**: Identifies root causes
3. **Creates Fixes**: Pushes commits to fix issues
4. **Re-triggers Build**: CircleCI re-runs automatically

### Example Workflow

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  test:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - run: npm ci
      - run: npm test
      - run: npm run lint

workflows:
  main:
    jobs:
      - test
```

**What happens when tests fail:**

1. CircleCI sends webhook to Codegen
2. Codegen analyzes failure logs
3. Agent creates fix commit
4. Push triggers new CircleCI build
5. Build passes ✅

### Configuration

Customize in `.codegen/config.yml`:

```yaml
integrations:
  circleci:
    enabled: true
    auto_fix: true
    max_retries: 3
    retry_delay: 60  # seconds

    # Which failures to auto-fix
    fix_types:
      - test_failures
      - lint_errors
      - build_errors
      - type_errors

    # Notification settings
    notify_on_fix: true
    notify_on_failure: true
```

---

## Sentry Integration

Connect Sentry for automatic error monitoring and fixing in production.

### Features

- ✅ Auto-create issues from Sentry errors
- ✅ Analyze error traces
- ✅ Generate fixes for production bugs
- ✅ Link PRs to Sentry issues
- ✅ Update Sentry when issues are resolved

### Setup

#### Step 1: OAuth Connection

1. Visit [codegen.com/settings/integrations](https://codegen.com/settings/integrations)
2. Find "Sentry"
3. Click "Connect with OAuth"
4. Authorize Codegen to access your Sentry organization
5. Select which projects to monitor

#### Step 2: Configure Sentry Webhooks

1. Go to Sentry organization settings
2. Navigate to "Developer Settings" → "Internal Integrations"
3. Create new integration:
   - **Name**: Codegen
   - **Webhook URL**: `https://api.codegen.com/webhooks/sentry`
   - **Permissions**:
     - Issues: Read & Write
     - Projects: Read
     - Releases: Read
   - **Webhooks**: Select all error events

#### Step 3: Set Alert Rules

```yaml
# Sentry Alert Rule
When: An issue is first seen
Then: Send webhook to Codegen
```

### Usage

**Automatic Error Handling:**

1. Error occurs in production → Sentry captures it
2. Sentry webhook triggers Codegen agent
3. Agent analyzes stack trace and error context
4. Agent creates PR with fix
5. PR merged → Sentry issue marked as resolved

### Example Sentry Error → Codegen Fix

**Sentry Error:**
```text
TypeError: Cannot read property 'email' of undefined
  at UserService.getEmail (src/services/user.ts:45)
  at AuthController.login (src/controllers/auth.ts:23)
```

**Codegen Agent:**
1. Identifies null/undefined user object
2. Adds null check and proper error handling
3. Creates PR with fix
4. Links PR to Sentry issue

### Configuration

```yaml
# .codegen/config.yml
integrations:
  sentry:
    enabled: true

    # Auto-create issues
    auto_create_issues: true

    # Auto-fix errors
    auto_fix: true
    priority_threshold: "high"  # Only auto-fix high/critical

    # Issue creation settings
    create_linear_tickets: true  # Also create Linear tickets
    assign_to_team: "backend"

    # Notification settings
    slack_notifications: true
    channels:
      - "#production-errors"
```

---

## Linear Integration

Connect Linear for seamless issue tracking and PR management.

### Features

- ✅ Auto-create PRs from Linear issues
- ✅ Sync PR status with Linear
- ✅ Link commits to Linear issues
- ✅ Update Linear when PRs are merged
- ✅ Create Linear issues from errors

### Setup

#### Step 1: OAuth Connection

1. Visit [codegen.com/settings/integrations](https://codegen.com/settings/integrations)
2. Find "Linear"
3. Click "Connect with OAuth"
4. Authorize Codegen
5. Select teams and projects

#### Step 2: Configure Webhooks (Optional)

Linear automatically creates webhooks, but you can customize:

1. Go to Linear Settings → API → Webhooks
2. Add webhook:
   - **URL**: `https://api.codegen.com/webhooks/linear`
   - **Events**: Issue created, updated, assigned

### Usage

**Workflow Example:**

```text
1. Create Linear issue: "Fix authentication bug"
2. Add label: "codegen"
3. Codegen agent:
   - Analyzes issue description
   - Creates branch: codegen/issue-123-fix-auth-bug
   - Implements fix
   - Creates PR
   - Links PR to Linear issue
4. Merge PR → Linear issue auto-closed
```

**Mention @codegen in Linear:**

```text
@codegen implement user profile editing feature

Requirements:
- Allow users to edit name, email, avatar
- Add validation
- Include tests
```

Codegen will:
1. Create branch
2. Implement feature
3. Add tests
4. Create PR
5. Link to Linear issue

### Configuration

```yaml
# .codegen/config.yml
integrations:
  linear:
    enabled: true

    # Auto-create PRs
    auto_create_prs: true
    labels_to_trigger:
      - "codegen"
      - "bot"
      - "automated"

    # PR settings
    create_draft_prs: false
    auto_request_review: true
    default_reviewers:
      - "@team/backend"

    # Sync settings
    sync_pr_status: true
    auto_close_on_merge: true

    # Comment settings
    post_progress_updates: true
    comment_on_completion: true
```

---

## Slack Integration

Get real-time notifications and interact with Codegen via Slack.

### Features

- ✅ PR review notifications
- ✅ Agent run updates
- ✅ Error alerts from Sentry
- ✅ CI/CD failure notifications
- ✅ @codegen mentions in Slack

### Setup

#### Step 1: Install Slack App

1. Visit [codegen.com/settings/integrations](https://codegen.com/settings/integrations)
2. Find "Slack"
3. Click "Add to Slack"
4. Select workspace
5. Choose channels for notifications

#### Step 2: Connect Your Account

```bash
# Get connection token
Visit: https://codegen.com/settings/slack

# In Slack, DM the Codegen bot:
Connect my account: <token>
```

### Usage

**In Slack:**

```text
# Mention Codegen in any channel
@codegen review PR #123

# Get agent status
@codegen status

# List recent runs
@codegen runs

# Fix failing build
@codegen fix CI for PR #456
```

**Automatic Notifications:**

```text
📊 Codegen Agent Started
   PR #123: Fix authentication bug
   Track: https://codegen.com/runs/abc123

✅ Codegen Agent Completed
   PR #123: 3 commits pushed
   All checks passing

❌ CI Failed: PR #456
   Codegen auto-fixer activated
   Attempt 1 of 3
```

### Configuration

```yaml
# .codegen/config.yml
integrations:
  slack:
    enabled: true

    # Notification channels
    channels:
      pr_reviews: "#code-reviews"
      agent_runs: "#dev-bots"
      errors: "#production-errors"
      ci_failures: "#build-failures"

    # Notification settings
    notify_on:
      agent_start: true
      agent_complete: true
      agent_error: true
      pr_created: true
      pr_merged: true
      ci_failure: true
      sentry_error: true

    # Mention settings
    enable_mentions: true
    mention_keywords:
      - "@codegen"
      - "codegen:"
```

---

## Additional Integrations

### Notion

Document code changes and architecture decisions.

**Features:**
- Auto-update technical docs
- Create release notes
- Document API changes

**Setup:** OAuth at [codegen.com/settings/integrations](https://codegen.com/settings/integrations)

### Jira

Alternative to Linear for issue tracking.

**Features:**
- Create PRs from Jira tickets
- Sync status
- Auto-close tickets

**Setup:** OAuth at [codegen.com/settings/integrations](https://codegen.com/settings/integrations)

### ClickUp

Task management integration.

**Features:**
- Create PRs from tasks
- Update task status
- Link commits to tasks

**Setup:** OAuth at [codegen.com/settings/integrations](https://codegen.com/settings/integrations)

### Monday.com

Project management integration.

**Setup:** OAuth at [codegen.com/settings/integrations](https://codegen.com/settings/integrations)

### Figma

Design-to-code workflow.

**Features:**
- Implement designs from Figma
- Generate component code
- Sync design tokens

**Setup:** OAuth at [codegen.com/settings/integrations](https://codegen.com/settings/integrations)

---

## Configuration

### Master Configuration

Edit `.codegen/config.yml`:

```yaml
# Codegen Integrations Configuration

organization:
  id: ${CODEGEN_ORG_ID}

# Integration settings
integrations:
  # GitHub (required, via GitHub App)
  github:
    enabled: true
    auto_pr_review: true
    auto_fix_checks: true

  # CircleCI
  circleci:
    enabled: true
    auto_fix: true
    max_retries: 3

  # Sentry
  sentry:
    enabled: true
    auto_create_issues: true
    priority_threshold: "high"

  # Linear
  linear:
    enabled: true
    auto_create_prs: true
    sync_pr_status: true

  # Slack
  slack:
    enabled: true
    default_channel: "#dev-bots"
    notify_on_completion: true

  # Additional integrations
  notion:
    enabled: false
  jira:
    enabled: false
  clickup:
    enabled: false
  figma:
    enabled: false

# Agent behavior
agent:
  model: "sonnet-4.5"
  permissions:
    create_prs: true
    push_commits: true
    merge_prs: false

# Rules
rules:
  global:
    - "Follow existing code style"
    - "Write comprehensive tests"
    - "Update documentation"
```

### Environment Variables

For local development and CI/CD:

```bash
# .env
CODEGEN_API_TOKEN=your_token
CODEGEN_ORG_ID=your_org_id

# Integration tokens (managed via Codegen dashboard)
CIRCLECI_API_KEY=managed_by_codegen
SENTRY_AUTH_TOKEN=managed_by_codegen
LINEAR_API_KEY=managed_by_codegen
SLACK_BOT_TOKEN=managed_by_codegen
```

---

## Verification

### Check Integration Status

```bash
# Via Codegen API
curl -H "Authorization: Bearer $CODEGEN_API_TOKEN" \
  https://api.codegen.com/v1/organizations/$CODEGEN_ORG_ID/integrations

# Response:
{
  "integrations": {
    "github": { "status": "active", "installed": true },
    "circleci": { "status": "active", "connected": true },
    "sentry": { "status": "active", "connected": true },
    "linear": { "status": "active", "connected": true },
    "slack": { "status": "active", "connected": true }
  }
}
```

### Test Integrations

```bash
# Test GitHub App
gh pr create --title "Test Codegen" --body "Testing integration"
gh pr edit <pr-number> --add-label "codegen"

# Test CircleCI
# Push code that fails tests, watch auto-fixer activate

# Test Sentry
# Trigger an error in production, watch Codegen create issue

# Test Linear
# Create issue with "codegen" label, watch PR creation

# Test Slack
# Mention @codegen in Slack channel
```

---

## Troubleshooting

### GitHub App Not Responding

**Check:**
1. GitHub App installed? → [github.com/settings/installations](https://github.com/settings/installations)
2. Permissions granted?
3. Repository included in installation?

**Fix:**
```bash
# Reinstall GitHub App
Visit: https://github.com/apps/codegen-sh
```

### CircleCI Not Triggering

**Check:**
1. API token valid?
2. Webhook configured?
3. CircleCI project connected?

**Fix:**
```bash
# Test webhook
curl -X POST https://api.codegen.com/webhooks/circleci \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Sentry Integration Not Working

**Check:**
1. OAuth connection active?
2. Webhooks configured?
3. Alert rules set?

**Fix:**
Visit [codegen.com/settings/integrations](https://codegen.com/settings/integrations) and reconnect Sentry.

### Linear PRs Not Creating

**Check:**
1. OAuth permissions granted?
2. Labels configured correctly?
3. Issue has enough context?

**Fix:**
Add more detail to Linear issue description.

---

## Best Practices

### 1. Start with GitHub App

Always install the Codegen GitHub App first - it's the foundation for all other integrations.

### 2. Enable Integrations Incrementally

Start with:
1. GitHub App ✅
2. CircleCI (if using)
3. Sentry (for production monitoring)
4. Linear or Slack (for team workflow)

### 3. Configure Notifications Carefully

Avoid notification spam:
```yaml
integrations:
  slack:
    notify_on:
      agent_start: false      # Too noisy
      agent_complete: true    # Important
      agent_error: true       # Critical
```

### 4. Use Labels for Control

Control when Codegen acts:
- `codegen` - generic trigger
- `codegen:auto-fix` - only fix CI failures
- `skip-codegen` - prevent activation

### 5. Monitor Agent Runs

Track performance at [codegen.com/runs](https://codegen.com/runs):
- Success rate
- Average time
- Cost per run
- Common failures

---

## Documentation

- **Codegen Docs**: [docs.codegen.com](https://docs.codegen.com)
- **CircleCI Integration**: [docs.codegen.com/integrations/circleci](https://docs.codegen.com/integrations/circleci)
- **Sentry Integration**: [docs.codegen.com/integrations/sentry](https://docs.codegen.com/integrations/sentry)
- **Linear Integration**: [docs.codegen.com/integrations/linear](https://docs.codegen.com/integrations/linear)
- **GitHub Integration**: [docs.codegen.com/integrations/github](https://docs.codegen.com/integrations/github)

---

## Support

Need help?

- 📖 [docs.codegen.com](https://docs.codegen.com)
- 💬 [Discord Community](https://discord.gg/codegen)
- 📧 [support@codegen.com](mailto:support@codegen.com)
- 🐛 [GitHub Issues](https://github.com/codegen-sh/codegen/issues)
