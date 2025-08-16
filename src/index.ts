#!/usr/bin/env node

/**
 * Claude Code + Linear Integration - Main Entry Point
 * 
 * This is a native implementation that connects Claude Code with Linear
 * without requiring external services like Cyrus (which needs a customer ID).
 * 
 * Features:
 * - Webhook handling for Linear events
 * - Automatic Claude Code session management
 * - Git branch creation and management
 * - Session cleanup and monitoring
 * - RESTful API for integration management
 */

import { writeFileSync, existsSync } from "fs";
import { join } from "path";
import { IntegrationServer } from "./server/integration.js";
import { loadConfig, createExampleEnv, printConfigSummary } from "./utils/config.js";
import { createLogger } from "./utils/logger.js";

/**
 * CLI command interface
 */
interface Command {
  name: string;
  description: string;
  handler: (args: string[]) => Promise<void>;
}

/**
 * Available CLI commands
 */
const commands: Command[] = [
  {
    name: "start",
    description: "Start the integration server",
    handler: startCommand
  },
  {
    name: "init",
    description: "Initialize configuration (.env file)",
    handler: initCommand
  },
  {
    name: "test",
    description: "Test Linear API connection",
    handler: testCommand
  },
  {
    name: "help",
    description: "Show help information",
    handler: helpCommand
  }
];

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const commandName = args[0] || "start";

  // Find and execute command
  const command = commands.find(cmd => cmd.name === commandName);
  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    await helpCommand();
    process.exit(1);
  }

  try {
    await command.handler(args.slice(1));
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Start the integration server
 */
async function startCommand(args: string[]): Promise<void> {
  const logger = createLogger(process.env["DEBUG"] === "true");
  
  logger.info("🚀 Starting Claude Code + Linear Integration");
  
  try {
    // Load configuration
    const configPath = args.find(arg => arg.startsWith("--config="))?.split("=")[1];
    const config = loadConfig(configPath);
    
    if (config.debug) {
      printConfigSummary(config);
    }

    // Create and start server
    const server = new IntegrationServer(config);
    await server.start();

    logger.info("✅ Integration server is running");
    logger.info(`📡 Webhook endpoint: http://localhost:${config.webhookPort}/webhooks/linear`);
    logger.info(`📊 Management API: http://localhost:${config.webhookPort}/`);
    logger.info("Press Ctrl+C to stop");

    // Keep the process alive
    process.on("SIGINT", () => {
      logger.info("Received SIGINT, shutting down gracefully...");
      server.stop().then(() => {
        logger.info("Server stopped");
        process.exit(0);
      }).catch((error) => {
        logger.error("Error during shutdown", error);
        process.exit(1);
      });
    });

  } catch (error) {
    logger.error("Failed to start server", error as Error);
    process.exit(1);
  }
}

/**
 * Initialize configuration
 */
async function initCommand(args: string[]): Promise<void> {
  const force = args.includes("--force");
  const envPath = join(process.cwd(), ".env");

  if (existsSync(envPath) && !force) {
    console.log("❌ .env file already exists");
    console.log("Use --force to overwrite");
    return;
  }

  try {
    const exampleEnv = createExampleEnv();
    writeFileSync(envPath, exampleEnv, "utf-8");
    
    console.log("✅ Created .env configuration file");
    console.log(`📝 Edit ${envPath} with your Linear API token and settings`);
    console.log("");
    console.log("Required steps:");
    console.log("1. Get Linear API token: https://linear.app/settings/account/security");
    console.log("2. Find your organization ID in Linear settings");
    console.log("3. Set PROJECT_ROOT_DIR to your project path");
    console.log("4. Configure webhook endpoint in Linear:");
    console.log("   https://linear.app/[your-org]/settings/account/webhooks");
    console.log("");
    console.log("Then run: npm start");
    
  } catch (error) {
    console.error("Failed to create .env file:", error);
    process.exit(1);
  }
}

/**
 * Test Linear connection
 */
async function testCommand(args: string[]): Promise<void> {
  const logger = createLogger(true);
  
  try {
    logger.info("🔍 Testing Linear API connection...");
    
    const configPath = args.find(arg => arg.startsWith("--config="))?.split("=")[1];
    const config = loadConfig(configPath);
    
    // Import here to avoid loading dependencies for init command
    const { LinearClient } = await import("./linear/client.js");
    const client = new LinearClient(config, logger);
    
    // Test connection
    const user = await client.getCurrentUser();
    logger.info("✅ Linear connection successful");
    logger.info(`👤 Authenticated as: ${user.name} (${user.email})`);
    
    // Test organization access via teams
    logger.info("🔐 Testing organization access...");
    const { LinearClient: LinearSDK } = await import("@linear/sdk");
    const sdk = new LinearSDK({ apiKey: config.linearApiToken });
    
    const teams = await sdk.teams();
    logger.info(`📋 Found ${teams.nodes.length} teams`);
    
    if (teams.nodes.length === 0) {
      logger.warn("⚠️  No teams found - check Linear API token permissions");
    } else {
      // Show organization info via first team
      const firstTeam = teams.nodes[0];
      const organization = await firstTeam.organization;
      logger.info(`🏢 Organization: ${organization.name}`);
    }
    
    logger.info("🎉 All tests passed!");
    
  } catch (error) {
    logger.error("❌ Test failed", error as Error);
    console.log("");
    console.log("Common issues:");
    console.log("• Invalid LINEAR_API_TOKEN");
    console.log("• Incorrect LINEAR_ORGANIZATION_ID"); 
    console.log("• Missing .env file (run: npm run init)");
    console.log("• Network connectivity issues");
    process.exit(1);
  }
}

/**
 * Show help information
 */
async function helpCommand(): Promise<void> {
  console.log("Claude Code + Linear Integration");
  console.log("");
  console.log("A native implementation for connecting Claude Code with Linear");
  console.log("without requiring external services or customer IDs.");
  console.log("");
  console.log("Usage:");
  console.log("  npm start [command] [options]");
  console.log("");
  console.log("Commands:");
  for (const cmd of commands) {
    console.log(`  ${cmd.name.padEnd(12)} ${cmd.description}`);
  }
  console.log("");
  console.log("Options:");
  console.log("  --config=path    Use custom configuration file");
  console.log("  --force          Force overwrite (for init command)");
  console.log("");
  console.log("Examples:");
  console.log("  npm run init                 # Initialize .env configuration");
  console.log("  npm start                    # Start the integration server");
  console.log("  npm run test                 # Test Linear API connection");
  console.log("  npm start start --config=.env.prod  # Use custom config");
  console.log("");
  console.log("Environment Variables:");
  console.log("  LINEAR_API_TOKEN             Linear API token (required)");
  console.log("  LINEAR_ORGANIZATION_ID       Linear organization ID (required)");
  console.log("  PROJECT_ROOT_DIR             Project directory path (required)");
  console.log("  WEBHOOK_PORT                 Server port (default: 3000)");
  console.log("  DEBUG                        Enable debug logging (default: false)");
  console.log("");
  console.log("Documentation:");
  console.log("  https://github.com/yourusername/claude-code-linear");
}

/**
 * Handle unhandled errors
 */
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Run main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}