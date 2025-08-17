/**
 * Centralized test utilities to eliminate code duplication
 * Single source of truth for common test patterns
 */

import { vi } from "vitest";
import type { IntegrationConfig, Logger } from "../core/types.js";

/**
 * Standard mock factory for ClaudeExecutor
 * Eliminates repeated executor mock setup
 */
export function createMockExecutor() {
  return {
    execute: vi.fn(),
    cancelSession: vi.fn(),
  };
}

/**
 * Global mock setup for ClaudeExecutor
 * Call this once in test files that need executor mocking
 */
export function setupExecutorMock() {
  const mockExecutor = createMockExecutor();

  vi.mock("../claude/executor.js", () => ({
    ClaudeExecutor: vi.fn().mockImplementation(() => mockExecutor),
  }));

  return mockExecutor;
}

/**
 * Standard crypto mock for webhook signature testing
 * Eliminates repeated crypto mock setup
 */
export function setupCryptoMock() {
  const mockCrypto = {
    createHmac: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue("mocked-signature"),
    }),
    timingSafeEqual: vi.fn().mockReturnValue(true),
  };

  vi.mock("crypto", () => ({
    default: mockCrypto,
    ...mockCrypto,
  }));

  return mockCrypto;
}

/**
 * Standard beforeEach setup for tests
 * Eliminates repeated beforeEach patterns
 */
export function standardBeforeEach(setup?: () => void | Promise<void>) {
  return async () => {
    vi.clearAllMocks();
    if (setup) {
      await setup();
    }
  };
}

/**
 * Standard afterEach cleanup for tests
 * Eliminates repeated afterEach patterns
 */
export function standardAfterEach(cleanup?: () => void | Promise<void>) {
  return async () => {
    vi.restoreAllMocks();
    if (cleanup) {
      await cleanup();
    }
  };
}

/**
 * Factory for mock logger with standard spy setup
 * Eliminates repeated logger mock creation
 */
export function createStandardMockLogger(): Logger & {
  debug: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
} {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

/**
 * Factory for mock integration config
 * Eliminates repeated config mock creation
 */
export function createStandardMockConfig(
  overrides: Partial<IntegrationConfig> = {},
): IntegrationConfig {
  return {
    linearApiToken: "test-token",
    linearOrganizationId: "test-org-id",
    claudeExecutablePath: "claude",
    webhookPort: 3000,
    webhookSecret: "test-webhook-secret",
    projectRootDir: "/tmp/test-project",
    defaultBranch: "main",
    createBranches: true,
    timeoutMinutes: 30,
    agentUserId: "test-agent-id",
    debug: false,
    ...overrides,
  };
}

/**
 * Complete test environment setup
 * Single function to set up common test requirements
 */
export function setupTestEnvironment(
  options: {
    needsExecutorMock?: boolean;
    needsCryptoMock?: boolean;
    configOverrides?: Partial<IntegrationConfig>;
  } = {},
) {
  const logger = createStandardMockLogger();
  const config = createStandardMockConfig(options.configOverrides);

  let mockExecutor;
  let mockCrypto;

  if (options.needsExecutorMock) {
    mockExecutor = setupExecutorMock();
  }

  if (options.needsCryptoMock) {
    mockCrypto = setupCryptoMock();
  }

  return {
    logger,
    config,
    mockExecutor,
    mockCrypto,
    beforeEach: standardBeforeEach(),
    afterEach: standardAfterEach(),
  };
}

/**
 * Assertion helpers for common test patterns
 */
export const testAssertions = {
  /**
   * Assert mock was called with specific arguments
   */
  wasCalledWith: (mock: any, ...args: any[]) => {
    expect(mock).toHaveBeenCalledWith(...args);
  },

  /**
   * Assert mock was called once
   */
  wasCalledOnce: (mock: any) => {
    expect(mock).toHaveBeenCalledTimes(1);
  },

  /**
   * Assert mock was not called
   */
  wasNotCalled: (mock: any) => {
    expect(mock).not.toHaveBeenCalled();
  },

  /**
   * Assert result has expected structure
   */
  hasStructure: (result: any, expectedKeys: string[]) => {
    for (const key of expectedKeys) {
      expect(result).toHaveProperty(key);
    }
  },
};
