/**
 * MCP Linear configuration
 */

import type { MCPConfig } from "@anthropic-ai/claude-code";
import type { IntegrationConfig } from "../core/types.js";

/**
 * Linear MCP tool names
 */
export const LinearMCPTools = {
  // Viewer operations
  GET_VIEWER: "mcp__linear__linear_getViewer",

  // Issue operations
  GET_ISSUES: "mcp__linear__linear_getIssues",
  GET_ISSUE: "mcp__linear__linear_getIssue",
  CREATE_ISSUE: "mcp__linear__linear_createIssue",
  UPDATE_ISSUE: "mcp__linear__linear_updateIssue",

  // Comment operations
  CREATE_COMMENT: "mcp__linear__linear_createComment",
  GET_ISSUE_COMMENTS: "mcp__linear__linear_getIssueComments",

  // Team operations
  GET_TEAMS: "mcp__linear__linear_getTeams",

  // State operations
  GET_ISSUE_STATES: "mcp__linear__linear_getIssueStates",

  // Label operations
  GET_ISSUE_LABELS: "mcp__linear__linear_getIssueLabels",

  // User operations
  GET_ASSIGNEES: "mcp__linear__linear_getAssignees",

  // Project operations
  GET_PROJECTS: "mcp__linear__linear_getProjects",

  // Cycle operations
  GET_CYCLES: "mcp__linear__linear_getCycles",
  GET_ACTIVE_CYCLE: "mcp__linear__linear_getActiveCycle",
  GET_CYCLE_ISSUES: "mcp__linear__linear_getCycleIssues",
  ASSIGN_ISSUE_TO_CYCLE: "mcp__linear__linear_assignIssueToCycle",
};

/**
 * Default allowed Linear MCP tools
 */
export const DEFAULT_LINEAR_MCP_TOOLS = [
  LinearMCPTools.GET_VIEWER,
  LinearMCPTools.GET_ISSUES,
  LinearMCPTools.GET_ISSUE,
  LinearMCPTools.CREATE_COMMENT,
  LinearMCPTools.GET_ISSUE_COMMENTS,
  LinearMCPTools.UPDATE_ISSUE,
  LinearMCPTools.GET_TEAMS,
  LinearMCPTools.GET_ISSUE_STATES,
];

/**
 * Create MCP configuration for Linear
 */
export function createLinearMCPConfig(
  config: IntegrationConfig,
  additionalTools: string[] = [],
): MCPConfig {
  return {
    linear: {
      type: "stdio",
      command: "npx",
      args: ["-y", "@tacticlaunch/mcp-linear"],
      env: {
        LINEAR_API_TOKEN: config.linearApiToken,
      },
    },
  };
}

/**
 * Get allowed tools for Linear MCP
 */
export function getLinearAllowedTools(
  additionalTools: string[] = [],
): string[] {
  // Standard Claude tools
  const standardTools = ["Read", "Edit", "Task", "Bash"];

  // Combine standard tools, default Linear tools, and additional tools
  return [...standardTools, ...DEFAULT_LINEAR_MCP_TOOLS, ...additionalTools];
}
