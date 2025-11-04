# SonarQube Integration Setup Guide

This guide explains how to configure SonarQube analysis for the Claude Code + Linear Native Integration project.

## Overview

The project is configured with automated SonarQube scanning that runs on:

- Push to `main`, `develop`, and `claude/**` branches
- Pull requests to `main` and `develop` branches

## Prerequisites

1. **SonarQube Instance**: Either SonarCloud (cloud-hosted) or self-hosted SonarQube Server
2. **GitHub Repository Access**: Admin access to configure secrets

## Setup Steps

### 1. Create SonarQube Project

#### For SonarCloud

1. Go to [sonarcloud.io](https://sonarcloud.io)
2. Sign in with your GitHub account
3. Click "+" → "Analyze new project"
4. Select your repository: `evgenygurin/claude-code-connect`
5. Choose organization or create new one
6. Note your project key (e.g., `evgenygurin_claude-code-connect`)

#### For Self-Hosted SonarQube

1. Log in to your SonarQube Server
2. Click "Create Project" → "Manually"
3. Enter project details:
   - **Project key**: `claude-code-connect`
   - **Display name**: `Claude Code Linear Native Integration`
4. Click "Set Up"

### 2. Generate Authentication Token

#### For SonarCloud

1. Go to [sonarcloud.io/account/security](https://sonarcloud.io/account/security)
2. Click "Generate Token"
3. Name: `GitHub Actions - claude-code-connect`
4. Type: `Global Analysis Token` or `Project Analysis Token`
5. Click "Generate" and copy the token

#### For Self-Hosted SonarQube

1. Go to your SonarQube Server
2. Navigate to **My Account** → **Security**
3. Click "Generate Tokens"
4. Name: `GitHub Actions`
5. Type: `Global Analysis Token`
6. Click "Generate" and copy the token

### 3. Configure GitHub Secrets

1. Go to your GitHub repository: `https://github.com/evgenygurin/claude-code-connect`
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click "New repository secret"
4. Add the following secrets:

#### Required Secrets

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `SONAR_TOKEN` | `your-sonarqube-token` | Authentication token from step 2 |
| `SONAR_HOST_URL` | `https://your-sonarqube-server.com` | SonarQube Server URL (not needed for SonarCloud) |

#### For SonarCloud Only

If using SonarCloud, you also need to update `sonar-project.properties`:

```properties
# Uncomment and set your organization key
sonar.organization=your-organization-key
```

### 4. Update Project Configuration (if needed)

Edit `sonar-project.properties` in the repository root:

```properties
# Update project key if using custom key
sonar.projectKey=your-custom-project-key

# For SonarCloud, add organization
sonar.organization=your-org-key
```

### 5. Verify Configuration

1. Push a commit to trigger the workflow:

   ```bash
   git add .
   git commit -m "feat: Configure SonarQube analysis"
   git push
   ```

2. Go to **Actions** tab in GitHub
3. Check the "SonarQube Analysis" workflow
4. Verify it completes successfully

### 6. View Results

#### SonarCloud

- Go to [sonarcloud.io/projects](https://sonarcloud.io/projects)
- Click on your project
- View quality metrics, code smells, bugs, and security hotspots

#### Self-Hosted SonarQube

- Go to your SonarQube Server URL
- Navigate to **Projects**
- Click on `claude-code-connect`
- Review analysis results

## Workflow Configuration

The workflow is defined in `.github/workflows/sonarqube.yml`:

```yaml
name: SonarQube Analysis

on:
  push:
    branches:
      - main
      - develop
      - 'claude/**'
  pull_request:
    types: [opened, synchronize, reopened]
    branches:
      - main
      - develop
```

### Key Features

- **Automatic Coverage**: Runs tests with coverage before analysis
- **Quality Gate**: Checks quality gate status after analysis
- **Branch Support**: Analyzes main, develop, and all Claude branches
- **PR Analysis**: Automatically analyzes pull requests

## Coverage Configuration

Coverage is generated using Vitest with the following settings:

```typescript
// vitest.config.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'lcov', 'html', 'json'],
  reportsDirectory: './coverage',
  lines: 70,
  functions: 70,
  branches: 70,
  statements: 70,
}
```

To run coverage locally:

```bash
npm run test:coverage
```

## Troubleshooting

### Issue: "ERROR: Error during SonarQube Scanner execution - Project not found"

**Solution**: Verify `sonar.projectKey` in `sonar-project.properties` matches the project key in SonarQube.

### Issue: "WARN: JAVA_HOME not set"

**Solution**: This warning is normal for TypeScript/JavaScript projects and can be ignored.

### Issue: "Quality Gate Failed"

**Solution**: Review the quality gate conditions in SonarQube settings. You can temporarily set `continue-on-error: true` in the workflow while improving code quality.

### Issue: "No coverage report found"

**Solution**: Ensure tests run successfully before SonarQube scan. Check that `coverage/lcov.info` exists after running tests.

## Project Metrics

### Current Configuration

- **Language**: TypeScript
- **Test Framework**: Vitest
- **Coverage Format**: LCOV
- **Exclusions**: node_modules, dist, coverage, test files, scripts

### Quality Thresholds

| Metric | Threshold |
|--------|-----------|
| Coverage | 70% |
| Duplications | TBD by SonarQube |
| Code Smells | TBD by SonarQube |
| Security Hotspots | 0 (recommended) |

## Additional Resources

- [SonarQube Documentation](https://docs.sonarqube.org/)
- [SonarCloud Documentation](https://docs.sonarcloud.io/)
- [Official SonarQube Scan Action](https://github.com/marketplace/actions/official-sonarqube-scan)
- [TypeScript Analysis](https://docs.sonarqube.org/latest/analyzing-source-code/languages/typescript/)

## Support

For issues related to:

- **SonarQube configuration**: Check [SonarQube Community](https://community.sonarsource.com/)
- **GitHub Actions**: Review workflow logs in Actions tab
- **Project-specific issues**: Create issue in repository
