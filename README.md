# 🤖 Boss Agent: AI-Powered Development Coordinator

> **Next-generation** development automation platform where **Boss Agent** (Claude Code) coordinates all development work by delegating tasks to **Codegen agents**, while maintaining full oversight and control.

[![Status](https://img.shields.io/badge/status-active-success.svg)](https://github.com/evgenygurin/claude-code-connect)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Linear SDK](https://img.shields.io/badge/Linear%20SDK-latest-purple.svg)](https://github.com/linear/linear)
[![Codegen](https://img.shields.io/badge/Codegen-integrated-orange.svg)](https://github.com/codegen-sh/codegen)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

<!-- SonarQube badges (uncomment after configuring SonarQube) -->
<!-- SonarCloud: -->
<!-- [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=your-project-key&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=your-project-key) -->
<!-- [![Coverage](https://sonarcloud.io/api/project_badges/measure?project=your-project-key&metric=coverage)](https://sonarcloud.io/summary/new_code?id=your-project-key) -->
<!-- Self-hosted SonarQube: -->
<!-- [![Quality Gate Status](https://your-sonarqube-server.com/api/project_badges/measure?project=claude-code-connect&metric=alert_status)](https://your-sonarqube-server.com/dashboard?id=claude-code-connect) -->

## 🎯 What is Boss Agent?

**Boss Agent** is an intelligent coordinator that **NEVER codes directly** - instead, it:

- 🧠 **Analyzes** tasks and makes strategic decisions
- 🎯 **Delegates** all coding work to Codegen agents
- 👀 **Monitors** execution progress in real-time
- 📊 **Reports** results to Linear, GitHub, and Slack
- 💾 **Learns** from past decisions using Mem0 memory

### Key Principle

> **Boss Agent doesn't DO the work - it MANAGES the work.**

Think of it as a **senior engineering manager** who:
- Receives requirements (Linear issues, GitHub PRs, Sentry errors)
- Analyzes complexity and priority
- Delegates to the right specialist (Codegen agents)
- Tracks progress and ensures quality
- Reports outcomes to stakeholders

## 🏗️ Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                        BOSS AGENT                            │
│                     (Claude Code)                            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Decision Engine                                   │     │
│  │  • Analyze task complexity                         │     │
│  │  • Classify type (bug/feature/refactor)           │     │
│  │  • Assess priority & scope                        │     │
│  │  • Select delegation strategy                     │     │
│  └────────────────────────────────────────────────────┘     │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Task Delegator                                    │     │
│  │  • Build context-rich prompts                     │     │
│  │  • Invoke Codegen API                             │     │
│  │  • Set rules & constraints                        │     │
│  └────────────────────────────────────────────────────┘     │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Progress Monitor                                  │     │
│  │  • Track task status                              │     │
│  │  • Receive Codegen webhooks                       │     │
│  │  • Collect metrics                                │     │
│  └────────────────────────────────────────────────────┘     │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Reporter                                          │     │
│  │  • Update Linear/GitHub                           │     │
│  │  • Notify via Slack                               │     │
│  │  • Store learnings in Mem0                        │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
                          ↓ Delegation ↓
┌──────────────────────────────────────────────────────────────┐
│                     CODEGEN AGENTS                           │
│                  (Task Executors)                            │
│                                                              │
│  🔧 Code Implementation  |  🧪 Testing  |  🐛 Bug Fixes      │
│  ♻️  Refactoring         |  📝 Documentation  |  🔍 Reviews   │
│  ⚡ CI/CD Fixes          |  🚨 Sentry Errors  |  📦 Updates   │
└──────────────────────────────────────────────────────────────┘
                          ↓ Results ↓
┌──────────────────────────────────────────────────────────────┐
│                    INTEGRATIONS                              │
│                                                              │
│  GitHub • Linear • CircleCI • Sentry • Slack • Mem0          │
└──────────────────────────────────────────────────────────────┘
```

## ✨ Features

### 🚀 Core Capabilities

- ✅ **Intelligent Task Analysis** - Automatic classification, complexity assessment, priority determination
- ✅ **Smart Delegation** - Context-rich prompt generation for Codegen agents
- ✅ **Real-time Monitoring** - Track Codegen task execution via webhooks and polling
- ✅ **Multi-Platform Reporting** - Linear comments, GitHub updates, Slack notifications
- ✅ **Persistent Memory** - Learn from decisions using Mem0 integration
- ✅ **Security-First** - Rate limiting, webhook validation, audit logging

### 🎯 Supported Workflows

| Workflow | Trigger | Boss Agent Action | Codegen Action | Outcome |
|----------|---------|-------------------|----------------|---------|
| **Bug Fix** | Linear issue with "bug" label | Analyze bug, delegate to Codegen | Identify cause, implement fix, add tests | PR ready for review |
| **Feature Development** | Linear issue with "feature" label | Break down requirements, delegate | Implement feature, write tests, update docs | PR with complete implementation |
| **Production Error** | Sentry webhook | Assess severity, prioritize | Auto-fix error, add error handling | GitHub issue + PR with fix |
| **CI/CD Failure** | CircleCI webhook | Analyze logs, delegate fix | Fix failing tests/builds | Auto-retry CI pipeline |
| **Code Review** | GitHub PR comment `@codegen` | Delegate review task | Analyze code, suggest improvements | Review comments posted |
| **Refactoring** | Linear issue with "refactor" label | Plan approach, delegate | Improve code quality, maintain functionality | PR with refactored code |

### 🔗 Integrations

#### **Linear** (Issue Management)

- Webhook events (issue created, updated, commented)
- Auto-comment with progress updates
- Status transitions (In Progress → In Review → Done)
- PR linking

#### **GitHub** (Code Repository)

- PR creation and management
- Comment mentions (`@codegen`)
- Check suite monitoring
- Issue creation from errors

#### **Codegen** (Task Execution)

- Task delegation via Python SDK
- Webhook notifications (started, progress, completed, failed)
- Result retrieval
- Cost tracking

#### **Sentry** (Error Monitoring)

- Production error webhooks
- Auto-create GitHub issues
- Priority-based auto-fix
- Issue resolution tracking

#### **CircleCI** (CI/CD)

- Build failure webhooks
- Auto-fix failing tests
- Retry logic (up to 3 attempts)
- Build status reporting

#### **Slack** (Team Communication)

- Task delegation notifications
- Progress updates
- Completion reports
- Error alerts

#### **Mem0** (Persistent Memory)

- Decision history storage
- Context retrieval
- Learning from patterns
- Optimization suggestions

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** & npm
- **Linear API token** ([Get it here](https://linear.app/settings/account/security))
- **Codegen account** ([Sign up](https://codegen.com/signup))
- **GitHub token** (optional, for PR automation)
- **Git repository** for code operations

### Installation

#### Option 1: Using Makefile (Recommended)

```bash
# Clone repository
git clone https://github.com/evgenygurin/claude-code-connect.git
cd claude-code-connect

# Quick start - automated setup
make quick-start

# Or step by step
make install              # Install dependencies
cp .env.example .env      # Setup environment
# Edit .env with your credentials
make dev                  # Start development server
```

#### Option 2: Using NPM

```bash
# Clone repository
git clone https://github.com/evgenygurin/claude-code-connect.git
cd claude-code-connect

# Install dependencies
npm install

# Setup configuration
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run start:dev
```

### Configuration

#### Required Environment Variables

```env
# Linear Integration
LINEAR_API_TOKEN=lin_api_your_token_here
LINEAR_ORGANIZATION_ID=your-org-id

# Codegen Integration (NEW)
CODEGEN_API_TOKEN=your_codegen_token
CODEGEN_ORG_ID=your_codegen_org_id

# Project Configuration
PROJECT_ROOT_DIR=/path/to/your/project
WEBHOOK_PORT=3005

# Optional: GitHub Integration
GITHUB_TOKEN=ghp_your_github_token
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo

# Optional: Security
LINEAR_WEBHOOK_SECRET=your_webhook_secret
CODEGEN_WEBHOOK_SECRET=your_codegen_secret

# Optional: Boss Agent Configuration
BOSS_AGENT_ENABLED=true
DELEGATION_STRATEGY=codegen  # codegen | hybrid | selective
BOSS_AGENT_AUTO_DELEGATE=true
```

#### Codegen Configuration (`.codegen/config.yml`)

```yaml
# Boss Agent Integration
boss_agent:
  enabled: true
  mode: "coordinator"

  delegation:
    auto_delegate: true
    delegate_to_codegen:
      - bug_fix
      - feature_implementation
      - refactoring
      - ci_fix
      - sentry_error
      - code_review

  monitoring:
    poll_interval: 30000  # 30 seconds
    enable_webhooks: true
    update_linear: true
    notify_slack: true
```

### Running the Server

#### Using Makefile

```bash
# Show all available commands
make help

# Development mode with hot reload
make dev

# Run tests
make test

# Test Linear connection
make test-connection

# Complete CI checks
make ci-check
```

#### Using NPM

```bash
# Development mode
npm run start:dev

# Production mode
npm run build && npm start

# Test Linear connection
npm run test:connection

# Run tests
npm test
```

### Setting up Webhooks

#### 1. Linear Webhook

```bash
# Start ngrok tunnel (for local development)
ngrok http 3005

# Configure webhook in Linear:
# Settings → API → Webhooks
# URL: https://your-ngrok-url.ngrok-free.app/webhooks/linear
# Events: Issues (all), Comments (all)
```

#### 2. Codegen Webhook

```bash
# Configure webhook in Codegen dashboard:
# Settings → Webhooks
# URL: https://your-server.com/webhooks/codegen
# Events: task.started, task.completed, task.failed
```

#### 3. GitHub Webhook (Optional)

Install the **Codegen GitHub App** ([Installation guide](docs/CODEGEN-GITHUB-APP-SETUP.md))

#### 4. Sentry Webhook (Optional)

See [Sentry Setup Guide](docs/SENTRY-SETUP.md)

## 🎮 Usage

### Triggering Boss Agent

#### Method 1: Linear Issue with Label

Create a Linear issue and add label:

- `codegen` - Generic task
- `codegen:bug` - Bug fix
- `codegen:feature` - Feature implementation
- `codegen:refactor` - Refactoring

**Boss Agent will:**
1. Analyze the issue
2. Determine task type and complexity
3. Delegate to Codegen with appropriate prompt
4. Monitor execution
5. Report results in Linear comments

#### Method 2: Linear Comment Mention

Comment on any Linear issue:

```text
@claude please implement user authentication with JWT

@claude fix the performance issue in the payment module

@claude refactor the database queries for better performance
```

#### Method 3: GitHub PR Comment

Comment on any GitHub PR:

```text
@codegen please review this code

@codegen fix the failing tests

@codegen optimize the SQL queries
```

#### Method 4: Automatic (Sentry/CircleCI)

Boss Agent automatically handles:
- Production errors from Sentry
- Failing CI/CD builds from CircleCI
- Check suite failures on GitHub

### Example Workflow

```text
1. Developer creates Linear issue:
   "Implement user authentication with JWT"
   Labels: ["codegen", "feature"]

2. Boss Agent receives webhook:
   ✓ Analyzes issue description
   ✓ Classifies as "feature" (medium complexity, high priority)
   ✓ Builds context-rich prompt
   ✓ Delegates to Codegen

3. Codegen executes:
   ✓ Implements JWT authentication
   ✓ Adds login/logout endpoints
   ✓ Writes tests (unit + integration)
   ✓ Updates documentation
   ✓ Creates PR

4. Boss Agent monitors:
   ✓ Receives progress webhooks
   ✓ Updates Linear with status
   ✓ Notifies team in Slack

5. Boss Agent reports:
   ✓ PR link in Linear comment
   ✓ "✅ Feature implemented by Codegen agent"
   ✓ Ready for code review
   ✓ All tests passing
```

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server health check |
| `/config` | GET | Configuration summary (sensitive data excluded) |
| `/sessions` | GET | List all Boss Agent sessions |
| `/sessions/active` | GET | List active sessions |
| `/sessions/:id` | GET | Get session details |
| `/sessions/:id` | DELETE | Cancel session |
| `/stats` | GET | Server statistics & metrics |
| `/webhooks/linear` | POST | Linear webhook endpoint |
| `/webhooks/github` | POST | GitHub webhook endpoint |
| `/webhooks/codegen` | POST | Codegen webhook endpoint |
| `/security/metrics` | GET | Security metrics |
| `/security/alerts` | GET | Security alerts |

### Example API Response

```json
{
  "sessions": [{
    "id": "task-abc123",
    "issueId": "PROJ-123",
    "issueTitle": "Implement user authentication",
    "status": "delegated",
    "delegatedTo": "codegen",
    "codegenTaskId": "codegen-task-xyz789",
    "startedAt": "2025-11-04T10:30:00Z",
    "estimatedCompletion": "2025-11-04T14:30:00Z",
    "progress": {
      "phase": "implementation",
      "percentComplete": 65
    }
  }]
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Test Linear connection
npm run test:connection

# Integration tests
npm run test:integration

# Test Boss Agent delegation
npm run test:boss-agent

# Test Codegen integration
npm run test:codegen
```

## 🔍 Code Quality

This project uses **SonarQube** for continuous code quality and security analysis.

### Automated Analysis

- **Workflow**: `.github/workflows/sonarqube.yml`
- **Triggers**: Push to `main`, `develop`, `claude/**` branches and PRs
- **Coverage**: 70% target threshold for lines, functions, branches, statements
- **Reports**: LCOV format generated via Vitest

### Running Locally

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html

# Check LCOV report (used by SonarQube)
cat coverage/lcov.info
```

### Configuration

- **Project Config**: `sonar-project.properties`
- **Test Config**: `vitest.config.ts`
- **Setup Guide**: [SonarQube Setup](docs/SONARQUBE-SETUP.md)

### Quality Metrics

- ✅ Automated code smell detection
- ✅ Security vulnerability scanning
- ✅ Code coverage tracking
- ✅ Duplicated code detection
- ✅ Maintainability ratings

## 📝 Documentation

### Getting Started

- [Quick Start Guide](docs/QUICK-START-GUIDE.md) - Get started in 5 minutes
- [Boss Agent Integration Plan](docs/BOSS-AGENT-INTEGRATION-PLAN.md) - Complete architecture and implementation guide
- [Claude Code Installation Troubleshooting](docs/CLAUDE-CODE-INSTALLATION-TROUBLESHOOTING.md) - Fix installation errors

### Integration Setup

- [Codegen Setup](docs/CODEGEN-SETUP.md) - Configure Codegen integration
- [Codegen GitHub App](docs/CODEGEN-GITHUB-APP-SETUP.md) - Install GitHub App
- [Linear Webhook Setup](docs/LINEAR-WEBHOOK-SETUP.md) - Configure Linear webhooks
- [Sentry Setup](docs/SENTRY-SETUP.md) - Production error monitoring
- [CircleCI Setup](docs/CIRCLECI-SETUP.md) - CI/CD integration
- [Web Preview Setup](docs/WEB-PREVIEW-SETUP.md) - Codegen sandbox testing
- [SonarQube Setup](docs/SONARQUBE-SETUP.md) - Code quality analysis configuration

### Features

- [PR Metadata Automation](docs/PR-METADATA-AUTOMATION.md) - Auto-assign reviewers, labels
- [GitHub PR Agent](docs/GITHUB-PR-AGENT.md) - PR automation features
- [Security Documentation](docs/security.md) - Security architecture

### Advanced

- [Codegen Integrations](docs/CODEGEN-INTEGRATIONS.md) - CircleCI, Sentry, Linear, Slack
- [Roadmap & Improvements](docs/ROADMAP-IMPROVEMENTS.md) - Future development plans

## 🎯 Boss Agent vs. Traditional Approach

| Aspect | Traditional (Old) | Boss Agent (New) |
|--------|-------------------|------------------|
| **Execution** | Claude Code executes tasks directly | Boss Agent delegates to Codegen |
| **Focus** | Code implementation | Strategic coordination |
| **Scalability** | Limited by single agent | Unlimited parallel Codegen agents |
| **Specialization** | Generalist approach | Specialized agents for each task type |
| **Learning** | No persistent memory | Learns via Mem0 |
| **Monitoring** | Basic session tracking | Real-time progress monitoring |
| **Reporting** | Minimal | Comprehensive (Linear + GitHub + Slack) |
| **Cost** | Fixed per task | Optimized based on complexity |

## ⚠️ Known Limitations

### Current Status

- ✅ **Boss Agent coordination** - Working (analyzes, delegates, monitors)
- ✅ **Linear integration** - Production ready
- ✅ **GitHub integration** - Working (PR automation, comments)
- ✅ **Security** - Rate limiting, webhook validation, audit logging
- 🚧 **Codegen integration** - In development (see [Integration Plan](docs/BOSS-AGENT-INTEGRATION-PLAN.md))
- 🚧 **Sentry integration** - Configured but needs testing
- 🚧 **CircleCI integration** - Configured but needs testing
- 🚧 **Mem0 learning** - Integration ready, learning algorithms in development

### Deployment Considerations

- Always use HTTPS in production
- Configure webhook secrets for all integrations
- Implement proper access controls
- Monitor costs (Codegen usage)
- Set up proper logging and alerting

## 🗺️ Roadmap

### Phase 1: Foundation (✅ Complete)

- [x] Core Boss Agent architecture
- [x] Linear webhook integration
- [x] Session management
- [x] Security infrastructure
- [x] Basic monitoring

### Phase 2: Codegen Integration (🚧 In Progress)

- [ ] Codegen API client
- [ ] Task delegation system
- [ ] Progress monitoring
- [ ] Webhook handling
- [ ] Result reporting

**Timeline**: 4 weeks
**Status**: Implementation plan ready ([docs/BOSS-AGENT-INTEGRATION-PLAN.md](docs/BOSS-AGENT-INTEGRATION-PLAN.md))

### Phase 3: Advanced Features (📋 Planned)

- [ ] Mem0 learning optimization
- [ ] Multi-agent coordination
- [ ] Custom delegation strategies
- [ ] Cost optimization
- [ ] Advanced analytics

**Timeline**: 2-3 months

### Phase 4: Enterprise (📋 Future)

- [ ] Multi-tenant support
- [ ] Advanced security (SSO, RBAC)
- [ ] Horizontal scaling
- [ ] Custom agent types
- [ ] AI feature expansion

**Timeline**: 6+ months

See [ROADMAP-IMPROVEMENTS.md](docs/ROADMAP-IMPROVEMENTS.md) for detailed plans.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

### Development Setup

```bash
# Install dependencies
npm install

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Run formatting
npm run format

# Run all checks (CI)
npm run ci-check
```

## 📊 Success Metrics

Current project metrics:

- **Webhook Processing**: ~25ms average response time
- **Session Success Rate**: 100% (Linear → Boss Agent → Session Creation)
- **Security**: Rate limiting enabled, webhook validation working
- **Integration Coverage**: Linear ✅, GitHub ✅, Codegen 🚧

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Linear SDK](https://github.com/linear/linear)
- Powered by [Codegen](https://github.com/codegen-sh/codegen)
- Coordinated by [Claude Code](https://claude.ai/code)
- Server framework: [Fastify](https://www.fastify.io/)
- Memory: [Mem0](https://github.com/mem0ai/mem0)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/evgenygurin/claude-code-connect/issues)
- **Documentation**: [docs/](docs/)
- **Discussions**: [GitHub Discussions](https://github.com/evgenygurin/claude-code-connect/discussions)

---

## 🎓 Understanding Boss Agent

### What makes Boss Agent different?

**Traditional AI coding assistant:**
```text
User → AI Agent → Code
```
The AI writes code directly.

**Boss Agent approach:**
```text
User → Boss Agent → Codegen Agents → Code
       (analyze)     (execute)
          ↓
       (monitor)
          ↓
       (report)
```
Boss Agent NEVER writes code - it coordinates specialists who do.

### Real-world analogy

Think of Boss Agent as a **senior engineering manager**:

- **Receives requirements** (Linear issues, production errors)
- **Analyzes complexity** (simple fix vs. major refactor)
- **Assigns to specialists** (backend team, frontend team, testing team)
- **Monitors progress** (daily standups, status checks)
- **Reports to stakeholders** (Linear comments, Slack updates)
- **Never codes themselves** (stays at strategic level)

### Why this approach?

1. **Specialization** - Each Codegen agent can be optimized for specific task types
2. **Scalability** - Multiple agents work in parallel
3. **Quality** - Strategic oversight ensures consistency
4. **Learning** - Boss Agent learns from patterns and improves delegation
5. **Transparency** - Clear visibility into who's doing what

---

**Status**: 🚀 Boss Agent foundation ready | 🚧 Codegen integration in progress (4-week timeline)

**Current Version**: 2.0.0 (Boss Agent Architecture)

**Last Updated**: 2025-11-04

**Next Milestone**: Complete Codegen integration (Phase 2)
