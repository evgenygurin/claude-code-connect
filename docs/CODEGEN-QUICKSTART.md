# Codegen Quick Start Guide

Get Codegen AI agent integration up and running in 5 minutes.

## Prerequisites

- GitHub repository access
- GitHub CLI (`gh`) installed
- Python 3.13+ (for Codegen SDK)

## Setup (5 minutes)

### 1. Get Credentials (2 min)

Visit these URLs and copy your credentials:

- **API Token**: [codegen.com/token](https://codegen.com/token)
- **Organization ID**: [codegen.com/settings](https://codegen.com/settings)

### 2. Run Setup Script (2 min)

```bash
# Clone this repo (if not already)
git clone <repo-url>
cd claude-code-connect

# Run automated setup
./scripts/setup-codegen.sh
```

The script will:

- ✅ Set GitHub Secrets (CODEGEN_API_TOKEN, CODEGEN_ORG_ID)
- ✅ Create GitHub labels (codegen, codegen:bug-fix, etc.)
- ✅ Verify workflow files exist
- ✅ Test API connection
- ✅ Provide next steps

### 3. Install GitHub App (1 min, optional but recommended)

For full webhook integration:

1. Visit [github.com/apps/codegen-sh](https://github.com/apps/codegen-sh)
2. Click "Install"
3. Select this repository
4. Grant permissions

## Usage

### Test It Out

**Method 1: Label-Based**

```bash
# Create a test PR
gh pr create --title "Test Codegen" --body "Testing AI agent"

# Add label to trigger agent
gh pr edit <pr-number> --add-label "codegen:review"
```

**Method 2: Comment-Based**

Comment on any PR or issue:

```text
@codegen please review this code for security issues
```

**Method 3: Automatic**

- Create a PR → Auto-review runs
- CI fails → Auto-fixer attempts fix

### Available Labels

Add these labels to PRs/issues to trigger specific tasks:

| Label | Action |
|-------|--------|
| `codegen` | Generic task (analyzes title/body) |
| `codegen:bug-fix` | Fix a bug |
| `codegen:feature` | Implement a feature |
| `codegen:refactor` | Refactor code |
| `codegen:auto-fix` | Fix CI failures |
| `codegen:review` | Code review |
| `codegen:tests` | Add test coverage |
| `codegen:docs` | Update documentation |

### Comment Keywords

Use these phrases in comments:

- `@codegen review this`
- `@codegen fix the tests`
- `@codegen implement X feature`
- `@codegen add tests for Y`
- `@codegen refactor Z`

## What Happens Next?

1. **Agent Activates**: Codegen agent starts analyzing
2. **Progress Updates**: Agent posts comments with status
3. **Creates PR** (if needed): Agent creates PR with changes
4. **Updates Existing PR** (if on PR): Agent pushes commits
5. **Human Review**: You review and approve changes
6. **Merge**: Merge the PR when satisfied

## Example Workflow

### Scenario: Fix a Bug

```bash
# 1. Create issue describing bug
gh issue create --title "Login timeout error" --body "Users experience timeout..."

# 2. Add codegen:bug-fix label
gh issue edit <issue-number> --add-label "codegen:bug-fix"

# 3. Agent analyzes, creates PR with fix
# Wait for PR creation...

# 4. Review the PR
gh pr view <pr-number> --web

# 5. Provide feedback if needed
gh pr comment <pr-number> --body "@codegen please also add a test for timeout handling"

# 6. Merge when ready
gh pr merge <pr-number>
```

## Monitoring

### View Agent Progress

**GitHub Actions:**

```bash
# List recent workflow runs
gh run list --workflow=codegen.yml

# View specific run
gh run view <run-id>
```

**Codegen Dashboard:**

Visit [codegen.com/runs](https://codegen.com/runs) to see all agent runs.

**PR Comments:**

Agent posts updates directly in PR comments:

```text
🤖 Codegen Agent Activated
   Agent Run: abc123xyz
   Track progress: https://codegen.com/runs/abc123xyz

✅ Analysis Complete
   - Found 2 security issues
   - Identified performance bottleneck
   - Preparing fixes...

📝 Changes Ready
   - Fixed SQL injection vulnerability
   - Optimized database query
   - Added validation tests
```

## Configuration

### Customize Agent Behavior

Edit `.codegen/config.yml`:

```yaml
agent:
  model: "sonnet-4.5"  # or "opus-4"

  permissions:
    create_prs: true
    push_commits: true
    merge_prs: false  # Require human approval

rules:
  global:
    - "Follow TypeScript best practices"
    - "Write comprehensive tests"
    - "Use meaningful commit messages"
```

### Adjust Triggers

Modify `.github/workflows/codegen.yml`:

```yaml
# Disable auto-review for draft PRs
if: |
  github.event.pull_request.draft == false &&
  !contains(github.event.pull_request.labels.*.name, 'skip-codegen')
```

## Troubleshooting

### Agent Not Starting

**Check secrets are set:**

```bash
gh secret list
```

**Should see:**

- `CODEGEN_API_TOKEN`
- `CODEGEN_ORG_ID`

**If missing, add them:**

```bash
gh secret set CODEGEN_API_TOKEN
gh secret set CODEGEN_ORG_ID
```

### Permission Denied

**Check workflow permissions:**

Ensure `.github/workflows/codegen.yml` has:

```yaml
permissions:
  contents: write
  pull-requests: write
  issues: write
```

### No Response from Agent

**Check workflow ran:**

```bash
gh run list --workflow=codegen.yml --limit=5
```

**Check label is correct:**

```bash
gh pr view <pr-number> --json labels
```

### Agent Timeout

**Increase timeout in `.codegen/config.yml`:**

```yaml
agent:
  timeouts:
    max_run_time: 120  # Increase to 120 minutes
```

## Next Steps

1. ✅ **Read full guide**: [docs/CODEGEN-SETUP.md](CODEGEN-SETUP.md)
2. 🧪 **Experiment**: Try different labels and commands
3. ⚙️ **Customize**: Adjust rules in `.codegen/config.yml`
4. 📊 **Monitor**: Track agent performance
5. 🚀 **Scale**: Roll out to team

## Examples

### Example 1: Add Test Coverage

```bash
# Add label to PR
gh pr edit 123 --add-label "codegen:tests"

# Or comment
gh pr comment 123 --body "@codegen add comprehensive tests for the auth service"
```

### Example 2: Refactor Code

```bash
# Comment on issue
gh issue comment 456 --body "@codegen refactor src/utils/db.ts to use async/await pattern"
```

### Example 3: Fix CI Failure

CI automatically fails → Agent automatically activates → Pushes fix → CI passes ✅

No manual intervention needed!

## Resources

- **Full Setup Guide**: [docs/CODEGEN-SETUP.md](CODEGEN-SETUP.md)
- **Codegen Documentation**: [docs.codegen.com](https://docs.codegen.com)
- **API Reference**: [docs.codegen.com/api-reference](https://docs.codegen.com/api-reference)
- **Examples**: [github.com/codegen-sh/codegen-examples](https://github.com/codegen-sh/codegen-examples)
- **Community**: [discord.gg/codegen](https://discord.gg/codegen)

## Support

Need help?

- 📖 Check [docs.codegen.com](https://docs.codegen.com)
- 💬 Ask in [Discord](https://discord.gg/codegen)
- 📧 Email [support@codegen.com](mailto:support@codegen.com)
- 🐛 Report issues on [GitHub](https://github.com/codegen-sh/codegen/issues)

---

**Ready to go?** Try it now:

```bash
# Create a test PR and add the codegen label
gh pr create --title "Test Codegen Integration" --body "Testing AI agent"
gh pr edit <pr-number> --add-label "codegen"
```

Watch the magic happen! 🎉
