# Web UI Execution Plan for claude-code-connect

## Overview

This document outlines the step-by-step plan to create a web UI for the claude-code-connect backend (port 3005).

---

## Phase 0: Preparation (Before Starting Development)

### Step 1: Analyze Reference Repositories
**Duration**: 2-3 hours

Use the `REPOSITORY-ANALYSIS-CHECKLIST.md` to analyze:

1. **v0-ai-agents-control-panel**
   - Extract agent management UI patterns
   - Document state management approach
   - Identify real-time update mechanism
   - Note dashboard layout structure

2. **claudecodeui2**
   - Extract session visualization patterns
   - Document streaming implementation
   - Identify terminal/logs display
   - Note file explorer UI

3. **v0-vercel-ai-app**
   - Extract streaming response patterns
   - Document API integration
   - Identify error handling
   - Note UI component library usage

### Step 2: Create Analysis Summary
**Duration**: 1 hour

Document findings in: `/docs/ANALYSIS-SUMMARY.md`

Include:
- Technology stack comparison table
- Best practices from each repo
- Component patterns to reuse
- Recommended architecture

### Step 3: Set Up Development Environment
**Duration**: 30 minutes

```bash
# 1. Ensure backend is running
cd /home/user/claude-code-connect
npm run start:dev

# 2. Create web UI directory
mkdir ../claude-code-connect-ui
cd ../claude-code-connect-ui

# 3. Initialize Next.js project
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --no-git \
  --no-import-alias

# 4. Add key dependencies
npm install \
  @tanstack/react-query \
  axios \
  date-fns \
  recharts \
  clsx \
  tailwind-merge

# 5. Add dev dependencies
npm install --save-dev \
  @types/node \
  typescript \
  tailwindcss
```

### Step 4: Enable CORS in Backend
**Duration**: 30 minutes

Update `/src/server/integration.ts`:

```typescript
// Add at the top
import fastifyCors from '@fastify/cors';

// Add in setupRoutes() before route definitions
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

---

## Phase 1: Basic UI (Week 1)

### Day 1-2: Core Infrastructure

**Create API Client** (2-3 hours)
```bash
# File: lib/api-client.ts
# Implement:
# - Base fetch wrapper with error handling
# - API endpoints (sessions, stats, config, security)
# - Type definitions matching backend
# - Timeout and retry logic
```

**Create Custom Hooks** (2-3 hours)
```bash
# Files: hooks/
# Implement:
# - useSessions() - fetch all sessions
# - useSession(id) - fetch single session
# - useStats() - fetch server stats
# - useConfig() - fetch configuration
# - useSecurityAlerts() - fetch security data
# - useRealTime() - polling setup
```

**Setup TanStack Query** (1-2 hours)
```bash
# File: lib/queries.ts
# Implement:
# - Query key factories
# - Query configurations with polling
# - Mutation hooks (cancelSession)
```

### Day 3: Dashboard Component

**Create Dashboard** (3-4 hours)
```bash
# File: app/page.tsx
# Components: components/Dashboard.tsx
# Display:
# - Server health status (green/red)
# - Session counters (total, active, completed, failed)
# - Recent sessions list
# - System metrics (uptime, memory)
# - Configuration summary
# - Quick actions (link to sessions)
```

### Day 4-5: Sessions Management

**Create Sessions List** (3-4 hours)
```bash
# File: app/sessions/page.tsx
# Components: components/SessionsList.tsx
# Features:
# - Table with columns: ID, Issue, Status, Created, Actions
# - Status badges with color coding
# - Sort by created date (descending default)
# - Filter by status (dropdown)
# - Search by issue ID (input field)
# - Load more / pagination
```

**Create Session Detail** (3-4 hours)
```bash
# File: app/sessions/[id]/page.tsx
# Components: components/SessionDetail.tsx
# Display:
# - Session metadata (ID, issue, status)
# - Linked issue details
# - Branch information (if created)
# - Timeline of state changes
# - Metadata (created by, organization)
# - Action buttons (view in Linear, cancel)
```

### Deliverables
- [ ] Functional dashboard with health status
- [ ] Sessions list with filtering/sorting
- [ ] Session detail view
- [ ] Real-time polling every 5 seconds
- [ ] Basic error handling and loading states

---

## Phase 2: Interactivity & Real-Time (Week 2)

### Day 1-2: Enhanced Interactivity

**Add Session Actions** (2-3 hours)
```bash
# Implement:
# - Cancel session button (DELETE /sessions/:id)
# - Confirmation dialog before cancel
# - Toast notifications for actions
# - Optimistic updates (optional)
```

**Add Filtering & Search** (2-3 hours)
```bash
# Components: components/SessionsFilter.tsx
# Features:
# - Status filter (dropdown)
# - Date range filter
# - Search by issue ID / title
# - Clear filters button
# - Saved filter preferences (localStorage)
```

### Day 3-4: Security Monitoring

**Create Security Dashboard** (4-5 hours)
```bash
# File: app/security/page.tsx
# Components: components/SecurityMonitor.tsx
# Display:
# - Alert timeline (newest first)
# - Alert severity badges
# - Alert details on click/expand
# - Event counts by type
# - Rate limiting status
# - Webhook validation logs
```

### Day 5: Polish & Deployment

**Add Responsive Design** (2-3 hours)
```bash
# Ensure mobile-friendly:
# - Mobile menu navigation
# - Responsive tables (stack on mobile)
# - Responsive cards
# - Touch-friendly buttons
```

**Add Notifications** (2-3 hours)
```bash
# Toast notifications for:
# - Session cancelled
# - Polling errors
# - API errors
# - Success confirmations
```

### Deliverables
- [ ] Cancel session functionality
- [ ] Filtering and search UI
- [ ] Security monitoring dashboard
- [ ] Responsive mobile design
- [ ] Toast notifications system
- [ ] Optimized polling (pause on error, exponential backoff)

---

## Phase 3: Advanced Features (Week 3+)

### Optional Enhancements

**WebSocket Real-Time Updates** (4-6 hours)
```bash
# 1. Add WebSocket endpoint to backend
# 2. Create useWebSocket hook
# 3. Replace polling with WebSocket
# 4. Add reconnection logic
# 5. Implement optimistic updates
```

**Session Execution Logs** (4-6 hours)
```bash
# Display:
# - Real-time execution logs
# - Syntax highlighting
# - Log filtering by level
# - Search within logs
# - Export logs
```

**Git Branch Visualization** (3-4 hours)
```bash
# Display:
# - Branch name
# - Link to GitHub/GitLab
# - Branch status (created, merged, deleted)
# - Commits in branch
```

**Advanced Security Features** (4-6 hours)
```bash
# Add:
# - Security event details modal
# - Alert severity filtering
# - Export security logs
# - Security metrics charts
# - Threat timeline visualization
```

**Analytics & Reporting** (5-7 hours)
```bash
# Create:
# - Session success rate chart
# - Session duration distribution
# - Peak usage times
# - Failure reasons analysis
# - PDF/CSV export
```

---

## Implementation Details by Phase

### Phase 1: Specific Code Examples

#### lib/api-client.ts
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

export const apiClient = {
  async getSessions() {
    const res = await fetch(`${API_BASE}/sessions`);
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
  },

  async cancelSession(id: string) {
    const res = await fetch(`${API_BASE}/sessions/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to cancel session');
    return res.json();
  },

  // ... more endpoints
};
```

#### hooks/useSessions.ts
```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: apiClient.getSessions,
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 0, // Always consider data stale
  });
}
```

#### components/Dashboard.tsx
```typescript
'use client';

import { useSessions, useStats } from '@/hooks';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function Dashboard() {
  const { data: sessions, isLoading } = useSessions();
  const { data: stats } = useStats();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <div className="p-6">
          <h3 className="text-sm font-medium">Total Sessions</h3>
          <p className="text-2xl font-bold">{stats?.sessions.totalSessions || 0}</p>
        </div>
      </Card>
      {/* More cards */}
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests (Phase 2)
```bash
npm install --save-dev jest @testing-library/react

# Test:
# - API client functions
# - Hook implementations
# - Component rendering
```

### Integration Tests (Phase 2)
```bash
# Test:
# - Full user flows
# - API integration
# - Real-time updates
# - Error scenarios
```

### E2E Tests (Phase 3, Optional)
```bash
npm install --save-dev cypress

# Test:
# - User workflows
# - Cross-browser compatibility
# - Performance
```

---

## Deployment Strategy

### Development
```bash
# Terminal 1: Backend
cd /home/user/claude-code-connect
npm run start:dev

# Terminal 2: Web UI
cd /home/user/claude-code-connect-ui
npm run dev
```

Visit: `http://localhost:3000`

### Production

**Option 1: Vercel** (Recommended)
```bash
# Push to GitHub
# Connect to Vercel
# Set environment: NEXT_PUBLIC_API_URL=your-backend-url
# Deploy
```

**Option 2: Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**Option 3: Railway/Render**
```bash
# Connect GitHub repo
# Add build command: npm install && npm run build
# Add start command: npm run start
# Set NEXT_PUBLIC_API_URL env var
```

---

## Progress Tracking

### Week 1 Checklist
- [ ] Environment setup complete
- [ ] CORS enabled in backend
- [ ] API client implemented
- [ ] Custom hooks created
- [ ] Dashboard displays (health, metrics)
- [ ] Sessions list functional (read-only)
- [ ] Session detail view working
- [ ] Polling updates working

### Week 2 Checklist
- [ ] Cancel session functionality
- [ ] Filter/search UI
- [ ] Security monitoring dashboard
- [ ] Responsive mobile design
- [ ] Toast notifications
- [ ] Error handling improved
- [ ] Loading states polished
- [ ] Tested in Chrome/Firefox/Safari

### Week 3+ Checklist
- [ ] WebSocket implemented (optional)
- [ ] Execution logs display
- [ ] Git branch visualization
- [ ] Advanced security features
- [ ] Analytics & reporting
- [ ] Performance optimized
- [ ] Accessibility (a11y) improved
- [ ] Documentation complete

---

## Common Issues & Solutions

### CORS Errors
**Issue**: "Access to XMLHttpRequest has been blocked by CORS policy"
**Solution**: Enable CORS in backend (see Phase 0, Step 4)

### Session Not Updating
**Issue**: Dashboard doesn't reflect state changes
**Solution**: Check polling interval (should be 5s), check browser console for errors

### API 404 Errors
**Issue**: Cannot find /sessions endpoint
**Solution**: Ensure backend is running on port 3005, check NEXT_PUBLIC_API_URL

### Performance Issues
**Issue**: UI sluggish with many sessions
**Solution**: Implement pagination, add virtualization for large lists

---

## Success Criteria

### Minimum Viable Product (MVP)
- [ ] Dashboard shows server health and metrics
- [ ] Can view all sessions
- [ ] Can view session details
- [ ] Can cancel sessions
- [ ] Real-time updates via polling
- [ ] Works on desktop and mobile
- [ ] No unhandled errors in console

### Production Ready
- [ ] All MVP criteria met
- [ ] +80% test coverage
- [ ] Accessibility score >90
- [ ] Performance score >80
- [ ] <1s initial load time
- [ ] Responsive to 5+ breakpoints
- [ ] Documented for maintenance

---

## Resources

### Documentation
- `/docs/WEB-UI-INTEGRATION-GUIDE.md` - Complete API reference
- `/docs/REPOSITORY-ANALYSIS-CHECKLIST.md` - How to analyze reference repos
- Reference repos for patterns

### Key Libraries
- [Next.js 14 Docs](https://nextjs.org/docs)
- [TanStack Query Docs](https://tanstack.com/query/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com/)

### Development Tools
- VS Code with TypeScript support
- Browser DevTools for debugging
- Network tab for API calls

---
