# Codegen Configuration

This directory contains configuration files for the Codegen AI agent integration.

## Files

### `config.yml`

Main configuration file for Codegen agent behavior, rules, and settings.

**Key sections:**

- **organization**: Your Codegen organization settings
- **agent**: Agent behavior and permissions
- **rules**: Code quality, testing, and security rules
- **check_suite**: Auto-fixer configuration
- **pr_review**: PR review automation settings
- **triggers**: Keywords and labels that activate the agent
- **integrations**: GitHub, Slack, Linear integration settings
- **sandbox**: Agent execution environment configuration

### `prompts/` (optional)

Custom prompt templates for reusable agent tasks.

Example structure:

```text
prompts/
├── bug-fix.yml
├── feature-implementation.yml
├── code-review.yml
└── test-generation.yml
```

## Configuration

### Organization Settings

```yaml
organization:
  id: ${CODEGEN_ORG_ID}  # From environment variable
```

### Agent Permissions

```yaml
agent:
  permissions:
    create_prs: true       # Can create pull requests
    push_commits: true     # Can push commits
    merge_prs: false       # Cannot merge (requires human approval)
    delete_branches: false # Cannot delete branches
    modify_workflows: false # Cannot modify GitHub workflows
```

### Custom Rules

Add project-specific rules to guide agent behavior:

```yaml
rules:
  global:
    - "Always write TypeScript with strict type safety"
    - "Follow the existing code style and conventions"
    - "Write comprehensive tests for new functionality"
    - "Never commit secrets or sensitive data"
```

### Trigger Configuration

Configure how to activate the agent:

```yaml
triggers:
  mention_keywords:
    - "@codegen"
    - "@agent"
    - "codegen:"

  labels:
    - "codegen"
    - "codegen:bug-fix"
    - "codegen:feature"
```

## Usage

### Method 1: Comment-Based Triggers

Mention keywords in PR/issue comments:

```text
@codegen please review this code
@codegen fix the failing tests
codegen: implement user authentication
```

### Method 2: Label-Based Triggers

Add labels to PRs or issues:

- `codegen` - Generic task
- `codegen:bug-fix` - Fix a bug
- `codegen:feature` - Implement feature
- `codegen:refactor` - Refactor code
- `codegen:auto-fix` - Auto-fix CI failures
- `codegen:review` - Code review
- `codegen:tests` - Add tests
- `codegen:docs` - Update documentation

### Method 3: Automatic Triggers

Agent automatically activates on:

- New pull requests (if auto-review enabled)
- Check suite failures (if auto-fix enabled)
- Push events to PRs (if configured)

## Best Practices

### 1. Clear Rules

Define clear, specific rules for your project:

✅ Good: "Use React hooks instead of class components"
❌ Bad: "Write good code"

### 2. Permission Control

Start with restrictive permissions and gradually expand:

```yaml
agent:
  permissions:
    create_prs: true
    push_commits: true
    merge_prs: false      # Require human approval
    modify_workflows: false # Prevent workflow tampering
```

### 3. Cost Controls

Set limits to control costs:

```yaml
cost_controls:
  max_cost_per_run: 100
  max_daily_cost: 1000
  cost_alerts: true
```

### 4. Retry Limits

Configure auto-fixer retry behavior:

```yaml
agent:
  retries:
    check_suite_failures: 3  # Try fixing 3 times
    delay_seconds: 30        # Wait 30s between attempts
```

## Environment Variables

Required environment variables (set in GitHub Secrets or `.env`):

```bash
CODEGEN_API_TOKEN=your_api_token
CODEGEN_ORG_ID=your_org_id
CODEGEN_MODEL=sonnet-4.5
```

Optional environment variables:

```bash
CODEGEN_AUTO_FIX=true
CODEGEN_AUTO_REVIEW=true
CODEGEN_MAX_RUNS_PER_HOUR=50
CODEGEN_VERBOSE_LOGGING=false
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

## Monitoring

### View Agent Runs

Track agent activity:

1. **GitHub Actions**: Repository → Actions → Codegen workflows
2. **Codegen Dashboard**: [codegen.com/runs](https://codegen.com/runs)
3. **PR Comments**: Agent posts progress updates

### Metrics

Enable metrics tracking:

```yaml
monitoring:
  verbose_logging: true
  track_metrics: true
  send_analytics: true
```

## Security

### Secret Management

Never commit sensitive data:

- Use environment variables for tokens
- Store secrets in GitHub Secrets
- Use `${VAR_NAME}` syntax in config files

### Access Control

Limit agent permissions:

```yaml
agent:
  permissions:
    merge_prs: false          # Require human approval
    delete_branches: false    # Prevent accidental deletions
    modify_workflows: false   # Protect CI/CD workflows
```

### Code Review

Always review agent-generated code:

- Check for unintended changes
- Verify tests are meaningful
- Ensure code follows project standards

## Documentation

- **Setup Guide**: [../docs/CODEGEN-SETUP.md](../docs/CODEGEN-SETUP.md)
- **Codegen Docs**: [docs.codegen.com](https://docs.codegen.com)
- **API Reference**: [docs.codegen.com/api-reference](https://docs.codegen.com/api-reference)
- **Examples**: [github.com/codegen-sh/codegen-examples](https://github.com/codegen-sh/codegen-examples)

## Support

- 📖 [Documentation](https://docs.codegen.com)
- 💬 [Discord Community](https://discord.gg/codegen)
- 📧 [Email Support](mailto:support@codegen.com)
- 🐛 [GitHub Issues](https://github.com/codegen-sh/codegen/issues)
