/**
 * Boss Agent - Delegation System
 *
 * The Boss Agent system enables automatic task delegation to specialized sub-agents
 * for handling complex tasks that require multiple steps or different areas of expertise.
 */

export { BossAgentOrchestrator } from "./orchestrator.js";
export { TaskAnalyzer } from "./task-analyzer.js";
export { TaskDecomposer } from "./task-decomposer.js";
export { AgentRegistry } from "./agent-registry.js";
export { DelegationManager } from "./delegation-manager.js";
export { ResultAggregator } from "./result-aggregator.js";

export type { AgentDefinition } from "./agent-registry.js";
export type { BossAgentEvents } from "./orchestrator.js";
export type { DelegationManagerEvents } from "./delegation-manager.js";
