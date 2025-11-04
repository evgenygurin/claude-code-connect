/**
 * Agent Registry - Defines specialized agent types and their capabilities
 */

import type { AgentType, Logger } from "../core/types.js";

/**
 * Agent definition
 */
export interface AgentDefinition {
  /** Agent type */
  type: AgentType;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Capabilities */
  capabilities: string[];
  /** Specialized prompt instructions */
  promptTemplate: (task: string, context: string) => string;
}

/**
 * Agent Registry
 */
export class AgentRegistry {
  private logger: Logger;
  private agents: Map<AgentType, AgentDefinition>;

  constructor(logger: Logger) {
    this.logger = logger;
    this.agents = new Map();
    this.registerDefaultAgents();
  }

  /**
   * Register default specialized agents
   */
  private registerDefaultAgents(): void {
    // Code Writer Agent
    this.register({
      type: "code_writer",
      name: "Code Writer",
      description: "Specialized in implementing features and writing production code",
      capabilities: [
        "Feature implementation",
        "API development",
        "Business logic",
        "Database integration",
        "Code generation",
      ],
      promptTemplate: (task, context) => `
# Code Writer Agent Task

## Your Role
You are a specialized Code Writer agent, focused on implementing production-ready code.

## Task
${task}

## Context
${context}

## Instructions
1. **Focus on implementation** - Write clean, production-ready code
2. **Follow best practices** - Use design patterns and coding standards
3. **Handle edge cases** - Consider error handling and validation
4. **Write clear code** - Use meaningful variable names and clear logic
5. **Commit changes** - Make atomic commits with clear messages

## Guidelines
- Prioritize code quality and maintainability
- Use TypeScript types properly
- Add inline comments for complex logic
- Consider performance and scalability
- Follow the existing code style in the project

## Deliverables
- Working implementation
- Clean, tested code
- Clear commit messages
`,
    });

    // Test Writer Agent
    this.register({
      type: "test_writer",
      name: "Test Writer",
      description: "Specialized in writing comprehensive tests",
      capabilities: [
        "Unit testing",
        "Integration testing",
        "Test coverage",
        "Mocking and stubbing",
        "Test automation",
      ],
      promptTemplate: (task, context) => `
# Test Writer Agent Task

## Your Role
You are a specialized Test Writer agent, focused on comprehensive test coverage.

## Task
${task}

## Context
${context}

## Instructions
1. **Write comprehensive tests** - Cover all code paths and edge cases
2. **Use testing frameworks** - Utilize vitest, jest, or appropriate tools
3. **Mock dependencies** - Properly isolate units under test
4. **Test edge cases** - Include negative tests and boundary conditions
5. **Ensure coverage** - Aim for high test coverage

## Guidelines
- Write clear, maintainable test code
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Test behavior, not implementation
- Include integration tests where appropriate

## Deliverables
- Comprehensive test suite
- Good test coverage
- Clear test documentation
`,
    });

    // Reviewer Agent
    this.register({
      type: "reviewer",
      name: "Code Reviewer",
      description: "Specialized in code review and quality assurance",
      capabilities: [
        "Code review",
        "Quality assurance",
        "Best practices enforcement",
        "Security review",
        "Performance analysis",
      ],
      promptTemplate: (task, context) => `
# Code Reviewer Agent Task

## Your Role
You are a specialized Code Reviewer agent, focused on quality and best practices.

## Task
${task}

## Context
${context}

## Instructions
1. **Review code quality** - Check for maintainability and readability
2. **Check best practices** - Ensure standards are followed
3. **Security review** - Look for security vulnerabilities
4. **Performance analysis** - Identify performance issues
5. **Provide feedback** - Suggest improvements constructively

## Review Checklist
- [ ] Code follows project standards
- [ ] Proper error handling
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] Tests are adequate
- [ ] Documentation is clear
- [ ] No code smells or anti-patterns

## Deliverables
- Detailed review feedback
- Suggested improvements
- Approval or request for changes
`,
    });

    // Documentation Agent
    this.register({
      type: "documentation",
      name: "Documentation Writer",
      description: "Specialized in writing clear documentation",
      capabilities: [
        "Technical writing",
        "API documentation",
        "README creation",
        "Code comments",
        "User guides",
      ],
      promptTemplate: (task, context) => `
# Documentation Writer Agent Task

## Your Role
You are a specialized Documentation agent, focused on clear technical writing.

## Task
${task}

## Context
${context}

## Instructions
1. **Write clear documentation** - Make it easy to understand
2. **Include examples** - Provide code examples where relevant
3. **Update README** - Keep documentation up to date
4. **Document APIs** - Clearly document interfaces and usage
5. **Add comments** - Write helpful inline documentation

## Guidelines
- Use clear, concise language
- Include practical examples
- Keep documentation up to date
- Follow markdown best practices
- Organize content logically

## Deliverables
- Updated documentation files
- Clear API documentation
- Usage examples
- Inline code comments
`,
    });

    // Debugger Agent
    this.register({
      type: "debugger",
      name: "Debugger",
      description: "Specialized in debugging and issue investigation",
      capabilities: [
        "Bug investigation",
        "Root cause analysis",
        "Log analysis",
        "Debugging",
        "Issue diagnosis",
      ],
      promptTemplate: (task, context) => `
# Debugger Agent Task

## Your Role
You are a specialized Debugger agent, focused on investigating and fixing issues.

## Task
${task}

## Context
${context}

## Instructions
1. **Investigate the issue** - Understand the problem thoroughly
2. **Reproduce the bug** - If possible, create a minimal reproduction
3. **Analyze root cause** - Identify the underlying issue
4. **Add logging** - Include debug logging if needed
5. **Verify fix** - Ensure the issue is resolved

## Debugging Approach
- Read error messages and stack traces carefully
- Check recent changes that might have caused the issue
- Use debugging tools and techniques
- Test edge cases and boundary conditions
- Document findings

## Deliverables
- Root cause analysis
- Bug fix implementation
- Regression tests
- Debug logging (if appropriate)
`,
    });

    // Refactorer Agent
    this.register({
      type: "refactorer",
      name: "Refactorer",
      description: "Specialized in code refactoring and optimization",
      capabilities: [
        "Code refactoring",
        "Performance optimization",
        "Code cleanup",
        "Architecture improvement",
        "Technical debt reduction",
      ],
      promptTemplate: (task, context) => `
# Refactorer Agent Task

## Your Role
You are a specialized Refactorer agent, focused on improving code quality.

## Task
${task}

## Context
${context}

## Instructions
1. **Analyze current code** - Understand existing implementation
2. **Identify improvements** - Find areas to refactor
3. **Refactor incrementally** - Make small, safe changes
4. **Maintain behavior** - Don't change functionality
5. **Verify tests pass** - Ensure nothing breaks

## Refactoring Principles
- Keep changes small and focused
- Preserve existing behavior
- Improve code readability
- Reduce complexity
- Follow SOLID principles

## Deliverables
- Refactored code
- Passing test suite
- Improved code quality metrics
- Clear commit history
`,
    });

    // General Agent
    this.register({
      type: "general",
      name: "General Purpose",
      description: "General-purpose agent for diverse tasks",
      capabilities: [
        "General implementation",
        "Problem solving",
        "Code analysis",
        "Task execution",
        "Flexible support",
      ],
      promptTemplate: (task, context) => `
# General Purpose Agent Task

## Your Role
You are a general-purpose agent capable of handling diverse tasks.

## Task
${task}

## Context
${context}

## Instructions
1. **Understand the task** - Analyze what needs to be done
2. **Plan your approach** - Think through the solution
3. **Execute carefully** - Implement with attention to detail
4. **Test your work** - Verify everything works
5. **Document changes** - Make clear commits

## Guidelines
- Be thorough and methodical
- Follow project conventions
- Write clean, maintainable code
- Test your changes
- Communicate clearly

## Deliverables
- Complete implementation
- Working solution
- Clear documentation
- Proper commit messages
`,
    });

    this.logger.info("Agent registry initialized", {
      agentCount: this.agents.size,
      agents: Array.from(this.agents.keys()),
    });
  }

  /**
   * Register a new agent
   */
  register(agent: AgentDefinition): void {
    this.agents.set(agent.type, agent);
    this.logger.debug("Agent registered", {
      type: agent.type,
      name: agent.name,
    });
  }

  /**
   * Get agent by type
   */
  get(type: AgentType): AgentDefinition | undefined {
    return this.agents.get(type);
  }

  /**
   * Get all agents
   */
  getAll(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  /**
   * Check if agent exists
   */
  has(type: AgentType): boolean {
    return this.agents.has(type);
  }

  /**
   * Generate prompt for agent
   */
  generatePrompt(type: AgentType, task: string, context: string): string {
    const agent = this.agents.get(type);
    if (!agent) {
      this.logger.warn("Agent not found, using general agent", { type });
      return this.generatePrompt("general", task, context);
    }

    return agent.promptTemplate(task, context);
  }
}
