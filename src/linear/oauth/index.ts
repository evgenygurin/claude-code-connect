/**
 * Linear OAuth integration
 */

export * from "./types.js";
export * from "./storage.js";
export * from "./service.js";
export * from "./controller.js";

import type { FastifyInstance } from "fastify";
import type { Logger } from "../../core/types.js";
import type { IntegrationConfig } from "../../core/types.js";
import { LinearOAuthService } from "./service.js";
import { LinearOAuthController } from "./controller.js";
import { createOAuthStorage } from "./storage.js";
import { join } from "path";

/**
 * Initialize Linear OAuth integration
 */
export function initializeLinearOAuth(
  app: FastifyInstance,
  config: IntegrationConfig,
  logger: Logger
): {
  service: LinearOAuthService;
  controller: LinearOAuthController;
} {
  // Create OAuth storage
  const storageDir = join(config.projectRootDir, ".linear-oauth");
  const encryptionKey = config.webhookSecret || "default-encryption-key";
  
  const storage = createOAuthStorage("file", logger, {
    storageDir,
    encryptionKey,
  });

  // Initialize storage
  (async () => {
    try {
      await (storage as any).initialize?.();
    } catch (error) {
      logger.error("Failed to initialize OAuth storage", error as Error);
    }
  })();

  // Create OAuth service
  const service = new LinearOAuthService(
    {
      clientId: config.linearClientId || "",
      clientSecret: config.linearClientSecret || "",
      redirectUri: config.oauthRedirectUri || `http://localhost:${config.webhookPort}/oauth/callback`,
      encryptionKey,
    },
    storage,
    logger
  );

  // Create OAuth controller
  const controller = new LinearOAuthController(service, logger);

  // Register routes
  controller.registerRoutes(app);

  return { service, controller };
}

