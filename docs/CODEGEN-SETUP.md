# Codegen Integration Setup Guide

Complete guide to setting up Codegen AI agent integration with your GitHub repository.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Configuration](#configuration)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [Advanced Features](#advanced-features)

## Overview

Codegen is an AI-powered software engineering agent that can:

- **Automatic PR Reviews**: Review code quality, security, and best practices
- **Check Suite Auto-fixer**: Automatically fix failing CI/CD checks
- **Code Generation**: Implement features, fix bugs, and refactor code
- **Test Generation**: Create comprehensive test coverage
- **Documentation**: Update docs and add code comments
- **Code Analysis**: Deep codebase exploration and insights

This integration provides:

✅ GitHub Actions workflows for automated agent runs
✅ Label-based triggering for easy task assignment
✅ Comment-based activation with `@codegen` mentions
✅ Automatic check suite failure fixing
✅ PR review automation
✅ Manual workflow dispatch for custom tasks

## Prerequisites

1. **GitHub Account** with repository access
2. **Codegen Account** at [codegen.com](https://codegen.com)
3. **API Token** from [codegen.com/token](https://codegen.com/token)
4. **Organization ID** from [codegen.com/settings](https://codegen.com/settings)

## Quick Start

### 1. Get Codegen Credentials

```bash
# Visit https://codegen.com/token to get your API token
# Visit https://codegen.com/settings to get your organization ID
```

### 2. Add GitHub Secrets

Go to your repository settings → Secrets and variables → Actions → New repository secret:

```text
CODEGEN_API_TOKEN=your_api_token_here
CODEGEN_ORG_ID=your_organization_id_here
```

### 3. Install GitHub App (Recommended)

For full integration with webhooks and real-time processing:

1. Visit [github.com/apps/codegen-sh](https://github.com/apps/codegen-sh)
2. Click "Install"
3. Select your organization/repositories
4. Grant required permissions

### 4. Copy Workflow Files

The workflow files are already in `.github/workflows/`:

- `codegen.yml` - Main Codegen integration
- `codegen-labels.yml` - Label-based triggers

### 5. Test the Integration

Create a test PR and add the `codegen` label, or comment with `@codegen please review this code`.

## Detailed Setup

### Step 1: Create Codegen Account

1. Visit [codegen.com](https://codegen.com)
2. Sign up with your GitHub account
3. Complete organization setup
4. Note your organization ID

### Step 2: Generate API Token

1. Navigate to [codegen.com/token](https://codegen.com/token)
2. Click "Generate New Token"
3. Copy the token (you won't see it again!)
4. Store securely - this is your authentication key

### Step 3: Configure GitHub Secrets

Add the following secrets to your repository:

| Secret Name | Description | Required |
|------------|-------------|----------|
| `CODEGEN_API_TOKEN` | Your Codegen API token | ✅ Yes |
| `CODEGEN_ORG_ID` | Your organization ID | ✅ Yes |
| `GITHUB_TOKEN` | Automatic, no setup needed | ✅ Auto |

**How to add secrets:**

```bash
# Via GitHub CLI
gh secret set CODEGEN_API_TOKEN

# Via GitHub Web UI
Repository → Settings → Secrets and variables → Actions → New repository secret
```

### Step 4: Configure Codegen Settings

Edit `.codegen/config.yml` to customize agent behavior:

```yaml
organization:
  id: ${CODEGEN_ORG_ID}

agent:
  model: "sonnet-4.5"
  permissions:
    create_prs: true
    push_commits: true
    merge_prs: false

check_suite:
  auto_fix: true
  fix_types:
    - "test_failures"
    - "lint_errors"
    - "type_errors"
```

### Step 5: Set Up Labels

Create these labels in your repository for easy triggering:

```bash
# Recommended labels
gh label create "codegen" --description "Trigger Codegen agent" --color "0E8A16"
gh label create "codegen:bug-fix" --description "Auto-fix bug" --color "D73A4A"
gh label create "codegen:feature" --description "Implement feature" --color "0075CA"
gh label create "codegen:refactor" --description "Refactor code" --color "5319E7"
gh label create "codegen:auto-fix" --description "Auto-fix CI failures" --color "FBCA04"
gh label create "codegen:review" --description "Code review" --color "1D76DB"
gh label create "codegen:tests" --description "Add tests" --color "C5DEF5"
gh label create "codegen:docs" --description "Update documentation" --color "0052CC"
```

## Configuration

### Agent Rules

Customize agent behavior by editing `.codegen/config.yml`:

```yaml
rules:
  global:
    - "Always write TypeScript with strict type safety"
    - "Follow existing code style and conventions"
    - "Write comprehensive tests for new functionality"
    - "Use meaningful commit messages"
    - "Never commit secrets or sensitive data"

  code_quality:
    - "Run linter and fix all linting errors"
    - "Ensure type checking passes"
    - "Add JSDoc comments for public APIs"

  testing:
    - "Achieve at least 80% code coverage"
    - "Write unit tests for all new functions"
    - "Test edge cases and error conditions"

  security:
    - "Validate and sanitize all user inputs"
    - "Never log sensitive information"
    - "Keep dependencies up to date"
```

### Environment Variables

Optional environment variables for local development (`.env`):

```bash
# Codegen configuration
CODEGEN_API_TOKEN=your_token
CODEGEN_ORG_ID=your_org_id
CODEGEN_MODEL=sonnet-4.5
CODEGEN_AUTO_FIX=true
CODEGEN_AUTO_REVIEW=true
CODEGEN_MAX_RUNS_PER_HOUR=50
CODEGEN_VERBOSE_LOGGING=false
```

### Workflow Customization

Customize triggers in `.github/workflows/codegen.yml`:

```yaml
# Disable auto-review for draft PRs
if: |
  github.event.pull_request.draft == false &&
  !contains(github.event.pull_request.labels.*.name, 'skip-codegen')

# Custom review prompt
prompt: |
  Focus on:
  1. Security vulnerabilities
  2. Performance bottlenecks
  3. Code maintainability
```

## Usage

### Method 1: Label-Based Triggering

Add labels to issues or PRs:

- `codegen` - General task based on title/description
- `codegen:bug-fix` - Automatically fix a bug
- `codegen:feature` - Implement a feature
- `codegen:refactor` - Refactor code
- `codegen:auto-fix` - Fix failing CI checks
- `codegen:review` - Code review
- `codegen:tests` - Add test coverage
- `codegen:docs` - Update documentation

**Example:**

```bash
# Add label via CLI
gh pr edit 123 --add-label "codegen:bug-fix"

# Add label via GitHub UI
PR → Labels → Select "codegen:bug-fix"
```

### Method 2: Comment-Based Triggering

Mention `@codegen` in PR/issue comments:

```text
@codegen please review this code for security issues

@codegen implement the authentication feature described in issue #123

@codegen fix the failing tests in this PR

@codegen refactor the database connection logic

@codegen add comprehensive tests for the user service
```

### Method 3: Automatic Triggers

Codegen automatically runs on:

- **PR Creation**: Automatic code review
- **Check Suite Failure**: Auto-fixer attempts to resolve
- **Push to PR**: Re-review if configured

### Method 4: Manual Workflow Dispatch

Trigger manually via GitHub Actions:

```bash
# Via GitHub CLI
gh workflow run codegen.yml \
  -f prompt="Fix the authentication bug in src/auth.ts" \
  -f pr_number="123"

# Via GitHub UI
Actions → Codegen Integration → Run workflow → Enter prompt
```

## Monitoring and Tracking

### View Agent Runs

Track agent progress:

1. **GitHub Actions**: Check workflow runs in Actions tab
2. **Codegen Dashboard**: Visit [codegen.com/runs](https://codegen.com/runs)
3. **PR Comments**: Agent posts updates in PR comments

### Agent Run Lifecycle

```text
Created → Running → Analyzing → Implementing → Testing → Completed
                                                      ↓
                                                   Failed
```

### Status Updates

Codegen posts updates:

```text
🤖 Codegen Agent Activated
   Agent Run: abc123xyz
   Track progress: https://codegen.com/runs/abc123xyz

✅ Task Completed
   - Fixed 3 failing tests
   - Updated 2 files
   - All checks passing
```

## Troubleshooting

### Common Issues

#### 1. "Codegen agent failed to start"

**Cause**: Invalid API token or organization ID

**Solution**:

```bash
# Verify secrets are set
gh secret list

# Regenerate token at codegen.com/token
gh secret set CODEGEN_API_TOKEN
```

#### 2. "Permission denied"

**Cause**: Insufficient GitHub permissions

**Solution**:

- Check workflow file has required permissions
- Verify GitHub token has necessary scopes
- Ensure Codegen GitHub App is installed

#### 3. "Agent timeout"

**Cause**: Task took longer than max timeout

**Solution**:

- Increase timeout in `.codegen/config.yml`
- Break task into smaller chunks
- Check agent run logs for bottlenecks

#### 4. "Rate limit exceeded"

**Cause**: Too many agent runs

**Solution**:

```yaml
# Adjust in .codegen/config.yml
rate_limits:
  max_runs_per_hour: 100  # Increase limit
  max_concurrent_runs: 5
```

#### 5. "No response from agent"

**Cause**: Webhook delivery issues

**Solution**:

- Check GitHub App installation
- Verify webhook configuration
- Test with manual workflow dispatch

### Debug Mode

Enable verbose logging:

```yaml
# In .codegen/config.yml
monitoring:
  verbose_logging: true
  track_metrics: true
```

### Support

- **Documentation**: [docs.codegen.com](https://docs.codegen.com)
- **GitHub Issues**: [github.com/codegen-sh/codegen/issues](https://github.com/codegen-sh/codegen/issues)
- **Discord Community**: [discord.gg/codegen](https://discord.gg/codegen)
- **Email Support**: support@codegen.com

## Advanced Features

### Custom Prompts

Create reusable prompt templates:

```yaml
# .codegen/prompts/bug-fix.yml
name: "Bug Fix"
description: "Fix a bug with comprehensive testing"
prompt: |
  Fix the bug described in the issue/PR:

  1. Analyze the bug and identify root cause
  2. Implement a fix following best practices
  3. Add unit tests to prevent regression
  4. Update documentation if needed
  5. Ensure all CI checks pass
```

### Integration with Other Tools

#### Slack Notifications

```yaml
# .codegen/config.yml
integrations:
  slack:
    enabled: true
    webhook_url: ${SLACK_WEBHOOK_URL}
    channels:
      - "#dev-notifications"
```

#### Linear Integration

```yaml
integrations:
  linear:
    enabled: true
    update_issues: true
```

### Cost Controls

Monitor and limit costs:

```yaml
cost_controls:
  max_cost_per_run: 100
  max_daily_cost: 1000
  cost_alerts: true
```

### Sandbox Configuration

Customize agent sandbox environment:

```yaml
sandbox:
  env_vars:
    NODE_ENV: "test"
    CI: "true"

  setup_commands:
    - "npm ci"
    - "npm run build"

  setup_timeout: 10
```

## Best Practices

### 1. Clear Task Descriptions

❌ Bad: `@codegen fix this`

✅ Good: `@codegen fix the authentication timeout issue in src/auth/session.ts by increasing the session timeout from 30 to 60 minutes`

### 2. Use Specific Labels

Use `codegen:bug-fix` instead of generic `codegen` for better task routing.

### 3. Review Agent Changes

Always review agent-generated PRs before merging:

- Check for unintended changes
- Verify tests are meaningful
- Ensure code style matches project conventions

### 4. Iterative Refinement

If the agent doesn't get it right the first time, provide feedback:

```text
@codegen the tests you added don't cover edge cases. Please add tests for:
- null inputs
- empty arrays
- concurrent requests
```

### 5. Set Clear Rules

Define project-specific rules in `.codegen/config.yml`:

```yaml
rules:
  global:
    - "Use React hooks instead of class components"
    - "Prefer async/await over promises"
    - "Use Zod for schema validation"
```

## Security Considerations

### Secret Management

- Never commit `.env` files
- Use GitHub Secrets for sensitive data
- Rotate API tokens regularly
- Limit agent permissions appropriately

### Code Review

- Always review agent-generated code
- Use branch protection rules
- Require human approval before merging
- Enable code scanning and security alerts

### Access Control

```yaml
# Limit agent permissions
agent:
  permissions:
    create_prs: true
    push_commits: true
    merge_prs: false          # Require human approval
    delete_branches: false
    modify_workflows: false   # Prevent workflow tampering
```

## Examples

### Example 1: Bug Fix Workflow

```bash
# 1. Create issue describing bug
gh issue create --title "User login timeout error" --body "Users report timeout..."

# 2. Add codegen:bug-fix label
gh issue edit 456 --add-label "codegen:bug-fix"

# 3. Agent analyzes, fixes, creates PR
# 4. Review the PR
gh pr view 457 --web

# 5. Merge if approved
gh pr merge 457
```

### Example 2: Feature Implementation

```text
1. Create issue with feature requirements
2. Comment: @codegen implement user profile editing feature
3. Agent creates implementation PR
4. Review and request changes if needed
5. Agent iterates based on feedback
6. Merge completed feature
```

### Example 3: Auto-fix CI Failures

```text
1. Push commit that breaks tests
2. CI checks fail
3. Codegen auto-fixer activates automatically
4. Agent analyzes logs, fixes tests
5. Pushes fix commit
6. CI checks pass ✅
```

## Next Steps

1. ✅ Complete setup following this guide
2. 🧪 Test with a small PR using `codegen` label
3. 📚 Review generated code and provide feedback
4. ⚙️ Customize rules in `.codegen/config.yml`
5. 🚀 Roll out to team with training session
6. 📊 Monitor usage and iterate on configuration

## Resources

- **Documentation**: [docs.codegen.com](https://docs.codegen.com)
- **API Reference**: [docs.codegen.com/api-reference](https://docs.codegen.com/api-reference)
- **Examples**: [github.com/codegen-sh/codegen-examples](https://github.com/codegen-sh/codegen-examples)
- **Community**: [discord.gg/codegen](https://discord.gg/codegen)
- **Blog**: [codegen.com/blog](https://codegen.com/blog)

---

**Need Help?**

- 📖 Check the [full documentation](https://docs.codegen.com)
- 💬 Ask in [Discord community](https://discord.gg/codegen)
- 📧 Email [support@codegen.com](mailto:support@codegen.com)
- 🐛 Report issues on [GitHub](https://github.com/codegen-sh/codegen/issues)
