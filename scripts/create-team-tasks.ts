/**
 * Create Linear tasks for team to fix remaining test issues
 */

import { LinearClient } from "@linear/sdk";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface TaskData {
  title: string;
  description: string;
  priority: number;
  labels: string[];
  estimate: number;
  assigneeEmail?: string;
}

const tasks: TaskData[] = [
  {
    title: "🔧 Fix Agent Scenarios Integration Tests (High Priority)",
    description: `**Задача**: Исправить интеграционные тесты в src/testing/agent-scenarios.test.ts

**Проблемы**:
- Все тесты падают из-за неправильной настройки моков
- Проблемы с SessionManager integration
- Нужно адаптировать к новой архитектуре test-utils

**Файлы для исправления**:
- \`src/testing/agent-scenarios.test.ts\`
- \`src/testing/workflow.test.ts\`

**План действий**:
1. Проанализировать ошибки тестов
2. Обновить моки в соответствии с test-utils.ts
3. Исправить интеграционные паттерны
4. Убедиться, что все сценарии работают

**Критерии готовности**:
- Все тесты в agent-scenarios.test.ts проходят
- Покрытие кода не снижается
- Документация обновлена

**Приоритет**: HIGH - блокирует CI/CD`,
    priority: 2,
    labels: ["testing", "integration", "high-priority", "bug"],
    estimate: 8,
    assigneeEmail: "developer1@team.local"
  },
  
  {
    title: "🧪 Fix Integration Test Framework Issues",
    description: `**Задача**: Исправить проблемы с интеграционными тестами

**Проблемы**:
- src/testing/integration.test.ts падает
- Vitest internal state access errors
- Transform errors в webhook handler tests

**Файлы для исправления**:
- \`src/testing/integration.test.ts\`
- \`src/testing/run-integration-tests.ts\`

**План действий**:
1. Исправить Vitest configuration issues
2. Решить проблемы с internal state access
3. Обновить интеграционные тесты под новую архитектуру
4. Убедиться в стабильности CI

**Критерии готовности**:
- integration.test.ts полностью проходит
- Нет ошибок transform/configuration
- Интеграционные тесты стабильны

**Приоритет**: HIGH - критично для CI`,
    priority: 2,
    labels: ["testing", "vitest", "integration", "framework"],
    estimate: 6,
    assigneeEmail: "developer2@team.local"
  },

  {
    title: "⚙️ Fix Remaining Unit Test Issues",
    description: `**Задача**: Исправить оставшиеся проблемы unit тестов

**Проблемы**:
- Branch name generation тесты падают в SessionManager
- Несколько webhook handler тестов требуют доработки
- Проблемы с mock cleanup

**Файлы для исправления**:
- \`src/sessions/manager.test.ts\` (branch generation)
- \`src/webhooks/handler.test.ts\` (remaining failures)
- \`src/utils/*.test.ts\` (config validation)

**План действий**:
1. Исправить branch name generation тесты
2. Довести до конца webhook handler тесты
3. Убедиться в правильной настройке моков
4. Проверить все edge cases

**Критерии готовности**:
- Все unit тесты проходят (100%)
- Моки настроены правильно
- Edge cases покрыты

**Приоритет**: MEDIUM - завершающий этап`,
    priority: 3,
    labels: ["testing", "unit-tests", "mocks", "cleanup"],
    estimate: 4,
    assigneeEmail: "developer3@team.local"
  },

  {
    title: "📊 Test Coverage Analysis & Optimization",
    description: `**Задача**: Проанализировать и оптимизировать покрытие тестов

**Цели**:
- Достичь 80%+ покрытия кода тестами
- Убедиться в качестве существующих тестов
- Оптимизировать производительность тест-сьюта

**План действий**:
1. Запустить анализ покрытия: \`npm run test:coverage\`
2. Определить области с низким покрытием
3. Написать недостающие тесты
4. Оптимизировать медленные тесты
5. Создать отчет о покрытии

**Файлы для анализа**:
- Все файлы в \`src/\` без достаточного покрытия
- Критические пути (security, core logic)

**Критерии готовности**:
- Покрытие тестами >= 80%
- Все критические функции покрыты
- Тесты выполняются < 30 секунд
- Создан coverage report

**Приоритет**: MEDIUM - качество кода`,
    priority: 3,
    labels: ["testing", "coverage", "optimization", "quality"],
    estimate: 5,
    assigneeEmail: "developer4@team.local"
  }
];

async function createTeamTasks() {
  const apiKey = process.env.LINEAR_API_TOKEN;
  const orgId = process.env.LINEAR_ORGANIZATION_ID;
  
  if (!apiKey || !orgId) {
    console.error("❌ Missing LINEAR_API_TOKEN or LINEAR_ORGANIZATION_ID");
    process.exit(1);
  }

  const linear = new LinearClient({ apiKey });

  try {
    console.log("🔍 Getting team information...");
    
    // Get team (assuming first team for now)
    const teams = await linear.teams();
    const team = teams.nodes[0];
    
    if (!team) {
      console.error("❌ No teams found");
      process.exit(1);
    }

    console.log(`📋 Creating tasks for team: ${team.name}`);
    console.log(`🎯 Total tasks to create: ${tasks.length}\n`);

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      
      console.log(`⏳ Creating task ${i + 1}/${tasks.length}: ${task.title}`);
      
      try {
        const issue = await linear.createIssue({
          teamId: team.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          estimate: task.estimate,
          // Note: Labels would need to be created first in real scenario
          // For now, just create without labels
        });

        if (issue.success) {
          console.log(`✅ Created: ${issue.issue?.identifier} - ${task.title}`);
          console.log(`   🔗 URL: ${issue.issue?.url}`);
          console.log(`   👤 Assigned to: ${task.assigneeEmail || 'Unassigned'}`);
          console.log(`   📊 Estimate: ${task.estimate} points\n`);
        } else {
          console.error(`❌ Failed to create task: ${task.title}`);
        }
      } catch (error) {
        console.error(`❌ Error creating task "${task.title}":`, error);
      }
    }

    console.log("🎉 Team task creation completed!");
    console.log("\n📋 **TASK DISTRIBUTION SUMMARY**:");
    console.log("================================");
    
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title}`);
      console.log(`   👤 Assignee: ${task.assigneeEmail || 'Unassigned'}`);
      console.log(`   📊 Estimate: ${task.estimate} points`);
      console.log(`   🎯 Priority: ${task.priority === 1 ? 'URGENT' : task.priority === 2 ? 'HIGH' : 'MEDIUM'}`);
      console.log("");
    });

    console.log("🚀 **NEXT STEPS**:");
    console.log("- Assign tasks to team members");
    console.log("- Set up Linear notifications");
    console.log("- Create sprint/milestone for tracking");
    console.log("- Monitor progress daily");

  } catch (error) {
    console.error("❌ Failed to create team tasks:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createTeamTasks();
}