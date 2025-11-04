# ⚠️ Codegen Setup Required

The Codegen workflows are configured but **GitHub Secrets are not set**.

## Quick Fix (2 minutes)

### Option 1: Automated Setup (Recommended)

```bash
./scripts/setup-codegen.sh
```

### Option 2: Manual Setup

1. **Get your credentials:**
   - API Token: [codegen.com/token](https://codegen.com/token)
   - Organization ID: [codegen.com/settings](https://codegen.com/settings)

2. **Set GitHub Secrets:**

   ```bash
   gh secret set CODEGEN_API_TOKEN
   # Paste your token

   gh secret set CODEGEN_ORG_ID
   # Paste your org ID (numeric value)
   ```

3. **Verify:**

   ```bash
   gh secret list
   ```

   Should show:
   ```text
   CODEGEN_API_TOKEN  Updated ...
   CODEGEN_ORG_ID     Updated ...
   ```

## What This Fixes

Without these secrets, you'll see this error:
```text
❌ ERROR: CODEGEN_API_TOKEN secret is not set
ValueError: invalid literal for int() with base 10: ''
```

## Next Steps

After setting secrets:

1. ✅ Test with a PR: `gh pr create --title "Test Codegen"`
2. ✅ Add label: `gh pr edit <PR#> --add-label "codegen"`
3. ✅ Or comment: `@codegen please review this code`

## Documentation

- **Full Setup Guide**: [docs/CODEGEN-SETUP.md](docs/CODEGEN-SETUP.md)
- **Secrets Setup**: [docs/GITHUB-SECRETS-SETUP.md](docs/GITHUB-SECRETS-SETUP.md)
- **Quick Start**: [docs/CODEGEN-QUICKSTART.md](docs/CODEGEN-QUICKSTART.md)

## Support

Need help? Check [docs/GITHUB-SECRETS-SETUP.md](docs/GITHUB-SECRETS-SETUP.md) for detailed troubleshooting.
