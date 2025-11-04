# Web UI Dashboard Debugging Report

**Date**: 2025-11-04
**Issue**: Web UI Dashboard showing loading spinner indefinitely
**Status**: Partially Fixed - Type mismatch resolved, environment variable issue ongoing

---

## Issues Found

### ✅ Issue #1: Health Endpoint Type Mismatch (FIXED)

**Backend Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-04T13:13:57.580Z",
  "version": "1.0.0",
  "uptime": 255.796,
  "oauthEnabled": false
}
```

**Frontend Type Definition** (BEFORE):
```typescript
export interface HealthStatus {
  status: 'ok' | 'error';  // ❌ Wrong!
  timestamp?: string;
}
```

**Frontend Type Definition** (AFTER):
```typescript
export interface HealthStatus {
  status: 'healthy' | 'error';  // ✅ Fixed!
  timestamp?: string;
  version?: string;
  uptime?: number;
  oauthEnabled?: boolean;
}
```

**Dashboard Component** (BEFORE):
```typescript
const isHealthy = health?.status === 'ok';  // ❌ Always false!
```

**Dashboard Component** (AFTER):
```typescript
const isHealthy = health?.status === 'healthy';  // ✅ Fixed!
```

**Files Modified**:
- `/home/user/claude-code-connect-ui/lib/types.ts:64-70`
- `/home/user/claude-code-connect-ui/components/dashboard.tsx:27`

---

### ⚠️ Issue #2: Environment Variables Not Loading (ONGOING)

**Evidence from Next.js Logs**:
```
GET /api/health 404 in 587ms
```

This shows the browser is trying to fetch from `/api/health` (relative to localhost:3000) instead of `http://localhost:3005/health` (the backend server).

**Environment Configuration**:

`.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3005
NEXT_PUBLIC_POLL_INTERVAL=5000
```

**Attempted Fixes**:

1. ✅ **Restarted Next.js dev server** - Did not resolve issue
2. ✅ **Added explicit env configuration to next.config.ts**:
   ```typescript
   const nextConfig: NextConfig = {
     reactStrictMode: true,
     env: {
       NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005',
       NEXT_PUBLIC_POLL_INTERVAL: process.env.NEXT_PUBLIC_POLL_INTERVAL || '5000',
     },
   };
   ```
3. ❌ **Issue persists** - Loading spinner still showing

---

## Technical Analysis

### Why the Dashboard Shows Loading Spinner

The Dashboard component uses TanStack Query hooks:
```typescript
const { data: stats, isLoading: statsLoading, error: statsError } = useStats();
const { data: health, isLoading: healthLoading } = useHealth();

if (statsLoading || healthLoading) {
  return <LoadingSpinner className="py-12" />;
}
```

If `statsLoading` or `healthLoading` is `true`, the loading spinner is shown. This happens when:
1. **Server-Side Rendering (SSR)**: During initial render, no data is available yet
2. **Client-Side Hydration**: React takes over, hooks should run and fetch data
3. **⚠️ PROBLEM**: API calls from browser are failing, so `isLoading` never resolves to `false`

### Environment Variable Loading in Next.js 16

In Next.js, `NEXT_PUBLIC_*` variables should be:
1. Defined in `.env.local` (✅ Done)
2. Available at build/dev time (⚠️ Unclear)
3. Embedded in the JavaScript bundle (⚠️ Not working)
4. Accessible via `process.env.NEXT_PUBLIC_*` in browser (❌ Failing)

**Current Behavior**:
- `process.env.NEXT_PUBLIC_API_URL` is likely `undefined` in browser
- Falls back to relative URLs (`/health` instead of `http://localhost:3005/health`)
- Browser tries to fetch from Next.js server (port 3000) instead of backend (port 3005)
- Results in 404 errors

---

## Next Steps to Resolve

### Option 1: Hardcode API URL (Quick Fix)
```typescript
// lib/api-client.ts
const API_BASE = 'http://localhost:3005';  // Hardcoded for dev
```

**Pros**: Will immediately fix the issue
**Cons**: Not portable, can't use environment variables

### Option 2: Use Next.js Public Runtime Config
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  publicRuntimeConfig: {
    API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005',
  },
};

// lib/api-client.ts
import getConfig from 'next/config';
const { publicRuntimeConfig } = getConfig();
const API_BASE = publicRuntimeConfig.API_URL;
```

**Pros**: Proper Next.js pattern
**Cons**: Requires additional configuration

### Option 3: Debug Environment Variable Loading
Add debugging to see if env vars are available:
```typescript
// lib/api-client.ts
console.log('Environment check:', {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  typeof_window: typeof window,
  NODE_ENV: process.env.NODE_ENV,
});
```

---

## Server Status

### Backend Server (Port 3005)
- ✅ Running successfully
- ✅ CORS configured for localhost:3000
- ✅ All endpoints responding correctly:
  - `GET /health` → 200 OK
  - `GET /stats` → 200 OK
  - `GET /sessions` → 200 OK

### Frontend Server (Port 3000)
- ✅ Running successfully
- ✅ Pages rendering (SSR working)
- ✅ Navigation working
- ❌ Client-side API calls failing
- ❌ Loading spinner showing indefinitely

---

## Files Changed

### Backend: None
No backend changes required - all endpoints working correctly.

### Frontend:

1. **lib/types.ts** - Fixed HealthStatus type to match backend
2. **components/dashboard.tsx** - Changed health check from `'ok'` to `'healthy'`
3. **next.config.ts** - Added explicit env configuration

---

## Testing Commands

```bash
# Test backend directly
curl http://localhost:3005/health

# Test frontend page load
curl http://localhost:3000

# Check for loading spinner
curl -s http://localhost:3000 | grep -c "animate-spin"

# Test CORS
curl -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS http://localhost:3005/health -v
```

---

## Recommendations

1. **Immediate**: Try hardcoding the API URL to confirm this is the issue
2. **Debug**: Add console logging to api-client.ts to see environment variables
3. **Investigate**: Check if Turbopack (Next.js 16) has different env var handling
4. **Alternative**: Create a simple API route in Next.js that proxies to the backend
5. **Long-term**: Consider using Next.js API routes as a proxy layer for better security

---

**Report Generated**: 2025-11-04 13:18 UTC
**Next Action**: Try hardcoding API URL to confirm diagnosis
