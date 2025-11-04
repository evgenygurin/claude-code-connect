# LangChain Next.js Template Analysis

**Analysis Date**: 2025-11-04
**Repository**: [langchain-ai/langchain-nextjs-template](https://github.com/langchain-ai/langchain-nextjs-template)
**Purpose**: Understanding patterns for building a Web UI dashboard for Claude Code Connect

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Key Patterns & Implementations](#key-patterns--implementations)
5. [Integration Points](#integration-points)
6. [Reusable Components](#reusable-components)
7. [Streaming Architecture](#streaming-architecture)
8. [Recommendations for Claude Code Connect](#recommendations-for-claude-code-connect)

---

## Executive Summary

The LangChain Next.js template is a production-ready starter showcasing AI chat interfaces with real-time streaming, structured outputs, agentic workflows, and retrieval-augmented generation (RAG). Built on **Next.js 15.2.4** with **React 18.3.1** and **TypeScript 5.1.6**, it demonstrates best practices for integrating LangChain.js with modern web applications.

**Key Highlights:**

- ✅ **Edge Runtime** - Optimized for serverless deployment (Vercel free-tier friendly)
- ✅ **Real-time Streaming** - Uses Vercel AI SDK for token-by-token streaming
- ✅ **Modern Stack** - Next.js 15 App Router, React Server Components, TypeScript
- ✅ **Production Ready** - Small bundle size (37 KB for RAG), comprehensive error handling
- ✅ **Modular Architecture** - LangChain Expression Language for composable chains

---

## Technology Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.2.4 | React framework with App Router |
| **React** | 18.3.1 | UI library |
| **TypeScript** | 5.1.6 | Type safety |
| **Node.js** | ≥18 | Runtime requirement |

### UI Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| **Tailwind CSS** | 3.3.3 | Utility-first styling |
| **Radix UI** | Various | Accessible component primitives |
| **Lucide React** | 0.473.0 | Icon system |
| **Sonner** | Latest | Toast notifications |
| **next-themes** | Latest | Dark mode support |
| **vaul** | Latest | Drawer component |

### AI & Backend

| Library | Version | Purpose |
|---------|---------|---------|
| **@langchain/core** | 0.3.43 | Core LangChain functionality |
| **@langchain/openai** | 0.4.9 | OpenAI integration |
| **@langchain/langgraph** | 0.2.57 | Agentic workflows |
| **ai** (Vercel SDK) | Latest | Streaming utilities |
| **Zod** | Latest | Schema validation |

### State & Routing

| Library | Purpose |
|---------|---------|
| **nuqs** | URL state management |
| **React hooks** | Local state management |

---

## Project Structure

```text
langchain-nextjs-template/
├── app/                           # Next.js App Router
│   ├── layout.tsx                # Root layout with navigation
│   ├── page.tsx                  # Home page (simple chat)
│   ├── globals.css              # Global styles (Tailwind)
│   │
│   ├── api/                      # API Routes (Edge Runtime)
│   │   └── chat/
│   │       ├── route.ts         # Simple streaming chat
│   │       ├── agents/
│   │       │   └── route.ts     # Multi-step agents
│   │       ├── retrieval/
│   │       │   └── route.ts     # RAG with chains
│   │       ├── retrieval_agents/
│   │       │   └── route.ts     # RAG with agents
│   │       └── structured_output/
│   │           └── route.ts     # Schema-based output
│   │   └── retrieval/
│   │       └── ingest/
│   │           └── route.ts     # Document upload
│   │
│   ├── agents/                   # Agents demo page
│   ├── retrieval/               # RAG demo page
│   ├── structured_output/       # Structured output demo
│   ├── langgraph/              # LangGraph demos
│   └── ai_sdk/                 # AI SDK examples
│
├── components/                   # React Components
│   ├── ChatWindow.tsx          # Main chat interface
│   ├── ChatMessageBubble.tsx   # Individual message
│   ├── IntermediateStep.tsx    # Agent step visualization
│   ├── Navbar.tsx              # Navigation component
│   ├── UploadDocumentsForm.tsx # Document upload
│   ├── guide/
│   │   └── GuideInfoBox.tsx    # Info cards
│   └── ui/                     # Radix UI primitives
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── textarea.tsx
│       └── ...
│
├── utils/
│   └── cn.ts                   # Tailwind utility merger
│
├── data/
│   └── DefaultRetrievalText.ts # Sample data
│
├── public/
│   └── images/                 # Static assets
│
├── .env.example                # Environment template
├── next.config.js             # Next.js configuration
├── tailwind.config.js         # Tailwind customization
├── tsconfig.json              # TypeScript config
├── components.json            # Component library config
└── package.json               # Dependencies
```

### Directory Patterns

1. **`/app`** - Next.js App Router structure with co-located API routes
2. **`/components`** - Reusable UI components (both custom and UI library)
3. **`/utils`** - Helper functions and utilities
4. **`/data`** - Static data and content
5. **`/public`** - Static assets served directly

---

## Key Patterns & Implementations

### 1. Streaming API Route Pattern

**File**: `app/api/chat/route.ts`

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StreamingTextResponse, LangChainAdapter } from "ai";

export const runtime = "edge"; // Enable Edge Runtime

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];

    // Extract previous messages and current input
    const formattedPreviousMessages = formatPreviousMessages(messages);
    const currentMessageContent = messages[messages.length - 1].content;

    // Create prompt template
    const prompt = PromptTemplate.fromTemplate(`
      You are a helpful assistant. Previous conversation:
      {chat_history}

      Current question: {input}
    `);

    // Initialize model
    const model = new ChatOpenAI({
      temperature: 0.8,
      modelName: "gpt-4o-mini",
    });

    // Create chain using LangChain Expression Language
    const chain = prompt.pipe(model);

    // Stream response
    const stream = await chain.stream({
      chat_history: formattedPreviousMessages,
      input: currentMessageContent,
    });

    // Return streaming response
    return new StreamingTextResponse(
      LangChainAdapter.toDataStreamResponse(stream)
    );

  } catch (e: any) {
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
```

**Key Features:**

- ✅ **Edge Runtime** for optimal performance
- ✅ **Streaming** via `StreamingTextResponse`
- ✅ **LangChain Expression Language** (`.pipe()`)
- ✅ **Error handling** with structured responses
- ✅ **Message history** management

### 2. Client-Side Streaming with useChat Hook

**File**: `components/ChatWindow.tsx`

```typescript
"use client";

import { useChat } from "ai/react";
import { Message } from "ai";
import { useState } from "react";
import { toast } from "sonner";

export function ChatWindow({
  endpoint,
  emoji,
  titleText = "Chat",
  placeholder = "Type a message...",
  emptyStateComponent,
}: {
  endpoint: string;
  emoji: string;
  titleText?: string;
  placeholder?: string;
  emptyStateComponent?: ReactNode;
}) {
  const [sourcesForMessages, setSourcesForMessages] = useState<
    Record<string, any[]>
  >({});

  const [showIntermediateSteps, setShowIntermediateSteps] = useState(false);

  // useChat hook handles streaming automatically
  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat({
    api: endpoint,
    streamMode: "text",
    onResponse(response) {
      // Extract sources from response headers
      const sourcesHeader = response.headers.get("x-sources");
      const sources = sourcesHeader ? JSON.parse(atob(sourcesHeader)) : [];
      const messageIndexHeader = response.headers.get("x-message-index");

      if (sources.length && messageIndexHeader !== null) {
        setSourcesForMessages({
          ...sourcesForMessages,
          [messageIndexHeader]: sources,
        });
      }
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  // Filter out system messages for intermediate steps
  const displayMessages = showIntermediateSteps
    ? messages
    : messages.filter((msg) => msg.role !== "system");

  return (
    <ChatLayout>
      <ChatMessages messages={displayMessages} sources={sourcesForMessages} />
      <ChatInput
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </ChatLayout>
  );
}
```

**Key Features:**

- ✅ **Automatic streaming** via `useChat` hook
- ✅ **Real-time updates** without manual WebSocket management
- ✅ **Error handling** with toast notifications
- ✅ **Loading states** for UX feedback
- ✅ **Source attribution** via response headers
- ✅ **Intermediate step visualization** for agents

### 3. Message Display Component

**File**: `components/ChatMessageBubble.tsx`

```typescript
export function ChatMessageBubble({
  message,
  aiEmoji,
  sources,
}: {
  message: Message;
  aiEmoji?: string;
  sources?: any[];
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn(
      "flex gap-3 my-4",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-primary text-primary-foreground">
          {aiEmoji}
        </div>
      )}

      {/* Message Content */}
      <div className={cn(
        "flex flex-col gap-2 rounded-2xl px-4 py-3 max-w-[80%]",
        isUser
          ? "bg-secondary text-secondary-foreground"
          : "bg-muted"
      )}>
        <div className="whitespace-pre-wrap">
          {message.content}
        </div>

        {/* Sources Section */}
        {sources && sources.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer">
              🔍 Sources ({sources.length})
            </summary>
            <div className="mt-2 space-y-2">
              {sources.map((source, idx) => (
                <div key={idx} className="border-l-2 pl-2">
                  <p className="text-xs opacity-70">
                    {source.metadata?.loc?.lines?.from &&
                      `Lines ${source.metadata.loc.lines.from}-${source.metadata.loc.lines.to}`
                    }
                  </p>
                  <p className="text-xs">{source.pageContent}</p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
```

**Key Features:**

- ✅ **Role-based styling** (user vs AI)
- ✅ **Avatar system** with emoji
- ✅ **Source attribution** with collapsible details
- ✅ **Responsive layout** (max-width 80%)
- ✅ **Text formatting** preservation

### 4. Root Layout Structure

**File**: `app/layout.tsx`

```typescript
import { Public_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";

const publicSans = Public_Sans({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={publicSans.className}>
        <NuqsAdapter>
          <div className="grid grid-rows-[auto,1fr] min-h-screen">
            {/* Header with Navigation */}
            <header className="bg-secondary border-b">
              <nav className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                  <Logo />
                  <NavigationLinks />
                </div>
              </nav>
            </header>

            {/* Main Content Area */}
            <main className="relative bg-background border rounded-t-3xl">
              {children}
            </main>
          </div>

          {/* Global Toast Notifications */}
          <Toaster />
        </NuqsAdapter>
      </body>
    </html>
  );
}
```

**Key Features:**

- ✅ **Global providers** (NuqsAdapter for URL state)
- ✅ **Font optimization** via next/font
- ✅ **Grid layout** with fixed header
- ✅ **Toast notifications** globally available
- ✅ **Consistent navigation** across pages

### 5. Environment Configuration

**File**: `.env.example`

```bash
# Required - OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Optional - LangSmith Tracing
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langchain_api_key
LANGCHAIN_PROJECT=nextjs-starter
LANGCHAIN_CALLBACKS_BACKGROUND=false

# Optional - Agent Web Search
SERPAPI_API_KEY=your_serpapi_key

# Optional - Vector Store (Supabase)
SUPABASE_PRIVATE_KEY=your_supabase_key
SUPABASE_URL=your_supabase_url

# Optional - Alternative Models
ANTHROPIC_API_KEY=your_anthropic_key

# Optional - Demo Mode (client-side)
NEXT_PUBLIC_DEMO=true
```

**Configuration Pattern:**

- ✅ **`NEXT_PUBLIC_*`** prefix for client-side variables
- ✅ **Clear documentation** in example file
- ✅ **Optional dependencies** clearly marked
- ✅ **Multiple provider support** (OpenAI, Anthropic)

---

## Integration Points

### 1. Backend API Integration

**Pattern**: Dedicated API routes in `app/api/` directory

```typescript
// API Route: app/api/chat/route.ts
export async function POST(req: Request) {
  // Backend logic here
}

// Frontend: components/ChatWindow.tsx
const { messages, input, handleSubmit } = useChat({
  api: "api/chat", // Relative path to API route
});
```

**Benefits:**

- ✅ **Co-located** with frontend code
- ✅ **Type-safe** with shared TypeScript types
- ✅ **Serverless-ready** with Edge Runtime
- ✅ **Automatic routing** via file system

### 2. Streaming Response Pattern

**Backend** (API Route):

```typescript
import { StreamingTextResponse, LangChainAdapter } from "ai";

const stream = await chain.stream(input);
return new StreamingTextResponse(
  LangChainAdapter.toDataStreamResponse(stream)
);
```

**Frontend** (Component):

```typescript
const { messages, isLoading } = useChat({
  api: endpoint,
  streamMode: "text", // Enable streaming
});
```

**Flow:**

```text
Client Request → API Route → LangChain Stream → StreamingTextResponse
                                                         ↓
Client Component ← useChat hook ← Token-by-token ← Response Stream
```

### 3. Error Handling Pattern

**Backend**:

```typescript
try {
  // API logic
} catch (e: any) {
  return Response.json(
    { error: e.message },
    { status: e.status ?? 500 }
  );
}
```

**Frontend**:

```typescript
const { error } = useChat({
  onError: (e) => {
    toast.error(e.message); // User-friendly notification
  },
});
```

### 4. State Management Pattern

The template uses a **minimal state management approach**:

1. **URL State** via `nuqs` for shareable state
2. **Local State** via React hooks for UI state
3. **Server State** via API routes (no global store needed)

**Example**:

```typescript
// URL state for page params
import { useQueryState } from "nuqs";
const [searchQuery, setSearchQuery] = useQueryState("q");

// Local state for UI
const [showSidebar, setShowSidebar] = useState(false);

// Server state via API
const { messages, isLoading } = useChat({ api: "api/chat" });
```

### 5. CORS & Security

**Next.js Configuration** (`next.config.js`):

```javascript
module.exports = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST" },
        ],
      },
    ];
  },
};
```

**Note**: The template uses minimal configuration, relying on Vercel's defaults.

---

## Reusable Components

### 1. ChatWindow Component

**Purpose**: Complete chat interface with streaming support

**Props**:

```typescript
interface ChatWindowProps {
  endpoint: string;           // API route path
  emoji: string;             // AI avatar emoji
  titleText?: string;        // Chat title
  placeholder?: string;      // Input placeholder
  emptyStateComponent?: ReactNode;  // Empty state UI
}
```

**Usage**:

```typescript
<ChatWindow
  endpoint="api/chat"
  emoji="🤖"
  titleText="AI Assistant"
  placeholder="Ask me anything..."
  emptyStateComponent={<EmptyState />}
/>
```

**Features**:

- ✅ Automatic streaming
- ✅ Message history
- ✅ Loading states
- ✅ Error handling
- ✅ Source attribution
- ✅ Scroll management

### 2. ChatMessageBubble Component

**Purpose**: Individual message rendering

**Props**:

```typescript
interface ChatMessageBubbleProps {
  message: Message;          // Message object from AI SDK
  aiEmoji?: string;         // AI avatar emoji
  sources?: any[];          // Optional source attribution
}
```

**Styling**: Role-based (user vs AI) with Tailwind classes

### 3. UI Components (Radix UI)

**Location**: `components/ui/`

**Available Components**:

- `Button` - Accessible button with variants
- `Input` - Styled text input
- `Textarea` - Multi-line text input
- `Dialog` - Modal dialog
- `Popover` - Floating popover
- `Checkbox` - Accessible checkbox
- `Drawer` - Bottom sheet (mobile-friendly)
- `Sonner` - Toast notifications

**Usage Pattern**:

```typescript
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

<Button variant="default" size="lg">
  Click me
</Button>

<Dialog>
  <DialogContent>
    <p>Dialog content</p>
  </DialogContent>
</Dialog>
```

### 4. GuideInfoBox Component

**Purpose**: Information cards with instructions

**Features**:

- ✅ Markdown-style formatting
- ✅ Collapsible sections
- ✅ Code snippets
- ✅ Icon support

---

## Streaming Architecture

### How Real-Time Streaming Works

```text
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │         useChat Hook (Vercel AI SDK)              │   │
│  │                                                    │   │
│  │  • Manages message state                          │   │
│  │  • Handles streaming updates                      │   │
│  │  • Provides input/submit handlers                 │   │
│  │  • Error handling                                 │   │
│  └────────────────────────────────────────────────────┘   │
│                          ↕                                   │
│                    HTTP POST /api/chat                       │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  SERVER (Edge Runtime)                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │         API Route (app/api/chat/route.ts)         │   │
│  │                                                    │   │
│  │  1. Receive POST request                          │   │
│  │  2. Extract messages from body                    │   │
│  │  3. Create LangChain chain                        │   │
│  │  4. Call chain.stream()                           │   │
│  │  5. Return StreamingTextResponse                  │   │
│  └────────────────────────────────────────────────────┘   │
│                          ↕                                   │
│  ┌────────────────────────────────────────────────────┐   │
│  │         LangChain Expression Language             │   │
│  │                                                    │   │
│  │    prompt.pipe(model).pipe(outputParser)          │   │
│  │                                                    │   │
│  │    • PromptTemplate formats input                 │   │
│  │    • ChatOpenAI generates response                │   │
│  │    • OutputParser formats output                  │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    OpenAI API                                │
│                                                              │
│  • Receives request                                          │
│  • Streams tokens back                                       │
│  • Token-by-token generation                                 │
└─────────────────────────────────────────────────────────────┘
```

### Streaming Flow Details

1. **Client Initiates**:
   - User types message and submits
   - `useChat` hook calls `handleSubmit()`
   - POST request sent to API endpoint

2. **Server Processes**:
   - API route receives request
   - Creates LangChain chain
   - Calls `chain.stream(input)`
   - Returns `StreamingTextResponse`

3. **Stream Flows**:
   - OpenAI generates tokens
   - LangChain pipes tokens through chain
   - `StreamingTextResponse` sends tokens to client
   - Client receives token-by-token updates

4. **Client Updates**:
   - `useChat` hook automatically updates `messages` state
   - React re-renders with new content
   - User sees real-time typing effect

### Key Advantages

- ✅ **No WebSocket setup** required
- ✅ **Automatic state management** via `useChat`
- ✅ **Error recovery** built-in
- ✅ **Backpressure handling** automatic
- ✅ **Simple implementation** (few lines of code)

---

## Recommendations for Claude Code Connect

### 1. Adopt the Streaming Architecture

**Why**: Real-time updates for session status, logs, and progress

**Implementation**:

```typescript
// API Route: app/api/sessions/[id]/stream/route.ts
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Subscribe to session updates
      const unsubscribe = sessionManager.subscribe(sessionId, (update) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(update)}\n\n`)
        );
      });

      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

**Frontend**:

```typescript
"use client";

import { useEffect, useState } from "react";

function SessionMonitor({ sessionId }: { sessionId: string }) {
  const [updates, setUpdates] = useState<SessionUpdate[]>([]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/sessions/${sessionId}/stream`);

    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setUpdates((prev) => [...prev, update]);
    };

    return () => eventSource.close();
  }, [sessionId]);

  return (
    <div>
      {updates.map((update, idx) => (
        <UpdateBubble key={idx} update={update} />
      ))}
    </div>
  );
}
```

### 2. Reuse the Component Structure

**Adopt these components**:

1. **SessionWindow** (similar to ChatWindow)
   - Display session logs in real-time
   - Show status updates
   - Handle user actions (cancel, retry)

2. **SessionMessageBubble** (similar to ChatMessageBubble)
   - Display log entries
   - Show status badges
   - Support collapsible details

3. **UI Components** from Radix UI
   - Button, Dialog, Popover for actions
   - Drawer for mobile-friendly modals
   - Toast notifications for alerts

**Example**:

```typescript
<SessionWindow
  sessionId="abc-123"
  endpoint="api/sessions/abc-123/stream"
  emptyStateComponent={<NoLogsYet />}
/>
```

### 3. Implement the Layout Pattern

**Adopt**:

- Fixed header with navigation
- Grid layout for responsive design
- Rounded content area
- Global toast notifications

**Structure**:

```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <div className="grid grid-rows-[auto,1fr] min-h-screen">
          <Header>
            <Logo />
            <Nav>
              <Link href="/">Dashboard</Link>
              <Link href="/sessions">Sessions</Link>
              <Link href="/config">Config</Link>
            </Nav>
          </Header>

          <main className="bg-background border rounded-t-3xl p-6">
            {children}
          </main>
        </div>

        <Toaster />
      </body>
    </html>
  );
}
```

### 4. Use the Environment Configuration Pattern

**Adopt**:

```bash
# .env.example for Claude Code Connect

# Required - Backend API
NEXT_PUBLIC_API_BASE_URL=http://localhost:3005

# Optional - Authentication
NEXT_PUBLIC_AUTH_ENABLED=false
AUTH_SECRET=your_secret_key

# Optional - Feature Flags
NEXT_PUBLIC_ENABLE_REALTIME=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true

# Optional - Monitoring
SENTRY_DSN=your_sentry_dsn
```

**Usage**:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const response = await fetch(`${API_BASE_URL}/api/sessions`);
```

### 5. Implement Error Handling Pattern

**Backend** (API Routes):

```typescript
export async function GET(req: Request) {
  try {
    const sessions = await sessionManager.getAllSessions();
    return Response.json({ sessions });
  } catch (e: any) {
    console.error("Failed to fetch sessions:", e);
    return Response.json(
      { error: e.message || "Internal server error" },
      { status: e.status ?? 500 }
    );
  }
}
```

**Frontend** (Components):

```typescript
"use client";

import { toast } from "sonner";

async function fetchSessions() {
  try {
    const response = await fetch("/api/sessions");

    if (!response.ok) {
      const { error } = await response.json();
      throw new Error(error);
    }

    return response.json();
  } catch (error) {
    toast.error(error.message || "Failed to fetch sessions");
    return null;
  }
}
```

### 6. Adopt the TypeScript Setup

**Key configs to adopt**:

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### 7. Use the Tailwind Configuration

**Adopt the CSS variable pattern**:

```javascript
// tailwind.config.js
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        // ... more colors
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

**Benefits**:

- ✅ Easy theme switching (dark mode)
- ✅ Consistent color palette
- ✅ CSS variable flexibility

---

## Specific Code Examples for Claude Code Connect

### Example 1: Dashboard Page

**File**: `app/page.tsx`

```typescript
import { SessionsTable } from "@/components/SessionsTable";
import { StatsCards } from "@/components/StatsCards";
import { GuideInfoBox } from "@/components/guide/GuideInfoBox";

export default function DashboardPage() {
  return (
    <div className="container mx-auto space-y-6">
      {/* Stats Overview */}
      <StatsCards />

      {/* Active Sessions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Active Sessions</h2>
        <SessionsTable filter="active" />
      </div>

      {/* Guide */}
      <GuideInfoBox
        title="Getting Started"
        description="Manage your Claude Code sessions from this dashboard"
      >
        <ul className="space-y-2">
          <li>• View active sessions in real-time</li>
          <li>• Monitor session progress and logs</li>
          <li>• Cancel or retry failed sessions</li>
        </ul>
      </GuideInfoBox>
    </div>
  );
}
```

### Example 2: Sessions API Route

**File**: `app/api/sessions/route.ts`

```typescript
import { sessionManager } from "@/lib/sessions";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const sessions = await sessionManager.getAllSessions();

    // Filter by status if provided
    const filtered = status
      ? sessions.filter((s) => s.status === status)
      : sessions;

    return Response.json({
      sessions: filtered,
      total: filtered.length,
    });
  } catch (e: any) {
    return Response.json(
      { error: e.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { issueId, issueTitle } = body;

    const session = await sessionManager.createSession({
      issueId,
      issueTitle,
    });

    return Response.json({ session }, { status: 201 });
  } catch (e: any) {
    return Response.json(
      { error: e.message },
      { status: 500 }
    );
  }
}
```

### Example 3: Session Detail Page

**File**: `app/sessions/[id]/page.tsx`

```typescript
import { SessionMonitor } from "@/components/SessionMonitor";
import { SessionActions } from "@/components/SessionActions";
import { notFound } from "next/navigation";

interface PageProps {
  params: { id: string };
}

async function getSession(id: string) {
  const res = await fetch(`${process.env.API_BASE_URL}/sessions/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
}

export default async function SessionDetailPage({ params }: PageProps) {
  const session = await getSession(params.id);

  if (!session) {
    notFound();
  }

  return (
    <div className="container mx-auto space-y-6">
      {/* Session Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{session.issueTitle}</h1>
          <p className="text-muted-foreground">
            Session ID: {session.id}
          </p>
        </div>

        <SessionActions sessionId={session.id} status={session.status} />
      </div>

      {/* Real-time Monitor */}
      <SessionMonitor sessionId={session.id} />
    </div>
  );
}
```

### Example 4: Real-Time Session Monitor Component

**File**: `components/SessionMonitor.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { SessionUpdate } from "@/types";
import { SessionLogBubble } from "./SessionLogBubble";
import { toast } from "sonner";

export function SessionMonitor({ sessionId }: { sessionId: string }) {
  const [updates, setUpdates] = useState<SessionUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/sessions/${sessionId}/stream`
    );

    eventSource.onopen = () => {
      setIsConnected(true);
      toast.success("Connected to session");
    };

    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setUpdates((prev) => [...prev, update]);
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      toast.error("Connection lost");
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [sessionId]);

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "h-2 w-2 rounded-full",
          isConnected ? "bg-green-500" : "bg-red-500"
        )} />
        <span className="text-sm text-muted-foreground">
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Updates Feed */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {updates.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No updates yet...
          </p>
        ) : (
          updates.map((update, idx) => (
            <SessionLogBubble key={idx} update={update} />
          ))
        )}
      </div>
    </div>
  );
}
```

### Example 5: Stats Cards Component

**File**: `components/StatsCards.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

interface Stats {
  total: number;
  active: number;
  completed: number;
  failed: number;
}

export function StatsCards() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    completed: 0,
    failed: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      const res = await fetch("/api/stats");
      const data = await res.json();
      setStats(data);
    }

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Refresh every 5s

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard
        title="Total Sessions"
        value={stats.total}
        icon="📊"
      />
      <StatCard
        title="Active"
        value={stats.active}
        icon="🔄"
        color="text-blue-500"
      />
      <StatCard
        title="Completed"
        value={stats.completed}
        icon="✅"
        color="text-green-500"
      />
      <StatCard
        title="Failed"
        value={stats.failed}
        icon="❌"
        color="text-red-500"
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color?: string;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={cn("text-3xl font-bold mt-2", color)}>
            {value}
          </p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </Card>
  );
}
```

---

## Key Takeaways

### Architecture Patterns

1. ✅ **App Router** with co-located API routes
2. ✅ **Edge Runtime** for optimal performance
3. ✅ **Streaming** via Vercel AI SDK
4. ✅ **Component-based** UI with Radix primitives
5. ✅ **CSS variables** for theming
6. ✅ **Minimal state** with React hooks

### Technology Decisions

1. ✅ **Next.js 15** - Modern app router, server components
2. ✅ **TypeScript** - Type safety throughout
3. ✅ **Tailwind CSS** - Utility-first styling
4. ✅ **Radix UI** - Accessible primitives
5. ✅ **Vercel AI SDK** - Streaming utilities
6. ✅ **Sonner** - Toast notifications

### Best Practices

1. ✅ **Error boundaries** at API and component levels
2. ✅ **Loading states** for better UX
3. ✅ **Responsive design** with Tailwind
4. ✅ **Accessibility** via Radix UI
5. ✅ **Performance** with Edge Runtime
6. ✅ **Developer experience** with TypeScript

### Implementation Priority for Claude Code Connect

**Phase 1** (Week 1):

1. Set up Next.js 15 project with TypeScript
2. Implement basic layout and navigation
3. Create dashboard page with stats
4. Add Tailwind and Radix UI components

**Phase 2** (Week 2):

1. Build sessions list page
2. Implement session detail page
3. Add real-time streaming for session logs
4. Create API routes for sessions

**Phase 3** (Week 3):

1. Add authentication if needed
2. Implement advanced features (filters, search)
3. Add error handling and notifications
4. Polish UI/UX

---

## Additional Resources

### Official Documentation

- [Next.js App Router](https://nextjs.org/docs/app)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [LangChain.js](https://js.langchain.com/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/)

### Template Repository

- [GitHub: langchain-nextjs-template](https://github.com/langchain-ai/langchain-nextjs-template)
- [Live Demo](https://langchain-nextjs-template.vercel.app/)

### Related Templates

- [Next.js AI Chatbot](https://github.com/vercel/ai-chatbot)
- [ChatGPT Next.js](https://github.com/Yidadaa/ChatGPT-Next-Web)
- [OpenAI Quickstart](https://github.com/openai/openai-quickstart-node)

---

## Conclusion

The LangChain Next.js template provides an excellent foundation for building a modern Web UI dashboard for Claude Code Connect. Its streaming architecture, component structure, and integration patterns are directly applicable to managing Claude Code sessions with real-time updates.

**Key advantages for our use case:**

1. ✅ **Real-time streaming** - Perfect for session logs and status updates
2. ✅ **Production-ready** - Battle-tested patterns and best practices
3. ✅ **Modern stack** - Latest Next.js, React, TypeScript
4. ✅ **Excellent DX** - Great developer experience with TypeScript and tooling
5. ✅ **Scalable** - Edge Runtime and serverless-friendly architecture

**Recommended approach:**

Start with the template's core patterns (layout, components, streaming), adapt the chat interface to session monitoring, and build upon its solid foundation rather than starting from scratch.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-04
**Author**: Claude Code Analysis
