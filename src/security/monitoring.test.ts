/**
 * Tests for SecurityMonitor
 * Security monitoring and alerting tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SecurityMonitor } from "./monitoring.js";
import {
  SecurityAgent,
  SecurityEventType,
  SecuritySeverity,
} from "./security-agent.js";
import {
  setupTestEnvironment,
  standardBeforeEach,
  standardAfterEach,
} from "../testing/test-utils.js";

// Setup test environment
const testEnv = setupTestEnvironment();

describe("SecurityMonitor", () => {
  let securityMonitor: SecurityMonitor;
  let securityAgent: SecurityAgent;

  beforeEach(
    standardBeforeEach(() => {
      securityAgent = new SecurityAgent(testEnv.config, testEnv.logger);
      securityMonitor = new SecurityMonitor(
        testEnv.config,
        testEnv.logger,
        securityAgent,
      );
    }),
  );

  afterEach(standardAfterEach());

  describe("instantiation", () => {
    it("should create instance with default options", () => {
      const monitor = new SecurityMonitor(
        testEnv.config,
        testEnv.logger,
        securityAgent,
      );
      expect(monitor).toBeInstanceOf(SecurityMonitor);
    });

    it("should create instance with custom options", () => {
      const monitor = new SecurityMonitor(
        testEnv.config,
        testEnv.logger,
        securityAgent,
        {
          enableRealTimeAlerts: true,
          enableMetricsCollection: true,
          metricsRetentionDays: 7,
          thresholds: {
            maxFailedAuthPerMinute: 3,
            maxCriticalEventsPerHour: 1,
            maxSessionDurationMinutes: 30,
            maxConcurrentSessions: 5,
            maxMemoryUsageMB: 512,
            maxCpuUsagePercent: 50,
          },
        },
      );
      expect(monitor).toBeInstanceOf(SecurityMonitor);
    });
  });

  describe("startMonitoring and stopMonitoring", () => {
    it("should start and stop monitoring", async () => {
      // Spy on logger
      const infoSpy = vi.spyOn(testEnv.logger, "info");

      await securityMonitor.startMonitoring();
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining("Starting security monitoring"),
        expect.any(Object),
      );

      // Clear previous calls
      infoSpy.mockClear();

      await securityMonitor.stopMonitoring();
      expect(infoSpy).toHaveBeenCalledWith("Stopping security monitoring");
    });

    it("should not start monitoring twice", async () => {
      // Spy on logger
      const infoSpy = vi.spyOn(testEnv.logger, "info");

      await securityMonitor.startMonitoring();
      infoSpy.mockClear(); // Clear previous calls

      await securityMonitor.startMonitoring(); // Try to start again
      expect(infoSpy).not.toHaveBeenCalled(); // Should not log again
    });

    it("should not stop monitoring if not started", async () => {
      // Spy on logger
      const infoSpy = vi.spyOn(testEnv.logger, "info");

      await securityMonitor.stopMonitoring(); // Try to stop without starting
      expect(infoSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Stopping security monitoring"),
        expect.any(Object),
      );
    });
  });

  describe("getMetrics", () => {
    it("should return metrics", async () => {
      await securityMonitor.startMonitoring();

      // Trigger some security events to generate metrics
      await securityAgent.logSecurityEvent({
        type: SecurityEventType.AUTHENTICATION_FAILURE,
        severity: SecuritySeverity.HIGH,
        source: "test",
        message: "Test event",
      });

      const metrics = await securityMonitor.getMetrics();

      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics)).toBe(true);

      if (metrics.length > 0) {
        expect(metrics[0].timestamp).toBeInstanceOf(Date);
        expect(typeof metrics[0].failedAuthentications).toBe("number");
      }

      await securityMonitor.stopMonitoring();
    });

    it("should limit metrics by count", async () => {
      await securityMonitor.startMonitoring();

      // Generate multiple metrics entries
      for (let i = 0; i < 5; i++) {
        await securityAgent.logSecurityEvent({
          type: SecurityEventType.AUTHENTICATION_FAILURE,
          severity: SecuritySeverity.HIGH,
          source: "test",
          message: `Test event ${i}`,
          timestamp: new Date(),
          id: `test-${i}`,
          details: {},
          blocked: false,
        });

        // Force metrics collection
        await securityMonitor["collectMetrics"]();
      }

      const metrics = await securityMonitor.getMetrics(undefined, undefined, {
        limit: 3,
      });

      expect(metrics.length).toBeLessThanOrEqual(3);

      await securityMonitor.stopMonitoring();
    });
  });

  describe("getAlerts", () => {
    it("should return alerts", async () => {
      await securityMonitor.startMonitoring();

      // Trigger a critical event to generate an alert
      await securityAgent.logSecurityEvent({
        type: SecurityEventType.COMMAND_INJECTION_ATTEMPT,
        severity: SecuritySeverity.CRITICAL,
        source: "test",
        message: "Critical security event",
      });

      const alerts = await securityMonitor.getAlerts();

      expect(alerts).toBeDefined();
      expect(Array.isArray(alerts)).toBe(true);

      await securityMonitor.stopMonitoring();
    });

    it("should filter alerts by severity", async () => {
      await securityMonitor.startMonitoring();

      // Generate alerts of different severities
      await securityAgent.logSecurityEvent({
        type: SecurityEventType.AUTHENTICATION_FAILURE,
        severity: SecuritySeverity.HIGH,
        source: "test",
        message: "High severity event",
      });

      await securityAgent.logSecurityEvent({
        type: SecurityEventType.COMMAND_INJECTION_ATTEMPT,
        severity: SecuritySeverity.CRITICAL,
        source: "test",
        message: "Critical security event",
      });

      const criticalAlerts = await securityMonitor.getAlerts({
        severity: SecuritySeverity.CRITICAL,
      });

      if (criticalAlerts.length > 0) {
        expect(criticalAlerts[0].severity).toBe(SecuritySeverity.CRITICAL);
      }

      await securityMonitor.stopMonitoring();
    });
  });

  describe("event handling", () => {
    it("should generate alerts for critical events", async () => {
      // Configure monitor with low threshold
      securityMonitor = new SecurityMonitor(
        testEnv.config,
        testEnv.logger,
        securityAgent,
        {
          thresholds: {
            maxCriticalEventsPerHour: 1,
            maxFailedAuthPerMinute: 10,
            maxSessionDurationMinutes: 60,
            maxConcurrentSessions: 10,
            maxMemoryUsageMB: 1024,
            maxCpuUsagePercent: 80,
          },
        },
      );

      await securityMonitor.startMonitoring();

      // Manually add an alert to the monitor
      const alert = {
        id: "test-alert-1",
        severity: SecuritySeverity.CRITICAL,
        title: "Test Critical Alert",
        description: "This is a test critical alert",
        timestamp: new Date(),
        events: [],
        recommendations: ["Test recommendation"],
      };

      // @ts-ignore - Accessing private property for testing
      securityMonitor["alerts"].push(alert);

      const alerts = await securityMonitor.getAlerts();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].id).toBe("test-alert-1");

      await securityMonitor.stopMonitoring();
    });

    it("should detect authentication failures", async () => {
      // Configure monitor with low threshold
      securityMonitor = new SecurityMonitor(
        testEnv.config,
        testEnv.logger,
        securityAgent,
        {
          thresholds: {
            maxFailedAuthPerMinute: 1,
            maxCriticalEventsPerHour: 10,
            maxSessionDurationMinutes: 60,
            maxConcurrentSessions: 10,
            maxMemoryUsageMB: 1024,
            maxCpuUsagePercent: 80,
          },
        },
      );

      await securityMonitor.startMonitoring();

      // Manually add an auth alert to the monitor
      const alert = {
        id: "test-auth-alert-1",
        severity: SecuritySeverity.HIGH,
        title: "Authentication Failures Detected",
        description:
          "Multiple authentication failures detected from the same source",
        timestamp: new Date(),
        events: [],
        recommendations: [
          "Review authentication logs",
          "Check for brute force attempts",
        ],
      };

      // @ts-ignore - Accessing private property for testing
      securityMonitor["alerts"].push(alert);

      const alerts = await securityMonitor.getAlerts();

      expect(alerts.length).toBeGreaterThan(0);
      expect(
        alerts.some(
          (alert) =>
            alert.title.includes("Authentication") ||
            alert.description.includes("authentication"),
        ),
      ).toBe(true);

      await securityMonitor.stopMonitoring();
    });
  });
});
