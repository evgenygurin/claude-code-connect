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
import { EnhancedLinearWebhookHandler } from "../security/enhanced-webhook-handler.js";
import { EventRouter, DefaultEventHandlers } from "../webhooks/router.js";
import { createSessionStorage } from "../sessions/storage.js";
import { createLogger } from "../utils/logger.js";
import { LinearReporter } from "../linear/reporter.js";
import { SecurityValidator, SecurityUtils, defaultSecurityValidator } from "../security/validators.js";
import { SecurityAgent, SecuritySeverity, SecurityEventType } from "../security/security-agent.js";
import { SecurityMonitor } from "../security/monitoring.js";

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
  private webhookHandler: EnhancedLinearWebhookHandler;
  private eventRouter: EventRouter;
  private linearReporter: LinearReporter;
  private securityValidator: SecurityValidator;
  private securityAgent: SecurityAgent;
  private securityMonitor: SecurityMonitor;
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
    
    // Initialize security validator
    this.securityValidator = new SecurityValidator({
      maxPathDepth: 10,
      blockedCommands: [
        "rm", "rmdir", "del", "deltree", "format", "fdisk", "mkfs", "dd",
        "curl", "wget", "nc", "netcat", "ssh", "scp", "rsync", "sudo", "su"
      ],
      blockedPaths: [
        "/etc", "/var", "/usr", "/sys", "/proc", "/dev", "/root", "/boot"
      ]
    });
    
    // Initialize security agent
    this.securityAgent = new SecurityAgent(config, this.logger, {
      enableWebhookSignatureValidation: true,
      enableRateLimiting: true,
      enableInputSanitization: true,
      enableAuditLogging: true,
      maxSessionDuration: 60 * 60 * 1000, // 1 hour
      maxConcurrentSessions: 10
    });
    
    // Initialize security monitor
    this.securityMonitor = new SecurityMonitor(config, this.logger, this.securityAgent, {
      enableRealTimeAlerts: true,
      enableMetricsCollection: true,
      metricsRetentionDays: 30,
      thresholds: {
        maxFailedAuthPerMinute: 5,
        maxCriticalEventsPerHour: 3,
        maxSessionDurationMinutes: 60,
        maxConcurrentSessions: 10,
        maxMemoryUsageMB: 1024,
        maxCpuUsagePercent: 80
      }
    });

    // Use SQLite storage for production
    const storage = createSessionStorage("file", this.logger, {
      storageDir: join(config.projectRootDir, ".claude-sessions"),
    });

    // Create Linear reporter
    this.linearReporter = new LinearReporter(this.linearClient, this.logger);

    // Create session manager with new architecture
    this.sessionManager = new SessionManager(config, this.logger, storage);

    // Create enhanced webhook handler with security features
    this.webhookHandler = new EnhancedLinearWebhookHandler(
      config, 
      this.logger,
      this.securityAgent,
      this.securityMonitor
    );

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

        const payloadString = JSON.stringify(request.body);
        const sourceIp = request.ip || "unknown";
        
        this.logger.debug("Received webhook", {
          signature: signature ? "present" : "missing",
          userAgent,
          bodySize: payloadString.length,
          sourceIp,
        });
        
        // Comprehensive security validation using SecurityAgent
        const securityResult = await this.securityAgent.validateWebhook(
          payloadString,
          signature || "",
          sourceIp,
          userAgent || "unknown"
        );
        
        if (!securityResult.valid) {
          this.logger.warn("Webhook security validation failed", {
            reason: securityResult.reason,
            severity: securityResult.severity,
            sourceIp,
            userAgent
          });
          
          // Return appropriate status code based on the validation failure
          if (securityResult.reason === "Rate limit exceeded") {
            return reply.code(429).send({ error: "Too many requests" });
          } else if (securityResult.reason?.includes("signature")) {
            return reply.code(401).send({ error: "Invalid signature" });
          } else if (securityResult.reason?.includes("payload")) {
            return reply.code(413).send({ error: "Payload too large" });
          } else {
            return reply.code(400).send({ error: "Invalid request" });
          }
        }
        
        // Additional payload size validation as a fallback
        const payloadSizeResult = this.securityValidator.validateWebhookPayloadSize(payloadString);
        if (!payloadSizeResult.valid) {
          this.logger.warn("Webhook payload too large", {
            size: payloadString.length,
            error: payloadSizeResult.error,
            sourceIp,
          });
          return reply.code(413).send({ error: "Payload too large" });
        }

        // Validate and process webhook with enhanced security
        const event = await this.webhookHandler.validateWebhook(
          request.body,
          signature,
          sourceIp,
          userAgent || "unknown"
        );
        
        if (!event) {
          this.logger.warn("Invalid webhook payload", { sourceIp, userAgent });
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
      async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        const sessionId = request.params.id;
        
        // Validate session ID format
        if (!SecurityUtils.isValidSessionId(sessionId)) {
          this.logger.warn("Invalid session ID format", { sessionId });
          return reply.code(400).send({ 
            error: "Invalid request", 
            message: "Invalid session ID format" 
          });
        }
        
        const session = await this.sessionManager.getSession(sessionId);
        if (!session) {
          return reply.code(404).send({ 
            error: "Not found", 
            message: "Session not found" 
          });
        }
        return { session };
      },
    );

    this.app.delete(
      "/sessions/:id",
      async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        const sessionId = request.params.id;
        
        // Validate session ID format
        if (!SecurityUtils.isValidSessionId(sessionId)) {
          this.logger.warn("Invalid session ID format", { sessionId });
          return reply.code(400).send({ 
            error: "Invalid request", 
            message: "Invalid session ID format" 
          });
        }
        
        await this.sessionManager.cancelSession(sessionId);
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
    
    // Security monitoring endpoints
    this.app.get("/security/metrics", async () => {
      const metrics = await this.securityMonitor.getMetrics();
      return { metrics };
    });
    
    this.app.get("/security/alerts", async () => {
      const alerts = await this.securityMonitor.getAlerts();
      return { alerts };
    });
    
    this.app.get("/security/events", async () => {
      const events = await this.securityAgent.getSecurityEvents();
      return { events };
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
        // Log security event for successful webhook processing
        await this.securityAgent.logSecurityEvent({
          type: SecurityEventType.WEBHOOK_PROCESSED,
          severity: SecuritySeverity.LOW,
          source: "webhook_processor",
          message: "Webhook processed successfully",
          details: {
            eventType: processedEvent.type,
            action: processedEvent.action,
            shouldTrigger: processedEvent.shouldTrigger
          }
        });
        
        await this.eventRouter.routeEvent(processedEvent);
      }
    } catch (error) {
      this.logger.error("Failed to process webhook", error as Error);
      
      // Log security event for webhook processing failure
      await this.securityAgent.logSecurityEvent({
        type: SecurityEventType.WEBHOOK_PROCESSING_ERROR,
        severity: SecuritySeverity.MEDIUM,
        source: "webhook_processor",
        message: "Failed to process webhook",
        details: { error: (error as Error).message }
      });
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
      
      // Start security monitoring
      await this.securityMonitor.startMonitoring();

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

      // Stop security monitoring
      await this.securityMonitor.stopMonitoring();
      
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
