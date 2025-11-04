# Codegen GitHub App Setup

**Quick Start**: Install the Codegen GitHub App for webhook-based AI agent integration.

## Why GitHub App Instead of SDK?

The Codegen GitHub App provides:

✅ **No API Tokens Needed**: OAuth-based authentication
✅ **Real-time Webhooks**: Instant event processing
✅ **Native Integrations**: CircleCI, Sentry, Linear work automatically
✅ **Better Security**: Scoped permissions, no secrets in repo
✅ **Centralized Config**: Manage all settings at codegen.com

## Installation (2 minutes)

### Step 1: Install GitHub App

1. **Visit**: [github.com/apps/codegen-sh](https://github.com/apps/codegen-sh)

2. **Click "Install"**

3. **Select repositories**:
   - Choose "All repositories" OR
   - Select specific repositories (including this one)

4. **Grant permissions**:
   - ✅ Read access to code
   - ✅ Write access to pull requests
   - ✅ Write access to issues
   - ✅ Read access to checks
   - ✅ Write access to commit statuses
   - ✅ Webhooks (for event subscriptions)

5. **Click "Install"**

### Step 2: Verify Installation

```bash
# Check installation status
gh api /repos/{owner}/{repo}/installations

# Or visit GitHub Settings
# Settings → Applications → Installed GitHub Apps
```

You should see "Codegen" in the list.

### Step 3: Configure on Codegen Dashboard

1. Visit [codegen.com](https://codegen.com)
2. Sign in with GitHub
3. Navigate to Settings → Integrations
4. Verify GitHub App is connected
5. Configure additional integrations (CircleCI, Sentry, Linear)

## What Gets Enabled

Once installed, Codegen automatically handles:

### PR Events
- ✅ PR created → Optional auto-review
- ✅ PR updated → Re-review if configured
- ✅ PR comments with `@codegen` → Agent activation
- ✅ Labels added (`codegen:*`) → Task execution

### Check Suite Events
- ✅ CI fails → Auto-fixer activates
- ✅ Tests fail → Analyzes and fixes
- ✅ Linting errors → Auto-format
- ✅ Type errors → Adds types

### Issue Events
- ✅ Issue created with `codegen` label → Creates PR
- ✅ `@codegen` mentions → Analyzes and responds
- ✅ Linked to Sentry errors → Auto-fixes

### Integration Events (if configured)
- ✅ CircleCI build fails → Auto-fixes
- ✅ Sentry error reported → Creates issue + fix
- ✅ Linear issue labeled → Creates PR

## Configuration

### Workflow Files Not Required!

Unlike direct SDK integration, you **don't need** complex workflow files. The GitHub App handles everything.

**Minimal workflow** (optional):

```yaml
# .github/workflows/codegen.yml
name: Codegen

on:
  issue_comment:
    types: [created]

jobs:
  acknowledge:
    if: contains(github.event.comment.body, '@codegen')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: '👋 Codegen GitHub App will process this request'
            });
```

### Configuration File

Edit `.codegen/config.yml`:

```yaml
organization:
  id: ${CODEGEN_ORG_ID}

# Agent behavior
agent:
  model: "sonnet-4.5"
  permissions:
    create_prs: true
    push_commits: true
    merge_prs: false  # Require human approval

# Integration settings
integrations:
  github:
    enabled: true
    auto_pr_review: true    # Review PRs automatically
    auto_fix_checks: true   # Fix failing checks

  circleci:
    enabled: false  # Enable at codegen.com/settings

  sentry:
    enabled: false  # Enable at codegen.com/settings

  linear:
    enabled: false  # Enable at codegen.com/settings

# Rules
rules:
  global:
    - "Follow existing code style"
    - "Write comprehensive tests"
    - "Never commit secrets"
```

## Usage

### Trigger via Comments

```text
@codegen please review this code for security issues
@codegen fix the failing tests
@codegen implement feature X described in issue #123
```

### Trigger via Labels

```bash
# Add label to trigger agent
gh pr edit 123 --add-label "codegen:bug-fix"
gh issue edit 456 --add-label "codegen:feature"
```

### Trigger via Integrations

**CircleCI:**
- Build fails → Codegen auto-fixes

**Sentry:**
- Error reported → Codegen creates issue and fix

**Linear:**
- Issue with `codegen` label → Codegen creates PR

## Monitoring

### View Agent Runs

**Codegen Dashboard:**
[codegen.com/runs](https://codegen.com/runs)

**GitHub Checks:**
- Go to PR → Checks tab
- Look for "Codegen" check

**PR Comments:**
Codegen posts progress updates:
```text
🤖 Codegen Agent Activated
   Agent Run: abc123xyz
   Track: https://codegen.com/runs/abc123xyz

✅ Analysis Complete
   - Fixed 3 test failures
   - Updated 2 files
   - All checks passing
```

### Check Integration Status

```bash
# Via API
curl -H "Authorization: Bearer $CODEGEN_API_TOKEN" \
  https://api.codegen.com/v1/organizations/$ORG_ID/integrations

# Response:
{
  "github": { "status": "active", "installed": true },
  "circleci": { "status": "inactive" },
  "sentry": { "status": "inactive" },
  "linear": { "status": "inactive" }
}
```

## Troubleshooting

### GitHub App Not Responding

**Issue**: No response to @codegen mentions

**Check:**
1. Is GitHub App installed? → [github.com/settings/installations](https://github.com/settings/installations)
2. Does it have access to this repo?
3. Are webhooks enabled?

**Fix:**
```bash
# Reinstall GitHub App
Visit: https://github.com/apps/codegen-sh
Click "Configure" → Re-select repositories
```

### Permissions Denied

**Issue**: "Codegen does not have permission to..."

**Fix:**
1. Go to [github.com/settings/installations](https://github.com/settings/installations)
2. Click "Configure" next to Codegen
3. Grant additional permissions
4. Save changes

### Webhooks Not Firing

**Issue**: Events not reaching Codegen

**Check:**
```bash
# View webhook deliveries
gh api /repos/{owner}/{repo}/hooks

# Check recent deliveries
# Settings → Webhooks → Recent Deliveries
```

**Fix:**
1. Verify webhook URL is correct: `https://api.codegen.com/webhooks/github`
2. Check webhook is active
3. Re-deliver failed webhooks

### Rate Limits

**Issue**: "Rate limit exceeded"

**Solution:**
- GitHub App has higher rate limits than personal tokens
- Check usage at [codegen.com/settings/usage](https://codegen.com/settings/usage)
- Upgrade plan if needed

## Uninstallation

To remove Codegen:

1. Go to [github.com/settings/installations](https://github.com/settings/installations)
2. Click "Configure" next to Codegen
3. Scroll down → Click "Uninstall"
4. Confirm uninstallation

**Note**: This removes all permissions and stops all webhooks.

## Comparison: GitHub App vs SDK

| Feature | GitHub App | Direct SDK |
|---------|-----------|------------|
| **Setup Complexity** | ✅ Simple (2 mins) | ❌ Complex (workflows, secrets) |
| **Authentication** | ✅ OAuth (no tokens) | ❌ Requires API tokens |
| **Webhooks** | ✅ Automatic | ❌ Manual configuration |
| **Integrations** | ✅ Native (CircleCI, Sentry) | ❌ Manual setup |
| **Security** | ✅ Scoped permissions | ⚠️ Broad token access |
| **Maintenance** | ✅ Auto-updated | ❌ Manual workflow updates |
| **Rate Limits** | ✅ Higher limits | ⚠️ Personal limits |

**Recommendation**: Always use GitHub App for production.

## Next Steps

1. ✅ Install GitHub App
2. ✅ Test with `@codegen` comment
3. ✅ Configure integrations: [docs/CODEGEN-INTEGRATIONS.md](CODEGEN-INTEGRATIONS.md)
4. ✅ Customize config: `.codegen/config.yml`
5. ✅ Monitor runs: [codegen.com/runs](https://codegen.com/runs)

## Resources

- **GitHub App**: [github.com/apps/codegen-sh](https://github.com/apps/codegen-sh)
- **Dashboard**: [codegen.com](https://codegen.com)
- **Integrations**: [docs/CODEGEN-INTEGRATIONS.md](CODEGEN-INTEGRATIONS.md)
- **API Docs**: [docs.codegen.com/api-reference](https://docs.codegen.com/api-reference)
- **Support**: [support@codegen.com](mailto:support@codegen.com)
