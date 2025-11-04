/**
 * Simple test script to verify Mem0 integration
 * Run with: npx tsx src/memory/test-integration.ts
 */

import { loadConfig } from "../utils/config.js";
import { createLogger } from "../utils/logger.js";
import { Mem0MemoryManager } from "./manager.js";

async function testMem0Integration() {
  console.log("🧪 Testing Mem0 Integration\n");

  try {
    // Load configuration
    const config = loadConfig();
    const logger = createLogger(config.debug);

    console.log("✓ Configuration loaded");
    console.log(`  Mem0 Enabled: ${config.mem0Enabled || false}`);
    console.log(`  Has API Key: ${config.mem0ApiKey ? "✓" : "✗"}`);
    console.log();

    // Initialize Mem0 Memory Manager
    const memoryManager = new Mem0MemoryManager(config, logger);

    console.log("✓ Memory Manager initialized");
    console.log(`  Is Enabled: ${memoryManager.isEnabled()}`);
    console.log();

    if (!memoryManager.isEnabled()) {
      console.log("⚠️  Mem0 integration is disabled or not configured");
      console.log("To enable Mem0:");
      console.log("  1. Set MEM0_ENABLED=true in .env");
      console.log("  2. Set MEM0_API_KEY=your_api_key in .env");
      console.log("  3. Get your API key from https://app.mem0.ai/");
      return;
    }

    console.log("✅ Mem0 integration is ready to use!");
    console.log();
    console.log("Next steps:");
    console.log(
      "  - Issue context will be stored automatically when issues are assigned",
    );
    console.log("  - Comment context will be stored when @mentions occur");
    console.log(
      "  - Session results will be stored after Claude completes work",
    );
  } catch (error) {
    console.error("❌ Error testing Mem0 integration:", error);
    process.exit(1);
  }
}

// Run the test
testMem0Integration().catch(console.error);
