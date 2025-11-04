# Web UI Integration Summary for claude-code-connect

**Date**: November 4, 2025
**Status**: Analysis Complete - Ready for Implementation
**Target**: Create a web UI dashboard for managing Claude Code + Linear integration sessions

---

## Executive Summary

I have completed a comprehensive analysis of the claude-code-connect backend and created three detailed guides for building a web UI. Due to network constraints, I could not directly clone the three reference repositories, but I have provided a complete framework for analyzing them.

### What Has Been Created

1. **WEB-UI-INTEGRATION-GUIDE.md** (15KB)
   - Complete API specification of current backend
   - Real-time update requirements and patterns
   - Framework for analyzing reference repositories
   - Recommended tech stack and architecture
   - CORS configuration and integration points

2. **REPOSITORY-ANALYSIS-CHECKLIST.md** (10KB)
   - Step-by-step instructions for analyzing each repo
   - Specific file paths and search patterns
   - Technology detection templates
   - Comparative analysis framework
   - Best practices extraction guide

3. **WEB-UI-EXECUTION-PLAN.md** (12KB)
   - Phased development approach (3 phases)
   - Week-by-week breakdown with time estimates
   - Specific code examples for Phase 1
   - Testing and deployment strategies
   - Progress tracking checklists
   - Common issues and solutions

---

## Current Backend API Specification

### Running Backend
```bash
Port: 3005
Base URL: http://localhost:3005
Framework: Fastify (TypeScript)
```

### Key Endpoints

**Session Management**
```
GET    /sessions              - List all sessions
GET    /sessions/active       - List active sessions only
GET    /sessions/:id          - Get specific session details
DELETE /sessions/:id          - Cancel a session
```

**Monitoring & Status**
```
GET    /health                - Server health check
GET    /config                - Configuration summary
GET    /stats                 - Session statistics & server metrics
GET    /security/metrics      - Security metrics
GET    /security/alerts       - Security alerts list
GET    /security/events       - Security event log
```

**Webhooks**
```
POST   /webhooks/linear       - Linear webhook receiver
POST   /webhooks/github       - GitHub webhook receiver
```

### Session Data Structure

```typescript
interface ClaudeSession {
  id: string;                     // Unique session ID
  issueId: string;                // Linear issue ID
  issueIdentifier: string;        // e.g., "PERF-456"
  status: "created" | "running" | "completed" | "failed" | "cancelled";
  branchName?: string;            // Git branch created
  workingDir?: string;            // Working directory
  startedAt: Date;                // Creation timestamp
  completedAt?: Date;             // Completion timestamp
  metadata: {
    createdBy: string;            // User who triggered
    organizationId: string;        // Linear org ID
    projectScope: string[];        // Project directories
    triggerCommentId?: string;     // If triggered by comment
    issueTitle: string;            // Issue title
    triggerEventType: "comment" | "issue";
  };
}
```

### Security Features Already Implemented

- Rate limiting: 60 req/min global, 30 req/min per org
- Webhook signature validation
- Payload size limits (413 for oversized)
- Security event logging
- Bot detection enabled
- Input sanitization

---

## Reference Repositories Analysis

### To Complete This Analysis

You need to analyze three repositories to understand UI patterns:

#### 1. v0-ai-agents-control-panel
**Purpose**: Agent management dashboard with real-time updates
**Key Patterns to Learn**:
- Dashboard layout with metrics cards
- Session/agent list with filtering & sorting
- Status indicators and badges
- Real-time update mechanisms
- State management approach

**Expected Stack**: Next.js, React, Tailwind CSS, possibly TanStack Query

#### 2. claudecodeui2
**Purpose**: Claude Code session execution visualization
**Key Patterns to Learn**:
- Session state visualization
- Live output/terminal streaming
- File explorer integration
- Git branch visualization
- Real-time log display

**Expected Stack**: React, possibly Monaco Editor, xterm.js

#### 3. v0-vercel-ai-app
**Purpose**: Streaming AI responses in web UI
**Key Patterns to Learn**:
- Streaming response handling
- Real-time message updates
- Error recovery and reconnection
- Loading and progress states
- Chat/interaction UI

**Expected Stack**: Next.js, Vercel AI SDK, shadcn/ui

### How to Analyze Them

See `REPOSITORY-ANALYSIS-CHECKLIST.md` for detailed instructions including:
- Command templates for directory inspection
- File paths to examine in each repo
- Specific search patterns (grep commands)
- Technology detection steps
- Comparison framework

---

## Recommended Tech Stack

```json
{
  "frontend": "Next.js 14+ (React)",
  "language": "TypeScript",
  "styling": "Tailwind CSS",
  "components": "shadcn/ui",
  "state_management": "TanStack Query + Context API",
  "realtime": "TanStack Query polling (upgrade to WebSocket later)",
  "testing": "Jest + React Testing Library",
  "deployment": "Vercel (recommended)"
}
```

### Why This Stack?

- **Next.js**: Modern React framework, great for dashboards, easy deployment to Vercel
- **Tailwind CSS**: Utility-first CSS, rapid UI development
- **shadcn/ui**: High-quality, copy-paste React components
- **TanStack Query**: Perfect for polling and API state management
- **TypeScript**: Type safety, better DX

---

## Required Backend Changes

### CORS Configuration (Critical!)

The Fastify backend needs CORS enabled. Add to `src/server/integration.ts`:

```typescript
import fastifyCors from '@fastify/cors';

// In setupRoutes() method, add:
app.register(fastifyCors, {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.NEXT_PUBLIC_API_URL || '*'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
});
```

### Optional: WebSocket Support (Phase 3)

For real-time updates without polling:

```typescript
import websocket from '@fastify/websocket';

app.register(websocket);
app.get('/ws', { websocket: true }, (socket, req) => {
  // Emit session updates to connected clients
});
```

---

## Recommended Development Approach

### Phase 1: Basic UI (Week 1) - ~30-40 hours

**Core Features:**
- Dashboard with health status and metrics
- Sessions list (read-only)
- Session detail view
- Real-time polling (5-second intervals)
- Basic error handling

**Deliverables:**
- [ ] Functional dashboard
- [ ] Sessions list and filtering
- [ ] Session detail view
- [ ] Polling working

### Phase 2: Interactivity (Week 2) - ~20-30 hours

**Enhanced Features:**
- Cancel session functionality
- Advanced filtering and search
- Security monitoring dashboard
- Responsive mobile design
- Toast notifications

**Deliverables:**
- [ ] All Phase 1 features + interactive actions
- [ ] Mobile responsive
- [ ] Error handling improved

### Phase 3: Advanced (Week 3+) - ~30-50 hours

**Optional Enhancements:**
- WebSocket real-time updates
- Session execution logs display
- Git branch visualization
- Advanced analytics and reporting
- Performance optimization

**Deliverables:**
- [ ] Production-ready UI
- [ ] >80% test coverage
- [ ] Performance optimized

---

## Development Environment Setup

### Quick Start

```bash
# 1. Ensure backend is running
cd /home/user/claude-code-connect
npm run start:dev

# 2. Create UI project
mkdir ../claude-code-connect-ui
cd ../claude-code-connect-ui

# 3. Initialize Next.js
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint

# 4. Install dependencies
npm install @tanstack/react-query axios date-fns recharts

# 5. Enable CORS in backend
# Edit src/server/integration.ts (see above)

# 6. Start UI development
npm run dev
```

Visit: `http://localhost:3000`

### Environment Variables

```bash
# UI .env.local
NEXT_PUBLIC_API_URL=http://localhost:3005
NEXT_PUBLIC_POLL_INTERVAL=5000
NEXT_PUBLIC_ENVIRONMENT=development
```

---

## Implementation Key Points

### Real-Time Updates Strategy

**Option 1: Polling (Recommended for MVP)**
```typescript
// Use TanStack Query with refetchInterval
const { data: sessions } = useQuery({
  queryKey: ['sessions'],
  queryFn: fetchSessions,
  refetchInterval: 5000, // Poll every 5 seconds
});
```

**Option 2: WebSocket (Phase 3 upgrade)**
- Requires backend WebSocket support
- Lower latency, more efficient
- More complex client implementation

### Component Structure

```
web-ui/
├── app/                      # Next.js app routes
│   ├── page.tsx             # Dashboard
│   ├── sessions/            # Sessions pages
│   │   ├── page.tsx         # List
│   │   └── [id]/page.tsx    # Detail
│   └── security/            # Security monitoring
│
├── components/              # React components
│   ├── Dashboard.tsx        # Dashboard
│   ├── SessionsList.tsx     # Sessions table
│   ├── SessionDetail.tsx    # Session details
│   └── common/              # Reusable components
│
├── hooks/                   # Custom hooks
│   ├── useSessions.ts       # Fetch sessions
│   ├── useSession.ts        # Fetch single session
│   ├── useStats.ts          # Fetch stats
│   └── useRealTime.ts       # Polling setup
│
├── lib/                     # Utilities
│   ├── api-client.ts        # API wrapper
│   ├── queries.ts           # TanStack Query setup
│   └── types.ts             # Type definitions
│
└── styles/                  # CSS/Tailwind
```

---

## Next Steps for You

### Immediate (Today/Tomorrow)

1. **Access the three reference repos**:
   ```bash
   git clone https://github.com/evgenygurin/v0-ai-agents-control-panel.git
   git clone https://github.com/evgenygurin/claudecodeui2.git
   git clone https://github.com/evgenygurin/v0-vercel-ai-app.git
   ```

2. **Analyze them using the checklist**:
   - Follow steps in `REPOSITORY-ANALYSIS-CHECKLIST.md`
   - Document findings in your own analysis doc
   - Extract code patterns and component examples

3. **Create analysis summary**:
   - Technology stack for each repo
   - Key components and patterns
   - Integration approach recommendations

### Week 1 (Development Start)

1. **Set up development environment**:
   - Initialize Next.js project
   - Install dependencies
   - Enable CORS in backend

2. **Build Phase 1 (Basic UI)**:
   - Implement API client
   - Create custom hooks
   - Build dashboard with metrics
   - Build sessions list
   - Set up polling

3. **Testing**:
   - Manual testing with real backend
   - Browser DevTools debugging
   - Responsive design testing

### Ongoing

- Follow the `WEB-UI-EXECUTION-PLAN.md` for detailed weekly breakdown
- Check progress against checklists
- Debug issues using troubleshooting section

---

## Documentation Files Created

Save these files in `/docs/` for reference:

1. **WEB-UI-INTEGRATION-GUIDE.md** (15KB)
   - Complete API spec and patterns
   - Architecture recommendations
   - Integration with backend

2. **REPOSITORY-ANALYSIS-CHECKLIST.md** (10KB)
   - How to analyze each reference repo
   - Command templates
   - Technology detection guide

3. **WEB-UI-EXECUTION-PLAN.md** (12KB)
   - Phase-by-phase development plan
   - Specific code examples
   - Deployment and testing strategies

---

## Critical Success Factors

### Must Have (MVP)
- [ ] Backend running on port 3005 with CORS enabled
- [ ] Dashboard showing health and session counts
- [ ] Sessions list with filtering
- [ ] Session detail view
- [ ] Real-time polling every 5 seconds
- [ ] Cancel session functionality
- [ ] Mobile responsive
- [ ] Error handling

### Should Have (Production Ready)
- [ ] 80%+ test coverage
- [ ] Security monitoring dashboard
- [ ] Advanced filtering and search
- [ ] Toast notifications
- [ ] Performance optimized
- [ ] Accessibility score >90
- [ ] Documentation

### Nice to Have (Phase 3)
- [ ] WebSocket real-time updates
- [ ] Execution logs display
- [ ] Analytics & reporting
- [ ] Git branch visualization
- [ ] Session export

---

## Troubleshooting Quick Links

See `WEB-UI-EXECUTION-PLAN.md` "Common Issues & Solutions" section for:
- CORS errors
- Session not updating
- API 404 errors
- Performance issues

---

## Resources & References

### Documentation
- `WEB-UI-INTEGRATION-GUIDE.md` - API reference
- `REPOSITORY-ANALYSIS-CHECKLIST.md` - How to analyze repos
- `WEB-UI-EXECUTION-PLAN.md` - Development plan
- `CLAUDE.md` - Project overview

### Key Technologies
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [TanStack Query Documentation](https://tanstack.com/query/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [shadcn/ui Component Library](https://ui.shadcn.com/)
- [Fastify Documentation](https://www.fastify.io/docs/)

### Learning Resources
- Reference repositories for UI patterns
- Backend source code for API details
- Existing project documentation

---

## File Locations

All documentation is saved in `/home/user/claude-code-connect/docs/`:

```bash
docs/
├── WEB-UI-INTEGRATION-GUIDE.md      # Main integration guide
├── REPOSITORY-ANALYSIS-CHECKLIST.md # How to analyze refs
├── WEB-UI-EXECUTION-PLAN.md         # Development plan
├── WEB-UI-SUMMARY.md                # This file
├── CLAUDE.md                        # Project overview
└── [other docs...]
```

---

## Contact & Support

**Questions about the analysis?**
- Review the three guides above
- Check the troubleshooting section
- Examine the reference repositories
- Review the backend code in `src/`

**Ready to start?**
1. Analyze the reference repos (2-3 hours)
2. Follow the execution plan (start with Phase 1)
3. Reference the integration guide as needed

---

**Last Updated**: November 4, 2025
**Status**: Ready for Implementation
**Next Action**: Analyze reference repositories and begin Phase 1 development

