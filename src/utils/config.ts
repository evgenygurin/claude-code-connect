/**
 * Configuration loading and validation utilities
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { IntegrationConfig } from "../core/types.js";

/**
 * Environment variable mapping
 */
const ENV_MAPPING = {
  linearApiToken: "LINEAR_API_TOKEN",
  linearOrganizationId: "LINEAR_ORGANIZATION_ID",
  agentUserId: "CLAUDE_AGENT_USER_ID",
  webhookSecret: "LINEAR_WEBHOOK_SECRET",
  projectRootDir: "PROJECT_ROOT_DIR",
  defaultBranch: "DEFAULT_BRANCH",
  createBranches: "CREATE_BRANCHES",
  webhookPort: "WEBHOOK_PORT",
  claudeExecutablePath: "CLAUDE_EXECUTABLE_PATH",
  timeoutMinutes: "SESSION_TIMEOUT_MINUTES",
  debug: "DEBUG",
} as const;

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<IntegrationConfig> = {
  defaultBranch: "main",
  createBranches: true,
  webhookPort: 3000,
  claudeExecutablePath: "claude",
  timeoutMinutes: 30,
  debug: false,
};

/**
 * Load configuration from environment variables and .env file
 */
export function loadConfig(configPath?: string): IntegrationConfig {
  // Load .env file if it exists
  loadDotEnv(configPath);

  const config: Partial<IntegrationConfig> = { ...DEFAULT_CONFIG };

  // Load from environment variables
  for (const [configKey, envKey] of Object.entries(ENV_MAPPING)) {
    const envValue = process.env[envKey];
    if (envValue !== undefined) {
      (config as any)[configKey] = parseEnvValue(envValue, configKey);
    }
  }

  // Validate required fields
  validateConfig(config);

  return config as IntegrationConfig;
}

/**
 * Load .env file if it exists
 */
function loadDotEnv(configPath?: string): void {
  const envPath = configPath || join(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return;
  }

  try {
    const envContent = readFileSync(envPath, "utf-8");
    const lines = envContent.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } catch (error) {
    console.warn("Failed to load .env file:", error);
  }
}

/**
 * Parse environment variable value based on config key
 */
function parseEnvValue(value: string, configKey: string): any {
  switch (configKey) {
    case "createBranches":
    case "debug":
      return value.toLowerCase() === "true" || value === "1";

    case "webhookPort":
    case "timeoutMinutes": {
      const numValue = parseInt(value, 10);
      if (isNaN(numValue)) {
        throw new Error(`Invalid number value for ${configKey}: ${value}`);
      }
      return numValue;
    }

    default:
      return value;
  }
}

/**
 * Validate required configuration
 */
function validateConfig(config: Partial<IntegrationConfig>): void {
  const errors: string[] = [];

  // Required fields
  const required = [
    "linearApiToken",
    "linearOrganizationId",
    "projectRootDir",
  ] as const;

  for (const field of required) {
    if (!config[field]) {
      errors.push(`${ENV_MAPPING[field]} is required`);
    }
  }

  // Validate paths
  if (config.projectRootDir && !existsSync(config.projectRootDir)) {
    errors.push(
      `Project root directory does not exist: ${config.projectRootDir}`,
    );
  }

  // Validate port
  if (
    config.webhookPort &&
    (config.webhookPort < 1 || config.webhookPort > 65535)
  ) {
    errors.push(`Invalid webhook port: ${config.webhookPort}`);
  }

  // Validate timeout
  if (config.timeoutMinutes && config.timeoutMinutes < 1) {
    errors.push(`Invalid timeout minutes: ${config.timeoutMinutes}`);
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`,
    );
  }
}

/**
 * Create example .env file content
 */
export function createExampleEnv(): string {
  return `# Claude Code + Linear Integration Configuration

# Required: Linear API token (get from https://linear.app/settings/account/security)
LINEAR_API_TOKEN=your_linear_api_token_here

# Required: Linear organization ID (find in Linear settings)
LINEAR_ORGANIZATION_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Required: Path to your project directory
PROJECT_ROOT_DIR=/path/to/your/project

# Optional: Claude agent user ID (auto-detected if not set)
# CLAUDE_AGENT_USER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Optional: Webhook secret for Linear webhook verification
# LINEAR_WEBHOOK_SECRET=your-webhook-secret

# Optional: Git branch configuration
DEFAULT_BRANCH=main
CREATE_BRANCHES=true

# Optional: Server configuration
WEBHOOK_PORT=3000
SESSION_TIMEOUT_MINUTES=30

# Optional: Claude executable path (if not in PATH)
# CLAUDE_EXECUTABLE_PATH=/usr/local/bin/claude

# Optional: Debug logging
DEBUG=false
`;
}

/**
 * Print configuration summary (without sensitive data)
 */
export function printConfigSummary(config: IntegrationConfig): void {
  console.log("Configuration Summary:");
  console.log(`  Linear Organization: ${config.linearOrganizationId}`);
  console.log(`  Project Root: ${config.projectRootDir}`);
  console.log(`  Default Branch: ${config.defaultBranch}`);
  console.log(`  Create Branches: ${config.createBranches}`);
  console.log(`  Webhook Port: ${config.webhookPort}`);
  console.log(`  Session Timeout: ${config.timeoutMinutes} minutes`);
  console.log(`  Claude Executable: ${config.claudeExecutablePath}`);
  console.log(`  Debug Mode: ${config.debug}`);
  console.log(`  Has API Token: ${config.linearApiToken ? "✓" : "✗"}`);
  console.log(`  Has Webhook Secret: ${config.webhookSecret ? "✓" : "✗"}`);
  console.log(`  Has Agent User ID: ${config.agentUserId ? "✓" : "✗"}`);
}
