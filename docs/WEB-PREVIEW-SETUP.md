# Web Preview Setup Guide

This guide explains how to use **Codegen's Web Preview** feature with the Claude Code + Linear Integration project.

## What is Web Preview?

Web Preview is a Codegen feature that allows you to:

- Start a development server in a secure sandbox environment
- View your running application directly through Codegen's interface
- Test webhook integrations without exposing your local machine
- Share live previews with team members

## Requirements

- Codegen repository configured at [codegen.com/repos](https://codegen.com/repos)
- Application must listen on **port 3000** (Codegen requirement)
- Web server startup command configured

## Automatic Port Configuration

This project **automatically detects** when running in Codegen's Web Preview environment and switches to port 3000:

```typescript
// Automatic port selection
webhookPort: process.env.CG_PREVIEW_URL ? 3000 : 3005
```

- **Local Development**: Port 3005 (default)
- **Codegen Web Preview**: Port 3000 (auto-detected via `CG_PREVIEW_URL`)

## Configuration Steps

### 1. Configure Setup Commands

First, configure the installation dependencies at your repository settings:

Navigate to: `https://codegen.com/repos/{your_org}/{repo_name}/settings/setup-commands`

```bash
# Install Node.js dependencies
npm install
```

### 2. Configure Web Preview Command

Navigate to: `https://codegen.com/repos/{your_org}/{repo_name}/settings/web-preview`

Add the startup command:

```bash
npm run start:dev
```

**IMPORTANT**: The server MUST listen on port 3000 for Codegen Web Preview. This project handles this automatically when `CG_PREVIEW_URL` is detected.

### 3. Environment Variables

Configure your environment variables in Codegen repository settings:

Navigate to: `https://codegen.com/repos/{your_org}/{repo_name}/settings/secrets`

Required variables:

```bash
LINEAR_API_TOKEN=your_linear_api_token
LINEAR_ORGANIZATION_ID=your_org_id
PROJECT_ROOT_DIR=/tmp/{org}/{repo}
```

Optional variables:

```bash
GITHUB_TOKEN=your_github_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repo_name
DEBUG=false
```

**Note**: Do NOT set `WEBHOOK_PORT` - it will auto-configure to 3000 in Web Preview mode.

## Using Web Preview

### Starting the Preview

1. Navigate to your Codegen agent trace page
2. The Web Preview will start automatically based on your configured command
3. Click the **"View Web Preview"** button when the server is ready
4. Your application opens in a new tab through Codegen's secure proxy

### Web Preview Features

Once running, you can access:

- **Health Check**: `{CG_PREVIEW_URL}/health`
- **Configuration**: `{CG_PREVIEW_URL}/config`
- **Sessions**: `{CG_PREVIEW_URL}/sessions`
- **Active Sessions**: `{CG_PREVIEW_URL}/sessions/active`
- **Statistics**: `{CG_PREVIEW_URL}/stats`
- **Linear Webhook**: `{CG_PREVIEW_URL}/webhooks/linear`
- **GitHub Webhook**: `{CG_PREVIEW_URL}/webhooks/github`

### Environment Variables Available

The `CG_PREVIEW_URL` environment variable contains the public URL for your preview:

```javascript
// Automatically available in Web Preview
console.log(process.env.CG_PREVIEW_URL);
// Example: https://ta-01k96s9ee5mcv0bxppqcgr20de-3000.wo-f9clw5v3xxbstys68cgvs9nft.w.modal.host
```

## Webhook Testing with Web Preview

### Linear Webhooks

1. Copy your Web Preview URL: `{CG_PREVIEW_URL}/webhooks/linear`
2. Go to Linear Settings → API → Webhooks
3. Add webhook with your preview URL
4. Select events: Issue created, Issue updated, Comment created
5. Test the webhook from Linear

### GitHub Webhooks

1. Copy your Web Preview URL: `{CG_PREVIEW_URL}/webhooks/github`
2. Go to GitHub Repository Settings → Webhooks
3. Add webhook with your preview URL
4. Select events: Issue comments, Pull request review comments
5. Test the webhook from GitHub

## Startup Logs

When running in Web Preview mode, you'll see:

```text
2025-11-04T06:36:34.671Z [INFO]  🚀 Starting Claude Code + Linear Integration
2025-11-04T06:36:34.918Z [INFO]  Linear connection successful { userId: '...', userName: '...' }
2025-11-04T06:36:34.926Z [INFO]  Integration server started {
  port: 3000,
  organization: 'your-organization-id',
  projectRoot: '/tmp/your-org/your-repo',
  webPreviewMode: true,
  webPreviewUrl: 'https://ta-...-3000.wo-....w.modal.host'
}
2025-11-04T06:36:34.926Z [INFO]  ✅ Integration server is running
2025-11-04T06:36:34.926Z [INFO]  🌐 Web Preview: https://ta-...-3000.wo-....w.modal.host
2025-11-04T06:36:34.926Z [INFO]  📡 Webhook endpoint: https://ta-...-3000.wo-....w.modal.host/webhooks/linear
2025-11-04T06:36:34.926Z [INFO]  📊 Management API: https://ta-...-3000.wo-....w.modal.host/
2025-11-04T06:36:34.926Z [INFO]  Press Ctrl+C to stop
```

## Troubleshooting

### Port Mismatch Error

If you see "Cannot bind to port 3000":

1. Check that `WEBHOOK_PORT` is NOT set in your Codegen secrets
2. Ensure the application is using the auto-detection: `process.env.CG_PREVIEW_URL ? 3000 : 3005`
3. Verify no other services are using port 3000

### Web Preview Not Accessible

If the "View Web Preview" button doesn't appear:

1. Check that the server is listening on port 3000
2. Verify the startup command is correct: `npm run start:dev`
3. Check logs for startup errors
4. Ensure the server binds to `0.0.0.0`, not `127.0.0.1` only

### Linear/GitHub Connection Failed

If API connections fail in Web Preview:

1. Verify environment variables are set in Codegen repository settings
2. Check that `LINEAR_API_TOKEN` is valid
3. Ensure `PROJECT_ROOT_DIR` matches the sandbox path
4. Review security logs at `{CG_PREVIEW_URL}/security/events`

## Security Considerations

### Web Preview is Public

- Web Preview URLs are publicly accessible (with obscure URLs)
- Do NOT expose sensitive data through the preview
- Use webhook secrets for validation
- Rate limiting is enabled by default

### Environment Variables

- Never commit secrets to the repository
- Always use Codegen's secret management
- Rotate API tokens regularly
- Use OAuth when possible for production

### Webhook Validation

The server validates all webhooks:

```javascript
// Linear webhook signature validation (if LINEAR_WEBHOOK_SECRET is set)
const signature = request.headers["x-linear-signature"];
const isValid = await webhookHandler.validateWebhook(body, signature);

// GitHub webhook signature validation (if GITHUB_WEBHOOK_SECRET is set)
const signature = request.headers["x-hub-signature-256"];
const isValid = githubHandler.verifySignature(body, signature);
```

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Start development server (port 3005)
npm run start:dev

# Test locally
curl http://localhost:3005/health
```

### Web Preview Testing

```bash
# 1. Push changes to GitHub
git add .
git commit -m "Add new feature"
git push

# 2. Codegen automatically creates sandbox with Web Preview

# 3. Test using the preview URL
curl {CG_PREVIEW_URL}/health

# 4. Test webhooks with the public URL
# Configure Linear/GitHub webhooks with {CG_PREVIEW_URL}/webhooks/...
```

## Example: Testing Linear Integration

1. **Start Web Preview** in Codegen sandbox
2. **Copy webhook URL**: `{CG_PREVIEW_URL}/webhooks/linear`
3. **Configure Linear webhook** with this URL
4. **Create test issue** in Linear with description: "@claude please implement authentication"
5. **Monitor logs** at `{CG_PREVIEW_URL}/sessions`
6. **View session** at `{CG_PREVIEW_URL}/sessions/{session_id}`

## Next Steps

- [Quick Start Guide](QUICK-START-GUIDE.md) - General setup instructions
- [Linear Webhook Setup](LINEAR-WEBHOOK-SETUP.md) - Detailed Linear configuration
- [Codegen Integration](CODEGEN-INTEGRATIONS.md) - Codegen features and setup

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/claude-code-connect/issues)
- **Codegen Docs**: [docs.codegen.com](https://docs.codegen.com)
- **Web Preview Docs**: [docs.codegen.com/sandboxes/web-preview](https://docs.codegen.com/sandboxes/web-preview)
