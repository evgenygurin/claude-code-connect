/**
 * Security Analysis Agent for Claude Code + Linear Integration
 * Provides comprehensive security monitoring, validation, and threat detection
 */

import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { join, resolve, relative } from "path";
import { promises as fs } from "fs";
import type {
  IntegrationConfig,
  Logger,
  ClaudeSession,
} from "../core/types.js";

/**
 * Security severity levels
 */
export enum SecuritySeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Security event types
 */
export enum SecurityEventType {
  AUTHENTICATION_FAILURE = "auth_failure",
  AUTHORIZATION_VIOLATION = "authz_violation",
  INPUT_VALIDATION_FAILURE = "input_validation_failure",
  WEBHOOK_SIGNATURE_INVALID = "webhook_signature_invalid",
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  SESSION_ANOMALY = "session_anomaly",
  COMMAND_INJECTION_ATTEMPT = "command_injection_attempt",
  PATH_TRAVERSAL_ATTEMPT = "path_traversal_attempt",
  RESOURCE_EXHAUSTION = "resource_exhaustion",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
  WEBHOOK_PROCESSED = "webhook_processed",
  WEBHOOK_PROCESSING_ERROR = "webhook_processing_error"
}

/**
 * Security event data
 */
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  timestamp: Date;
  source: string;
  message: string;
  details: Record<string, unknown>;
  remediationAction?: string;
  blocked: boolean;
}

/**
 * Security validation result
 */
export interface SecurityValidationResult {
  valid: boolean;
  severity?: SecuritySeverity;
  reason?: string;
  recommendations?: string[];
  blocked?: boolean;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  enableWebhookSignatureValidation: boolean;
  enableRateLimiting: boolean;
  enableInputSanitization: boolean;
  enableAuditLogging: boolean;
  enableProcessSandboxing: boolean;
  rateLimitConfig: RateLimitConfig;
  maxSessionDuration: number;
  maxConcurrentSessions: number;
  allowedEnvironmentVars: string[];
  blockedCommands: string[];
  maxWorkingDirectoryDepth: number;
}

/**
 * Default security configuration
 */
const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableWebhookSignatureValidation: true,
  enableRateLimiting: true,
  enableInputSanitization: true,
  enableAuditLogging: true,
  enableProcessSandboxing: true,
  rateLimitConfig: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  maxSessionDuration: 60 * 60 * 1000, // 1 hour
  maxConcurrentSessions: 5,
  allowedEnvironmentVars: [
    "PATH",
    "HOME",
    "USER",
    "LANG",
    "LC_ALL",
    "TERM",
    "SHELL",
    "PWD",
    "TMPDIR",
  ],
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
  ],
  maxWorkingDirectoryDepth: 10,
};

/**
 * Security Analysis Agent
 */
export class SecurityAgent {
  private config: IntegrationConfig;
  private securityConfig: SecurityConfig;
  private logger: Logger;
  private securityEvents: SecurityEvent[] = [];
  private rateLimitStore = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private sessionMetrics = new Map<
    string,
    { startTime: number; commandCount: number }
  >();

  constructor(
    config: IntegrationConfig,
    logger: Logger,
    securityConfig?: Partial<SecurityConfig>,
  ) {
    this.config = config;
    this.logger = logger;
    this.securityConfig = { ...DEFAULT_SECURITY_CONFIG, ...securityConfig };

    this.logger.info("Security Agent initialized", {
      webhookValidation: this.securityConfig.enableWebhookSignatureValidation,
      rateLimiting: this.securityConfig.enableRateLimiting,
      inputSanitization: this.securityConfig.enableInputSanitization,
      auditLogging: this.securityConfig.enableAuditLogging,
      processSandboxing: this.securityConfig.enableProcessSandboxing,
    });
  }

  /**
   * Validate webhook security
   */
  async validateWebhook(
    payload: string,
    signature: string | undefined,
    userAgent: string | undefined,
    sourceIp: string,
  ): Promise<SecurityValidationResult> {
    const validationId = this.generateSecurityEventId();

    try {
      // Rate limiting check
      if (this.securityConfig.enableRateLimiting) {
        const rateLimitResult = this.checkRateLimit(sourceIp, "webhook");
        if (!rateLimitResult.valid) {
          await this.logSecurityEvent({
            id: validationId,
            type: SecurityEventType.RATE_LIMIT_EXCEEDED,
            severity: SecuritySeverity.MEDIUM,
            timestamp: new Date(),
            source: sourceIp,
            message: "Webhook rate limit exceeded",
            details: { userAgent, payloadSize: payload.length },
            blocked: true,
          });

          return {
            valid: false,
            severity: SecuritySeverity.MEDIUM,
            reason: "Rate limit exceeded",
            blocked: true,
          };
        }
      }

      // Signature validation
      if (this.securityConfig.enableWebhookSignatureValidation) {
        if (!this.config.webhookSecret) {
          await this.logSecurityEvent({
            id: validationId,
            type: SecurityEventType.WEBHOOK_SIGNATURE_INVALID,
            severity: SecuritySeverity.HIGH,
            timestamp: new Date(),
            source: sourceIp,
            message: "Webhook secret not configured but validation enabled",
            details: { userAgent },
            blocked: false,
          });

          return {
            valid: false,
            severity: SecuritySeverity.HIGH,
            reason: "Webhook secret not configured",
            recommendations: [
              "Configure LINEAR_WEBHOOK_SECRET environment variable",
            ],
          };
        }

        if (!signature) {
          await this.logSecurityEvent({
            id: validationId,
            type: SecurityEventType.WEBHOOK_SIGNATURE_INVALID,
            severity: SecuritySeverity.HIGH,
            timestamp: new Date(),
            source: sourceIp,
            message: "Missing webhook signature",
            details: { userAgent, payloadSize: payload.length },
            blocked: true,
          });

          return {
            valid: false,
            severity: SecuritySeverity.HIGH,
            reason: "Missing webhook signature",
            blocked: true,
          };
        }

        const isValidSignature = this.verifyWebhookSignature(
          payload,
          signature,
        );
        if (!isValidSignature) {
          await this.logSecurityEvent({
            id: validationId,
            type: SecurityEventType.WEBHOOK_SIGNATURE_INVALID,
            severity: SecuritySeverity.CRITICAL,
            timestamp: new Date(),
            source: sourceIp,
            message: "Invalid webhook signature",
            details: { userAgent, payloadSize: payload.length },
            blocked: true,
          });

          return {
            valid: false,
            severity: SecuritySeverity.CRITICAL,
            reason: "Invalid webhook signature",
            blocked: true,
          };
        }
      }

      // User-Agent validation
      if (userAgent && !this.isValidUserAgent(userAgent)) {
        await this.logSecurityEvent({
          id: validationId,
          type: SecurityEventType.SUSPICIOUS_ACTIVITY,
          severity: SecuritySeverity.MEDIUM,
          timestamp: new Date(),
          source: sourceIp,
          message: "Suspicious User-Agent header",
          details: { userAgent, payloadSize: payload.length },
          blocked: false,
        });
      }

      // Payload size validation
      if (payload.length > 1024 * 1024) {
        // 1MB limit
        await this.logSecurityEvent({
          id: validationId,
          type: SecurityEventType.SUSPICIOUS_ACTIVITY,
          severity: SecuritySeverity.MEDIUM,
          timestamp: new Date(),
          source: sourceIp,
          message: "Unusually large webhook payload",
          details: { userAgent, payloadSize: payload.length },
          blocked: false,
        });
      }

      this.logger.debug("Webhook security validation passed", {
        source: sourceIp,
        userAgent,
        payloadSize: payload.length,
      });

      return { valid: true };
    } catch (error) {
      await this.logSecurityEvent({
        id: validationId,
        type: SecurityEventType.AUTHENTICATION_FAILURE,
        severity: SecuritySeverity.HIGH,
        timestamp: new Date(),
        source: sourceIp,
        message: "Webhook validation error",
        details: { error: (error as Error).message, userAgent },
        blocked: true,
      });

      return {
        valid: false,
        severity: SecuritySeverity.HIGH,
        reason: "Validation error",
        blocked: true,
      };
    }
  }

  /**
   * Validate session security
   */
  async validateSession(
    session: ClaudeSession,
  ): Promise<SecurityValidationResult> {
    const validationId = this.generateSecurityEventId();

    try {
      // Session duration check
      const sessionAge = Date.now() - session.startedAt.getTime();
      if (sessionAge > this.securityConfig.maxSessionDuration) {
        await this.logSecurityEvent({
          id: validationId,
          type: SecurityEventType.SESSION_ANOMALY,
          severity: SecuritySeverity.MEDIUM,
          timestamp: new Date(),
          source: session.id,
          message: "Session exceeded maximum duration",
          details: {
            sessionId: session.id,
            duration: sessionAge,
            maxDuration: this.securityConfig.maxSessionDuration,
          },
          blocked: true,
        });

        return {
          valid: false,
          severity: SecuritySeverity.MEDIUM,
          reason: "Session duration exceeded",
          blocked: true,
        };
      }

      // Concurrent session check
      const activeSessions = Array.from(this.sessionMetrics.keys()).length;
      if (activeSessions > this.securityConfig.maxConcurrentSessions) {
        await this.logSecurityEvent({
          id: validationId,
          type: SecurityEventType.RESOURCE_EXHAUSTION,
          severity: SecuritySeverity.HIGH,
          timestamp: new Date(),
          source: session.id,
          message: "Maximum concurrent sessions exceeded",
          details: {
            sessionId: session.id,
            activeSessions,
            maxSessions: this.securityConfig.maxConcurrentSessions,
          },
          blocked: true,
        });

        return {
          valid: false,
          severity: SecuritySeverity.HIGH,
          reason: "Too many concurrent sessions",
          blocked: true,
        };
      }

      // Working directory validation
      const workingDirResult = this.validateWorkingDirectory(
        session.workingDir,
      );
      if (!workingDirResult.valid) {
        await this.logSecurityEvent({
          id: validationId,
          type: SecurityEventType.PATH_TRAVERSAL_ATTEMPT,
          severity: SecuritySeverity.CRITICAL,
          timestamp: new Date(),
          source: session.id,
          message: "Invalid working directory path",
          details: {
            sessionId: session.id,
            workingDir: session.workingDir,
            reason: workingDirResult.reason,
          },
          blocked: true,
        });

        return workingDirResult;
      }

      return { valid: true };
    } catch (error) {
      await this.logSecurityEvent({
        id: validationId,
        type: SecurityEventType.SESSION_ANOMALY,
        severity: SecuritySeverity.HIGH,
        timestamp: new Date(),
        source: session.id,
        message: "Session validation error",
        details: {
          sessionId: session.id,
          error: (error as Error).message,
        },
        blocked: true,
      });

      return {
        valid: false,
        severity: SecuritySeverity.HIGH,
        reason: "Validation error",
        blocked: true,
      };
    }
  }

  /**
   * Sanitize input for safe processing
   */
  sanitizeInput(input: string, context: string): string {
    if (!this.securityConfig.enableInputSanitization) {
      return input;
    }

    let sanitized = input;

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, "");

    // Context-specific sanitization
    switch (context) {
      case "branch_name":
        // Allow only alphanumeric, hyphens, and underscores
        sanitized = sanitized.replace(/[^a-zA-Z0-9\-_]/g, "-");
        // Remove consecutive hyphens
        sanitized = sanitized.replace(/--+/g, "-");
        // Trim hyphens from ends
        sanitized = sanitized.replace(/^-+|-+$/g, "");
        // Limit length
        sanitized = sanitized.substring(0, 50);
        break;

      case "file_path":
        // Remove path traversal attempts
        sanitized = sanitized.replace(/\.\./g, "");
        sanitized = sanitized.replace(/\\/g, "/");
        break;

      case "command": {
        // Check for blocked commands
        const command = sanitized.split(" ")[0].toLowerCase();
        if (this.securityConfig.blockedCommands.includes(command)) {
          throw new Error(`Blocked command: ${command}`);
        }
        break;
      }

      case "issue_description":
        // Remove script tags and other potentially dangerous content
        sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, "");
        sanitized = sanitized.replace(/javascript:/gi, "");
        sanitized = sanitized.replace(/on\w+\s*=/gi, "");
        break;
    }

    return sanitized;
  }

  /**
   * Create secure environment for Claude execution
   */
  createSecureEnvironment(session: ClaudeSession): Record<string, string> {
    if (!this.securityConfig.enableProcessSandboxing) {
      return {
        ...process.env,
        CLAUDE_SESSION_ID: session.id,
        CLAUDE_ISSUE_ID: session.issueId,
      };
    }

    const secureEnv: Record<string, string> = {};

    // Add only allowed environment variables
    for (const envVar of this.securityConfig.allowedEnvironmentVars) {
      if (process.env[envVar]) {
        secureEnv[envVar] = process.env[envVar]!;
      }
    }

    // Add Claude-specific variables
    secureEnv.CLAUDE_SESSION_ID = session.id;
    secureEnv.CLAUDE_ISSUE_ID = session.issueId;
    secureEnv.CLAUDE_WORKING_DIR = session.workingDir;

    this.logger.debug("Created secure environment", {
      sessionId: session.id,
      envVarCount: Object.keys(secureEnv).length,
    });

    return secureEnv;
  }

  /**
   * Validate webhook signature using HMAC-SHA256
   */
  private verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      return false;
    }

    try {
      const expectedSignature = createHash("sha256")
        .update(this.config.webhookSecret + payload)
        .digest("hex");

      const actualSignature = signature.replace("sha256=", "");

      return timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(actualSignature, "hex"),
      );
    } catch (error) {
      this.logger.error("Signature verification error", error as Error);
      return false;
    }
  }

  /**
   * Check rate limits
   */
  private checkRateLimit(
    identifier: string,
    type: string,
  ): SecurityValidationResult {
    const key = `${type}:${identifier}`;
    const now = Date.now();
    const window = this.securityConfig.rateLimitConfig.windowMs;
    const maxRequests = this.securityConfig.rateLimitConfig.maxRequests;

    const existing = this.rateLimitStore.get(key);

    if (!existing || now > existing.resetTime) {
      // New window
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + window,
      });
      return { valid: true };
    }

    if (existing.count >= maxRequests) {
      return {
        valid: false,
        severity: SecuritySeverity.MEDIUM,
        reason: `Rate limit exceeded: ${existing.count}/${maxRequests}`,
        blocked: true,
      };
    }

    existing.count++;
    return { valid: true };
  }

  /**
   * Validate User-Agent header
   */
  private isValidUserAgent(userAgent: string): boolean {
    // Check for Linear webhook user agent patterns
    const validPatterns = [/^Linear\/[\d.]+/, /^Linear-Webhook\/[\d.]+/];

    return validPatterns.some((pattern) => pattern.test(userAgent));
  }

  /**
   * Validate working directory path
   */
  private validateWorkingDirectory(
    workingDir: string,
  ): SecurityValidationResult {
    try {
      const projectRoot = resolve(this.config.projectRootDir);
      const resolvedWorkingDir = resolve(workingDir);

      // Check if working directory is within project bounds
      if (!resolvedWorkingDir.startsWith(projectRoot)) {
        return {
          valid: false,
          severity: SecuritySeverity.CRITICAL,
          reason: "Working directory outside project bounds",
          blocked: true,
        };
      }

      // Check directory depth
      const relativePath = relative(projectRoot, resolvedWorkingDir);
      const depth = relativePath.split("/").length;

      if (depth > this.securityConfig.maxWorkingDirectoryDepth) {
        return {
          valid: false,
          severity: SecuritySeverity.MEDIUM,
          reason: "Working directory too deep",
          blocked: true,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        severity: SecuritySeverity.HIGH,
        reason: "Path validation error",
        blocked: true,
      };
    }
  }

  /**
   * Log security event
   */
  public async logSecurityEvent(event: SecurityEvent): Promise<void> {
    this.securityEvents.push(event);

    // Keep only recent events (last 1000)
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    if (this.securityConfig.enableAuditLogging) {
      this.logger.warn("Security Event", {
        id: event.id,
        type: event.type,
        severity: event.severity,
        source: event.source,
        message: event.message,
        timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : new Date().toISOString(),
        blocked: event.blocked,
      });

      // Write to audit log file if configured
      await this.writeAuditLog(event);
    }

    // Trigger alerts for high/critical events
    if (
      event.severity === SecuritySeverity.HIGH ||
      event.severity === SecuritySeverity.CRITICAL
    ) {
      await this.triggerSecurityAlert(event);
    }
  }

  /**
   * Write audit log to file
   */
  private async writeAuditLog(event: SecurityEvent): Promise<void> {
    try {
      const logDir = join(this.config.projectRootDir, "logs", "security");
      await fs.mkdir(logDir, { recursive: true });

      const logFile = join(
        logDir,
        `security-audit-${new Date().toISOString().split("T")[0]}.json`,
      );
      const logEntry = JSON.stringify(event) + "\n";

      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      this.logger.error("Failed to write audit log", error as Error);
    }
  }

  /**
   * Trigger security alert
   */
  private async triggerSecurityAlert(event: SecurityEvent): Promise<void> {
    // This could integrate with external alerting systems
    this.logger.error("SECURITY ALERT", undefined, {
      id: event.id,
      type: event.type,
      severity: event.severity,
      source: event.source,
      message: event.message,
      timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : new Date().toISOString(),
      blocked: event.blocked,
      details: event.details,
    });

    // In a production system, this might:
    // - Send notifications to security team
    // - Create tickets in incident management system
    // - Trigger automated response procedures
  }

  /**
   * Generate unique security event ID
   */
  private generateSecurityEventId(): string {
    return randomBytes(16).toString("hex");
  }

  /**
   * Get security event history
   */
  getSecurityEvents(
    severity?: SecuritySeverity,
    type?: SecurityEventType,
    limit?: number,
  ): SecurityEvent[] {
    let events = [...this.securityEvents];

    if (severity) {
      events = events.filter((event) => event.severity === severity);
    }

    if (type) {
      events = events.filter((event) => event.type === type);
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (limit) {
      events = events.slice(0, limit);
    }

    return events;
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(): {
    totalEvents: number;
    eventsBySeverity: Record<SecuritySeverity, number>;
    eventsByType: Record<SecurityEventType, number>;
    blockedEvents: number;
    rateLimitHits: number;
  } {
    const eventsBySeverity = {
      [SecuritySeverity.LOW]: 0,
      [SecuritySeverity.MEDIUM]: 0,
      [SecuritySeverity.HIGH]: 0,
      [SecuritySeverity.CRITICAL]: 0,
    };

    const eventsByType = Object.values(SecurityEventType).reduce(
      (acc, type) => ({ ...acc, [type]: 0 }),
      {} as Record<SecurityEventType, number>,
    );

    let blockedEvents = 0;
    let rateLimitHits = 0;

    for (const event of this.securityEvents) {
      eventsBySeverity[event.severity]++;
      eventsByType[event.type]++;

      if (event.blocked) {
        blockedEvents++;
      }

      if (event.type === SecurityEventType.RATE_LIMIT_EXCEEDED) {
        rateLimitHits++;
      }
    }

    return {
      totalEvents: this.securityEvents.length,
      eventsBySeverity,
      eventsByType,
      blockedEvents,
      rateLimitHits,
    };
  }

  /**
   * Clear security event history
   */
  clearSecurityEvents(): void {
    this.securityEvents = [];
    this.logger.info("Security event history cleared");
  }

  /**
   * Update security configuration
   */
  updateSecurityConfig(newConfig: Partial<SecurityConfig>): void {
    this.securityConfig = { ...this.securityConfig, ...newConfig };
    this.logger.info("Security configuration updated", newConfig);
  }

  /**
   * Generate security report
   */
  generateSecurityReport(): {
    summary: {
      riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      totalEvents: number;
      criticalEvents: number;
      highEvents: number;
      blockedEvents: number;
    };
    recommendations: string[];
    recentEvents: SecurityEvent[];
    metrics: ReturnType<SecurityAgent["getSecurityMetrics"]>;
  } {
    const metrics = this.getSecurityMetrics();
    const recentEvents = this.getSecurityEvents(undefined, undefined, 10);

    // Determine risk level
    let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";

    if (metrics.eventsBySeverity[SecuritySeverity.CRITICAL] > 0) {
      riskLevel = "CRITICAL";
    } else if (metrics.eventsBySeverity[SecuritySeverity.HIGH] > 5) {
      riskLevel = "HIGH";
    } else if (metrics.eventsBySeverity[SecuritySeverity.MEDIUM] > 10) {
      riskLevel = "MEDIUM";
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (metrics.rateLimitHits > 0) {
      recommendations.push(
        "Review rate limiting configuration - multiple rate limit violations detected",
      );
    }

    if (metrics.eventsBySeverity[SecuritySeverity.HIGH] > 0) {
      recommendations.push(
        "Investigate high-severity security events immediately",
      );
    }

    if (metrics.blockedEvents > metrics.totalEvents * 0.1) {
      recommendations.push(
        "High number of blocked events - review security policies",
      );
    }

    if (!this.config.webhookSecret) {
      recommendations.push("Configure webhook secret for signature validation");
    }

    return {
      summary: {
        riskLevel,
        totalEvents: metrics.totalEvents,
        criticalEvents: metrics.eventsBySeverity[SecuritySeverity.CRITICAL],
        highEvents: metrics.eventsBySeverity[SecuritySeverity.HIGH],
        blockedEvents: metrics.blockedEvents,
      },
      recommendations,
      recentEvents,
      metrics,
    };
  }
}
