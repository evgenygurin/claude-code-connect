/**
 * Security monitoring and alerting system for Claude Code + Linear Integration
 */

import { EventEmitter } from "events";
import { promises as fs } from "fs";
import { join } from "path";
import type {
  IntegrationConfig,
  Logger,
  ClaudeSession,
} from "../core/types.js";
import {
  SecurityAgent,
  SecurityEvent,
  SecuritySeverity,
  SecurityEventType,
} from "./security-agent.js";

/**
 * Security metric thresholds
 */
export interface SecurityThresholds {
  maxFailedAuthPerMinute: number;
  maxCriticalEventsPerHour: number;
  maxSessionDurationMinutes: number;
  maxConcurrentSessions: number;
  maxMemoryUsageMB: number;
  maxCpuUsagePercent: number;
}

/**
 * Security monitoring configuration
 */
export interface MonitoringConfig {
  enableRealTimeAlerts: boolean;
  enableMetricsCollection: boolean;
  alertWebhookUrl?: string;
  metricsRetentionDays: number;
  thresholds: SecurityThresholds;
}

/**
 * Security metrics data
 */
export interface SecurityMetrics {
  timestamp: Date;
  activeSessions: number;
  failedAuthentications: number;
  blockedRequests: number;
  memoryUsageMB: number;
  cpuUsagePercent: number;
  securityEvents: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Alert notification
 */
export interface SecurityAlert {
  id: string;
  severity: SecuritySeverity;
  title: string;
  description: string;
  timestamp: Date;
  events: SecurityEvent[];
  metrics?: SecurityMetrics;
  recommendations: string[];
}

/**
 * Default monitoring configuration
 */
const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enableRealTimeAlerts: true,
  enableMetricsCollection: true,
  metricsRetentionDays: 30,
  thresholds: {
    maxFailedAuthPerMinute: 10,
    maxCriticalEventsPerHour: 5,
    maxSessionDurationMinutes: 60,
    maxConcurrentSessions: 10,
    maxMemoryUsageMB: 1024,
    maxCpuUsagePercent: 80,
  },
};

/**
 * Security monitoring system
 */
export class SecurityMonitor extends EventEmitter {
  private config: IntegrationConfig;
  private monitoringConfig: MonitoringConfig;
  private logger: Logger;
  private securityAgent: SecurityAgent;
  private metrics: SecurityMetrics[] = [];
  private alerts: SecurityAlert[] = [];
  private metricsInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor(
    config: IntegrationConfig,
    logger: Logger,
    securityAgent: SecurityAgent,
    monitoringConfig?: Partial<MonitoringConfig>,
  ) {
    super();
    this.config = config;
    this.logger = logger;
    this.securityAgent = securityAgent;
    this.monitoringConfig = {
      ...DEFAULT_MONITORING_CONFIG,
      ...monitoringConfig,
    };
  }

  /**
   * Start security monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    this.logger.info("Starting security monitoring", {
      realTimeAlerts: this.monitoringConfig.enableRealTimeAlerts,
      metricsCollection: this.monitoringConfig.enableMetricsCollection,
      retentionDays: this.monitoringConfig.metricsRetentionDays,
    });

    // Start metrics collection
    if (this.monitoringConfig.enableMetricsCollection) {
      this.startMetricsCollection();
    }

    // Setup event listeners
    this.setupEventListeners();

    this.isMonitoring = true;
    this.emit("monitoring-started");
  }

  /**
   * Stop security monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.logger.info("Stopping security monitoring");

    // Stop metrics collection
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }

    // Remove event listeners
    this.removeAllListeners();

    this.isMonitoring = false;
    this.emit("monitoring-stopped");
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    // Collect metrics every minute
    this.metricsInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        this.metrics.push(metrics);

        // Keep only recent metrics based on retention policy
        const retentionDate = new Date();
        retentionDate.setDate(
          retentionDate.getDate() - this.monitoringConfig.metricsRetentionDays,
        );
        this.metrics = this.metrics.filter((m) => m.timestamp > retentionDate);

        // Check thresholds
        await this.checkThresholds(metrics);

        this.emit("metrics-collected", metrics);
      } catch (error) {
        this.logger.error("Failed to collect security metrics", error as Error);
      }
    }, 60000); // 1 minute
  }

  /**
   * Setup event listeners for security events
   */
  private setupEventListeners(): void {
    // Listen for security events from the security agent
    // In a real implementation, this would be integrated with the security agent's event system

    this.on("security-event", async (event: SecurityEvent) => {
      await this.handleSecurityEvent(event);
    });

    this.on("session-created", async (session: ClaudeSession) => {
      await this.handleSessionEvent("created", session);
    });

    this.on("session-completed", async (session: ClaudeSession) => {
      await this.handleSessionEvent("completed", session);
    });

    this.on("session-failed", async (session: ClaudeSession) => {
      await this.handleSessionEvent("failed", session);
    });
  }

  /**
   * Collect current security metrics
   */
  private async collectMetrics(): Promise<SecurityMetrics> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Get security events from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = this.securityAgent
      .getSecurityEvents()
      .filter((event) => event.timestamp > oneHourAgo);

    const securityEventCounts = {
      critical: recentEvents.filter(
        (e) => e.severity === SecuritySeverity.CRITICAL,
      ).length,
      high: recentEvents.filter((e) => e.severity === SecuritySeverity.HIGH)
        .length,
      medium: recentEvents.filter((e) => e.severity === SecuritySeverity.MEDIUM)
        .length,
      low: recentEvents.filter((e) => e.severity === SecuritySeverity.LOW)
        .length,
    };

    return {
      timestamp: new Date(),
      activeSessions: 0, // This would be integrated with session manager
      failedAuthentications: recentEvents.filter(
        (e) => e.type === SecurityEventType.AUTHENTICATION_FAILURE,
      ).length,
      blockedRequests: recentEvents.filter((e) => e.blocked).length,
      memoryUsageMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      cpuUsagePercent: Math.round((cpuUsage.user + cpuUsage.system) / 1000), // Simplified calculation
      securityEvents: securityEventCounts,
    };
  }

  /**
   * Check metrics against thresholds and trigger alerts
   */
  private async checkThresholds(metrics: SecurityMetrics): Promise<void> {
    const thresholds = this.monitoringConfig.thresholds;
    const alerts: SecurityAlert[] = [];

    // Check critical events threshold
    if (metrics.securityEvents.critical > thresholds.maxCriticalEventsPerHour) {
      alerts.push(
        await this.createAlert(
          SecuritySeverity.CRITICAL,
          "Critical Security Events Threshold Exceeded",
          `${metrics.securityEvents.critical} critical security events in the last hour (threshold: ${thresholds.maxCriticalEventsPerHour})`,
          [],
          metrics,
          [
            "Review critical security events immediately",
            "Check for ongoing security incidents",
            "Consider temporarily blocking suspicious sources",
          ],
        ),
      );
    }

    // Check concurrent sessions threshold
    if (metrics.activeSessions > thresholds.maxConcurrentSessions) {
      alerts.push(
        await this.createAlert(
          SecuritySeverity.HIGH,
          "Maximum Concurrent Sessions Exceeded",
          `${metrics.activeSessions} active sessions (threshold: ${thresholds.maxConcurrentSessions})`,
          [],
          metrics,
          [
            "Review active sessions for suspicious activity",
            "Consider implementing session limits",
            "Monitor resource usage",
          ],
        ),
      );
    }

    // Check memory usage threshold
    if (metrics.memoryUsageMB > thresholds.maxMemoryUsageMB) {
      alerts.push(
        await this.createAlert(
          SecuritySeverity.MEDIUM,
          "High Memory Usage Detected",
          `Memory usage at ${metrics.memoryUsageMB}MB (threshold: ${thresholds.maxMemoryUsageMB}MB)`,
          [],
          metrics,
          [
            "Check for memory leaks in active sessions",
            "Consider restarting the service",
            "Review session cleanup processes",
          ],
        ),
      );
    }

    // Check blocked requests rate
    const blockedRequestsPerMinute = metrics.blockedRequests / 60; // Approximate
    if (blockedRequestsPerMinute > thresholds.maxFailedAuthPerMinute) {
      alerts.push(
        await this.createAlert(
          SecuritySeverity.HIGH,
          "High Rate of Blocked Requests",
          `${metrics.blockedRequests} requests blocked in the last hour`,
          [],
          metrics,
          [
            "Investigate source of blocked requests",
            "Review security policies",
            "Consider IP blocking for persistent attackers",
          ],
        ),
      );
    }

    // Process alerts
    for (const alert of alerts) {
      await this.triggerAlert(alert);
    }
  }

  /**
   * Handle security events
   */
  private async handleSecurityEvent(event: SecurityEvent): Promise<void> {
    this.logger.debug("Processing security event for monitoring", {
      id: event.id,
      type: event.type,
      severity: event.severity,
    });

    // Create immediate alert for critical/high severity events
    if (
      event.severity === SecuritySeverity.CRITICAL ||
      event.severity === SecuritySeverity.HIGH
    ) {
      const alert = await this.createAlert(
        event.severity,
        `Security Event: ${event.type}`,
        event.message,
        [event],
        undefined,
        event.remediationAction ? [event.remediationAction] : [],
      );

      await this.triggerAlert(alert);
    }
  }

  /**
   * Handle session events
   */
  private async handleSessionEvent(
    eventType: string,
    session: ClaudeSession,
  ): Promise<void> {
    this.logger.debug("Processing session event for monitoring", {
      sessionId: session.id,
      eventType,
      status: session.status,
    });

    // Check for long-running sessions
    if (eventType === "created") {
      const sessionDuration = Date.now() - session.startedAt.getTime();
      const maxDuration =
        this.monitoringConfig.thresholds.maxSessionDurationMinutes * 60 * 1000;

      if (sessionDuration > maxDuration) {
        const alert = await this.createAlert(
          SecuritySeverity.MEDIUM,
          "Long-Running Session Detected",
          `Session ${session.id} has been running for ${Math.round(sessionDuration / 60000)} minutes`,
          [],
          undefined,
          [
            "Review session activity logs",
            "Consider terminating if necessary",
            "Check for stuck processes",
          ],
        );

        await this.triggerAlert(alert);
      }
    }
  }

  /**
   * Create security alert
   */
  private async createAlert(
    severity: SecuritySeverity,
    title: string,
    description: string,
    events: SecurityEvent[],
    metrics?: SecurityMetrics,
    recommendations: string[] = [],
  ): Promise<SecurityAlert> {
    const alert: SecurityAlert = {
      id: this.generateAlertId(),
      severity,
      title,
      description,
      timestamp: new Date(),
      events,
      metrics,
      recommendations,
    };

    this.alerts.push(alert);

    // Keep only recent alerts (last 1000)
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    return alert;
  }

  /**
   * Trigger security alert
   */
  private async triggerAlert(alert: SecurityAlert): Promise<void> {
    this.logger.warn("Security Alert Triggered", {
      id: alert.id,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      timestamp: alert.timestamp.toISOString(),
    });

    // Emit alert event
    this.emit("security-alert", alert);

    // Send webhook notification if configured
    if (
      this.monitoringConfig.alertWebhookUrl &&
      this.monitoringConfig.enableRealTimeAlerts
    ) {
      await this.sendWebhookAlert(alert);
    }

    // Save alert to file
    await this.saveAlertToFile(alert);
  }

  /**
   * Send webhook alert notification
   */
  private async sendWebhookAlert(alert: SecurityAlert): Promise<void> {
    try {
      // In a real implementation, this would use fetch or axios to send HTTP request
      this.logger.info("Would send webhook alert", {
        url: this.monitoringConfig.alertWebhookUrl,
        alertId: alert.id,
        severity: alert.severity,
      });
    } catch (error) {
      this.logger.error("Failed to send webhook alert", error as Error);
    }
  }

  /**
   * Save alert to file
   */
  private async saveAlertToFile(alert: SecurityAlert): Promise<void> {
    try {
      const alertsDir = join(
        this.config.projectRootDir,
        "logs",
        "security",
        "alerts",
      );
      await fs.mkdir(alertsDir, { recursive: true });

      const alertFile = join(alertsDir, `alert-${alert.id}.json`);
      await fs.writeFile(alertFile, JSON.stringify(alert, null, 2));

      this.logger.debug("Alert saved to file", { alertFile });
    } catch (error) {
      this.logger.error("Failed to save alert to file", error as Error);
    }
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get security metrics for time range
   */
  getMetrics(startDate?: Date, endDate?: Date): SecurityMetrics[] {
    let filteredMetrics = [...this.metrics];

    if (startDate) {
      filteredMetrics = filteredMetrics.filter((m) => m.timestamp >= startDate);
    }

    if (endDate) {
      filteredMetrics = filteredMetrics.filter((m) => m.timestamp <= endDate);
    }

    return filteredMetrics.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  /**
   * Get security alerts for time range
   */
  getAlerts(
    startDate?: Date,
    endDate?: Date,
    severity?: SecuritySeverity,
  ): SecurityAlert[] {
    let filteredAlerts = [...this.alerts];

    if (startDate) {
      filteredAlerts = filteredAlerts.filter((a) => a.timestamp >= startDate);
    }

    if (endDate) {
      filteredAlerts = filteredAlerts.filter((a) => a.timestamp <= endDate);
    }

    if (severity) {
      filteredAlerts = filteredAlerts.filter((a) => a.severity === severity);
    }

    return filteredAlerts.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    isMonitoring: boolean;
    metricsCount: number;
    alertsCount: number;
    lastMetricTime?: Date;
    lastAlertTime?: Date;
    config: MonitoringConfig;
  } {
    const lastMetric = this.metrics[this.metrics.length - 1];
    const lastAlert = this.alerts[this.alerts.length - 1];

    return {
      isMonitoring: this.isMonitoring,
      metricsCount: this.metrics.length,
      alertsCount: this.alerts.length,
      lastMetricTime: lastMetric?.timestamp,
      lastAlertTime: lastAlert?.timestamp,
      config: this.monitoringConfig,
    };
  }

  /**
   * Generate security monitoring report
   */
  generateReport(days: number = 7): {
    summary: {
      alertCount: number;
      criticalAlerts: number;
      highAlerts: number;
      avgMemoryUsage: number;
      avgActiveSessions: number;
      totalBlockedRequests: number;
    };
    trends: {
      securityEvents: Array<{ date: string; count: number }>;
      memoryUsage: Array<{ date: string; usage: number }>;
      activeSessions: Array<{ date: string; count: number }>;
    };
    recommendations: string[];
  } {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const recentMetrics = this.getMetrics(startDate);
    const recentAlerts = this.getAlerts(startDate);

    // Calculate summary statistics
    const avgMemoryUsage =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.memoryUsageMB, 0) /
          recentMetrics.length
        : 0;

    const avgActiveSessions =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.activeSessions, 0) /
          recentMetrics.length
        : 0;

    const totalBlockedRequests = recentMetrics.reduce(
      (sum, m) => sum + m.blockedRequests,
      0,
    );

    // Generate trends data
    const trends = {
      securityEvents: this.generateTrendData(recentMetrics, "securityEvents"),
      memoryUsage: this.generateTrendData(recentMetrics, "memoryUsageMB"),
      activeSessions: this.generateTrendData(recentMetrics, "activeSessions"),
    };

    // Generate recommendations
    const recommendations: string[] = [];

    if (
      recentAlerts.filter((a) => a.severity === SecuritySeverity.CRITICAL)
        .length > 0
    ) {
      recommendations.push(
        "Critical security alerts detected - immediate review required",
      );
    }

    if (
      avgMemoryUsage >
      this.monitoringConfig.thresholds.maxMemoryUsageMB * 0.8
    ) {
      recommendations.push(
        "Memory usage trending high - consider optimization",
      );
    }

    if (totalBlockedRequests > 100) {
      recommendations.push(
        "High number of blocked requests - review security policies",
      );
    }

    return {
      summary: {
        alertCount: recentAlerts.length,
        criticalAlerts: recentAlerts.filter(
          (a) => a.severity === SecuritySeverity.CRITICAL,
        ).length,
        highAlerts: recentAlerts.filter(
          (a) => a.severity === SecuritySeverity.HIGH,
        ).length,
        avgMemoryUsage: Math.round(avgMemoryUsage),
        avgActiveSessions: Math.round(avgActiveSessions),
        totalBlockedRequests,
      },
      trends,
      recommendations,
    };
  }

  /**
   * Generate trend data for charting
   */
  private generateTrendData(
    metrics: SecurityMetrics[],
    field: keyof SecurityMetrics,
  ): Array<{ date: string; value: number }> {
    const dailyData = new Map<string, number[]>();

    for (const metric of metrics) {
      const dateKey = metric.timestamp.toISOString().split("T")[0];
      const value =
        typeof metric[field] === "number" ? (metric[field] as number) : 0;

      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, []);
      }
      dailyData.get(dateKey)!.push(value);
    }

    return Array.from(dailyData.entries()).map(([date, values]) => ({
      date,
      value: values.reduce((sum, v) => sum + v, 0) / values.length,
    }));
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.monitoringConfig = { ...this.monitoringConfig, ...newConfig };
    this.logger.info("Security monitoring configuration updated", newConfig);
  }

  /**
   * Clear old metrics and alerts
   */
  async cleanup(): Promise<void> {
    const retentionDate = new Date();
    retentionDate.setDate(
      retentionDate.getDate() - this.monitoringConfig.metricsRetentionDays,
    );

    const originalMetricsCount = this.metrics.length;
    const originalAlertsCount = this.alerts.length;

    this.metrics = this.metrics.filter((m) => m.timestamp > retentionDate);
    this.alerts = this.alerts.filter((a) => a.timestamp > retentionDate);

    const cleanedMetrics = originalMetricsCount - this.metrics.length;
    const cleanedAlerts = originalAlertsCount - this.alerts.length;

    this.logger.info("Security monitoring cleanup completed", {
      cleanedMetrics,
      cleanedAlerts,
      retentionDays: this.monitoringConfig.metricsRetentionDays,
    });
  }
}
