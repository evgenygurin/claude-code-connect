# Claude Code + Linear Native Integration

A powerful, native TypeScript implementation that connects Claude Code with Linear without requiring external services or customer IDs.

## 🎯 Overview

This integration provides:

- **Webhook-based event handling** for Linear issue events
- **Automatic Claude Code session management** with intelligent context switching
- **Git branch creation and management** for isolated development
- **Session cleanup and monitoring** with comprehensive API
- **Native Linear API integration** without third-party dependencies

Unlike Cyrus (which requires a Stripe customer ID), this is a completely native solution that you can self-host and customize.

## 🏗️ Architecture

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Linear Events  │───▶│  Webhook Server │───▶│ Event Processor │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Management    │    │ Session Storage │    │ Claude Executor │
│      API        │    │   (Memory/File) │    │   (Git+Branch)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components

- **Integration Server**: Fastify-based HTTP server with webhook handling
- **Linear Client**: Wrapper around Linear SDK with Claude integration features
- **Session Manager**: Manages Claude Code session lifecycle and cleanup
- **Event Router**: Routes Linear webhook events to appropriate handlers
- **Configuration Manager**: Environment-based configuration with validation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- TypeScript 5.3+
- Linear API token
- Claude Code CLI installed

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd claude-code-linear/cc

# Install dependencies
npm install

# Initialize configuration
npm run init

# Edit .env with your settings
# (See Configuration section below)

# Test Linear connection
npm run test:connection

# Start the integration server
npm start
```

### Configuration

Create and edit `.env` file:

```env
# Required: Linear API token
LINEAR_API_TOKEN=your_linear_api_token_here

# Required: Linear organization ID
LINEAR_ORGANIZATION_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Required: Project directory
PROJECT_ROOT_DIR=/path/to/your/project

# Optional settings
DEFAULT_BRANCH=main
CREATE_BRANCHES=true
WEBHOOK_PORT=3000
SESSION_TIMEOUT_MINUTES=30
DEBUG=false

# Optional: Webhook security
LINEAR_WEBHOOK_SECRET=your-webhook-secret

# Optional: Claude configuration
CLAUDE_EXECUTABLE_PATH=claude
```

## 📋 Usage

### CLI Commands

```bash
# Initialize configuration
npm run init

# Test Linear API connection
npm run test:connection

# Start integration server
npm start

# Development mode with auto-restart
npm run start:dev

# Show help
npm start help
```

### Linear Webhook Setup

1. Go to Linear: `https://linear.app/[your-org]/settings/account/webhooks`
2. Add webhook URL: `http://your-server:3000/webhooks/linear`
3. Select events: Issue created, updated, assigned
4. Optional: Add webhook secret for security

### Event Flow

1. **Issue Assignment**: When an issue is assigned to the agent user
2. **Webhook Processing**: Linear sends webhook to integration server
3. **Session Creation**: Creates isolated Claude Code session with git branch
4. **Claude Execution**: Runs Claude Code with issue context and project access
5. **Progress Updates**: Updates Linear issue with progress comments
6. **Session Cleanup**: Automatically cleans up completed/failed sessions

## 🔧 Configuration Reference

### Environment Variables

| Variable                  | Required | Description                   | Default  |
| ------------------------- | -------- | ----------------------------- | -------- |
| `LINEAR_API_TOKEN`        | ✅       | Linear API token              | -        |
| `LINEAR_ORGANIZATION_ID`  | ✅       | Linear organization ID        | -        |
| `PROJECT_ROOT_DIR`        | ✅       | Project directory path        | -        |
| `CLAUDE_AGENT_USER_ID`    | ❌       | Agent user ID (auto-detected) | -        |
| `LINEAR_WEBHOOK_SECRET`   | ❌       | Webhook verification secret   | -        |
| `DEFAULT_BRANCH`          | ❌       | Git default branch            | `main`   |
| `CREATE_BRANCHES`         | ❌       | Auto-create git branches      | `true`   |
| `WEBHOOK_PORT`            | ❌       | Server port                   | `3000`   |
| `SESSION_TIMEOUT_MINUTES` | ❌       | Session timeout               | `30`     |
| `CLAUDE_EXECUTABLE_PATH`  | ❌       | Claude CLI path               | `claude` |
| `DEBUG`                   | ❌       | Debug logging                 | `false`  |

### Getting Configuration Values

#### Linear API Token

1. Visit: `https://linear.app/settings/account/security`
2. Create new API token
3. Copy your Linear API token (starts with `lin_api_`)

#### Linear Organization ID

1. Go to Linear workspace settings
2. Find organization ID in URL or settings
3. Format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

#### Project Root Directory

- Absolute path to your git repository
- Where Claude Code will execute and create branches
- Must be a valid git repository

## 🔌 API Reference

The integration server provides a RESTful API for management:

### Health Check

```http
GET /health
```

Returns server health status and uptime.

### Session Management

#### List All Sessions

```http
GET /sessions
```

#### List Active Sessions

```http
GET /sessions/active
```

#### Get Session Details

```http
GET /sessions/{sessionId}
```

#### Cancel Session

```http
DELETE /sessions/{sessionId}
```

## 🛠️ Development

### Project Structure

```text
src/
├── core/
│   └── types.ts              # Core TypeScript interfaces
├── linear/
│   └── client.ts             # Linear API client wrapper
├── claude/
│   └── executor.ts           # Claude Code execution engine
├── sessions/
│   ├── manager.ts            # Session lifecycle management
│   └── storage.ts            # Session persistence
├── webhooks/
│   ├── handler.ts            # Webhook validation and processing
│   └── router.ts             # Event routing and handlers
├── server/
│   └── integration.ts        # Main Fastify server
├── utils/
│   ├── config.ts             # Configuration loading
│   └── logger.ts             # Structured logging
└── index.ts                  # CLI entry point
```

### Available Scripts

```bash
npm run build          # Compile TypeScript
npm run dev             # Development with auto-restart
npm run typecheck       # TypeScript type checking
npm run lint            # ESLint code linting
npm run format          # Prettier code formatting
npm test                # Run test suite
```

### Adding New Event Handlers

1. Implement `EventHandlers` interface in `src/webhooks/router.ts`
2. Add new webhook event types to `LinearWebhookEvent` type
3. Register handler in `DefaultEventHandlers` class
4. Update event routing logic as needed

### Custom Session Storage

Implement `SessionStorage` interface for custom persistence:

```typescript
import type { SessionStorage } from "./src/core/types.js";

export class CustomStorage implements SessionStorage {
  async save(session: ClaudeSession): Promise<void> {
    // Your implementation
  }

  async get(sessionId: string): Promise<ClaudeSession | null> {
    // Your implementation
  }

  // ... other methods
}
```

## 🔍 Troubleshooting

### Common Issues

#### "Linear connection failed"

- Check `LINEAR_API_TOKEN` is valid
- Verify `LINEAR_ORGANIZATION_ID` is correct
- Ensure network connectivity to Linear API

#### "No webhook events received"

- Verify webhook URL is accessible from internet
- Check Linear webhook configuration
- Validate webhook secret if configured

#### "Claude Code execution failed"

- Ensure Claude Code CLI is installed and in PATH
- Check `PROJECT_ROOT_DIR` is valid git repository
- Verify file permissions in project directory

#### "Session cleanup not working"

- Check session timeout configuration
- Review logs for cleanup errors
- Ensure sufficient disk space

### Debug Mode

Enable debug logging:

```bash
DEBUG=true npm start
```

This provides detailed logging of:

- Webhook event processing
- Claude Code execution steps
- Session state transitions
- API request/response details

### Log Analysis

Logs include structured information:

```bash
2024-01-15T10:30:45.123Z [INFO]  🚀 Starting Claude Code + Linear Integration
2024-01-15T10:30:45.124Z [DEBUG] [LinearClient] Getting current user
2024-01-15T10:30:45.234Z [INFO]  ✅ Linear connection successful
2024-01-15T10:30:45.235Z [INFO]  👤 Authenticated as: Agent Claude (claude@yourorg.com)
```

## 📈 Monitoring

### Key Metrics

- **Session Success Rate**: Percentage of successful Claude Code executions
- **Average Session Duration**: Time from creation to completion
- **Active Sessions**: Currently running Claude Code processes
- **Webhook Processing Time**: Time to process Linear webhook events
- **Error Rate**: Failed operations per time period

### Health Checks

The `/health` endpoint provides:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "version": "1.0.0",
  "uptime": 3600
}
```

### Performance Tuning

- **Session Timeout**: Adjust based on typical issue complexity
- **Cleanup Frequency**: Balance between resource usage and responsiveness
- **Branch Strategy**: Consider branch naming patterns for better organization
- **Webhook Filtering**: Only process relevant Linear events

## 🔐 Security

### Webhook Security

1. **Use HTTPS**: Always use HTTPS for webhook endpoints
2. **Webhook Secret**: Configure `LINEAR_WEBHOOK_SECRET` for signature verification
3. **IP Filtering**: Restrict webhook access to Linear's IP ranges
4. **Rate Limiting**: Implement rate limiting for webhook endpoints

### API Token Security

1. **Principle of Least Privilege**: Use Linear API tokens with minimal required permissions
2. **Token Rotation**: Regularly rotate Linear API tokens
3. **Environment Variables**: Never commit tokens to version control
4. **Access Logging**: Monitor API token usage

### Process Security

1. **Sandboxing**: Run Claude Code in isolated environment if possible
2. **File Permissions**: Restrict file system access to project directory
3. **Resource Limits**: Set memory and CPU limits for Claude processes
4. **Network Security**: Use firewalls to restrict network access

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Make changes with tests
4. Run type checking: `npm run typecheck`
5. Run linting: `npm run lint`
6. Commit changes: `git commit -m "feat: add new feature"`
7. Push branch: `git push origin feature/new-feature`
8. Open pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/claude-code-linear/issues)
- **Documentation**: This README and inline code comments
- **Community**: [Discussion Forums](https://github.com/yourusername/claude-code-linear/discussions)

---

**Built with ❤️ for seamless Claude Code + Linear integration**.
