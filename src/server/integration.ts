/**
 * Main integration server for Claude Code + Linear
 */

import Fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { join } from "path";
import { RateLimiterMemory } from "rate-limiter-flexible";
import type {
  IntegrationConfig,
  Logger,
  LinearWebhookEvent,
} from "../core/types.js";
import { LinearClient } from "../linear/client.js";
import { SessionManager } from "../sessions/manager.js";
import { EnhancedLinearWebhookHandler } from "../security/enhanced-webhook-handler.js";
import { EventRouter, DefaultEventHandlers } from "../webhooks/router.js";
import { createSessionStorage } from "../sessions/storage.js";
import { createLogger } from "../utils/logger.js";
import { LinearReporter } from "../linear/reporter.js";
import { SecurityValidator, SecurityUtils } from "../security/validators.js";
import {
  SecurityAgent,
  SecuritySeverity,
  SecurityEventType,
} from "../security/security-agent.js";
import { SecurityMonitor } from "../security/monitoring.js";
import { initializeLinearOAuth } from "../linear/oauth/index.js";
import { GitHubClient } from "../github/client.js";
import { GitHubWebhookHandler } from "../github/webhook-handler.js";
import { GitHubPRAgent } from "../github/pr-agent.js";
import { Mem0MemoryManager } from "../memory/manager.js";
import { BossAgent } from "../boss-agent/agent.js";
import { CodegenClient } from "../codegen/client.js";
import { CodegenWebhookHandler, CodegenWebhookEventType } from "../codegen/webhook-handler.js";
import type { ProcessedCodegenEvent } from "../codegen/webhook-handler.js";

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
  private githubClient?: GitHubClient;
  private githubWebhookHandler?: GitHubWebhookHandler;
  private githubPRAgent?: GitHubPRAgent;
  private sessionManager: SessionManager;
  private webhookHandler: EnhancedLinearWebhookHandler;
  private eventRouter: EventRouter;
  private linearReporter: LinearReporter;
  private memoryManager: Mem0MemoryManager;
  private securityValidator: SecurityValidator;
  private securityAgent: SecurityAgent;
  private securityMonitor: SecurityMonitor;
  private isStarted = false;
  private webhookRateLimiter: RateLimiterMemory;
  private orgRateLimiter: RateLimiterMemory;
  private bossAgent?: BossAgent;
  private codegenClient?: CodegenClient;
  private codegenWebhookHandler?: CodegenWebhookHandler;

  constructor(config: IntegrationConfig) {
    this.config = config;
    this.logger = createLogger(config.debug);
    this.app = Fastify({
      logger: config.debug,
      disableRequestLogging: !config.debug,
    });

    // Initialize rate limiters
    this.webhookRateLimiter = new RateLimiterMemory({
      keyPrefix: "webhook_global",
      points: 60, // 60 requests
      duration: 60, // per minute
    });

    this.orgRateLimiter = new RateLimiterMemory({
      keyPrefix: "webhook_org",
      points: 30, // 30 requests per organization
      duration: 60, // per minute
    });

    // Initialize components
    this.linearClient = new LinearClient(config, this.logger);

    // Initialize GitHub client if token is provided
    if (config.githubToken) {
      try {
        this.githubClient = new GitHubClient(config, this.logger);
        this.githubWebhookHandler = new GitHubWebhookHandler(
          config,
          this.logger,
        );
        this.githubPRAgent = new GitHubPRAgent(
          config,
          this.logger,
          this.githubClient,
        );
        this.logger.info("GitHub integration initialized");
      } catch (error) {
        this.logger.warn("Failed to initialize GitHub integration", {
          error: (error as Error).message,
        });
      }
    }

    // Initialize security validator
    this.securityValidator = new SecurityValidator({
      maxPathDepth: 10,
      blockedCommands: [
        "rm",
        "rmdir",
        "del",
        "deltree",
        "format",
        "fdisk",
        "mkfs",
        "dd",
        "curl",
        "wget",
        "nc",
        "netcat",
        "ssh",
        "scp",
        "rsync",
        "sudo",
        "su",
      ],
      blockedPaths: [
        "/etc",
        "/var",
        "/usr",
        "/sys",
        "/proc",
        "/dev",
        "/root",
        "/boot",
      ],
    });

    // Initialize security agent
    this.securityAgent = new SecurityAgent(config, this.logger, {
      enableWebhookSignatureValidation: true,
      enableRateLimiting: true,
      enableInputSanitization: true,
      enableAuditLogging: true,
      maxSessionDuration: 60 * 60 * 1000, // 1 hour
      maxConcurrentSessions: 10,
    });

    // Initialize security monitor
    this.securityMonitor = new SecurityMonitor(
      config,
      this.logger,
      this.securityAgent,
      {
        enableRealTimeAlerts: true,
        enableMetricsCollection: true,
        metricsRetentionDays: 30,
        thresholds: {
          maxFailedAuthPerMinute: 5,
          maxCriticalEventsPerHour: 3,
          maxSessionDurationMinutes: 60,
          maxConcurrentSessions: 10,
          maxMemoryUsageMB: 1024,
          maxCpuUsagePercent: 80,
        },
      },
    );

    // Create session storage
    const storage = createSessionStorage("file", this.logger, {
      storageDir: join(config.projectRootDir, ".claude-sessions"),
    });

    // Create session manager
    this.sessionManager = new SessionManager(config, this.logger, storage);

    // Create Linear reporter and connect to session manager
    this.linearReporter = new LinearReporter(this.linearClient, this.logger);
    this.linearReporter.setSessionManager(this.sessionManager);

    // Initialize Mem0 memory manager
    this.memoryManager = new Mem0MemoryManager(config, this.logger);
    if (this.memoryManager.isEnabled()) {
      this.logger.info("Mem0 integration enabled");
    }

    // Initialize Boss Agent if enabled
    if (config.enableBossAgent) {
      try {
        // Initialize Codegen client
        if (config.codegenApiToken && config.codegenOrgId) {
          this.codegenClient = new CodegenClient(
            config.codegenApiToken,
            config.codegenOrgId,
            {
              baseUrl: config.codegenBaseUrl,
              defaultTimeout: config.codegenDefaultTimeout,
            },
            this.logger
          );

          // Initialize Boss Agent with Codegen client
          this.bossAgent = new BossAgent(config, this.logger, this.codegenClient);

          this.logger.info("Boss Agent initialized", {
            mode: "coordinator",
            codegenEnabled: true,
            threshold: config.bossAgentThreshold || 6,
            maxConcurrent: config.maxConcurrentAgents || 3,
          });

          // Initialize Codegen webhook handler if webhook callbacks enabled
          if (config.codegenWebhookEnabled) {
            this.codegenWebhookHandler = new CodegenWebhookHandler(this.logger, {
              secret: config.codegenWebhookSecret,
              debug: config.debug,
            });

            // Setup webhook event listeners
            this.setupCodegenWebhookListeners();

            this.logger.info("Codegen webhook handler initialized", {
              hasSecret: !!config.codegenWebhookSecret,
            });
          }
        } else {
          this.logger.warn("Boss Agent enabled but Codegen credentials missing", {
            hasApiToken: !!config.codegenApiToken,
            hasOrgId: !!config.codegenOrgId,
          });
        }
      } catch (error) {
        this.logger.error("Failed to initialize Boss Agent", error as Error);
      }
    }

    // Create enhanced webhook handler with security features
    this.webhookHandler = new EnhancedLinearWebhookHandler(
      config,
      this.logger,
      this.securityAgent,
      this.securityMonitor,
    );

    // Create event handlers and router
    const eventHandlers = new DefaultEventHandlers(
      this.linearClient,
      this.sessionManager,
      this.memoryManager,
      config,
      this.logger,
    );
    this.eventRouter = new EventRouter(eventHandlers, this.logger);

    this.setupRoutes();
    this.setupShutdown();
  }

  /**
   * Setup Codegen webhook event listeners
   */
  private setupCodegenWebhookListeners(): void {
    if (!this.codegenWebhookHandler) {
      return;
    }

    // Listen for task progress updates
    this.codegenWebhookHandler.on(CodegenWebhookEventType.TASK_PROGRESS, async (event) => {
      this.logger.info('Codegen task progress', {
        taskId: event.taskId,
        percentage: event.progress?.percentage,
        step: event.progress?.currentStep,
      });

      // Report progress to Linear
      if (event.progress && event.shouldNotify) {
        await this.reportCodegenProgress(event);
      }
    });

    // Listen for task completion
    this.codegenWebhookHandler.on(CodegenWebhookEventType.TASK_COMPLETED, async (event) => {
      this.logger.info('Codegen task completed', {
        taskId: event.taskId,
        prUrl: event.result?.prUrl,
      });

      // Report success to Linear
      await this.reportCodegenCompletion(event);
    });

    // Listen for task failure
    this.codegenWebhookHandler.on(CodegenWebhookEventType.TASK_FAILED, async (event) => {
      this.logger.error('Codegen task failed', undefined, {
        taskId: event.taskId,
        error: event.error?.message,
      });

      // Report failure to Linear
      await this.reportCodegenFailure(event);
    });

    // Listen for task cancellation
    this.codegenWebhookHandler.on(CodegenWebhookEventType.TASK_CANCELLED, async (event) => {
      this.logger.warn('Codegen task cancelled', {
        taskId: event.taskId,
      });

      // Report cancellation to Linear
      await this.reportCodegenCancellation(event);
    });

    this.logger.debug('Codegen webhook listeners setup complete');
  }

  /**
   * Setup HTTP routes
   */
  private setupRoutes(): void {
    // Initialize OAuth if enabled
    if (this.config.enableOAuth) {
      this.logger.info("Initializing OAuth integration");
      initializeLinearOAuth(this.app, this.config, this.logger);
    }

    // Health check endpoint
    this.app.get(
      "/health",
      async (_request: FastifyRequest, _reply: FastifyReply) => {
        return {
          status: "healthy",
          timestamp: new Date().toISOString(),
          version: "1.0.0",
          uptime: process.uptime(),
          oauthEnabled: this.config.enableOAuth || false,
        };
      },
    );

    // Linear webhook endpoint
    this.app.post<WebhookRequest>(
      "/webhooks/linear",
      async (request, reply) => {
        const signature = request.headers["x-linear-signature"];
        const userAgent = request.headers["user-agent"];
        const clientIp = request.ip;
        const payloadString = JSON.stringify(request.body);
        const sourceIp = clientIp || "unknown";

        this.logger.debug("Received webhook", {
          signature: signature ? "present" : "missing",
          userAgent,
          clientIp,
          bodySize: payloadString.length,
        });

        // Apply global rate limiting first
        try {
          await this.webhookRateLimiter.consume(clientIp);
        } catch (_rateLimitError) {
          this.logger.warn("Global rate limit exceeded", { clientIp });
          return reply.code(429).send({
            error: "Too many requests",
            message: "Rate limit exceeded. Please try again later.",
          });
        }

        // Security validation is now handled by the SecurityAgent
        // Then apply security validation (from feature branch)
        const securityResult = await this.securityAgent.validateWebhook(
          payloadString,
          signature || "",
          sourceIp,
          userAgent || "unknown",
        );

        if (!securityResult.valid) {
          this.logger.warn("Webhook security validation failed", {
            reason: securityResult.reason,
            severity: securityResult.severity,
            sourceIp,
            userAgent,
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
        const payloadSizeResult =
          this.securityValidator.validateWebhookPayloadSize(payloadString);
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
          userAgent || "unknown",
        );

        if (!event) {
          this.logger.warn("Invalid webhook payload", { sourceIp, userAgent });
          return reply.code(400).send({ error: "Invalid payload" });
        }

        // Apply organization-specific rate limiting
        try {
          await this.orgRateLimiter.consume(event.organizationId);
        } catch (_rateLimitError) {
          this.logger.warn("Organization rate limit exceeded", {
            organizationId: event.organizationId,
          });
          return reply.code(429).send({
            error: "Too many requests",
            message:
              "Organization rate limit exceeded. Please try again later.",
          });
        }

        // Process event asynchronously
        this.processWebhookAsync(event);

        return { received: true };
      },
    );

    // GitHub webhook endpoint
    this.app.post<WebhookRequest>(
      "/webhooks/github",
      async (request, reply) => {
        // Check if GitHub integration is enabled
        if (
          !this.githubClient ||
          !this.githubWebhookHandler ||
          !this.githubPRAgent
        ) {
          this.logger.warn(
            "GitHub webhook received but integration not configured",
          );
          return reply.code(503).send({
            error: "Service unavailable",
            message: "GitHub integration not configured",
          });
        }

        const signature = request.headers["x-hub-signature-256"];
        const eventType = request.headers["x-github-event"] as string;
        const clientIp = request.ip;
        const payloadString = JSON.stringify(request.body);

        this.logger.debug("Received GitHub webhook", {
          eventType,
          signature: signature ? "present" : "missing",
          clientIp,
          bodySize: payloadString.length,
        });

        // Apply global rate limiting
        try {
          await this.webhookRateLimiter.consume(clientIp);
        } catch (_rateLimitError) {
          this.logger.warn("Global rate limit exceeded", { clientIp });
          return reply.code(429).send({
            error: "Too many requests",
            message: "Rate limit exceeded. Please try again later.",
          });
        }

        // Verify signature
        if (
          signature &&
          !this.githubWebhookHandler.verifySignature(
            payloadString,
            signature as string,
          )
        ) {
          this.logger.warn("GitHub webhook signature verification failed", {
            clientIp,
          });
          return reply.code(401).send({ error: "Invalid signature" });
        }

        // Validate webhook payload
        const event = this.githubWebhookHandler.validateWebhook(request.body);
        if (!event) {
          this.logger.warn("Invalid GitHub webhook payload", {
            clientIp,
            eventType,
          });
          return reply.code(400).send({ error: "Invalid payload" });
        }

        // Only process PR comment events
        if (
          eventType !== "issue_comment" &&
          eventType !== "pull_request_review_comment"
        ) {
          this.logger.debug("Ignoring non-comment GitHub event", { eventType });
          return { received: true, processed: false };
        }

        // Process event asynchronously
        this.processGitHubWebhookAsync(event, eventType);

        return { received: true, processed: true };
      },
    );

    // Codegen webhook endpoint
    this.app.post<WebhookRequest>(
      "/webhooks/codegen",
      async (request, reply) => {
        // Check if Codegen integration is enabled
        if (!this.codegenWebhookHandler) {
          this.logger.warn("Codegen webhook received but integration not configured");
          return reply.code(503).send({
            error: "Service unavailable",
            message: "Codegen webhook integration not configured",
          });
        }

        const signature = request.headers["x-codegen-signature"] || request.headers["x-webhook-signature"];
        const clientIp = request.ip;
        const payloadString = JSON.stringify(request.body);

        this.logger.debug("Received Codegen webhook", {
          signature: signature ? "present" : "missing",
          clientIp,
          bodySize: payloadString.length,
        });

        // Apply global rate limiting
        try {
          await this.webhookRateLimiter.consume(clientIp);
        } catch (rateLimitError) {
          this.logger.warn("Global rate limit exceeded", { clientIp });
          return reply.code(429).send({
            error: "Too many requests",
            message: "Rate limit exceeded. Please try again later.",
          });
        }

        // Verify signature if provided
        if (signature && !this.codegenWebhookHandler.verifySignature(payloadString, signature as string)) {
          this.logger.warn("Codegen webhook signature verification failed", { clientIp });
          return reply.code(401).send({ error: "Invalid signature" });
        }

        // Validate webhook payload
        const event = this.codegenWebhookHandler.validateWebhook(request.body);
        if (!event) {
          this.logger.warn("Invalid Codegen webhook payload", { clientIp });
          return reply.code(400).send({ error: "Invalid payload" });
        }

        // Process event asynchronously
        this.processCodegenWebhookAsync(event);

        return { received: true, processed: true };
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
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
      ) => {
        const sessionId = request.params.id;

        // Validate session ID format
        if (!SecurityUtils.isValidSessionId(sessionId)) {
          this.logger.warn("Invalid session ID format", { sessionId });
          return reply.code(400).send({
            error: "Invalid request",
            message: "Invalid session ID format",
          });
        }

        const session = await this.sessionManager.getSession(sessionId);
        if (!session) {
          return reply.code(404).send({
            error: "Not found",
            message: "Session not found",
          });
        }
        return { session };
      },
    );

    this.app.delete(
      "/sessions/:id",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
      ) => {
        const sessionId = request.params.id;

        // Validate session ID format
        if (!SecurityUtils.isValidSessionId(sessionId)) {
          this.logger.warn("Invalid session ID format", { sessionId });
          return reply.code(400).send({
            error: "Invalid request",
            message: "Invalid session ID format",
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
  private async processWebhookAsync(event: LinearWebhookEvent): Promise<void> {
    try {
      const processedEvent = await this.webhookHandler.processWebhook(event);
      if (processedEvent) {
        // Log security event for successful webhook processing
        await this.securityAgent.logSecurityEvent({
          id: `webhook-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          type: SecurityEventType.WEBHOOK_PROCESSED,
          severity: SecuritySeverity.LOW,
          timestamp: new Date(),
          source: "webhook_processor",
          message: "Webhook processed successfully",
          details: {
            eventType: processedEvent.type,
            action: processedEvent.action,
            shouldTrigger: processedEvent.shouldTrigger,
          },
          blocked: false,
        });

        // Use Boss Agent if enabled and event should trigger
        if (this.bossAgent && processedEvent.shouldTrigger) {
          this.logger.info("Boss Agent handling event", {
            eventType: processedEvent.type,
            action: processedEvent.action,
            issueId: processedEvent.issue.id,
          });

          // Execute Boss Agent workflow
          await this.processBossAgentWorkflow(processedEvent);
        } else {
          // Use default event router
          await this.eventRouter.routeEvent(processedEvent);
        }
      }
    } catch (error) {
      this.logger.error("Failed to process webhook", error as Error);

      // Log security event for webhook processing failure
      await this.securityAgent.logSecurityEvent({
        id: `webhook-error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: SecurityEventType.WEBHOOK_PROCESSING_ERROR,
        severity: SecuritySeverity.MEDIUM,
        timestamp: new Date(),
        source: "webhook_processor",
        message: "Failed to process webhook",
        details: { error: (error as Error).message },
        blocked: false,
      });
    }
  }

  /**
   * Process Boss Agent workflow
   */
  private async processBossAgentWorkflow(processedEvent: any): Promise<void> {
    if (!this.bossAgent) {
      this.logger.error("Boss Agent not initialized");
      return;
    }

    try {
      this.logger.info("Starting Boss Agent workflow", {
        issueId: processedEvent.issue.id,
        issueIdentifier: processedEvent.issue.identifier,
      });

      // Report initial status to Linear
      await this.linearReporter.reportDelegationStarted(
        processedEvent.issue,
        {
          delegateTo: 'codegen',
          message: '🤖 **Boss Agent activated!**\n\nAnalyzing task and preparing delegation to Codegen...',
        }
      );

      // Execute Boss Agent workflow
      const result = await this.bossAgent.executeWorkflow(
        processedEvent.issue,
        processedEvent.comment
      );

      this.logger.info("Boss Agent workflow completed", {
        issueId: result.issueId,
        status: result.status,
        delegatedTo: result.delegatedTo,
      });

      // Report result to Linear
      if (result.status === 'success' && result.prUrl) {
        await this.linearReporter.reportDelegationSuccess(
          processedEvent.issue,
          {
            delegateTo: result.delegatedTo || 'codegen',
            prUrl: result.prUrl,
            prNumber: result.prNumber,
            filesChanged: result.filesChanged || [],
            message: `✅ **Task completed successfully!**\n\n` +
              `🔗 Pull Request: ${result.prUrl}\n` +
              `📝 Files changed: ${result.filesChanged?.length || 0}\n` +
              `⏱️ Duration: ${result.duration || 'N/A'}\n\n` +
              `Please review and merge the PR.`,
          }
        );
      } else if (result.status === 'failed') {
        await this.linearReporter.reportDelegationFailure(
          processedEvent.issue,
          {
            delegateTo: result.delegatedTo || 'codegen',
            error: result.error || 'Unknown error',
            message: `❌ **Task failed**\n\n` +
              `Error: ${result.error || 'Unknown error'}\n\n` +
              `The Boss Agent encountered an issue while processing this task.`,
          }
        );
      }
    } catch (error) {
      this.logger.error("Boss Agent workflow failed", error as Error, {
        issueId: processedEvent.issue.id,
      });

      // Report error to Linear
      await this.linearReporter.reportDelegationFailure(
        processedEvent.issue,
        {
          delegateTo: 'codegen',
          error: (error as Error).message,
          message: `❌ **Boss Agent workflow failed**\n\n` +
            `Error: ${(error as Error).message}\n\n` +
            `Please check the logs for more details.`,
        }
      );
    }
  }

  /**
   * Process GitHub webhook asynchronously
   */
  private async processGitHubWebhookAsync(
    event: any,
    eventType: string,
  ): Promise<void> {
    if (!this.githubWebhookHandler || !this.githubPRAgent) {
      this.logger.error("GitHub webhook handler or PR agent not initialized");
      return;
    }

    try {
      const processedEvent = await this.githubWebhookHandler.processWebhook(
        event,
        eventType,
      );

      if (processedEvent && processedEvent.shouldTrigger) {
        this.logger.info("Processing GitHub PR comment", {
          type: processedEvent.type,
          action: processedEvent.action,
          commentId: processedEvent.comment.id,
          repository: processedEvent.repository.full_name,
        });

        // Handle PR comment
        await this.githubPRAgent.handlePRComment(processedEvent);
      }
    } catch (error) {
      this.logger.error("Failed to process GitHub webhook", error as Error);
    }
  }

  /**
   * Process Codegen webhook asynchronously
   */
  private async processCodegenWebhookAsync(event: any): Promise<void> {
    if (!this.codegenWebhookHandler) {
      this.logger.error("Codegen webhook handler not initialized");
      return;
    }

    try {
      const processedEvent = await this.codegenWebhookHandler.processWebhook(event);

      if (processedEvent) {
        this.logger.info("Codegen webhook processed", {
          type: processedEvent.type,
          taskId: processedEvent.taskId,
          shouldNotify: processedEvent.shouldNotify,
        });
      }
    } catch (error) {
      this.logger.error("Failed to process Codegen webhook", error as Error);
    }
  }

  /**
   * Report Codegen progress to Linear
   */
  private async reportCodegenProgress(event: ProcessedCodegenEvent): Promise<void> {
    if (!this.bossAgent) {
      return;
    }

    try {
      // Get task session to find associated Linear issue
      const taskSessionManager = this.bossAgent.getTaskSessionManager();
      const taskSession = await taskSessionManager.getSessionByTaskId(event.taskId);

      if (!taskSession) {
        this.logger.warn('Task session not found for progress update', {
          taskId: event.taskId,
        });
        return;
      }

      // Update task session progress
      if (event.progress) {
        await taskSessionManager.updateProgress(
          event.taskId,
          event.progress.percentage,
          event.progress.currentStep
        );
      }

      // Get Linear issue
      const issue = await this.linearClient.getIssue(taskSession.issueId);
      if (!issue) {
        this.logger.warn('Linear issue not found for progress update', {
          taskId: event.taskId,
          issueId: taskSession.issueId,
        });
        return;
      }

      // Report progress to Linear
      const message = `⏳ **Task Progress: ${event.progress?.percentage || 0}%**\n\n` +
        `Current step: ${event.progress?.currentStep || 'Processing...'}\n` +
        `${event.progress?.details ? `\n${event.progress.details}` : ''}`;

      await this.linearClient.createComment(issue.id, message);

      this.logger.info("Codegen progress reported to Linear", {
        taskId: event.taskId,
        issueId: issue.id,
        percentage: event.progress?.percentage,
      });
    } catch (error) {
      this.logger.error('Failed to report Codegen progress', error as Error, {
        taskId: event.taskId,
      });
    }
  }

  /**
   * Report Codegen completion to Linear
   */
  private async reportCodegenCompletion(event: ProcessedCodegenEvent): Promise<void> {
    if (!this.bossAgent) {
      return;
    }

    try {
      // Get task session to find associated Linear issue
      const taskSessionManager = this.bossAgent.getTaskSessionManager();
      const taskSession = await taskSessionManager.getSessionByTaskId(event.taskId);

      if (!taskSession) {
        this.logger.warn('Task session not found for completion', {
          taskId: event.taskId,
        });
        return;
      }

      // Update task session
      if (event.result) {
        await taskSessionManager.markCompleted(event.taskId, {
          prUrl: event.result.prUrl,
          prNumber: event.result.prNumber,
          filesChanged: event.result.filesChanged,
          duration: event.result.duration,
        });
      }

      // Get Linear issue
      const issue = await this.linearClient.getIssue(taskSession.issueId);
      if (!issue) {
        this.logger.warn('Linear issue not found for completion', {
          taskId: event.taskId,
          issueId: taskSession.issueId,
        });
        return;
      }

      // Report success to Linear using existing reporter
      await this.linearReporter.reportDelegationSuccess(issue, {
        delegateTo: 'codegen',
        prUrl: event.result?.prUrl,
        prNumber: event.result?.prNumber,
        filesChanged: event.result?.filesChanged,
        message: `✅ **Task completed successfully!**\n\n` +
          `${event.result?.prUrl ? `🔗 Pull Request: ${event.result.prUrl}\n` : ''}` +
          `📝 Files changed: ${event.result?.filesChanged?.length || 0}\n` +
          `⏱️ Duration: ${event.result?.duration ? `${Math.round(event.result.duration / 1000)}s` : 'N/A'}\n\n` +
          `Please review and merge the PR.`,
      });

      this.logger.info("Codegen completion reported to Linear", {
        taskId: event.taskId,
        issueId: issue.id,
        prUrl: event.result?.prUrl,
      });
    } catch (error) {
      this.logger.error('Failed to report Codegen completion', error as Error, {
        taskId: event.taskId,
      });
    }
  }

  /**
   * Report Codegen failure to Linear
   */
  private async reportCodegenFailure(event: ProcessedCodegenEvent): Promise<void> {
    if (!this.bossAgent) {
      return;
    }

    try {
      // Get task session to find associated Linear issue
      const taskSessionManager = this.bossAgent.getTaskSessionManager();
      const taskSession = await taskSessionManager.getSessionByTaskId(event.taskId);

      if (!taskSession) {
        this.logger.warn('Task session not found for failure', {
          taskId: event.taskId,
        });
        return;
      }

      // Update task session
      if (event.error) {
        await taskSessionManager.markFailed(event.taskId, {
          message: event.error.message,
          code: event.error.code,
          details: event.error.details,
        });
      }

      // Get Linear issue
      const issue = await this.linearClient.getIssue(taskSession.issueId);
      if (!issue) {
        this.logger.warn('Linear issue not found for failure', {
          taskId: event.taskId,
          issueId: taskSession.issueId,
        });
        return;
      }

      // Report failure to Linear using existing reporter
      await this.linearReporter.reportDelegationFailure(issue, {
        delegateTo: 'codegen',
        error: event.error?.message || 'Unknown error',
        message: `❌ **Task failed**\n\n` +
          `Error: ${event.error?.message || 'Unknown error'}\n` +
          `${event.error?.code ? `Code: ${event.error.code}\n` : ''}` +
          `\nThe Codegen agent encountered an issue while processing this task.\n` +
          `Please check the error details and try again.`,
      });

      this.logger.error("Codegen failure reported to Linear", undefined, {
        taskId: event.taskId,
        issueId: issue.id,
        error: event.error?.message,
      });
    } catch (error) {
      this.logger.error('Failed to report Codegen failure', error as Error, {
        taskId: event.taskId,
      });
    }
  }

  /**
   * Report Codegen cancellation to Linear
   */
  private async reportCodegenCancellation(event: ProcessedCodegenEvent): Promise<void> {
    if (!this.bossAgent) {
      return;
    }

    try {
      // Get task session to find associated Linear issue
      const taskSessionManager = this.bossAgent.getTaskSessionManager();
      const taskSession = await taskSessionManager.getSessionByTaskId(event.taskId);

      if (!taskSession) {
        this.logger.warn('Task session not found for cancellation', {
          taskId: event.taskId,
        });
        return;
      }

      // Update task session
      await taskSessionManager.markCancelled(event.taskId);

      // Get Linear issue
      const issue = await this.linearClient.getIssue(taskSession.issueId);
      if (!issue) {
        this.logger.warn('Linear issue not found for cancellation', {
          taskId: event.taskId,
          issueId: taskSession.issueId,
        });
        return;
      }

      // Report cancellation to Linear
      const message = `⚠️ **Task cancelled**\n\n` +
        `The task was cancelled before completion.\n` +
        `You can restart the task by commenting with @claude.`;

      await this.linearClient.createComment(issue.id, message);

      this.logger.warn("Codegen cancellation reported to Linear", {
        taskId: event.taskId,
        issueId: issue.id,
      });
    } catch (error) {
      this.logger.error('Failed to report Codegen cancellation', error as Error, {
        taskId: event.taskId,
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

      // Test Linear connection (optional in development/testing mode)
      if (!this.config.skipLinearCheck) {
        await this.testLinearConnection();
      } else {
        this.logger.warn(
          "⚠️  Skipping Linear API connection test (development mode)",
        );
      }

      // Start HTTP server
      await this.app.listen({
        port: this.config.webhookPort,
        host: this.config.webhookHost || "0.0.0.0",
      });

      // Start security monitoring
      await this.securityMonitor.startMonitoring();

      this.isStarted = true;

      const isWebPreview = !!process.env.CG_PREVIEW_URL;
      this.logger.info("Integration server started", {
        port: this.config.webhookPort,
        organization: this.config.linearOrganizationId,
        projectRoot: this.config.projectRootDir,
        webPreviewMode: isWebPreview,
        webPreviewUrl: process.env.CG_PREVIEW_URL || undefined,
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

    if (!this.config.defaultBranch) {
      this.logger.warn("DEFAULT_BRANCH not specified, using 'main'");
      this.config.defaultBranch = "main";
    }

    if (this.config.timeoutMinutes === undefined) {
      this.logger.warn("TIMEOUT_MINUTES not specified, using 30 minutes");
      this.config.timeoutMinutes = 30;
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(", ")}`);
    }

    // Set defaults (from main branch)
    if (!this.config.defaultBranch) {
      this.logger.warn("DEFAULT_BRANCH not specified, using 'main'");
      this.config.defaultBranch = "main";
    }

    if (this.config.timeoutMinutes === undefined) {
      this.logger.warn("TIMEOUT_MINUTES not specified, using 30 minutes");
      this.config.timeoutMinutes = 30;
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

    // Also run cleanup immediately
    setTimeout(async () => {
      try {
        const cleaned = await this.sessionManager.cleanupOldSessions(7);
        if (cleaned > 0) {
          this.logger.info("Initial cleanup of old sessions", {
            count: cleaned,
          });
        }
      } catch (error) {
        this.logger.error("Error during initial cleanup", error as Error);
      }
    }, 5000); // Run after 5 seconds
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
