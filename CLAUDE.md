# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 Project Overview

This is a **Claude Code + Linear Native Integration** - a TypeScript implementation that connects Claude Code with Linear for automated issue management without requiring external services or customer IDs. The system provides webhook-based event handling, automatic Claude Code session management, git branch creation, and comprehensive session monitoring.

### Core Architecture

- **CLI Entry Point**: Main command interface (`src/index.ts`)
- **Integration Server**: Fastify-based HTTP server (`src/server/integration.ts`)
- **Linear Client**: SDK wrapper with Claude integration features (`src/linear/client.ts`)
- **Claude Executor**: Claude Code execution engine (`src/claude/executor.ts`)
- **Session Manager**: Manages Claude Code session lifecycle (`src/sessions/manager.ts`)
- **Session Storage**: Session persistence layer (`src/sessions/storage.ts`)
- **Event Router**: Routes Linear webhook events to handlers (`src/webhooks/router.ts`)
- **Webhook Handler**: Validates and processes Linear webhooks (`src/webhooks/handler.ts`)
- **Configuration Manager**: Environment-based config with validation (`src/utils/config.ts`)
- **Logger**: Structured logging utility (`src/utils/logger.ts`)

## 🛠️ Development Commands

### Essential Commands

```bash
# Install dependencies
npm install

# Development mode with auto-restart (uses tsx watch)
npm run dev

# Type checking (ALWAYS run before committing)
npm run typecheck

# Linting and formatting
npm run lint
npm run format

# Build TypeScript to dist/
npm run build

# Run tests (uses vitest)
npm test
```

### CLI Application Commands

```bash
# Initialize configuration (.env file)
npm run init

# Test Linear API connection
npm run test:connection

# Start production server (uses built dist/index.js)
npm start

# Start development server (direct tsx execution)
npm run start:dev
```

### CLI Interface

```bash
# Available CLI commands (via src/index.ts):
npm start start          # Start integration server (default)
npm start init           # Initialize .env configuration
npm start test           # Test Linear API connection  
npm start help           # Show help information

# Custom config file
npm start start --config=.env.production

# Force overwrite .env
npm start init --force
```

## 📁 Project Structure

```text
src/
├── core/types.ts              # TypeScript interfaces and types
├── linear/client.ts           # Linear API client wrapper
├── claude/executor.ts         # Claude Code execution engine
├── sessions/
│   ├── manager.ts            # Session lifecycle management
│   └── storage.ts            # Session persistence
├── webhooks/
│   ├── handler.ts            # Webhook validation and processing
│   └── router.ts             # Event routing and handlers
├── server/integration.ts      # Main Fastify server
├── utils/
│   ├── config.ts             # Configuration loading
│   └── logger.ts             # Structured logging
└── index.ts                  # CLI entry point
```

## 🔧 Configuration

### Environment Variables Mapping

The system uses the following environment variable mapping (from `src/utils/config.ts`):

| Config Key | Environment Variable | Required | Default | Description |
|------------|---------------------|----------|---------|-------------|
| `linearApiToken` | `LINEAR_API_TOKEN` | ✅ | - | Linear API token |
| `linearOrganizationId` | `LINEAR_ORGANIZATION_ID` | ❌ | auto-detected | Linear organization ID (from API token) |
| `projectRootDir` | `PROJECT_ROOT_DIR` | ❌ | `process.cwd()` | Project directory path (current dir) |
| `agentUserId` | `CLAUDE_AGENT_USER_ID` | ❌ | auto-detected | Agent user ID (current Linear user) |
| `webhookSecret` | `LINEAR_WEBHOOK_SECRET` | ❌ | - | Webhook verification secret |
| `defaultBranch` | `DEFAULT_BRANCH` | ❌ | `main` | Git default branch |
| `createBranches` | `CREATE_BRANCHES` | ❌ | `true` | Auto-create git branches |
| `webhookPort` | `WEBHOOK_PORT` | ❌ | `3000` | Server port |
| `claudeExecutablePath` | `CLAUDE_EXECUTABLE_PATH` | ❌ | `claude` | Claude CLI path |
| `timeoutMinutes` | `SESSION_TIMEOUT_MINUTES` | ❌ | `30` | Session timeout |
| `debug` | `DEBUG` | ❌ | `false` | Debug logging |

### Quick Setup (Minimal Configuration)

For most use cases, you only need one environment variable:

```bash
# Create minimal .env file
echo "LINEAR_API_TOKEN=your_token_here" > .env

# Test the setup
npm run test:connection
```

**Minimal .env example:**

```env
# Only required field - everything else auto-detected
LINEAR_API_TOKEN=lin_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

The script automatically determines:

- **Organization ID**: From your Linear API token
- **Project Directory**: Current working directory
- **Agent User**: Current authenticated Linear user
- **Port**: Default 3000
- **All other settings**: Use sensible defaults

### Full Configuration (Advanced)

```bash
# Generate complete .env template
npm run init

# Full .env template:
```

```env
# Required: Linear API token (get from https://linear.app/settings/account/security)
LINEAR_API_TOKEN=lin_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Auto-detected if not set: Linear organization ID
# LINEAR_ORGANIZATION_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Auto-detected if not set: Current directory
# PROJECT_ROOT_DIR=/path/to/your/project

# Auto-detected if not set: Current Linear user
# CLAUDE_AGENT_USER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Optional: Webhook secret for Linear webhook verification
# LINEAR_WEBHOOK_SECRET=your-webhook-secret

# Optional: Git branch configuration
# DEFAULT_BRANCH=main
# CREATE_BRANCHES=true

# Optional: Server configuration
# WEBHOOK_PORT=3000
# SESSION_TIMEOUT_MINUTES=30

# Optional: Claude executable path (if not in PATH)
# CLAUDE_EXECUTABLE_PATH=/usr/local/bin/claude

# Optional: Debug logging
# DEBUG=false
```

### Configuration Loading Process

1. **Environment Variables**: System reads environment variables first
2. **`.env` File**: Loads `.env` file if exists (doesn't override env vars)
3. **Defaults**: Applies default values for optional fields
4. **Validation**: Validates required fields and data types
5. **Path Validation**: Ensures `PROJECT_ROOT_DIR` exists
6. **Port Validation**: Ensures port is valid (1-65535)
7. **Type Parsing**: Converts strings to appropriate types (boolean, number)

## 🌐 API Endpoints

### Health & Status

- `GET /health` - Server health check
- `GET /config` - Configuration summary (sensitive data excluded)
- `GET /stats` - Session statistics and server metrics

### Session Management

- `GET /sessions` - List all sessions
- `GET /sessions/active` - List only active sessions
- `GET /sessions/:id` - Get session details
- `DELETE /sessions/:id` - Cancel/stop session

### Webhooks

- `POST /webhooks/linear` - Linear webhook endpoint (requires proper signature if `LINEAR_WEBHOOK_SECRET` is set)

## 🔄 Event Flow

1. **Linear Issue Assignment** → Linear sends webhook to `/webhooks/linear`
2. **Signature Verification** → Validates webhook signature if configured
3. **Event Processing** → Determines if event should trigger Claude action
4. **Session Creation** → Creates new Claude session with git branch
5. **Claude Execution** → Runs Claude Code with issue context
6. **Progress Updates** → Updates Linear issue with progress comments
7. **Session Cleanup** → Automatically cleans up completed/failed sessions

## 🧪 Testing Strategy

### Unit Tests

Unit tests are located in `src/utils/` with `.test.ts` extension:

- **Configuration loading and validation**: `src/utils/config.test.ts`
- **Logger functionality**: `src/utils/logger.test.ts`

```bash
# Run all tests (uses vitest)
npm test

# Run specific test file
npx vitest src/utils/config.test.ts
```

### Integration Testing

```bash
# Test Linear API connection and authentication
npm run test:connection

# Test with custom config
npm start test --config=.env.staging
```

### Manual Webhook Testing

```bash
# Requires ngrok or similar for local development
curl -X POST http://localhost:3000/webhooks/linear \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "type": "Issue", 
    "data": {"id": "test-issue"},
    "organizationId": "your-org-id",
    "actor": {"id": "user-id"}
  }'
```

### Debugging

Enable debug mode for comprehensive logging:

```bash
DEBUG=true npm start
```

Debug output includes:

- **Configuration Summary**: Shows loaded config (without sensitive data)
- **Webhook Event Processing**: Detailed webhook payload processing
- **Claude Code Execution Steps**: Claude process management and output
- **Session State Transitions**: Session lifecycle changes
- **API Request/Response**: Linear API interaction details

## 🚀 Deployment Considerations

### Production Setup

1. **Environment Variables**: Never commit `.env` files - use proper secrets management
2. **Process Management**: Use PM2, systemd, or container orchestration
3. **Reverse Proxy**: Use nginx/Apache for HTTPS termination
4. **Monitoring**: Monitor session success rates and server health
5. **Resource Limits**: Set appropriate memory/CPU limits for Claude processes

### Security

- **Webhook Signatures**: Always use `LINEAR_WEBHOOK_SECRET` in production
- **HTTPS Only**: Never expose webhook endpoints over HTTP
- **API Token Rotation**: Regularly rotate Linear API tokens
- **Process Isolation**: Consider running Claude processes in isolated environments

## 🔍 Troubleshooting

### Common Issues

**"Linear connection failed"**.

- Verify `LINEAR_API_TOKEN` is valid and not expired
- Check `LINEAR_ORGANIZATION_ID` matches your Linear workspace
- Ensure network connectivity to Linear API

**"No webhook events received"**.

- Verify webhook URL is accessible from internet (use ngrok for local development)
- Check Linear webhook configuration includes correct events: Issue created/updated/assigned
- Validate webhook secret matches configuration

**"Claude Code execution failed"**.

- Ensure Claude Code CLI is installed and accessible in PATH
- Verify `PROJECT_ROOT_DIR` is a valid git repository
- Check file permissions in project directory

**"Session cleanup not working"**.

- Review session timeout configuration (`SESSION_TIMEOUT_MINUTES`)
- Check logs for cleanup errors
- Ensure sufficient disk space for session storage

### Debug Mode

Use `DEBUG=true` for detailed logging of all operations including webhook processing, Claude execution, and session state changes.

## 📋 Code Quality Standards

### TypeScript Configuration

The project uses relaxed TypeScript settings for rapid development (`tsconfig.json`):

- **Target**: `ES2022` with modern JavaScript features
- **Module**: `ESNext` with Node.js resolution
- **Strict Mode**: **Disabled** (`strict: false`) for flexibility during development
- **Module Resolution**: ES modules with `.js` extensions required in imports
- **Declaration Files**: Generated in `dist/` for potential library usage
- **Isolated Modules**: Each file treated as separate module

### Build System

- **Development**: Uses `tsx` for direct TypeScript execution with watch mode
- **Production**: Compiles to `dist/` directory using TypeScript compiler
- **Testing**: Uses `vitest` test runner
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier for code formatting

### Code Style Standards

```bash
# Type checking (required before commits)
npm run typecheck

# Linting (ESLint with TypeScript rules)
npm run lint

# Formatting (Prettier)
npm run format

# All quality checks
npm run typecheck && npm run lint && npm run format
```

### Required Patterns

1. **Import Extensions**: Always use `.js` extensions in imports for ES modules
2. **Async/Await**: All async operations must be properly awaited
3. **Error Handling**: Use structured logging with the Logger interface
4. **Type Safety**: Utilize interfaces from `src/core/types.ts`
5. **Configuration**: Access config through `IntegrationConfig` interface

## 🎯 Architecture Patterns

### Error Handling Pattern

All components implement structured error handling with context:

```typescript
import type { Logger } from "../core/types.js";

try {
  // operation
} catch (error) {
  this.logger.error("Operation failed", error as Error, { 
    context: "additional info",
    sessionId: "session-123"
  });
  throw error;
}
```

### Configuration Pattern

Configuration is centrally managed through `src/utils/config.ts`:

```typescript
import { loadConfig } from "../utils/config.js";
import type { IntegrationConfig } from "../core/types.js";

const config: IntegrationConfig = loadConfig();
// All environment variables mapped and validated
```

### Session Lifecycle Pattern

Sessions follow a strict state machine pattern:

```text
CREATED → RUNNING → COMPLETED/FAILED/CANCELLED
```

The `SessionManager` handles all state transitions with proper cleanup.

### Event Processing Pattern

Webhook events flow through a pipeline:

```text
Webhook → Validation → Processing → Routing → Handling
```

Each step has error boundaries and structured logging.
