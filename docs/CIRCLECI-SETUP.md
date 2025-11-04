# CircleCI + Codegen Integration Setup Guide

Complete guide to setting up CircleCI with Codegen auto-fixer for automatic build failure resolution.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Step-by-Step Setup](#step-by-step-setup)
  - [1. Create CircleCI Account](#1-create-circleci-account)
  - [2. Enable Project in CircleCI](#2-enable-project-in-circleci)
  - [3. Install Codegen GitHub App](#3-install-codegen-github-app)
  - [4. Configure CircleCI Integration in Codegen](#4-configure-circleci-integration-in-codegen)
  - [5. Setup CircleCI Webhook](#5-setup-circleci-webhook)
  - [6. Test Integration](#6-test-integration)
- [Configuration Details](#configuration-details)
- [How Auto-Fixing Works](#how-auto-fixing-works)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Overview

This integration connects CircleCI builds with Codegen's AI-powered auto-fixer. When builds fail, Codegen automatically:

1. **Analyzes failure logs** - Identifies root cause from CircleCI logs
2. **Creates fixes** - Generates code changes to resolve issues
3. **Pushes commits** - Commits fixes to your branch
4. **Retries build** - CircleCI automatically re-runs
5. **Repeats if needed** - Up to 3 attempts per failure

### What Can Be Auto-Fixed

✅ **Test Failures** - Failing unit/integration tests
✅ **Linting Errors** - ESLint, Prettier formatting
✅ **Type Errors** - TypeScript type mismatches
✅ **Build Failures** - Compilation errors
✅ **Security Issues** - npm audit vulnerabilities
✅ **Dependency Conflicts** - Version incompatibilities

---

## Prerequisites

Before starting, ensure you have:

- ✅ GitHub repository with code
- ✅ GitHub account with admin access to repository
- ✅ CircleCI account (free tier works)
- ✅ Node.js project with `package.json`

---

## Quick Start

**5-Minute Setup:**

```bash
# 1. Repository already has CircleCI config (.circleci/config.yml) ✅
# 2. Repository already has Codegen config (.codegen/config.yml) ✅

# 3. Enable project in CircleCI
# Visit: https://app.circleci.com/projects/github/{your-username}
# Click "Set Up Project" for this repository

# 4. Install Codegen GitHub App
# Visit: https://github.com/apps/codegen-sh
# Click "Install" and select this repository

# 5. Connect CircleCI to Codegen
# Visit: https://codegen.com/settings/integrations
# Find "CircleCI" → "Connect"
# Follow OAuth flow

# 6. Configure webhook (done automatically by Codegen)
# Webhook URL: https://api.codegen.com/webhooks/circleci

# 7. Test by pushing code
git push origin main

# CircleCI builds, and if it fails, Codegen auto-fixes! 🎉
```

---

## Step-by-Step Setup

### 1. Create CircleCI Account

If you don't have a CircleCI account:

1. Visit [circleci.com](https://circleci.com)
2. Click "Sign Up"
3. Sign up with GitHub
4. Authorize CircleCI to access your GitHub account

### 2. Enable Project in CircleCI

Enable this repository in CircleCI:

#### Via CircleCI Dashboard

1. Visit [app.circleci.com/projects](https://app.circleci.com/projects)
2. Find your repository in the list
3. Click "Set Up Project"
4. Choose "Use Existing Config" (we already have `.circleci/config.yml`)
5. Click "Start Building"

#### Verify Setup

```bash
# Push a commit to trigger first build
git commit --allow-empty -m "test: Trigger CircleCI build"
git push origin main

# Check build status
# Visit: https://app.circleci.com/pipelines/github/{username}/{repo}
```

### 3. Install Codegen GitHub App

The Codegen GitHub App handles webhooks and automation:

1. Visit [github.com/apps/codegen-sh](https://github.com/apps/codegen-sh)
2. Click "Install"
3. Select repositories:
   - Option A: "All repositories"
   - Option B: "Only select repositories" → choose this repo
4. Click "Install"
5. Authorize permissions:
   - ✅ Read code
   - ✅ Write pull requests
   - ✅ Write issues
   - ✅ Write checks
   - ✅ Write commit statuses

**Verify Installation:**

```bash
# Check GitHub Apps for this repo
gh api /repos/{owner}/{repo}/installation

# Or visit:
# https://github.com/settings/installations
```

### 4. Configure CircleCI Integration in Codegen

Connect CircleCI to your Codegen account:

#### Step 4.1: Get CircleCI API Token

1. Visit [app.circleci.com/settings/user/tokens](https://app.circleci.com/settings/user/tokens)
2. Click "Create New Token"
3. Settings:
   - **Name**: `Codegen Integration`
   - **Scope**: `All` (required for webhook access)
4. Click "Create"
5. **Copy the token** (you won't see it again!)

#### Step 4.2: Add Token to Codegen

1. Visit [codegen.com/settings/integrations](https://codegen.com/settings/integrations)
2. Find "CircleCI" in the integrations list
3. Click "Connect"
4. Paste your CircleCI API token
5. Click "Save"

#### Step 4.3: Enable Auto-Fix

Configure auto-fix settings in Codegen dashboard:

1. Stay on CircleCI integration page
2. Enable these options:
   - ✅ **Auto-fix build failures** - Fix failing builds automatically
   - ✅ **Post comments on PRs** - Notify when fixes are made
   - ✅ **Retry up to 3 times** - Retry failed builds
3. Click "Save Settings"

**Configuration is also in `.codegen/config.yml`:**

```yaml
integrations:
  circleci:
    enabled: true          # ✅ Already enabled in this repo
    auto_fix: true
    max_retries: 3
    notify_on_fix: true
```

### 5. Setup CircleCI Webhook

Configure CircleCI to send failure notifications to Codegen:

#### Step 5.1: Get Webhook URL from Codegen

1. Visit [codegen.com/settings/integrations/circleci](https://codegen.com/settings/integrations/circleci)
2. Find "Webhook URL" section
3. Copy webhook URL: `https://api.codegen.com/webhooks/circleci`
4. Copy signing secret (if shown)

#### Step 5.2: Add Webhook in CircleCI

1. Visit CircleCI project settings:
   - URL: `https://app.circleci.com/settings/project/github/{username}/{repo}/webhooks`
2. Click "Add Webhook"
3. Configure webhook:
   - **Webhook Name**: `Codegen Auto-fixer`
   - **URL**: `https://api.codegen.com/webhooks/circleci`
   - **Certificate Verification**: ✅ Enabled
   - **Events to send**:
     - ✅ `workflow-completed` (Required)
     - ✅ `job-completed` (Recommended)
4. Click "Add Webhook"

#### Step 5.3: Verify Webhook

Test webhook delivery:

1. In CircleCI webhook settings, find your new webhook
2. Click "Test Webhook"
3. Select event type: `workflow-completed`
4. Click "Test"
5. Check response: Should be `200 OK`

**Verify in Codegen:**

1. Visit [codegen.com/settings/integrations/circleci](https://codegen.com/settings/integrations/circleci)
2. Check "Webhook Status": Should show "Connected" ✅

### 6. Test Integration

Verify the complete integration:

#### Test 1: Successful Build

```bash
# Push a commit that should pass
git commit --allow-empty -m "test: Verify CircleCI works"
git push origin main

# Expected:
# 1. CircleCI runs build
# 2. Build passes ✅
# 3. GitHub shows green check
```

#### Test 2: Failing Build (Auto-Fix)

```bash
# Create a branch with a failing test
git checkout -b test-circleci-autofix

# Add a failing test
cat > test-fail.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';

describe('Failing test for CircleCI auto-fix', () => {
  it('should fail', () => {
    expect(1 + 1).toBe(3); // Intentionally wrong
  });
});
EOF

git add test-fail.test.ts
git commit -m "test: Add failing test to trigger auto-fix"
git push origin test-circleci-autofix

# Expected flow:
# 1. CircleCI runs build
# 2. Test fails ❌
# 3. CircleCI sends webhook to Codegen
# 4. Codegen receives failure notification
# 5. Codegen AI analyzes logs
# 6. Codegen creates fix commit
# 7. CircleCI re-runs automatically
# 8. Build passes ✅

# Monitor progress:
# - CircleCI: https://app.circleci.com/pipelines/github/{username}/{repo}
# - Codegen: https://codegen.com/runs
```

#### Test 3: PR with Auto-Fix

```bash
# Create PR from test branch
gh pr create \
  --base main \
  --head test-circleci-autofix \
  --title "Test CircleCI Auto-fix" \
  --body "Testing Codegen auto-fix integration"

# Expected:
# 1. CircleCI runs for PR
# 2. If tests fail, Codegen auto-fixes
# 3. PR shows status updates
# 4. Codegen posts comment explaining fix
```

---

## Configuration Details

### CircleCI Configuration (`.circleci/config.yml`)

Key sections for Codegen integration:

```yaml
version: 2.1

# Notify Codegen on failure
commands:
  notify-codegen:
    steps:
      - run:
          name: Notify Codegen
          when: on_fail
          command: |
            echo "Build failed - Codegen will receive webhook"

jobs:
  test:
    executor: node-executor
    steps:
      - checkout
      - run: npm ci
      - run: npm test
      - notify-codegen  # Call on failure
```

### Codegen Configuration (`.codegen/config.yml`)

CircleCI integration settings:

```yaml
integrations:
  circleci:
    enabled: true              # Enable CircleCI integration
    auto_fix: true             # Auto-fix failures
    max_retries: 3             # Retry up to 3 times
    notify_on_fix: true        # Post PR comments

    # Types of failures to fix
    fix_types:
      - test_failures          # Fix failing tests
      - lint_errors            # Fix linting issues
      - build_errors           # Fix compilation errors
      - type_errors            # Fix TypeScript errors
      - security_warnings      # Fix npm audit issues

    # Commit strategy
    separate_commits: true     # Separate commit per fix type
    commit_message_prefix: "fix(ci): "
```

### Environment Variables

Add these to CircleCI project settings if needed:

```bash
# CircleCI Project Settings → Environment Variables

# Optional: Codegen API token (for advanced features)
CODEGEN_API_TOKEN=your_token

# Optional: Custom configuration
CODEGEN_ORG_ID=your_org_id
```

---

## How Auto-Fixing Works

### Detailed Workflow

```text
┌──────────────┐
│ Git Push     │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ CircleCI Build Runs  │
│ - Install deps       │
│ - Run tests         │
│ - Linting           │
│ - Type checking     │
└──────┬───────────────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
  ✅ PASS            ❌ FAIL
       │                 │
       ▼                 ▼
  GitHub Status    CircleCI Webhook
  Green Check      ─────────┐
                            │
                            ▼
                   ┌─────────────────┐
                   │ Codegen Receives│
                   │ Failure Event   │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────────┐
                   │ AI Agent Analyzes:  │
                   │ - Build logs        │
                   │ - Error messages    │
                   │ - Stack traces      │
                   │ - File contents     │
                   └────────┬────────────┘
                            │
                            ▼
                   ┌─────────────────────┐
                   │ Agent Creates Fix:  │
                   │ - Identify root cause│
                   │ - Plan solution     │
                   │ - Generate code     │
                   │ - Test locally      │
                   └────────┬────────────┘
                            │
                            ▼
                   ┌─────────────────────┐
                   │ Agent Commits Fix   │
                   │ git commit -m "..." │
                   │ git push origin     │
                   └────────┬────────────┘
                            │
                            ▼
                   ┌─────────────────────┐
                   │ CircleCI Re-runs    │
                   │ (automatic)         │
                   └────────┬────────────┘
                            │
                            ├─────────────┐
                            │             │
                            ▼             ▼
                       ✅ PASS       ❌ STILL FAILS
                            │             │
                            ▼             ▼
                   GitHub Status    Retry (up to 3x)
                   Green Check      or notify user
```

### Example: Test Failure Fix

**1. Initial Failure:**

```typescript
// test/user.test.ts
describe('User service', () => {
  it('should return user email', () => {
    const user = { name: 'John' };
    expect(user.email).toBe('john@example.com'); // FAILS: email is undefined
  });
});
```

**CircleCI Output:**

```text
❌ FAIL test/user.test.ts
  ● User service › should return user email

    expect(received).toBe(expected)

    Expected: "john@example.com"
    Received: undefined

      4 |     const user = { name: 'John' };
    > 5 |     expect(user.email).toBe('john@example.com');
        |                       ^
```

**2. Codegen Analysis:**

- Identifies missing `email` property
- Checks if this is test data issue or implementation bug
- Determines test data needs fixing

**3. Codegen Fix:**

```typescript
// test/user.test.ts (fixed by Codegen)
describe('User service', () => {
  it('should return user email', () => {
    const user = { name: 'John', email: 'john@example.com' }; // ✅ Added email
    expect(user.email).toBe('john@example.com'); // Now passes
  });
});
```

**4. Codegen Commit:**

```bash
fix(ci): Add missing email property in user test

- Added email field to user test data
- Test now passes as expected

Fixes test failure in CircleCI build
```

**5. Result:**

- CircleCI re-runs automatically
- Test passes ✅
- PR shows green check
- Comment posted on PR explaining fix

---

## Troubleshooting

### Issue: CircleCI Build Not Running

**Symptoms:**

- No builds appear in CircleCI dashboard
- GitHub shows "Expected" status but never completes

**Solutions:**

1. **Check project is enabled:**
   ```bash
   # Visit: https://app.circleci.com/projects/github/{username}
   # Ensure project shows "Following" status
   ```

2. **Verify `.circleci/config.yml` exists:**
   ```bash
   ls -la .circleci/config.yml
   # Should exist and be committed
   ```

3. **Check CircleCI configuration syntax:**
   ```bash
   # Use CircleCI CLI to validate
   circleci config validate .circleci/config.yml
   ```

### Issue: Codegen Not Receiving Webhooks

**Symptoms:**

- Builds fail but Codegen doesn't create fixes
- No activity in Codegen runs dashboard

**Solutions:**

1. **Verify webhook is configured:**
   ```bash
   # Visit: https://app.circleci.com/settings/project/github/{username}/{repo}/webhooks
   # Check webhook URL is correct: https://api.codegen.com/webhooks/circleci
   ```

2. **Test webhook manually:**
   - In CircleCI webhook settings, click "Test Webhook"
   - Should return `200 OK`

3. **Check webhook deliveries:**
   - In CircleCI, view webhook delivery history
   - Look for recent deliveries and response codes

4. **Verify Codegen integration is enabled:**
   ```bash
   # Check .codegen/config.yml
   grep -A 5 "circleci:" .codegen/config.yml
   # Should show: enabled: true
   ```

### Issue: Auto-Fix Not Working

**Symptoms:**

- Webhook received but no fix commits created
- Codegen runs show failures

**Solutions:**

1. **Check Codegen agent runs:**
   ```bash
   # Visit: https://codegen.com/runs
   # Find recent runs for this repo
   # Click to see error details
   ```

2. **Verify GitHub App permissions:**
   ```bash
   # Visit: https://github.com/settings/installations
   # Find Codegen app
   # Ensure "Write" permission for:
   #   - Pull requests
   #   - Contents (code)
   #   - Issues
   ```

3. **Check branch protection:**
   ```bash
   # If branch is protected, Codegen needs permission to push
   # Visit: https://github.com/{owner}/{repo}/settings/branches
   # Allow Codegen app to bypass protection
   ```

4. **Review failure type:**
   - Some failures may be too complex for auto-fix
   - Check if failure type is in `fix_types` list

### Issue: Too Many Retry Attempts

**Symptoms:**

- Codegen retries 3 times but still fails
- No fix works

**Solutions:**

1. **Review failure complexity:**
   - May require human intervention
   - Check Codegen run logs for details

2. **Adjust retry settings:**
   ```yaml
   # .codegen/config.yml
   integrations:
     circleci:
       max_retries: 5  # Increase if needed
   ```

3. **Manual fix:**
   - Review Codegen's attempted fixes
   - Apply manual solution
   - Update tests/code to prevent recurrence

### Issue: Webhook Signature Verification Failed

**Symptoms:**

- Webhook deliveries show `401 Unauthorized` or `403 Forbidden`

**Solutions:**

1. **Regenerate webhook secret:**
   - In Codegen dashboard, regenerate secret
   - Update in CircleCI webhook settings

2. **Check webhook URL:**
   - Must be exact: `https://api.codegen.com/webhooks/circleci`
   - No trailing slashes

---

## Best Practices

### 1. Start with Simple Failures

Test auto-fix with simple, fixable issues first:

- Linting errors (easy to fix)
- Simple test failures
- Type errors

Then progress to more complex issues.

### 2. Monitor Agent Runs

Regularly review Codegen agent runs:

- Visit [codegen.com/runs](https://codegen.com/runs)
- Check success rate
- Identify patterns in failures
- Adjust configuration as needed

### 3. Set Appropriate Retry Limits

Balance between persistence and cost:

```yaml
# Conservative (fewer retries, lower cost)
max_retries: 2

# Balanced (recommended)
max_retries: 3

# Aggressive (more retries, higher cost)
max_retries: 5
```

### 4. Use Separate Commits

Keep fix types separate for clarity:

```yaml
integrations:
  circleci:
    separate_commits: true  # ✅ Recommended
```

Results in clear commit history:

```text
fix(ci): Fix TypeScript type errors
fix(ci): Fix ESLint errors
fix(ci): Fix failing unit tests
```

### 5. Configure Notifications

Stay informed without spam:

```yaml
integrations:
  circleci:
    notify_on_fix: true     # ✅ Notify when fixed
    notify_on_failure: false # ❌ Don't spam on every failure
```

### 6. Branch Protection Rules

Configure to work with auto-fix:

1. Require status checks to pass
2. Allow Codegen app to bypass restrictions
3. Require pull request reviews (still needed after auto-fix)

### 7. Cost Management

Set budget limits to control costs:

```yaml
cost_controls:
  max_cost_per_run: 100      # Max credits per run
  max_daily_cost: 1000       # Daily limit
  cost_alerts: true          # Get alerts
  alert_threshold: 80        # Alert at 80%
```

### 8. Test on Feature Branches First

Before enabling on `main`:

1. Test on feature branch
2. Verify auto-fix works
3. Review fix quality
4. Then enable for protected branches

---

## Integration Status

Check integration health:

```bash
# Test integration
gh workflow run circleci.yml -f test_integration=true

# Check recent runs
gh run list --workflow=circleci.yml

# View CircleCI status
# Visit: https://app.circleci.com/pipelines/github/{username}/{repo}

# View Codegen runs
# Visit: https://codegen.com/runs
```

---

## Additional Resources

- **CircleCI Documentation**: [circleci.com/docs](https://circleci.com/docs)
- **Codegen Docs**: [docs.codegen.com](https://docs.codegen.com)
- **Codegen CircleCI Integration**: [docs.codegen.com/integrations/circleci](https://docs.codegen.com/integrations/circleci)
- **GitHub App Setup**: [docs/CODEGEN-GITHUB-APP-SETUP.md](./CODEGEN-GITHUB-APP-SETUP.md)
- **Integration Overview**: [docs/CODEGEN-INTEGRATIONS.md](./CODEGEN-INTEGRATIONS.md)

---

## Support

Need help?

- 📖 [docs.codegen.com](https://docs.codegen.com)
- 💬 [Discord Community](https://discord.gg/codegen)
- 📧 [support@codegen.com](mailto:support@codegen.com)
- 🐛 [GitHub Issues](https://github.com/evgenygurin/claude-code-connect/issues)

---

**Last Updated**: 2025-01-04

**Status**: ✅ Integration configured and ready to use
