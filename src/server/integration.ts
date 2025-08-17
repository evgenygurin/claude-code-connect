/**
 * Main integration server for Claude Code + Linear
 */

import Fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { join } from "path";
import type { IntegrationConfig, Logger } from "../core/types.js";
import { LinearClient } from "../linear/client.js";
import { SessionManager } from "../sessions/manager.js";
import { LinearWebhookHandler } from "../webhooks/handler.js";
import { EventRouter, DefaultEventHandlers } from "../webhooks/router.js";
import { createSessionStorage } from "../sessions/storage.js";
import { createLogger } from "../utils/logger.js";
import { LinearReporter } from "../linear/reporter.js";

/**
 * Webhook request body type
 */
interface WebhookRequest {
  Body: unknown;
  Headers: {
    "x-linear-signature"?: string;
    "user-agent"?: string;
  };
}

/**
 * Main integration server
 */
export class IntegrationServer {
  private app: FastifyInstance;
  private config: IntegrationConfig;
  private logger: Logger;
  private linearClient: LinearClient;
  private sessionManager: SessionManager;
  private webhookHandler: LinearWebhookHandler;
  private eventRouter: EventRouter;
  private linearReporter: LinearReporter;
  private isStarted = false;

  constructor(config: IntegrationConfig) {
    this.config = config;
    this.logger = createLogger(config.debug);
    this.app = Fastify({
      logger: config.debug,
      disableRequestLogging: !config.debug,
    });

    // Initialize components
    this.linearClient = new LinearClient(config, this.logger);

    // Use SQLite storage for production
    const storage = createSessionStorage("file", this.logger, {
      storageDir: join(config.projectRootDir, ".claude-sessions"),
    });

    // Create Linear reporter
    this.linearReporter = new LinearReporter(this.linearClient, this.logger);

    // Create session manager with new architecture
    this.sessionManager = new SessionManager(config, this.logger, storage);

    this.webhookHandler = new LinearWebhookHandler(config, this.logger);

    const eventHandlers = new DefaultEventHandlers(
      this.linearClient,
      this.sessionManager,
      config,
      this.logger,
    );
    this.eventRouter = new EventRouter(eventHandlers, this.logger);

    this.setupRoutes();
    this.setupShutdown();
  }

  /**
   * Setup HTTP routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get(
      "/health",
      async (_request: FastifyRequest, _reply: FastifyReply) => {
        return {
          status: "healthy",
          timestamp: new Date().toISOString(),
          version: "1.0.0",
          uptime: process.uptime(),
        };
      },
    );

    // Linear webhook endpoint
    this.app.post<WebhookRequest>(
      "/webhooks/linear",
      async (request, reply) => {
        const signature = request.headers["x-linear-signature"];
        const userAgent = request.headers["user-agent"];

        this.logger.debug("Received webhook", {
          signature: signature ? "present" : "missing",
          userAgent,
          bodySize: JSON.stringify(request.body).length,
        });

        // Verify signature if configured
        if (this.config.webhookSecret && signature) {
          const isValid = this.webhookHandler.verifySignature(
            JSON.stringify(request.body),
            signature,
          );

          if (!isValid) {
            this.logger.warn("Invalid webhook signature");
            return reply.code(401).send({ error: "Invalid signature" });
          }
        }

        // Validate and process webhook
        const event = this.webhookHandler.validateWebhook(request.body);
        if (!event) {
          this.logger.warn("Invalid webhook payload");
          return reply.code(400).send({ error: "Invalid payload" });
        }

        // Process event asynchronously
        this.processWebhookAsync(event);

        return { received: true };
      },
    );

    // Session management endpoints
    this.app.get("/sessions", async () => {
      const sessions = await this.sessionManager.listSessions();
      return { sessions };
    });

    this.app.get("/sessions/active", async () => {
      const sessions = await this.sessionManager.listActiveSessions();
      return { sessions };
    });

    this.app.get(
      "/sessions/:id",
      async (request: FastifyRequest<{ Params: { id: string } }>) => {
        const session = await this.sessionManager.getSession(request.params.id);
        if (!session) {
          throw new Error("Session not found");
        }
        return { session };
      },
    );

    this.app.delete(
      "/sessions/:id",
      async (request: FastifyRequest<{ Params: { id: string } }>) => {
        await this.sessionManager.cancelSession(request.params.id);
        return { cancelled: true };
      },
    );

    // Statistics endpoint
    this.app.get("/stats", async () => {
      const sessionStats = await this.sessionManager.getStats();
      return {
        sessions: sessionStats,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        config: {
          organization: this.config.linearOrganizationId,
          projectRoot: this.config.projectRootDir,
          createBranches: this.config.createBranches,
          debug: this.config.debug,
        },
      };
    });

    // Configuration endpoint (read-only)
    this.app.get("/config", async () => {
      return {
        linearOrganizationId: this.config.linearOrganizationId,
        projectRootDir: this.config.projectRootDir,
        defaultBranch: this.config.defaultBranch,
        createBranches: this.config.createBranches,
        webhookPort: this.config.webhookPort,
        debug: this.config.debug,
        // Sensitive data excluded
        hasLinearToken: !!this.config.linearApiToken,
        hasWebhookSecret: !!this.config.webhookSecret,
        hasAgentUser: !!this.config.agentUserId,
      };
    });

    // Error handler
    this.app.setErrorHandler(async (error, request, reply) => {
      this.logger.error("HTTP request error", error, {
        method: request.method,
        url: request.url,
      });

      return reply.code(500).send({
        error: "Internal server error",
        message: this.config.debug ? error.message : "An error occurred",
      });
    });
  }

  /**
   * Process webhook asynchronously
   */
  private async processWebhookAsync(event: any): Promise<void> {
    try {
      const processedEvent = await this.webhookHandler.processWebhook(event);
      if (processedEvent) {
        await this.eventRouter.routeEvent(processedEvent);
      }
    } catch (error) {
      this.logger.error("Failed to process webhook", error as Error);
    }
  }

  /**
   * Setup graceful shutdown
   */
  private setupShutdown(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, shutting down gracefully`);

      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        this.logger.error("Error during shutdown", error as Error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      throw new Error("Server is already started");
    }

    try {
      // Validate configuration
      await this.validateConfig();

      // Test Linear connection
      await this.testLinearConnection();

      // Start HTTP server
      await this.app.listen({
        port: this.config.webhookPort,
        host: "0.0.0.0",
      });

      this.isStarted = true;

      this.logger.info("Integration server started", {
        port: this.config.webhookPort,
        organization: this.config.linearOrganizationId,
        projectRoot: this.config.projectRootDir,
      });

      // Setup periodic cleanup
      this.setupPeriodicCleanup();
    } catch (error) {
      this.logger.error("Failed to start server", error as Error);
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    this.logger.info("Stopping integration server");

    try {
      // Cancel all running sessions
      const activeSessions = await this.sessionManager.listActiveSessions();
      for (const session of activeSessions) {
        await this.sessionManager.cancelSession(session.id);
      }

      // Stop HTTP server
      await this.app.close();

      this.isStarted = false;
      this.logger.info("Integration server stopped");
    } catch (error) {
      this.logger.error("Error stopping server", error as Error);
      throw error;
    }
  }

  /**
   * Validate configuration
   */
  private async validateConfig(): Promise<void> {
    const errors: string[] = [];

    if (!this.config.linearApiToken) {
      errors.push("LINEAR_API_TOKEN is required");
    }

    if (!this.config.linearOrganizationId) {
      errors.push("LINEAR_ORGANIZATION_ID is required");
    }

    if (!this.config.projectRootDir) {
      errors.push("PROJECT_ROOT_DIR is required");
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(", ")}`);
    }
  }

  /**
   * Test Linear API connection
   */
  private async testLinearConnection(): Promise<void> {
    try {
      const user = await this.linearClient.getCurrentUser();
      this.logger.info("Linear connection successful", {
        userId: user.id,
        userName: user.name,
      });

      // Update agent user ID if not configured
      if (!this.config.agentUserId) {
        this.config.agentUserId = user.id;
        this.logger.info("Agent user ID auto-configured", { userId: user.id });
      }
    } catch (error) {
      this.logger.error("Linear connection failed", error as Error);
      throw new Error(
        "Failed to connect to Linear API. Please check your API token.",
      );
    }
  }

  /**
   * Setup periodic cleanup of old sessions
   */
  private setupPeriodicCleanup(): void {
    // Run cleanup every hour
    setInterval(
      async () => {
        try {
          const cleaned = await this.sessionManager.cleanupOldSessions(7); // 7 days
          if (cleaned > 0) {
            this.logger.info("Cleaned up old sessions", { count: cleaned });
          }
        } catch (error) {
          this.logger.error("Error during periodic cleanup", error as Error);
        }
      },
      60 * 60 * 1000,
    ); // 1 hour
  }

  /**
   * Get server info
   */
  getInfo(): {
    isStarted: boolean;
    port: number;
    config: IntegrationConfig;
  } {
    return {
      isStarted: this.isStarted,
      port: this.config.webhookPort,
      config: this.config,
    };
  }
}
