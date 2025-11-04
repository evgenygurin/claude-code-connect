# Setting Up GitHub Secrets for Codegen

## Quick Setup

You need to add two secrets to your GitHub repository for Codegen integration to work.

### Method 1: Using the Setup Script (Recommended)

```bash
./scripts/setup-codegen.sh
```

This interactive script will:
1. Ask for your API token and Organization ID
2. Automatically set the GitHub Secrets
3. Create all necessary labels
4. Test the connection

### Method 2: Manual Setup via GitHub CLI

```bash
# Get your credentials first:
# API Token: https://codegen.com/token
# Organization ID: https://codegen.com/settings

# Set the secrets
gh secret set CODEGEN_API_TOKEN
# Paste your token when prompted

gh secret set CODEGEN_ORG_ID
# Paste your organization ID when prompted
```

### Method 3: Manual Setup via GitHub Web UI

1. **Get Your Credentials**
   - API Token: Visit [codegen.com/token](https://codegen.com/token)
   - Organization ID: Visit [codegen.com/settings](https://codegen.com/settings)

2. **Navigate to Repository Settings**
   ```text
   Your Repository → Settings → Secrets and variables → Actions
   ```

3. **Add CODEGEN_API_TOKEN**
   - Click "New repository secret"
   - Name: `CODEGEN_API_TOKEN`
   - Value: Paste your API token from codegen.com/token
   - Click "Add secret"

4. **Add CODEGEN_ORG_ID**
   - Click "New repository secret"
   - Name: `CODEGEN_ORG_ID`
   - Value: Paste your organization ID from codegen.com/settings
   - Click "Add secret"

## Verify Setup

### Check Secrets Are Set

```bash
# List secrets (shows names only, not values)
gh secret list
```

You should see:
```text
CODEGEN_API_TOKEN  Updated YYYY-MM-DD
CODEGEN_ORG_ID     Updated YYYY-MM-DD
```

### Test the Integration

Create a test PR and add the `codegen` label:

```bash
# Create test PR
gh pr create --title "Test Codegen" --body "Testing AI agent integration"

# Add codegen label
gh pr edit <pr-number> --add-label "codegen"
```

Or comment on any PR:
```text
@codegen please review this code
```

## Troubleshooting

### Error: "CODEGEN_API_TOKEN secret is not set"

**Cause:** The secret is missing or empty.

**Solution:**
```bash
# Check if secret exists
gh secret list | grep CODEGEN_API_TOKEN

# If missing, set it
gh secret set CODEGEN_API_TOKEN
```

### Error: "ValueError: invalid literal for int() with base 10: ''"

**Cause:** `CODEGEN_ORG_ID` is empty or not a valid organization ID.

**Solution:**
1. Get your organization ID from [codegen.com/settings](https://codegen.com/settings)
2. It should be a numeric value (e.g., `123456`)
3. Set it correctly:
   ```bash
   gh secret set CODEGEN_ORG_ID
   # Enter the numeric ID when prompted
   ```

### Error: "Permission denied" when setting secrets

**Cause:** You don't have admin access to the repository.

**Solution:**
- Ask a repository admin to set the secrets
- Or get admin access to the repository

### Verify Secrets Are Accessible in Workflows

GitHub Actions can access secrets via `${{ secrets.SECRET_NAME }}`.

To verify they're being read correctly, check the workflow run logs:
1. Go to Actions tab
2. Click on the failed workflow run
3. Look for the "Check Codegen credentials" step
4. It should show "✅ Codegen credentials are configured"

## Security Best Practices

### 1. Never Commit Secrets

❌ **DON'T:**
```bash
# Don't commit .env with real tokens
git add .env
```

✅ **DO:**
```bash
# Use .env.example as template
cp .env.example .env
# Edit .env locally (it's in .gitignore)
# Use GitHub Secrets for CI/CD
```

### 2. Rotate Tokens Regularly

```bash
# Generate new token at codegen.com/token
# Update the secret
gh secret set CODEGEN_API_TOKEN
```

### 3. Limit Repository Access

Only add Codegen secrets to repositories that need them.

### 4. Use Environment-Specific Secrets

For multiple environments:
```text
Secrets:
- CODEGEN_API_TOKEN_DEV
- CODEGEN_API_TOKEN_STAGING
- CODEGEN_API_TOKEN_PROD
```

## Environment Variables for Local Development

For local testing (not required for GitHub Actions):

```bash
# Add to .env (already in .gitignore)
CODEGEN_API_TOKEN=your_token_here
CODEGEN_ORG_ID=your_org_id_here
```

## Next Steps

1. ✅ Verify secrets are set: `gh secret list`
2. ✅ Test integration with a PR
3. ✅ Review workflow run in Actions tab
4. ✅ Check agent progress at [codegen.com/runs](https://codegen.com/runs)

## Support

If you continue to have issues:

1. **Check workflow logs**: Repository → Actions → Select failed run
2. **Verify credentials**: Try logging in at [codegen.com](https://codegen.com)
3. **Test API access**: Run the setup script's connection test
4. **Report issues**: [github.com/codegen-sh/codegen/issues](https://github.com/codegen-sh/codegen/issues)

## Common Secret Names Reference

| Secret Name | Description | Where to Get |
|------------|-------------|--------------|
| `CODEGEN_API_TOKEN` | Codegen API authentication token | [codegen.com/token](https://codegen.com/token) |
| `CODEGEN_ORG_ID` | Your organization ID (numeric) | [codegen.com/settings](https://codegen.com/settings) |
| `GITHUB_TOKEN` | Auto-provided by GitHub Actions | Automatic, no setup needed |

## Additional Resources

- **Codegen Documentation**: [docs.codegen.com](https://docs.codegen.com)
- **GitHub Secrets Guide**: [docs.github.com/actions/security-guides/encrypted-secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- **Setup Script**: `./scripts/setup-codegen.sh`
- **Full Setup Guide**: `docs/CODEGEN-SETUP.md`
