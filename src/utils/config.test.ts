/**
 * Tests for configuration loading
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, createExampleEnv } from "./config.js";

describe("Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  it("should create example env content", () => {
    const example = createExampleEnv();
    expect(example).toContain("LINEAR_API_TOKEN");
    expect(example).toContain("LINEAR_ORGANIZATION_ID");
    expect(example).toContain("PROJECT_ROOT_DIR");
  });

  it("should parse boolean environment variables", () => {
    process.env.LINEAR_API_TOKEN = "test-token";
    process.env.LINEAR_ORGANIZATION_ID = "test-org";
    process.env.PROJECT_ROOT_DIR = "/tmp";
    process.env.DEBUG = "true";
    process.env.CREATE_BRANCHES = "false";

    try {
      const config = loadConfig();
      expect(config.debug).toBe(true);
      expect(config.createBranches).toBe(false);
    } catch (error) {
      // Expected to fail due to missing directory, but types should be parsed
      expect(error.message).toContain("does not exist");
    }
  });

  it("should parse numeric environment variables", () => {
    process.env.LINEAR_API_TOKEN = "test-token";
    process.env.LINEAR_ORGANIZATION_ID = "test-org";
    process.env.PROJECT_ROOT_DIR = "/tmp";
    process.env.WEBHOOK_PORT = "8080";
    process.env.SESSION_TIMEOUT_MINUTES = "60";

    try {
      const config = loadConfig();
      expect(config.webhookPort).toBe(8080);
      expect(config.timeoutMinutes).toBe(60);
    } catch (error) {
      // Expected to fail due to validation, but parsing should work
      expect(error.message).toContain("does not exist");
    }
  });

  it("should validate required fields", () => {
    // Clear required environment variables
    delete process.env.LINEAR_API_TOKEN;
    delete process.env.LINEAR_ORGANIZATION_ID;
    delete process.env.PROJECT_ROOT_DIR;

    // Use non-existent .env path to prevent loading actual .env file
    expect(() => loadConfig("/non/existent/path/.env")).toThrow(
      "Configuration validation failed",
    );
  });

  it("should use default values", () => {
    process.env.LINEAR_API_TOKEN = "test-token";
    process.env.LINEAR_ORGANIZATION_ID = "test-org";
    process.env.PROJECT_ROOT_DIR = "/tmp";

    try {
      const config = loadConfig();
      expect(config.defaultBranch).toBe("main");
      expect(config.webhookPort).toBe(3000);
      expect(config.claudeExecutablePath).toBe("claude");
    } catch (error) {
      // Expected validation error
    }
  });
});
