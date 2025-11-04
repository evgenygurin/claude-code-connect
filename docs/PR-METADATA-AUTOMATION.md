# PR Metadata Automation

Comprehensive guide for the automatic PR metadata population workflow.

## Overview

The PR Metadata Automation workflow automatically populates pull request metadata when a PR is opened or reopened:

- ✅ **Reviewers** - Auto-assigns repository maintainers
- ✅ **Assignees** - Assigns PR author or designated developer
- ✅ **Labels** - Based on branch name, content, and PR size
- ✅ **Issue Linking** - Detects and links related issues from branch name and PR body
- ⚪ **GitHub Projects** - Optional, requires configuration
- ⚪ **Milestones** - Optional, requires configuration

## Quick Start

### Default Behavior (No Configuration Required)

The workflow is **active by default** and will automatically:

1. Assign reviewers from the configured list
2. Assign the PR to its author
3. Add labels based on branch patterns and content
4. Link issues mentioned in branch name or PR description
5. Post a summary comment

### Example Workflow Output

When you open a PR with branch name `claude/issue-123-add-authentication`:

```text
✅ Reviewers: @evgenygurin
✅ Assignee: @pr-author
✅ Labels: claude-agent, automated, size/m
✅ Linked Issues: #123
```

## Label System

### Branch-Based Labels

Labels are automatically added based on branch name patterns:

| Branch Pattern | Labels Added |
|---------------|--------------|
| `claude/*` | `claude-agent`, `automated` |
| `feature/*` | `feature`, `enhancement` |
| `fix/*` | `bug`, `bugfix` |
| `hotfix/*` | `hotfix`, `urgent` |
| `docs/*` | `documentation` |
| `test/*` | `tests` |
| `refactor/*` | `refactoring` |
| `chore/*` | `maintenance` |

### Size Labels

Automatically calculated from total changes (additions + deletions):

| Total Changes | Label |
|--------------|-------|
| < 50 | `size/xs` |
| 50-199 | `size/s` |
| 200-499 | `size/m` |
| 500-999 | `size/l` |
| ≥ 1000 | `size/xl` |

### Content-Based Labels

Labels added when keywords are found in PR title or body:

| Keyword | Label |
|---------|-------|
| "breaking change" | `breaking-change` |
| "security" | `security` |
| "performance" | `performance` |
| "api" | `api` |
| "database" | `database` |
| "ui" | `ui` |
| "ux" | `ux` |

## Issue Linking

### Automatic Detection

Issues are automatically detected from:

1. **Branch names**: `feature/issue-123-description` → Links to #123
2. **PR body mentions**: `#123` → Links to #123

### Auto-Close Issues

Use keywords in PR description to automatically close issues when merged:

```markdown
Closes #123
Fixes #456
Resolves #789
```

Supported keywords: `Closes`, `Fixes`, `Resolves`, `Close`, `Fix`, `Resolve`

## Configuration

### 1. Configure Reviewers

Edit `.github/workflows/pr-metadata.yml`:

```yaml
const REVIEWERS = [
  'evgenygurin',      # Repository owner
  'developer1',       # Add team members
  'developer2'
];
```

### 2. Customize Labels

Edit the `branchPatterns` mapping:

```yaml
const branchPatterns = {
  'claude/': ['claude-agent', 'automated'],
  'feature/': ['feature', 'enhancement'],
  'yourpattern/': ['your-label']
};
```

Edit content keywords:

```yaml
const contentKeywords = {
  'breaking change': 'breaking-change',
  'your-keyword': 'your-label'
};
```

### 3. Enable GitHub Projects (Optional)

**Requirements:**
- Personal Access Token (PAT) with `project` permissions
- GitHub Project ID

**Steps:**

1. Create PAT at: Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Grant permissions: `repo`, `project`
3. Add to repository secrets: Settings → Secrets → Actions → New secret
   - Name: `PROJECT_TOKEN`
   - Value: Your PAT

4. Get your Project ID:
   - Go to your GitHub Project
   - Click "..." → Settings
   - Copy the Project ID (format: `PVT_xxx`)

5. Edit workflow:

```yaml
add-to-project:
  if: true  # Change from false to true
  steps:
    - name: Add PR to project
      env:
        PROJECT_ID: 'PVT_kwDOBxxx'  # Your project ID
```

### 4. Enable Milestones (Optional)

**Requirements:**
- Create milestones in GitHub: Issues → Milestones

**Steps:**

1. Create milestones (e.g., "MVP Release", "v1.1")
2. Edit workflow:

```yaml
set-milestone:
  if: true  # Change from false to true
  steps:
    - name: Auto-set milestone
      # Configure MILESTONE_MAP:
      const MILESTONE_MAP = {
        'v1.0': 'MVP Release',
        'v1.1': 'Feature Update 1.1',
        'hotfix': 'Hotfixes',
        'default': 'Next Release'
      };
```

## Best Practices

### Branch Naming Conventions

Use descriptive branch names that match the patterns:

```bash
# Good examples
claude/issue-123-add-authentication
feature/user-dashboard
fix/login-bug
hotfix/security-patch
docs/api-documentation
test/integration-tests
refactor/database-layer
chore/update-dependencies

# Poor examples (won't trigger labels)
my-branch
update
fix
```

### PR Descriptions

Include issue references for automatic linking:

```markdown
## Summary
This PR adds user authentication

## Changes
- JWT token implementation
- Login/logout endpoints

## Related Issues
Closes #123
Fixes #456
```

### Label Management

The workflow automatically creates labels if they don't exist. Colors are pre-configured:

- **claude-agent**: Purple (#9B59B6)
- **feature**: Green (#2ECC71)
- **bug**: Red (#D73A4A)
- **documentation**: Blue (#0075CA)
- **size/xs**: Light gray (#EDEDED)
- **size/xl**: Red (#FF0000)

## Troubleshooting

### Reviewers Not Assigned

**Cause**: User not collaborator or reviewer is PR author

**Solution**:
- Add user as repository collaborator
- Check REVIEWERS list excludes PR author

### Labels Not Applied

**Cause**: Label creation failed or branch pattern doesn't match

**Solution**:
- Check branch name matches patterns
- Manually create labels in repository
- Review workflow logs

### Issues Not Linked

**Cause**: Issue number format not recognized

**Solution**:
- Use `#123` format in PR body
- Use `issue-123` or `issue_123` in branch name
- Add keywords: `Closes #123`

### Projects Not Working

**Cause**: Missing PROJECT_TOKEN or wrong permissions

**Solution**:
- Verify PAT has `project` scope
- Confirm PROJECT_ID is correct (format: `PVT_xxx`)
- Check `if: true` is set in workflow

### Milestones Not Set

**Cause**: Milestone doesn't exist or name mismatch

**Solution**:
- Create milestone in GitHub
- Match MILESTONE_MAP names exactly
- Ensure milestone state is "open"

## Advanced Usage

### Custom Label Colors

Edit the `getColorForLabel()` function:

```javascript
function getColorForLabel(label) {
  const colorMap = {
    'your-label': 'FF5733',  // Custom hex color
    // ...
  };
  return colorMap[label] || 'EDEDED';
}
```

### Team-Specific Reviewers

Assign reviewers based on changed files:

```javascript
// Detect backend changes
if (files.some(f => f.filename.startsWith('src/server/'))) {
  reviewers.push('backend-team-lead');
}

// Detect frontend changes
if (files.some(f => f.filename.startsWith('src/client/'))) {
  reviewers.push('frontend-team-lead');
}
```

### Conditional Milestones

Set milestone based on labels or content:

```javascript
const { data: labels } = await github.rest.issues.listLabelsOnIssue({
  owner: context.repo.owner,
  repo: context.repo.repo,
  issue_number: prNumber
});

if (labels.some(l => l.name === 'breaking-change')) {
  milestoneName = 'Major Release';
}
```

## Workflow Reference

### Triggers

```yaml
on:
  pull_request:
    types: [opened, reopened, ready_for_review]
```

### Permissions Required

```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write
```

### Jobs Execution

1. `assign-reviewers-assignees` - Runs first
2. `auto-label` - Runs in parallel
3. `link-issues` - Runs in parallel
4. `add-to-project` - Optional, if enabled
5. `set-milestone` - Optional, if enabled
6. `post-summary` - Runs last, after all jobs complete

## Examples

### Example 1: Feature PR

**Branch**: `feature/issue-42-user-dashboard`

**Result**:
- Labels: `feature`, `enhancement`, `size/m`
- Linked: #42
- Reviewers: @evgenygurin
- Assignee: @developer

### Example 2: Hotfix PR

**Branch**: `hotfix/critical-security-fix`

**PR Body**: `Fixes critical vulnerability. Closes #999`

**Result**:
- Labels: `hotfix`, `urgent`, `security`, `size/xs`
- Linked: #999
- Reviewers: @evgenygurin
- Assignee: @author

### Example 3: Claude Agent PR

**Branch**: `claude/review-pull-request-011CUnFewkbn76o3mvcHmr4H`

**Result**:
- Labels: `claude-agent`, `automated`, `size/l`
- Reviewers: @evgenygurin
- Assignee: @claude-agent

## FAQ

**Q: Can I disable specific features?**

A: Yes, set `if: false` for any job you want to disable.

**Q: How do I change the default assignee?**

A: Edit `DEFAULT_ASSIGNEE` constant in the workflow.

**Q: Can I use team reviewers?**

A: Yes, add teams to the REVIEWERS array (format: `team-name`).

**Q: How do I test without creating a real PR?**

A: Use workflow_dispatch trigger or create a draft PR.

**Q: Does this work with forked repositories?**

A: Partially. Some features require repository write access.

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub REST API](https://docs.github.com/en/rest)
- [GitHub GraphQL API](https://docs.github.com/en/graphql)
- [Managing Labels](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/managing-labels)
- [Linking PRs to Issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue)

## Support

For issues or questions:

1. Check workflow logs: Actions → PR Metadata Automation
2. Review this documentation
3. Open an issue in the repository
4. Contact: @evgenygurin

## Changelog

### v1.0.0 (2025-11-04)

- Initial release
- Auto-assign reviewers and assignees
- Auto-label based on branch and content
- Auto-link issues
- Optional GitHub Projects integration
- Optional milestone management
- Summary comment posting
