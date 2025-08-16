# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Markdown Linting Guidelines

- Always ensure headings are surrounded by blank lines to follow the MD022/blanks-around-headings rule
- When using headings, include a blank line before and after the heading to maintain proper markdown formatting

## Markdownlint Warnings and Recommendations

- Always add a blank line before and after headings to comply with MD022/blanks-around-headings
- **Always specify language for ALL fenced code blocks** to resolve MD040/fenced-code-language warnings
- Use specific language identifiers (bash, python, javascript, yaml, toml, json, etc.) for every ```code``` block
- For generic text or output, use ```text``` instead of leaving language unspecified
- **Ensure files end with a single newline character** to resolve MD047/single-trailing-newline warnings
- Surround code blocks and lists with blank lines to meet MD031 and MD032 requirements
- **MD032/blanks-around-lists**: Lists should be surrounded by blank lines

## Memory System Prompt

Follow these steps for each interaction:

1. User Identification:
   - You should assume that you are interacting with default_user
   - If you have not identified default_user, proactively try to do so.

2. Memory Retrieval:
   - Always begin your chat by saying only "Remembering..." and retrieve all relevant information from your knowledge graph
   - Always refer to your knowledge graph as your "memory"

3. Memory:
   - While conversing with the user, be attentive to any new information that falls into these categories:
     a) Basic Identity (age, gender, location, job title, education level, etc.)
     b) Behaviors (interests, habits, etc.)
     c) Preferences (communication style, preferred language, etc.)
     d) Goals (goals, targets, aspirations, etc.)
     e) Relationships (personal and professional relationships up to 3 degrees of separation)

4. Memory Update:
   - If any new information was gathered during the interaction, update your memory as follows:
     a) Create entities for recurring organizations, people, and significant events
     b) Connect them to the current entities using relations
     c) Store facts about them as observations

Memory DB: `.claude/memory.db` (auto-created)

## vercel-mem0 Best Practices

### Auto-Approved Tools (No Confirmation Required)

**Tools that execute without user approval:**

- `mcp__vercel-mem0__add_memory` - Add new memory with content string (AUTO-APPROVED)
- `mcp__vercel-mem0__search_memory` - Semantic search with relevance scoring (AUTO-APPROVED)
- `mcp__vercel-mem0__get_memories` - List all memories with UUID and content (AUTO-APPROVED)
- `mcp__vercel-mem0__retrieve_context` - Retrieve memory context for questions (AUTO-APPROVED)

### Memory Structure

Each memory contains:

- **Content**: Text content (required string parameter)
- **ID**: Auto-generated UUID for unique identification
- **Relevance**: Semantic relevance score when searching (0.0-1.0 range)

### Best Practices for Effective Usage

#### Adding Memories

- **Be specific and descriptive**: Include context, action, and outcome
- **Use consistent formatting**: "Action: Result/Context/Details"
- **Include key metadata**: dates, versions, file paths, error codes
- **Example**: `"Fixed CORS configuration in app/main.py:35-41 - changed from allow_origins=['*'] to specific domains for security"`

#### Searching Memories

- **Use semantic queries**: Search by meaning, not just keywords
- **Combine context terms**: "authentication error JWT token"
- **Trust relevance scores**: 0.6+ usually indicates good matches, 0.4+ for broader context
- **Iterate searches**: Refine queries based on initial results

#### Memory Management

- **Avoid duplicate entries**: Search before adding similar content
- **Use structured content**: Include technical details like file paths, line numbers, error messages
- **Regular cleanup**: Use delete-all-memories sparingly and only when starting fresh
- **Context preservation**: Include enough detail for future reference

#### Security and Privacy

- **No sensitive data**: Never store API keys, passwords, or secrets in memory
- **Anonymize when possible**: Replace specific credentials with placeholders
- **User preferences**: Store user preferences and coding style decisions
- **Project context**: Remember architectural decisions and implementation patterns

#### Integration Patterns

- **Proactive memory**: Store important decisions and fixes immediately
- **Cross-session context**: Use memory to maintain context across different work sessions
- **Error tracking**: Remember common errors and their solutions
- **User preferences**: Store coding preferences, commit guidelines, style choices

### Memory Categories to Track

1. **User Preferences**: Coding style, commit format, architectural choices
2. **Technical Decisions**: Library choices, pattern implementations, configuration settings
3. **Problem Solutions**: Bug fixes, error resolutions, workarounds
4. **Project Context**: Architecture understanding, database schemas, API patterns
5. **Workflow Patterns**: Development processes, testing approaches, deployment steps

### Memory Lifecycle Management

#### Proactive Cleanup Strategies

- **Temporal Relevance Check**: Before using memory, verify timestamps and version relevance
- **Context Validation**: Ensure remembered context matches current project state
- **Outdated Detection**: Flag memories containing deprecated packages, obsolete APIs, or changed file structures
- **Automatic Cleanup**: Remove memories contradicted by new evidence

#### Memory Maintenance Patterns

```bash
# Memory freshness validation patterns:
# 1. Version-based cleanup
- "Fixed issue X in version Y" → outdated when version Z released
- "Library A version 1.0 configuration" → outdated when upgraded to 2.0

# 2. Context drift detection  
- "File located at path/old/structure" → outdated when project restructured
- "Authentication uses JWT tokens" → outdated when switched to OAuth

# 3. Resolution supersession
- "Temporary workaround for bug B" → outdated when proper fix implemented
- "Manual process for task T" → outdated when automation added
```

#### Best Practices for Memory Currency

**Detection Triggers:**

- Version changes in dependencies (`package.json`, `pyproject.toml` updates)
- File structure modifications (directories moved/renamed)
- Architecture changes (new patterns adopted, old ones deprecated)
- Tool/framework upgrades (Python 3.11 → 3.12, FastAPI v1 → v2)

**Cleanup Actions:**

- **Search conflicting memories**: Find outdated entries before adding new ones
- **Replace vs. Supplement**: Replace outdated information rather than adding conflicting entries  
- **Version tagging**: Include version numbers in memory content for future validation
- **Explicit invalidation**: Note when previous approaches are deprecated

**Memory Maintenance Workflow:**

1. **Before adding**: Search for existing related memories
2. **During conflicts**: Identify which memory is more current
3. **After changes**: Update dependent memories that reference changed elements
4. **Periodic review**: Clean memories referencing obsolete tools/versions

#### Obsolescence Indicators

**Code-level Changes:**

- Import statement modifications
- Configuration file schema updates  
- API endpoint changes
- Database schema migrations

**Project-level Changes:**

- Tool version upgrades
- Architecture pattern shifts
- Process improvements
- Team workflow changes

#### Memory Validation Examples

```python
# Good: Version-aware memory
"Fixed CORS in app/main.py:35-41 for FastAPI 0.110.0 - changed allow_origins=['*'] to specific domains"

# Good: Context-aware memory  
"Database connection pool configured in app/core/config.py:44 using Supabase client v2.x async pattern"

# Bad: Version-agnostic memory
"Fixed CORS problem by changing settings" # Too vague, no context

# Bad: Potentially outdated
"Temporary fix for authentication bug" # No indication when it should be replaced
```

### Proactive Memory Usage Rules

#### Automatic Memory Triggers

**CRITICAL BEHAVIORAL PATTERN**: When user mentions previous work or context, IMMEDIATELY use `mcp__vercel-mem0__search-memories` FIRST before responding. Don't wait for explicit instruction to use memory tools.

**Trigger Phrases for Automatic Memory Search:**

- Russian: "освежи память", "вспомни что было", "давай вспомним", "чем мы занимались", "что делали раньше", "предыдущая работа", "до этого", "помнишь", "мы работали с", "продолжаем с того места"
- English: "remember what we did", "refresh memory", "recall previous work", "what were we working on", "continue from where we left", "previous session"

**Expected Behavior:**

1. User mentions context/history → Immediately search memory
2. Use search results to provide informed response
3. Don't ask user to specify memory usage - it should be automatic

**Memory Search Strategy:**

- Use semantic queries combining context keywords
- Trust relevance scores (0.6+ for strong matches)
- Include search results in response context

## GraphQL Integration Notes

- **GraphQL Library Recommendation**: Use `mcp-graphql` for structured GraphQL interactions
- Implement GraphQL rules and guidelines for consistent API design

## MCP-GraphQL Best Practices

### Core MCP GraphQL Tools

**Available Tools:**

- `mcp__mcp-graphql__query-graphql` - Execute GraphQL queries with validation

#### Query Size Control

**⚠️ КРИТИЧЕСКИ ВАЖНО: ВСЕГДА ОГРАНИЧИВАТЬ ЗАПРОСЫ!**

**НИКОГДА НЕ ДЕЛАТЬ List запросы без лимитов - они сжигают ВСЕ токены!**

```graphql
# ❌ СМЕРТЕЛЬНО ОПАСНО: Неограниченные List запросы сжигают ВСЕ токены!
query { BioprojectsList { id bioprojectName } }
query { GeneticDataList { id genomeName } }

# ✅ ПРАВИЛЬНО: List запросы ТОЛЬКО с limit (1-3 записи макс!)
query GetLimitedBioprojects {
  BioprojectsList(limit: 3) {
    id
    bioprojectName
  }
}
```

**ЗАПОМНИ НАВСЕГДА:**

- List без limit = КАТАСТРОФА, ВСЕ ТОКЕНЫ СГОРЯТ
- ВСЕГДА используй limit: 1-3 для List запросов  
- ById запросы - самые безопасные
- Page запросы НЕ РАБОТАЮТ (серверная ошибка)

### Методология отладки (проверенная на практике)

#### ЗОЛОТОЕ ПРАВИЛО: Структура ПЕРЕД Данными

**⚡ ВСЕГДА выполняй type introspection ПЕРЕД запросом данных!**

```graphql
# ✅ ПРАВИЛЬНЫЙ ПОРЯДОК:
# 1. СНАЧАЛА узнаем структуру
query Step1_CheckStructure {
  __type(name: "ТипДанных") {
    fields {
      name
      type { name kind }
    }
  }
}

# 2. ПОТОМ запрашиваем данные с правильными полями
query Step2_GetData {
  EntityById(id: "...") {
    correctFieldName1
    correctFieldName2
  }
}
```

#### Алгоритм исправления любой ошибки поля

1. **Увидели FieldUndefined** → копируем имя типа из ошибки
2. **Запускаем type introspection** → находим все доступные поля
3. **Сравниваем** expected vs actual имена полей
4. **Исправляем запрос** с правильными именами
5. **Повторяем** → должно работать

#### Готовый шаблон для отладки

```graphql
# При любой ошибке поля - подставляем тип
query DebugFieldsFor_ТИПИЗОШИБКИ {
  __type(name: "ТИПИЗОШИБКИ") {
    fields {
      name
      type { name kind }
    }
  }
}
```

## ⚠️ КРИТИЧЕСКИЕ ПРАВИЛА: Предотвращение Fatal Ошибок

### 🚨 ПРАВИЛО №1: НИКОГДА не угадывать имена запросов

**ПРОБЛЕМА:** Использование `BioprojectById` вместо `BioprojectsById`

**РЕШЕНИЕ:** ВСЕГДА сначала проверять доступные query поля:

```graphql
# ✅ ОБЯЗАТЕЛЬНО перед первым запросом к новой сущности:
query CheckAvailableQueries {
  __schema {
    queryType {
      fields(includeDeprecated: false) {
        name
        type { name kind }
      }
    }
  }
}
```

**ЗОЛОТОЕ ПРАВИЛО:** Если не знаешь точное имя запроса → сначала проверь schema!

### 🚨 ПРАВИЛО №2: ВСЕГДА ограничивать introspection запросы

**ПРОБЛЕМА:** Запрос полной схемы без ограничений → 67k токенов > 25k лимит

**РЕШЕНИЕ:** Использовать фильтрацию для introspection:

```graphql
# ❌ ОПАСНО: Полная схема без фильтров
query { __schema { queryType { fields { name type { name } } } } }

# ✅ БЕЗОПАСНО: Ограниченные запросы
query CheckSpecificType {
  __type(name: "ConcreteTypeName") {
    fields(includeDeprecated: false) {
      name
      type { name kind }
    }
  }
}

# ✅ БЕЗОПАСНО: Ограниченный список query полей  
query CheckQueryFields {
  __schema {
    queryType {
      fields(includeDeprecated: false) {
        name
        type { name }
      }
    }
  }
}
```

### 🚨 ПРАВИЛО №3: Система проверки перед действием

**ОБЯЗАТЕЛЬНАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ:**

1. **Проверка доступности** → `__schema.queryType.fields` (ограниченно)
2. **Проверка структуры** → `__type(name: "TypeName").fields` (конкретный тип)
3. **Выполнение запроса** → с проверенными именами полей

### 🚨 ПРАВИЛО №4: Максимальные размеры запросов

**ЖЕСТКИЕ ЛИМИТЫ:**

- **List queries**: ВСЕГДА `limit: 1-3` (не больше!)
- **Type introspection**: ТОЛЬКО конкретные типы, НЕ полная схема
- **Query fields**: ТОЛЬКО `fields(includeDeprecated: false)` с фильтрацией
- **Любой introspection**: Проверять размер ответа < 20k токенов

### 🚨 ПРАВИЛО №6: ОБЯЗАТЕЛЬНАЯ проверка полей в связанных объектах

**КРИТИЧЕСКАЯ ОШИБКА:** Угадывание имен полей в связанных типах

```graphql
# ❌ ОШИБКА: Угадывание имен полей в связанных объектах
query GetBioproject {
  BioprojectsById(id: "...") {
    bioprojectStatus_obj {
      statusName    # ❌ ПОЛЕ НЕ СУЩЕСТВУЕТ!
    }
  }
}

# ✅ ПРАВИЛЬНО: Сначала проверяем структуру связанного типа
query DebugRelatedType {
  __type(name: "Statuses") {
    fields { name type { name } }
  }
}

# ✅ ПРАВИЛЬНО: Используем реальные поля
query GetBioproject {
  BioprojectsById(id: "...") {
    bioprojectStatus_obj {
      name          # ✅ ПРАВИЛЬНОЕ ПОЛЕ
      code
    }
  }
}
```

**ОБЯЗАТЕЛЬНЫЙ АЛГОРИТМ для связанных объектов:**

1. **Увидел `_obj` поле** → определи тип связанного объекта
2. **Запусти introspection** для этого типа: `__type(name: "RelatedTypeName")`
3. **Найди реальные поля** в связанном объекте
4. **Используй проверенные имена** в запросе

**Проверенные связанные типы:**

- `bioprojectStatus_obj` → тип `Statuses` → поля: `name`, `code`, `entity`
- `bioobjectId_obj` → тип `Bioobjects` → поля: `bioobjectName`
- `biosampleId_obj` → тип `Biosamples` → может быть `null`
