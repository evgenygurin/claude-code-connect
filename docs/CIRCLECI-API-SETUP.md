# CircleCI API Automated Setup Guide

Complete guide for automated CircleCI setup using API and automation scripts.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Method 1: CircleCI API Setup](#method-1-circleci-api-setup)
- [Method 2: Codegen + CircleCI Integration](#method-2-codegen--circleci-integration)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers **automated setup** of CircleCI using:

1. **CircleCI API v2** - Project setup and configuration
2. **Codegen API** - Integration configuration
3. **Automation scripts** - One-command setup

**vs Manual Setup:**

| Aspect | Manual Setup | API Setup |
|--------|--------------|-----------|
| Time | 15-20 minutes | 2-3 minutes |
| Steps | ~15 manual steps | 1-2 commands |
| Errors | Common | Rare |
| Reproducibility | Low | High |
| Automation | None | Full |

---

## Prerequisites

### Required Tools

Install these before starting:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y curl jq git

# macOS
brew install curl jq git

# Verify installation
curl --version
jq --version
git --version
```

### Required Tokens

#### 1. CircleCI API Token

Get your CircleCI personal API token:

1. Visit [app.circleci.com/settings/user/tokens](https://app.circleci.com/settings/user/tokens)
2. Click "Create New Token"
3. Settings:
   - **Name**: `Automated Setup` or `API Access`
   - **Scope**: `All` (required for full API access)
4. Click "Create"
5. **Copy the token** (shown only once!)

**Save token securely:**

```bash
# Add to your ~/.bashrc or ~/.zshrc
export CIRCLECI_TOKEN='your_circleci_token_here'

# Or use .env file (recommended)
echo "CIRCLECI_TOKEN='your_token'" >> .env

# Load it
source ~/.bashrc  # or source .env
```

#### 2. Codegen API Token (Optional)

For Codegen integration:

1. Visit [codegen.com/settings](https://codegen.com/settings)
2. Navigate to "API" or "Tokens" section
3. Click "Generate New Token"
4. Copy and save the token

```bash
# Add to environment
export CODEGEN_API_TOKEN='your_codegen_token_here'
```

### Repository Requirements

Ensure your repository has:

- ✅ `.circleci/config.yml` file (we already have this!)
- ✅ Committed to `main` or `master` branch
- ✅ Pushed to GitHub

```bash
# Verify CircleCI config exists and is committed
git ls-files .circleci/config.yml

# Should output: .circleci/config.yml
```

---

## Quick Start

### Option A: CircleCI Only (Fastest)

Setup CircleCI project in **under 2 minutes**:

```bash
# 1. Set token
export CIRCLECI_TOKEN='your_circleci_token_here'

# 2. Run setup script
./scripts/setup-circleci.sh

# That's it! ✅
```

**What this does:**

- ✅ Tests API connection
- ✅ Detects repository from git remote
- ✅ Creates/follows project in CircleCI
- ✅ Triggers initial pipeline
- ✅ Shows recent pipeline status

### Option B: Full Integration (CircleCI + Codegen)

Complete setup with Codegen auto-fixer:

```bash
# 1. Set both tokens
export CIRCLECI_TOKEN='your_circleci_token_here'
export CODEGEN_API_TOKEN='your_codegen_token_here'

# 2. Run integration setup
./scripts/setup-codegen-circleci.sh

# 3. Follow webhook setup instructions (manual step)
```

**What this does:**

- ✅ Everything from Option A, plus:
- ✅ Configures Codegen CircleCI integration
- ✅ Verifies integration status
- ✅ Provides webhook setup instructions

---

## Method 1: CircleCI API Setup

### Script: `setup-circleci.sh`

**Full automation for CircleCI project setup.**

#### Usage

```bash
# Basic usage with environment variable
export CIRCLECI_TOKEN='your_token'
./scripts/setup-circleci.sh

# Or inline
CIRCLECI_TOKEN='your_token' ./scripts/setup-circleci.sh

# Dry run (test without making changes)
CIRCLECI_TOKEN='your_token' DRY_RUN=1 ./scripts/setup-circleci.sh
```

#### What It Does

**Step-by-step execution:**

1. **Dependency Check**
   - Verifies `curl` and `jq` are installed
   - Shows installation instructions if missing

2. **Token Validation**
   - Checks `CIRCLECI_TOKEN` is set
   - Tests API authentication
   - Displays authenticated user info

3. **Repository Detection**
   - Reads git remote URL
   - Extracts organization and repository names
   - Confirms detected values

4. **API Connection Test**
   - Calls CircleCI `/me` endpoint
   - Verifies token permissions
   - Shows user account details

5. **Project Status Check**
   - Checks if project already exists in CircleCI
   - Shows existing project details if found

6. **Project Setup** (if needed)
   - Follows/creates project via API
   - Returns project configuration
   - Confirms successful setup

7. **Pipeline Trigger**
   - Triggers initial pipeline on `main` branch
   - Returns pipeline ID and number
   - Provides link to view pipeline

8. **Recent Pipelines**
   - Fetches last 5 pipelines
   - Shows status and branch info
   - Displays creation timestamps

#### Example Output

```text
=========================================
  CircleCI Automated Setup
=========================================

ℹ️  Checking dependencies...
✅ Dependencies checked

✅ CircleCI token found

ℹ️  Detecting repository information...
✅ Detected repository: evgenygurin/claude-code-connect

ℹ️  Repository: github/evgenygurin/claude-code-connect

ℹ️  Testing CircleCI API connection...
✅ API connection successful
ℹ️  Authenticated as: John Doe (ID: abc123)

ℹ️  Checking if project is already set up in CircleCI...
ℹ️  Project not found in CircleCI

ℹ️  Setting up project in CircleCI...
✅ Project successfully set up in CircleCI!
{
  "name": "claude-code-connect",
  "vcs_url": "https://github.com/evgenygurin/claude-code-connect",
  "default_branch": "main"
}

✅ Project successfully added to CircleCI!

ℹ️  Triggering initial pipeline...
✅ Pipeline triggered!
ℹ️  Pipeline ID: abc-def-123
ℹ️  Pipeline Number: 1

View pipeline: https://app.circleci.com/pipelines/github/evgenygurin/claude-code-connect/1

ℹ️  Getting recent pipelines...
✅ Recent pipelines retrieved
{
  "number": 1,
  "state": "created",
  "created_at": "2025-01-04T10:30:00Z",
  "branch": "main"
}

=========================================
  Setup Complete!
=========================================

✅ CircleCI project is configured and ready

Next steps:
1. ✅ Project enabled in CircleCI
2. ⚠️  Configure webhooks manually (see above)
3. 🔄 Monitor pipeline: https://app.circleci.com/pipelines/github/evgenygurin/claude-code-connect
4. 🤖 Setup Codegen integration: https://codegen.com/settings/integrations
```

#### Manual Steps Required

After script completes:

1. **Setup Webhooks** (for Codegen integration)
   - Visit: https://app.circleci.com/settings/project/github/{org}/{repo}/webhooks
   - Click "Add Webhook"
   - URL: `https://api.codegen.com/webhooks/circleci`
   - Events: `workflow-completed`, `job-completed`

---

## Method 2: Codegen + CircleCI Integration

### Script: `setup-codegen-circleci.sh`

**Full automation including Codegen integration.**

#### Usage

```bash
# Set both tokens
export CIRCLECI_TOKEN='your_circleci_token'
export CODEGEN_API_TOKEN='your_codegen_token'

# Run script
./scripts/setup-codegen-circleci.sh
```

#### What It Does

**Extended automation:**

1. **All CircleCI Setup** (from Method 1)
2. **Codegen Connection Test**
   - Verifies Codegen API access
   - Shows organization details
3. **Integration Check**
   - Checks existing Codegen integrations
   - Shows CircleCI integration status
4. **Integration Setup**
   - Configures CircleCI integration in Codegen
   - Sets auto-fix preferences
   - Enables retry logic
5. **Webhook Instructions**
   - Displays manual webhook setup steps
   - Provides exact configuration values
6. **Complete Verification**
   - Runs 4 verification checks
   - Reports overall status

#### Example Output

```text
=========================================
  Codegen + CircleCI Integration Setup
=========================================

✅ All dependencies installed

✅ All tokens found

ℹ️  Detecting repository information...
✅ Detected repository: evgenygurin/claude-code-connect

ℹ️  Repository: github/evgenygurin/claude-code-connect

ℹ️  Testing Codegen API connection...
✅ Codegen API connection successful
ℹ️  Organization: My Organization (ID: org_abc123)

ℹ️  Checking Codegen integrations...
✅ Integrations retrieved
⚠️  CircleCI integration status: not_configured

ℹ️  Setting up CircleCI integration in Codegen...
✅ CircleCI integration configured in Codegen
{
  "integration_type": "circleci",
  "status": "active",
  "auto_fix": true,
  "max_retries": 3
}

=========================================
  Manual Webhook Setup Required
=========================================

⚠️  CircleCI webhooks must be configured manually

Steps:

1. Visit CircleCI project webhooks:
   https://app.circleci.com/settings/project/github/evgenygurin/claude-code-connect/webhooks

2. Click 'Add Webhook'

3. Configure webhook:
   - Name: Codegen Auto-fixer
   - URL: https://api.codegen.com/webhooks/circleci
   - Events:
     ✅ workflow-completed
     ✅ job-completed

4. Click 'Add Webhook'

5. Test webhook delivery

ℹ️  Verifying complete setup...

✅ Check 1/4: Codegen connection ✅
✅ Check 2/4: Codegen CircleCI integration ✅
✅ Check 3/4: .codegen/config.yml configured ✅
✅ Check 4/4: .circleci/config.yml exists ✅

ℹ️  Verification: 4/4 checks passed
✅ All checks passed!

=========================================
  Setup Summary
=========================================

✅ Automated setup completed

Next steps:
1. ✅ Codegen CircleCI integration configured
2. ⚠️  Setup CircleCI webhook manually (see instructions above)
3. 🔄 Push code to trigger CircleCI build
4. 🤖 Watch Codegen auto-fix in action!

Useful links:
- Codegen Dashboard: https://codegen.com/settings/integrations
- Codegen Runs: https://codegen.com/runs
- CircleCI Pipelines: https://app.circleci.com/pipelines/github/evgenygurin/claude-code-connect
- CircleCI Webhooks: https://app.circleci.com/settings/project/github/evgenygurin/claude-code-connect/webhooks
```

---

## API Reference

### CircleCI API v2 Endpoints

#### Authentication

```bash
# All requests use Circle-Token header
curl -H "Circle-Token: YOUR_TOKEN" \
  https://circleci.com/api/v2/me
```

#### Get Current User

```bash
GET /api/v2/me

Response:
{
  "id": "abc123",
  "name": "John Doe",
  "login": "johndoe"
}
```

#### Follow/Create Project

```bash
POST /api/v2/project/{vcs}/{org}/{repo}

Example:
curl -X POST \
  -H "Circle-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  https://circleci.com/api/v2/project/github/evgenygurin/claude-code-connect

Response (201 Created):
{
  "name": "claude-code-connect",
  "vcs_url": "https://github.com/evgenygurin/claude-code-connect",
  "default_branch": "main"
}
```

#### Get Project Details

```bash
GET /api/v2/project/{vcs}/{org}/{repo}

Response:
{
  "name": "claude-code-connect",
  "organization_name": "evgenygurin",
  "vcs_url": "https://github.com/evgenygurin/claude-code-connect",
  "default_branch": "main"
}
```

#### Trigger Pipeline

```bash
POST /api/v2/project/{vcs}/{org}/{repo}/pipeline

Body:
{
  "branch": "main",
  "parameters": {}
}

Response (201 Created):
{
  "id": "abc-123-def",
  "number": 42,
  "state": "created",
  "created_at": "2025-01-04T10:30:00Z"
}
```

#### Get Pipelines

```bash
GET /api/v2/project/{vcs}/{org}/{repo}/pipeline?limit=10

Response:
{
  "items": [
    {
      "id": "abc-123",
      "number": 42,
      "state": "success",
      "created_at": "2025-01-04T10:30:00Z",
      "vcs": {
        "branch": "main"
      }
    }
  ]
}
```

#### Create Environment Variable

```bash
POST /api/v2/project/{vcs}/{org}/{repo}/envvar

Body:
{
  "name": "MY_VAR",
  "value": "my_secret_value"
}

Response (201 Created):
{
  "name": "MY_VAR",
  "value": "xxxx" // masked
}
```

### Codegen API (Experimental)

**Note:** Codegen API documentation is limited. These endpoints are inferred.

#### Get User/Organization

```bash
GET /api/v1/user

Headers:
Authorization: Bearer YOUR_CODEGEN_TOKEN

Response:
{
  "organization": {
    "id": "org_abc123",
    "name": "My Organization"
  }
}
```

#### Get Integrations

```bash
GET /api/v1/organizations/{org_id}/integrations

Response:
{
  "integrations": {
    "circleci": {
      "status": "active",
      "connected": true
    }
  }
}
```

#### Setup CircleCI Integration

```bash
POST /api/v1/organizations/{org_id}/integrations/circleci

Body:
{
  "integration_type": "circleci",
  "config": {
    "api_token": "CIRCLECI_TOKEN",
    "auto_fix": true,
    "max_retries": 3,
    "notify_on_fix": true
  }
}

Response (200/201):
{
  "integration_type": "circleci",
  "status": "active",
  "auto_fix": true
}
```

---

## Troubleshooting

### Script Errors

#### "CIRCLECI_TOKEN environment variable not set"

**Solution:**

```bash
# Set token in environment
export CIRCLECI_TOKEN='your_token_here'

# Or pass inline
CIRCLECI_TOKEN='your_token' ./scripts/setup-circleci.sh
```

#### "curl is not installed"

**Solution:**

```bash
# Ubuntu/Debian
sudo apt-get install curl

# macOS
brew install curl
```

#### "jq is not installed"

**Solution:**

```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq
```

### API Errors

#### HTTP 401 Unauthorized

**Cause:** Invalid or expired token

**Solution:**

1. Generate new token: https://app.circleci.com/settings/user/tokens
2. Update environment variable
3. Retry script

#### HTTP 404 Not Found (Project)

**Cause:** Repository not accessible or invalid org/repo name

**Solution:**

1. Verify repository exists on GitHub
2. Check git remote URL: `git remote get-url origin`
3. Ensure CircleCI has access to repository

#### HTTP 400 Bad Request

**Cause:** Missing `.circleci/config.yml` in main branch

**Solution:**

```bash
# Verify config exists
ls -la .circleci/config.yml

# Check it's committed
git ls-files .circleci/config.yml

# If not committed
git add .circleci/config.yml
git commit -m "Add CircleCI config"
git push origin main
```

### Integration Issues

#### Codegen not receiving webhooks

**Verify webhook configuration:**

1. Visit: https://app.circleci.com/settings/project/github/{org}/{repo}/webhooks
2. Check webhook exists with URL: `https://api.codegen.com/webhooks/circleci`
3. Test webhook delivery (should return 200 OK)
4. Check recent deliveries for errors

#### Auto-fix not working

**Check integration status:**

```bash
# Run verification
./scripts/setup-codegen-circleci.sh

# Should show all checks passing
```

**Manual verification:**

1. Codegen integration: https://codegen.com/settings/integrations
2. CircleCI webhook: https://app.circleci.com/settings/project/github/{org}/{repo}/webhooks
3. Config file: Check `.codegen/config.yml` has `circleci.enabled: true`

---

## Advanced Usage

### Custom Organization/Repository

Override auto-detection:

```bash
export CIRCLECI_TOKEN='your_token'
export CIRCLE_ORG='custom-org'
export CIRCLE_REPO='custom-repo'

./scripts/setup-circleci.sh
```

### Environment Variables

Add environment variables to CircleCI project:

```bash
# Using curl directly
curl -X POST \
  -H "Circle-Token: $CIRCLECI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"NODE_ENV","value":"production"}' \
  https://circleci.com/api/v2/project/github/evgenygurin/claude-code-connect/envvar
```

### Trigger Pipeline with Parameters

```bash
curl -X POST \
  -H "Circle-Token: $CIRCLECI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branch": "main",
    "parameters": {
      "run_integration_tests": true,
      "deploy_env": "staging"
    }
  }' \
  https://circleci.com/api/v2/project/github/evgenygurin/claude-code-connect/pipeline
```

---

## Additional Resources

- **CircleCI API v2 Docs**: https://circleci.com/docs/api/v2/
- **CircleCI API Guide**: https://circleci.com/docs/api-developers-guide/
- **Codegen Docs**: https://docs.codegen.com
- **Manual Setup Guide**: [CIRCLECI-SETUP.md](./CIRCLECI-SETUP.md)
- **Integration Guide**: [CODEGEN-INTEGRATIONS.md](./CODEGEN-INTEGRATIONS.md)

---

**Last Updated**: 2025-01-04

**Scripts Location**: `/scripts/`
- `setup-circleci.sh` - CircleCI only
- `setup-codegen-circleci.sh` - Full integration
