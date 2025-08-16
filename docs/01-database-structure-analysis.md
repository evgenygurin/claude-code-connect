# Анализ структуры Linear API в TypeScript Integration

## Введение

Данный анализ рассматривает структуру Linear GraphQL API с точки зрения TypeScript/Node.js реализации в проекте [claude-code-connect](https://github.com/evgenygurin/claude-code-connect). Используется официальный `@linear/sdk` для типобезопасной работы с API.

## Архитектурные особенности TypeScript реализации

### 1. Linear SDK Integration

```typescript
import { LinearClient as LinearSDK, Issue, Comment, Team, User, WorkflowState } from "@linear/sdk";

export class LinearClient {
  private client: LinearSDK;
  
  constructor(config: IntegrationConfig, logger: Logger) {
    this.client = new LinearSDK({
      apiKey: config.linearApiToken
    });
  }
}
```

### 2. Type Safety с @linear/sdk

- **Автоматическая типизация**: TypeScript интерфейсы генерируются из GraphQL схемы
- **Null safety**: все поля корректно типизированы как nullable/non-nullable
- **Enum поддержка**: полная поддержка Linear enum значений
- **Promise-based API**: все операции асинхронные

### 3. Современные TypeScript паттерны

- **ES Modules**: использование `import/export` синтаксиса
- **Async/await**: все Linear API вызовы асинхронные
- **Type assertions**: строгая типизация возвращаемых значений
- **Error handling**: типизированная обработка ошибок

## Основные сущности в TypeScript

### Issue (Центральная сущность)

```typescript
// Из @linear/sdk - автоматически типизированные интерфейсы
interface Issue {
  id: string;
  identifier: string;  // DEV-123 формат
  title: string;
  description?: string;
  priority: number;    // 0-4 (No priority → Low)
  
  // Временные метки
  createdAt: Date;
  updatedAt: Date;
  
  // Связи (Promise-based для lazy loading)
  assignee?: Promise<User>;
  team: Promise<Team>;
  state: Promise<WorkflowState>;
  
  // Коллекции (возвращают Connection objects)
  comments(): Promise<CommentConnection>;
  attachments(): Promise<AttachmentConnection>;
}

// Реальное использование в нашем коде
async getIssue(issueId: string): Promise<Issue | null> {
  try {
    const issue = await this.client.issue(issueId);
    return issue;
  } catch (error) {
    this.logger.error("Failed to get issue", error as Error, { issueId });
    return null;
  }
}
```

### Team (Организационная единица)

```typescript
interface Team {
  id: string;
  name: string;
  key: string;        // DEV, PROD, etc.
  
  // Workflow состояния команды
  states(): Promise<WorkflowStateConnection>;
  
  // Участники команды
  members(): Promise<UserConnection>;
  
  // Issues команды
  issues(filter?: IssueFilter): Promise<IssueConnection>;
}

// Получение workflow состояний команды
async getTeamStates(teamId: string): Promise<WorkflowState[]> {
  try {
    const team = await this.client.team(teamId);
    const states = await team.states();
    return states.nodes;
  } catch (error) {
    this.logger.error("Failed to get team states", error as Error, { teamId });
    return [];
  }
}
```

### User (Пользователь системы)

```typescript
interface User {
  id: string;
  name: string;
  displayName?: string;
  email: string;
  active: boolean;
  admin: boolean;
  
  // Назначенные issues
  assignedIssues(filter?: IssueFilter): Promise<IssueConnection>;
}

// Получение текущего пользователя (агента)
async getCurrentUser(): Promise<User> {
  this.logger.debug("Getting current user");
  const viewer = await this.client.viewer;
  return viewer;
}
```

### WorkflowState (Состояния workflow)

```typescript
interface WorkflowState {
  id: string;
  name: string;
  type: "triage" | "backlog" | "unstarted" | "started" | "completed" | "canceled";
  color: string;
  
  // Связь с командой
  team: Promise<Team>;
}

// Перемещение issue в статус "started"
async moveIssueToStarted(issue: Issue): Promise<boolean> {
  try {
    const team = await issue.team;
    const states = await team.states();
    
    const startedState = states.nodes.find(state => state.type === "started");
    if (!startedState) {
      this.logger.warn("No 'started' state found for team", { teamId: team.id });
      return false;
    }
    
    return await this.updateIssueStatus(issue.id, startedState.id);
  } catch (error) {
    this.logger.error("Failed to move issue to started", error as Error, { issueId: issue.id });
    return false;
  }
}
```

### Comment (Комментарии)

```typescript
interface Comment {
  id: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Автор комментария
  user: Promise<User>;
  
  // Issue к которому принадлежит
  issue: Promise<Issue>;
}

// Создание комментария с прогрессом агента
async createProgressComment(session: ClaudeSession, message: string): Promise<Comment | null> {
  const progressMessage = `
🤖 **Claude Agent - ${session.issueIdentifier}**

${message}

---
*Session ID: ${session.id}*  
*Started: ${session.startedAt.toISOString()}*  
${session.branchName ? `*Branch: \`${session.branchName}\`*` : ""}
  `.trim();

  return await this.createComment(session.issueId, progressMessage);
}
```

## Паттерны архитектуры в TypeScript

### 1. Connection Pattern (Relay) в @linear/sdk

```typescript
// Типизированные Connection интерфейсы из @linear/sdk
interface IssueConnection {
  edges: IssueEdge[];
  nodes: Issue[];        // Прямой доступ к данным
  pageInfo: PageInfo;    // Информация о пагинации
  totalCount: number;    // Общее количество
}

interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

// Реальное использование с пагинацией
async getAssignedIssues(userId?: string): Promise<Issue[]> {
  try {
    const issues = await this.client.issues({
      filter: {
        assignee: { id: { eq: userId } },
        state: { type: { nin: ["completed", "canceled"] } }
      },
      orderBy: "updatedAt",
      first: 100  // Явное указание лимита
    });

    return issues.nodes;  // Прямой доступ к массиву Issue
  } catch (error) {
    this.logger.error("Failed to get assigned issues", error as Error);
    return [];
  }
}
```

### 2. Promise-based Lazy Loading

@linear/sdk использует Promises для ленивой загрузки связанных данных:

```typescript
// Все связи загружаются по требованию
async analyzeIssue(issue: Issue): Promise<void> {
  // Связанные данные загружаются асинхронно
  const assignee = await issue.assignee;  // Promise<User | undefined>
  const team = await issue.team;          // Promise<Team>
  const state = await issue.state;       // Promise<WorkflowState>
  
  // Коллекции тоже асинхронные
  const comments = await issue.comments(); // Promise<CommentConnection>
  
  this.logger.info("Issue analysis", {
    assignee: assignee?.name,
    team: team.name,
    state: state.name,
    commentCount: comments.totalCount
  });
}
```

### 3. TypeScript Enum поддержка

```typescript
// Строго типизированные enum значения
type WorkflowStateType = "triage" | "backlog" | "unstarted" | "started" | "completed" | "canceled";

// Использование в фильтрах
async getActiveIssues(teamId: string): Promise<Issue[]> {
  return await this.client.issues({
    filter: {
      team: { id: { eq: teamId } },
      state: { 
        type: { 
          nin: ["completed", "canceled"] as WorkflowStateType[] 
        } 
      }
    }
  });
}
```

### 4. Типизированная система приоритетов

```typescript
// Числовая система приоритетов с TypeScript типами
type IssuePriority = 0 | 1 | 2 | 3 | 4;

const PRIORITY_LABELS: Record<IssuePriority, string> = {
  0: "No priority",
  1: "Urgent", 
  2: "High",
  3: "Normal",
  4: "Low"
};

// Использование в коде
function getPriorityLabel(priority: number): string {
  return PRIORITY_LABELS[priority as IssuePriority] || "Unknown";
}
```

### 5. Rich фильтрация с типобезопасностью

```typescript
// Типизированные фильтры
interface IssueFilterInput {
  assignee?: { id?: { eq?: string } };
  team?: { id?: { eq?: string } };
  state?: { type?: { eq?: WorkflowStateType, nin?: WorkflowStateType[] } };
  priority?: { gte?: number, lte?: number };
  createdAt?: { gte?: string, lte?: string };
  and?: IssueFilterInput[];
  or?: IssueFilterInput[];
}

// Сложный поиск с множественными фильтрами
async findIssuesWithComplexFilter(): Promise<Issue[]> {
  const filter: IssueFilterInput = {
    and: [
      { team: { id: { eq: "team-123" } } },
      { state: { type: { eq: "started" } } },
      { priority: { gte: 2 } },  // High or Urgent
      { assignee: { id: { eq: this.config.agentUserId } } }
    ]
  };

  const result = await this.client.issues({
    filter,
    orderBy: "priority",
    first: 50
  });

  return result.nodes;
}
```

### 6. Error Handling и Logging

```typescript
// Типизированная обработка ошибок
async safeOperation<T>(
  operation: () => Promise<T>, 
  context: Record<string, unknown>,
  fallback: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    this.logger.error("Operation failed", error as Error, context);
    return fallback;
  }
}

// Использование
const issue = await this.safeOperation(
  () => this.client.issue(issueId),
  { issueId },
  null
);
```

## Entity Relationships in TypeScript

### Issue as Central Entity

```typescript
// TypeScript representation of relationships
interface IssueRelationships {
  // Direct properties
  id: string;
  title: string;
  
  // Promise-based relationships (lazy loaded)
  assignee?: Promise<User>;
  team: Promise<Team>;
  state: Promise<WorkflowState>;
  creator: Promise<User>;
  
  // Collection relationships
  comments(): Promise<CommentConnection>;
  attachments(): Promise<AttachmentConnection>;
  labels(): Promise<IssueLabelConnection>;
  
  // Parent/child relationships
  parent?: Promise<Issue>;
  children(): Promise<IssueConnection>;
}

// Practical usage example
async function getIssueFullContext(issue: Issue): Promise<IssueContext> {
  const [assignee, team, state, comments] = await Promise.all([
    issue.assignee,
    issue.team,
    issue.state,
    issue.comments()
  ]);
  
  return {
    issue,
    assignee,
    team: team.name,
    state: state.name,
    commentCount: comments.totalCount
  };
}
```

### Organization Hierarchy

```typescript
// TypeScript organization structure
interface OrganizationStructure {
  organization: {
    teams: Promise<TeamConnection>;
  };
  
  team: {
    id: string;
    name: string;
    members(): Promise<UserConnection>;
    issues(filter?: IssueFilter): Promise<IssueConnection>;
    states(): Promise<WorkflowStateConnection>;
  };
}

// Navigation through hierarchy
async function getTeamIssuesSummary(teamId: string): Promise<TeamSummary> {
  const team = await this.client.team(teamId);
  const [issues, members, states] = await Promise.all([
    team.issues({ first: 100 }),
    team.members(),
    team.states()
  ]);
  
  return {
    teamName: team.name,
    totalIssues: issues.totalCount,
    memberCount: members.totalCount,
    workflowStates: states.nodes.map(s => s.name)
  };
}
```

## Key Development Insights

### 1. Architecture Simplification

Since Linear provides clean GraphQL API with TypeScript SDK:

- **Remove Repository patterns** - @linear/sdk handles data access
- **Minimize Service layers** - Direct SDK usage is type-safe
- **Work directly with typed responses** - No manual mapping needed

```typescript
// Direct SDK usage (GOOD)
const issue = await this.client.issue(issueId);
const assignee = await issue.assignee;

// Avoid unnecessary abstraction layers (AVOID)
const issue = await this.repository.findById(issueId);
const assignee = await this.userService.getById(issue.assigneeId);
```

### 2. Rich Filtering Capabilities

Linear provides powerful filtering with full TypeScript support:

```typescript
// Complex filtered queries
const criticalIssues = await this.client.issues({
  filter: {
    and: [
      { priority: { lte: 2 } },  // High or Urgent priority
      { state: { type: { eq: "started" } } },
      { assignee: { isNull: false } }
    ]
  },
  orderBy: "priority",
  first: 50
});
```

### 3. Pagination Best Practices

All collections use cursor-based pagination with configurable limits:

```typescript
// Handle pagination properly
async function getAllTeamIssues(teamId: string): Promise<Issue[]> {
  const allIssues: Issue[] = [];
  let hasNextPage = true;
  let cursor: string | undefined;
  
  while (hasNextPage) {
    const result = await this.client.issues({
      filter: { team: { id: { eq: teamId } } },
      first: 100,
      after: cursor
    });
    
    allIssues.push(...result.nodes);
    hasNextPage = result.pageInfo.hasNextPage;
    cursor = result.pageInfo.endCursor;
  }
  
  return allIssues;
}
```

### 4. Rich Metadata Usage

Linear stores comprehensive metadata - leverage it for insights:

```typescript
interface IssueAnalytics {
  timeToStart: number;      // Time from creation to "started"
  timeToComplete: number;   // Time from "started" to "completed"
  teamVelocity: number;     // Issues completed per cycle
}

async function analyzeIssueMetrics(issue: Issue): Promise<IssueAnalytics> {
  const state = await issue.state;
  const team = await issue.team;
  
  return {
    timeToStart: this.calculateTimeToStart(issue),
    timeToComplete: this.calculateTimeToComplete(issue),
    teamVelocity: await this.calculateTeamVelocity(team)
  };
}
```

### 5. AI Integration Opportunities

Leverage Linear's AI capabilities and extend with custom intelligence:

```typescript
// Detect AI-enabled features
async function checkAICapabilities(team: Team): Promise<AICapabilities> {
  return {
    threadSummariesEnabled: team.aiThreadSummariesEnabled,
    customAIIntegration: this.config.enableCustomAI,
    autoTriage: this.config.enableAutoTriage
  };
}
```

## Recommendations for TypeScript Project

1. **Use @linear/sdk directly** - No need for additional abstraction layers
2. **Leverage TypeScript types** - Full compile-time safety for Linear operations  
3. **Implement proper pagination** - Handle large datasets with cursor-based navigation
4. **Monitor webhook events** - Real-time updates for responsive integration
5. **Extend with AI capabilities** - Build intelligent automation on Linear's foundation

## Integration Architecture

```typescript
// Recommended TypeScript architecture
export class LinearIntegration {
  private client: LinearSDK;
  private webhook: WebhookHandler;
  private ai: AIService;
  
  constructor(config: IntegrationConfig) {
    this.client = new LinearSDK({ apiKey: config.linearApiToken });
    this.webhook = new WebhookHandler(config.webhookSecret);
    this.ai = new AIService(config.openaiApiKey);
  }
  
  // Type-safe Linear operations
  async processIssueEvent(event: LinearWebhookEvent): Promise<void> {
    const issue = await this.client.issue(event.data.id);
    const analysis = await this.ai.analyzeIssue(issue);
    
    if (analysis.requiresAction) {
      await this.triggerClaudeSession(issue, analysis);
    }
  }
}
```

---

**Source**: Real TypeScript Implementation Analysis + Linear GraphQL Schema  
**Technology Stack**: TypeScript/Node.js/@linear/sdk  
**Date**: 2025-08-16
