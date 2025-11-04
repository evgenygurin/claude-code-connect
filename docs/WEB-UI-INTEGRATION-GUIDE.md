# Web UI Integration Analysis for claude-code-connect

## Executive Summary

To create a web UI for claude-code-connect, you need to understand:

1. **Current Backend API** (Fastify-based, running on port 3005)
2. **Real-time Requirements** (Session state, webhook events, monitoring)
3. **Existing UI Patterns** in the three reference repositories
4. **Integration Strategy** to connect UI with backend

---

## Part 1: claude-code-connect Backend API Specification

### Current API Endpoints

#### Health & Monitoring
```typescript
GET /health                          // Server health check
GET /config                          // Configuration summary
GET /stats                           // Session statistics
GET /security/metrics                // Security metrics
GET /security/alerts                 // Security alerts
GET /security/events                 // Security events
```

#### Session Management
```typescript
GET /sessions                        // List all sessions
GET /sessions/active                 // List active sessions only
GET /sessions/:id                    // Get specific session details
DELETE /sessions/:id                 // Cancel a session
```

#### Webhooks
```typescript
POST /webhooks/linear               // Linear webhook receiver
POST /webhooks/github               // GitHub webhook receiver
```

### Response Data Structures

#### Session Object
```typescript
interface ClaudeSession {
  id: string;                        // Unique session ID
  issueId: string;                   // Linear issue ID
  issueIdentifier: string;           // e.g., "PERF-456"
  status: "created" | "running" | "completed" | "failed" | "cancelled";
  branchName?: string;               // Git branch created
  workingDir?: string;               // Working directory
  startedAt: Date;                   // Creation timestamp
  completedAt?: Date;                // Completion timestamp
  metadata: SessionMetadata;         // Additional metadata
}

interface SessionMetadata {
  createdBy: string;                 // User ID who triggered
  organizationId: string;            // Linear org ID
  projectScope: string[];            // Project directories
  permissions: SessionPermissions;
  triggerCommentId?: string;         // If triggered by comment
  issueTitle: string;                // Issue title
  triggerEventType: "comment" | "issue";
}
```

#### Stats Object
```typescript
interface SessionStats {
  sessions: {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    failedSessions: number;
    cancelledSessions: number;
  };
  uptime: number;                    // Seconds
  memory: NodeJS.MemoryUsage;
  config: {
    organization: string;
    projectRoot: string;
    createBranches: boolean;
    debug: boolean;
  };
}
```

### Key Architecture Patterns

**Event-Driven Architecture:**
- Sessions emit events: `session:created`, `session:started`, `session:completed`, `session:failed`, `session:cancelled`
- Security agent logs security events with timestamps
- Webhook handler validates and processes incoming events

**Session Lifecycle:**
```
CREATED → RUNNING → COMPLETED/FAILED/CANCELLED
```

**Security Features:**
- Rate limiting (60 req/min global, 30 req/min per org)
- Webhook signature validation
- Payload size limits
- Security event logging
- Bot detection enabled

---

## Part 2: Real-Time Features Needed in UI

### Real-Time Requirements

1. **WebSocket Support** (Not currently implemented in backend)
   - Session state changes
   - Security alerts
   - Progress updates
   - System metrics

2. **Polling Fallback**
   - Poll `/sessions` every 2-5 seconds
   - Poll `/stats` for metrics
   - Poll `/security/alerts` for security events

3. **Server-Sent Events (SSE)**
   - Session status updates
   - Error notifications
   - Webhook processing status

### Recommended Real-Time Implementation

For immediate use: **Polling + Refetch Pattern**
```typescript
// Poll sessions every 3 seconds
const pollInterval = setInterval(() => {
  fetch('/sessions').then(r => r.json()).then(updateUI);
}, 3000);
```

For production: **WebSocket Addition to Backend**
```typescript
// Add to Fastify server
import websocket from '@fastify/websocket';

app.register(websocket);
app.get('/ws', { websocket: true }, (socket, req) => {
  // Send session updates
  sessionManager.on('session:created', (session) => {
    socket.send(JSON.stringify({ type: 'session:created', data: session }));
  });
});
```

---

## Part 3: Reference Projects Analysis Framework

Since I cannot directly access the repositories, use this framework to analyze them:

### Repository 1: v0-ai-agents-control-panel
**Expected Analysis Areas:**

```bash
# Check structure
ls -la /path/to/repo
find . -name "*.tsx" -o -name "*.ts" | grep -E "(pages|components|hooks)" | head -20

# Look for:
# 1. Agent management UI components
# 2. State management (Redux, Zustand, Context API)
# 3. Real-time update mechanisms
# 4. Dashboard/monitoring components
# 5. API integration patterns

# Key files to examine:
- src/pages/agents/*.tsx        # Agent list, detail views
- src/components/dashboard/     # Dashboard components
- src/hooks/useAgents.ts        # Data fetching hooks
- src/lib/api.ts                # API client
- package.json                  # Dependencies (look for socket.io, swr, tanstack-query)
```

**Expected Stack:**
- Next.js (React framework)
- TypeScript
- React Hooks + Context or State Management Library
- Possible: TanStack Query, SWR for data fetching
- Possible: Socket.io or WS for real-time updates

### Repository 2: claudecodeui2
**Expected Analysis Areas:**

```bash
# Look for:
# 1. Claude Code session management UI
# 2. Terminal/output visualization
# 3. File explorer
# 4. Chat interface for AI
# 5. Real-time code execution feedback

# Key files:
- src/components/Session*.tsx   # Session components
- src/components/Terminal*.tsx  # Terminal output
- src/lib/claude-api.ts         # Claude integration
- src/hooks/useSession.ts       # Session state management
- src/utils/websocket.ts        # Real-time communication
```

**Expected Features:**
- Session state visualization
- Live output/terminal streaming
- File system navigation
- Code editor integration
- Agent execution logs

### Repository 3: v0-vercel-ai-app
**Expected Analysis Areas:**

```bash
# Look for:
# 1. Vercel AI SDK integration patterns
# 2. Chat/streaming UI
# 3. UI component library (v0, shadcn/ui, etc.)
# 4. API routes for AI interactions
# 5. Streaming response handling

# Key files:
- src/app/api/chat/route.ts     # Streaming API endpoint
- src/components/Chat.tsx        # Chat UI
- src/lib/ai.ts                 # AI client setup
- src/hooks/useChat.ts          # Chat hook from vercel/ai
```

**Expected Technologies:**
- Vercel AI SDK (vercel/ai)
- Next.js streaming
- React Server Components
- Streaming JSON/SSE handling
- shadcn/ui or similar component library

---

## Part 4: Recommended Web UI Architecture

### Recommended Tech Stack

```json
{
  "framework": "Next.js 14+",
  "language": "TypeScript",
  "styling": "Tailwind CSS",
  "components": "shadcn/ui or Mantine",
  "state": "TanStack Query + Context API or Zustand",
  "realtime": "TanStack Query polling + optional Socket.io upgrade",
  "deployment": "Vercel, Railway, or Docker"
}
```

### Recommended Architecture

```
web-ui/
├── src/
│   ├── app/                          # Next.js app directory
│   │   ├── page.tsx                  # Dashboard
│   │   ├── sessions/                 # Session pages
│   │   ├── security/                 # Security monitoring
│   │   ├── api/                      # Optional API routes
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── Dashboard.tsx             # Main dashboard
│   │   ├── SessionList.tsx           # Sessions table/list
│   │   ├── SessionDetail.tsx         # Single session detail
│   │   ├── SecurityMonitor.tsx       # Security metrics
│   │   ├── SystemStats.tsx           # Server stats
│   │   └── common/                   # Reusable components
│   │
│   ├── hooks/
│   │   ├── useSessions.ts            # Fetch sessions
│   │   ├── useStats.ts               # Fetch server stats
│   │   ├── useSecurityAlerts.ts      # Fetch security data
│   │   └── useRealTime.ts            # Real-time updates
│   │
│   ├── lib/
│   │   ├── api-client.ts             # Fetch wrapper
│   │   ├── queries.ts                # TanStack Query definitions
│   │   └── types.ts                  # Type definitions
│   │
│   └── styles/
│       └── globals.css
│
└── package.json
```

### Key Features to Implement

#### 1. Dashboard (Overview)
```typescript
// Show:
// - Server health status
// - Total/active sessions count
// - Recent sessions (last 5-10)
// - System metrics (uptime, memory)
// - Security alerts summary
// - Configuration summary

// Real-time updates: Poll every 5 seconds
```

#### 2. Sessions Management
```typescript
// List view with filtering:
// - Status filter (active, completed, failed)
// - Sort by created/completed time
// - Search by issue ID or name
// - Quick actions (view, cancel)

// Detail view:
// - Session metadata
// - Linked issue details
// - Branch information
// - Timeline of events
// - Related security events
```

#### 3. Security Monitoring
```typescript
// Display:
// - Security alerts (real-time list)
// - Event timeline
// - Security metrics (failed auth, attacks, etc.)
// - Rate limiting status
// - Webhook validation logs
```

#### 4. System Configuration
```typescript
// Read-only view:
// - Organization ID
// - Project root directory
// - Create branches setting
// - Debug mode status
// - Token presence indicators
```

---

## Part 5: Integration with Backend (Port 3005)

### Environment Configuration

```bash
# .env.local for Next.js
NEXT_PUBLIC_API_URL=http://localhost:3005
NEXT_PUBLIC_POLL_INTERVAL=5000  # 5 seconds
```

### API Client Implementation

```typescript
// lib/api-client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

export const apiClient = {
  async getSessions() {
    const res = await fetch(`${API_BASE}/sessions`);
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
  },

  async getSession(id: string) {
    const res = await fetch(`${API_BASE}/sessions/${id}`);
    if (!res.ok) throw new Error('Failed to fetch session');
    return res.json();
  },

  async cancelSession(id: string) {
    const res = await fetch(`${API_BASE}/sessions/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to cancel session');
    return res.json();
  },

  async getStats() {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async getSecurityAlerts() {
    const res = await fetch(`${API_BASE}/security/alerts`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
  },

  async getConfig() {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) throw new Error('Failed to fetch config');
    return res.json();
  }
};
```

### TanStack Query Setup

```typescript
// lib/queries.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';

export const sessionQueries = {
  all: () => ({ queryKey: ['sessions'] }),
  list: () => ({
    queryKey: ['sessions', 'list'],
    queryFn: apiClient.getSessions,
    refetchInterval: 5000,  // Poll every 5 seconds
  }),
  detail: (id: string) => ({
    queryKey: ['sessions', id],
    queryFn: () => apiClient.getSession(id),
    refetchInterval: 5000,
  }),
};

export const useSessions = () => useQuery(sessionQueries.list());
export const useSession = (id: string) => useQuery(sessionQueries.detail(id));
```

---

## Part 6: Integration Approach (How to Connect the Three Repos)

### Recommended Integration Pattern

#### From v0-ai-agents-control-panel
- **Reuse**: Agent/session management UI patterns
- **Adapt**: Replace agent concepts with Claude sessions
- **Example**: Session list table, detail view, status badges

#### From claudecodeui2
- **Reuse**: Session execution visualization
- **Adapt**: Display Claude execution output, logs, branch information
- **Example**: Session detail view with live logs/output

#### From v0-vercel-ai-app
- **Reuse**: Streaming response handling patterns
- **Adapt**: Display long-running operations status
- **Example**: Real-time session status updates, progress streaming

### Unified Component Library Recommendation

Instead of mixing UI patterns:

1. **Choose ONE base**: shadcn/ui (most modern, Vercel-recommended)
2. **Implement consistently**: All three repos likely use it
3. **Create custom hooks** that wrap backend API calls
4. **Use TanStack Query** for all data fetching

---

## Part 7: Development Roadmap

### Phase 1: Basic UI (Week 1)
- [ ] Dashboard showing server health
- [ ] Sessions list (read-only)
- [ ] Basic polling implementation
- [ ] Session detail view

### Phase 2: Interactivity (Week 2)
- [ ] Cancel session functionality
- [ ] Real-time updates (polling)
- [ ] Filter/sort sessions
- [ ] Security alerts display

### Phase 3: Advanced Features (Week 3+)
- [ ] WebSocket upgrade (backend change)
- [ ] Session execution logs
- [ ] Git branch visualization
- [ ] Advanced security monitoring
- [ ] Export/reporting features

---

## Part 8: Critical Integration Points

### CORS Configuration (Required!)

The backend needs CORS enabled for web UI:

```typescript
// Add to integration.ts
import fastifyCors from '@fastify/cors';

app.register(fastifyCors, {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
});
```

### Port Configuration

- **Backend**: Port 3005 (claude-code-connect)
- **Web UI**: Port 3000 or 3001 (Next.js)
- **Automatic in Codegen**: Port 3000 (auto-configured)

### Environment Variables Checklist

```bash
# Backend (.env)
LINEAR_API_TOKEN=
LINEAR_ORGANIZATION_ID=
PROJECT_ROOT_DIR=
WEBHOOK_SECRET=
DEBUG=false

# Web UI (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3005
NEXT_PUBLIC_POLL_INTERVAL=5000
NEXT_PUBLIC_ENVIRONMENT=development
```

---

## Conclusion

To build the web UI:

1. **Analyze the three reference repos** using the framework above
2. **Implement with Next.js + shadcn/ui + TanStack Query**
3. **Start with polling**, upgrade to WebSocket later
4. **Focus on Session Management & Security Monitoring**
5. **Enable CORS in backend** before deploying
6. **Test with real claude-code-connect instance** on port 3005

The three repos will show you:
- UI/UX patterns for similar applications
- Integration with backend APIs
- Real-time update mechanisms
- Component organization best practices

---
