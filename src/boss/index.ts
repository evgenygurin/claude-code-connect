/**
 * Boss Agent Module - Delegation and Orchestration
 *
 * Exports all Boss Agent functionality:
 * - Types and interfaces
 * - BossAgent class (analysis and delegation)
 * - AgentOrchestrator (execution management)
 * - BossSessionManager (integrated session management)
 */

export type {
  AgentType,
  AgentCapability,
  DelegatedTask,
  TaskStatus,
  TaskResult,
  BossAnalysis,
  TaskBreakdown,
  OrchestrationContext,
  AgentInstance,
  BossAgentConfig,
  OrchestrationStatus,
} from "./types.js";

export { BossAgent } from "./boss-agent.js";
export { AgentOrchestrator } from "./orchestrator.js";
export { BossSessionManager } from "./boss-session-manager.js";
