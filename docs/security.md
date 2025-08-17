# Security Components Documentation

This document provides an overview of the security components integrated into the Claude Code + Linear Integration system.

## Overview

The security system consists of several components that work together to provide comprehensive security features:

1. **SecurityValidator** - Validates inputs, commands, and paths
2. **SecurityAgent** - Monitors security events and provides validation
3. **SecurityMonitor** - Collects metrics and generates alerts
4. **EnhancedLinearWebhookHandler** - Securely processes Linear webhooks

## SecurityValidator

The `SecurityValidator` component provides validation for various inputs:

- **Command Validation** - Prevents command injection and blocks dangerous commands
- **Path Validation** - Prevents path traversal and blocks access to sensitive directories
- **Webhook Payload Validation** - Validates webhook payload size and content

### Usage

```typescript
import { SecurityValidator, SecurityUtils } from "../security/validators.js";

// Create validator with custom options
const validator = new SecurityValidator({
  maxPathDepth: 10,
  blockedCommands: ["rm", "rmdir", "del", "deltree"],
  blockedPaths: ["/etc", "/var", "/usr"],
  maxPayloadSize: 5 * 1024 * 1024 // 5MB
});

// Validate a command
const commandResult = validator.validateCommand("git status");
if (!commandResult.valid) {
  console.error(`Command validation failed: ${commandResult.error}`);
}

// Validate a path
const pathResult = validator.validatePath("./src/app.js");
if (!pathResult.valid) {
  console.error(`Path validation failed: ${pathResult.error}`);
}

// Validate webhook payload size
const payloadResult = validator.validateWebhookPayloadSize(payloadString);
if (!payloadResult.valid) {
  console.error(`Payload validation failed: ${payloadResult.error}`);
}

// Validate session ID
if (!SecurityUtils.isValidSessionId(sessionId)) {
  console.error("Invalid session ID format");
}
```

## SecurityAgent

The `SecurityAgent` component provides security monitoring and validation:

- **Webhook Validation** - Validates webhook signatures and content
- **Session Validation** - Validates session duration and status
- **Security Event Logging** - Logs security events with severity levels
- **Rate Limiting** - Prevents abuse through rate limiting

### Usage

```typescript
import { SecurityAgent, SecuritySeverity, SecurityEventType } from "../security/security-agent.js";

// Create agent with custom options
const securityAgent = new SecurityAgent(config, logger, {
  enableWebhookSignatureValidation: true,
  enableRateLimiting: true,
  enableInputSanitization: true,
  enableAuditLogging: true,
  maxSessionDuration: 60 * 60 * 1000, // 1 hour
  maxConcurrentSessions: 10
});

// Validate webhook
const webhookResult = await securityAgent.validateWebhook(
  payloadString,
  signature,
  sourceIp,
  userAgent
);

if (!webhookResult.valid) {
  console.error(`Webhook validation failed: ${webhookResult.reason}`);
}

// Validate session
const sessionResult = await securityAgent.validateSession(session);
if (!sessionResult.valid) {
  console.error(`Session validation failed: ${sessionResult.reason}`);
}

// Log security event
await securityAgent.logSecurityEvent({
  type: SecurityEventType.AUTHENTICATION_FAILURE,
  severity: SecuritySeverity.HIGH,
  source: "auth_service",
  message: "Failed login attempt",
  details: { username: "user123", ip: "192.168.1.1" }
});

// Get security events
const events = await securityAgent.getSecurityEvents({
  severity: SecuritySeverity.HIGH,
  limit: 10
});
```

## SecurityMonitor

The `SecurityMonitor` component provides metrics collection and alerting:

- **Metrics Collection** - Collects security metrics over time
- **Alert Generation** - Generates alerts based on thresholds
- **Real-time Monitoring** - Monitors security events in real-time
- **Threshold Configuration** - Configurable thresholds for alerts

### Usage

```typescript
import { SecurityMonitor } from "../security/monitoring.js";

// Create monitor with custom options
const securityMonitor = new SecurityMonitor(config, logger, securityAgent, {
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

// Start monitoring
await securityMonitor.startMonitoring();

// Get metrics
const metrics = await securityMonitor.getMetrics({ limit: 10 });

// Get alerts
const alerts = await securityMonitor.getAlerts({
  severity: SecuritySeverity.HIGH,
  limit: 10
});

// Stop monitoring
await securityMonitor.stopMonitoring();
```

## EnhancedLinearWebhookHandler

The `EnhancedLinearWebhookHandler` component provides secure webhook processing:

- **Secure Validation** - Validates webhook content with security checks
- **Input Sanitization** - Sanitizes webhook input data
- **Rate Limiting** - Prevents abuse through rate limiting
- **Security Integration** - Integrates with SecurityAgent and SecurityMonitor

### Usage

```typescript
import { EnhancedLinearWebhookHandler } from "../security/enhanced-webhook-handler.js";

// Create handler with security components
const webhookHandler = new EnhancedLinearWebhookHandler(
  config,
  logger,
  securityAgent,
  securityMonitor
);

// Validate webhook
const event = await webhookHandler.validateWebhook(
  payload,
  signature,
  sourceIp,
  userAgent
);

if (!event) {
  console.error("Webhook validation failed");
}

// Process webhook
const processedEvent = await webhookHandler.processWebhook(event);
```

## Security Endpoints

The integration server provides the following security endpoints:

- **GET /security/metrics** - Returns security metrics
- **GET /security/alerts** - Returns security alerts
- **GET /security/events** - Returns security events

## Best Practices

1. **Always validate inputs** - Use SecurityValidator to validate all user inputs
2. **Log security events** - Use SecurityAgent to log security events
3. **Monitor security metrics** - Use SecurityMonitor to track security metrics
4. **Configure thresholds** - Set appropriate thresholds for alerts
5. **Use secure webhook handling** - Use EnhancedLinearWebhookHandler for webhooks
6. **Validate session IDs** - Use SecurityUtils.isValidSessionId for session validation
7. **Sanitize user input** - Use SecurityUtils.sanitizeString for user input

## Testing Security Components

The security components include comprehensive test suites:

- **validators.test.ts** - Tests for SecurityValidator
- **security-agent.test.ts** - Tests for SecurityAgent
- **monitoring.test.ts** - Tests for SecurityMonitor
- **enhanced-webhook-handler.test.ts** - Tests for EnhancedLinearWebhookHandler

Run the tests using:

```bash
npm test -- src/security/*.test.ts
```

## Security Configuration

The security components can be configured through the IntegrationServer:

```typescript
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
```

