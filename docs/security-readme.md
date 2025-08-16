# Security System Documentation

## Claude Code + Linear Integration Security

This document provides comprehensive documentation for the security system implemented in the Claude Code + Linear integration project.

## Overview

The security system provides multi-layered protection for the webhook handling, session management, and Claude Code execution components. It includes real-time monitoring, threat detection, input validation, and comprehensive audit logging.

## Security Components

### 1. Security Agent (`src/security/security-agent.ts`)

The central security orchestrator that provides:

- **Webhook Security Validation**: Signature verification, rate limiting, payload validation
- **Session Security**: Secure session ID generation, validation, isolation
- **Input Sanitization**: Context-aware sanitization for all user inputs
- **Threat Detection**: Real-time detection of injection attempts and suspicious activity
- **Security Event Logging**: Comprehensive audit trail of all security events

#### Key Features

```typescript
// Validate webhook with comprehensive security checks
const result = await securityAgent.validateWebhook(
  payloadString,
  signature,
  userAgent,
  sourceIp
);

// Sanitize user input based on context
const safeBranchName = securityAgent.sanitizeInput(userInput, 'branch_name');

// Create secure environment for Claude execution
const secureEnv = securityAgent.createSecureEnvironment(session);
```

### 2. Security Validators (`src/security/validators.ts`)

Specialized validation utilities for different types of input:

- **Session ID Validation**: Cryptographically secure ID generation and validation
- **File Path Validation**: Path traversal prevention and directory boundary enforcement
- **Command Validation**: Command injection prevention with allowlist filtering
- **Input Sanitization**: Context-specific sanitization for various input types
- **Injection Detection**: Advanced pattern matching for various attack vectors

#### Usage Examples

```typescript
// Validate file path for security
const pathResult = validator.validateFilePath(userPath, projectRoot);
if (!pathResult.valid) {
  throw new Error(`Security violation: ${pathResult.error}`);
}

// Detect injection attempts
const injectionCheck = validator.detectInjectionAttempts(userInput);
if (injectionCheck.detected) {
  // Handle security threat
  handleSecurityThreat(injectionCheck);
}
```

### 3. Security Monitor (`src/security/monitoring.ts`)

Real-time security monitoring and alerting system:

- **Metrics Collection**: Continuous collection of security and performance metrics
- **Threshold Monitoring**: Automated threshold checking with configurable limits
- **Real-time Alerts**: Immediate notifications for critical security events
- **Trend Analysis**: Historical analysis and reporting capabilities
- **Alert Management**: Comprehensive alert lifecycle management

#### Key Capabilities

```typescript
// Start security monitoring
await securityMonitor.startMonitoring();

// Get security metrics
const metrics = securityMonitor.getMetrics(startDate, endDate);

// Generate security report
const report = securityMonitor.generateReport(7); // Last 7 days
```

### 4. Enhanced Webhook Handler (`src/security/enhanced-webhook-handler.ts`)

Secure webhook processing with integrated security features:

- **Multi-layer Validation**: Schema validation, security validation, business logic validation
- **Threat Detection**: Real-time injection detection in webhook payloads
- **Rate Limiting**: Per-IP rate limiting with configurable thresholds
- **Audit Logging**: Comprehensive logging of all webhook processing events
- **Security Event Integration**: Seamless integration with security monitoring

## Security Testing

### Automated Security Tests (`src/security/security-tests.ts`)

Comprehensive security testing suite covering:

- **Injection Attack Prevention**: SQL injection, command injection, XSS prevention
- **Path Traversal Protection**: Directory traversal and file access controls
- **Authentication Security**: Token validation and authentication mechanisms
- **Session Security**: Session ID generation, validation, and lifecycle
- **Input Validation**: Comprehensive input sanitization testing
- **Rate Limiting**: Rate limiting effectiveness and bypass prevention

### Running Security Tests

```bash
# Run basic security tests
npm run security:test

# Run with verbose output
npm run security:test:verbose

# Generate security report
npm run security:test:report

# Run specific test categories
tsx src/security/run-security-tests.ts --category injection
tsx src/security/run-security-tests.ts --category validation
```

### Test Categories

- **`all`**: Run all security tests (default)
- **`validation`**: Input validation and sanitization tests
- **`injection`**: Injection attack prevention tests
- **`auth`**: Authentication and authorization tests
- **`monitoring`**: Security monitoring and alerting tests

## Security Configuration

### Default Security Settings

```typescript
const DEFAULT_SECURITY_CONFIG = {
  enableWebhookSignatureValidation: true,
  enableRateLimiting: true,
  enableInputSanitization: true,
  enableAuditLogging: true,
  enableProcessSandboxing: true,
  rateLimitConfig: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  },
  maxSessionDuration: 60 * 60 * 1000, // 1 hour
  maxConcurrentSessions: 5,
  allowedEnvironmentVars: [
    'PATH', 'HOME', 'USER', 'LANG', 'LC_ALL',
    'TERM', 'SHELL', 'PWD', 'TMPDIR'
  ],
  blockedCommands: [
    'rm', 'rmdir', 'del', 'deltree', 'format',
    'fdisk', 'mkfs', 'dd', 'curl', 'wget',
    'nc', 'netcat', 'ssh', 'scp', 'rsync'
  ]
};
```

### Environment Variables

```bash
# Security configuration
LINEAR_WEBHOOK_SECRET=your-webhook-secret-here
SECURITY_ENABLE_RATE_LIMITING=true
SECURITY_ENABLE_AUDIT_LOGGING=true
SECURITY_MAX_SESSION_DURATION=3600000  # 1 hour in ms
SECURITY_MAX_CONCURRENT_SESSIONS=10

# Monitoring configuration
SECURITY_ENABLE_MONITORING=true
SECURITY_METRICS_RETENTION_DAYS=30
SECURITY_ALERT_WEBHOOK_URL=https://your-alert-endpoint.com/webhook
```

## Security Threats and Mitigations

### 1. Command Injection

**Threat**: Malicious Linear issue descriptions or comments containing shell commands

**Mitigation**:

- Input sanitization for all user-provided content
- Command allowlisting for Claude execution
- Environment variable filtering
- Process sandboxing

### 2. Path Traversal

**Threat**: Attempts to access files outside project boundaries

**Mitigation**:

- Path canonicalization and validation
- Directory boundary enforcement
- Working directory isolation
- File system access controls

### 3. Session Hijacking

**Threat**: Unauthorized access to Claude sessions

**Mitigation**:

- Cryptographically secure session ID generation
- Session encryption and validation
- Session timeout enforcement
- Session isolation

### 4. Webhook Spoofing

**Threat**: Forged webhook requests triggering unauthorized actions

**Mitigation**:

- HMAC-SHA256 signature validation
- Timestamp validation for replay protection
- Rate limiting per source IP
- User-Agent validation

### 5. Resource Exhaustion

**Threat**: Denial of service through resource consumption

**Mitigation**:

- Session duration limits
- Concurrent session limits
- Memory usage monitoring
- Process timeout enforcement

## Security Monitoring and Alerting

### Security Events

The system tracks various security event types:

- `AUTHENTICATION_FAILURE`: Failed authentication attempts
- `AUTHORIZATION_VIOLATION`: Unauthorized access attempts
- `INPUT_VALIDATION_FAILURE`: Invalid or malicious input detected
- `WEBHOOK_SIGNATURE_INVALID`: Invalid webhook signatures
- `RATE_LIMIT_EXCEEDED`: Rate limit violations
- `SESSION_ANOMALY`: Unusual session behavior
- `COMMAND_INJECTION_ATTEMPT`: Command injection attempts
- `PATH_TRAVERSAL_ATTEMPT`: Path traversal attempts
- `RESOURCE_EXHAUSTION`: Resource limit violations
- `SUSPICIOUS_ACTIVITY`: General suspicious behavior

### Security Metrics

Continuously monitored metrics include:

- Active session count
- Failed authentication rate
- Blocked request count
- Memory usage
- CPU usage
- Security event counts by severity

### Alert Thresholds

Default alert thresholds:

- **Critical Events**: > 5 per hour
- **Failed Authentication**: > 10 per minute
- **Session Duration**: > 60 minutes
- **Concurrent Sessions**: > 10
- **Memory Usage**: > 1GB
- **CPU Usage**: > 80%

## Integration Guide

### Basic Integration

```typescript
import { SecurityAgent } from './src/security/security-agent.js';
import { SecurityMonitor } from './src/security/monitoring.js';
import { EnhancedLinearWebhookHandler } from './src/security/enhanced-webhook-handler.js';

// Initialize security components
const securityAgent = new SecurityAgent(config, logger);
const securityMonitor = new SecurityMonitor(config, logger, securityAgent);
const webhookHandler = new EnhancedLinearWebhookHandler(
  config, 
  logger, 
  securityAgent, 
  securityMonitor
);

// Start monitoring
await securityMonitor.startMonitoring();

// Process webhooks securely
const result = await webhookHandler.validateWebhook(
  payload, 
  signature, 
  userAgent, 
  sourceIp
);
```

### Custom Security Configuration

```typescript
const customSecurityConfig = {
  enableWebhookSignatureValidation: true,
  enableRateLimiting: true,
  rateLimitConfig: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 50 // Stricter rate limiting
  },
  maxSessionDuration: 30 * 60 * 1000, // 30 minutes
  blockedCommands: [
    ...DEFAULT_BLOCKED_COMMANDS,
    'python', 'node', 'ruby' // Block scripting languages
  ]
};

const securityAgent = new SecurityAgent(config, logger, customSecurityConfig);
```

## Security Best Practices

### Development

1. **Always validate input**: Use security validators for all user input
2. **Sanitize output**: Ensure all output is properly sanitized
3. **Use secure defaults**: Configure security features with secure defaults
4. **Regular security testing**: Run security tests in CI/CD pipeline
5. **Monitor security events**: Implement comprehensive security monitoring

### Deployment

1. **Configure webhook secrets**: Always use strong webhook secrets in production
2. **Enable HTTPS**: Use HTTPS for all webhook endpoints
3. **Set up monitoring**: Configure real-time security monitoring and alerting
4. **Regular updates**: Keep dependencies and security configurations updated
5. **Backup and recovery**: Implement secure backup and recovery procedures

### Operations

1. **Monitor security dashboards**: Regular review of security metrics and alerts
2. **Incident response**: Have clear procedures for security incident response
3. **Security audits**: Regular security audits and penetration testing
4. **Training**: Security awareness training for development team
5. **Documentation**: Keep security documentation updated

## Troubleshooting

### Common Issues

**"Webhook signature validation failed"**

- Verify `LINEAR_WEBHOOK_SECRET` is correctly configured
- Check webhook signature format (should be `sha256=...`)
- Ensure payload is not modified in transit

**"Rate limit exceeded"**

- Check if legitimate traffic is being rate limited
- Adjust rate limiting configuration if needed
- Investigate potential DDoS attacks

**"Session validation failed"**

- Check session ID format and generation
- Verify session timeout configuration
- Review session storage and retrieval logic

**"Command blocked by security policy"**

- Review blocked commands configuration
- Ensure legitimate commands are allowlisted
- Check command sanitization logic

### Debug Mode

Enable debug logging for detailed security event information:

```bash
DEBUG=true npm start
```

### Security Logs

Security events are logged to:

- Console (with appropriate log levels)
- Security audit files: `logs/security/security-audit-YYYY-MM-DD.json`
- Security alerts: `logs/security/alerts/alert-{id}.json`

## Performance Considerations

### Security Impact

- **Input validation**: ~1-5ms per request
- **Security monitoring**: ~10MB memory overhead
- **Audit logging**: ~100KB per day per active session
- **Rate limiting**: ~0.1ms per request

### Optimization Tips

1. **Batch security events**: Reduce logging overhead by batching events
2. **Async processing**: Process security events asynchronously
3. **Efficient validation**: Use optimized validation patterns
4. **Memory management**: Regular cleanup of old security data
5. **Caching**: Cache validation results where appropriate

## Security Roadmap

### Planned Enhancements

1. **Advanced threat detection**: Machine learning-based anomaly detection
2. **Integration security**: Additional API security features
3. **Compliance reporting**: SOC 2, GDPR compliance reports
4. **Security automation**: Automated incident response
5. **Forensic capabilities**: Enhanced logging and analysis tools

### Version History

- **v1.0.0**: Initial security system implementation
- **v1.1.0**: Enhanced monitoring and alerting (planned)
- **v1.2.0**: Advanced threat detection (planned)
- **v2.0.0**: Complete security framework overhaul (planned)

## Support and Resources

### Documentation

- [Security Analysis Report](./security-analysis-report.md)
- [API Security Guidelines](./api-security-guidelines.md)
- [Incident Response Playbook](./incident-response-playbook.md)

### Tools

- Security test runner: `npm run security:test`
- Security monitoring: `npm run security:monitor`
- Vulnerability scanner: `npm run security:scan`

### Contacts

- **Security Team**: <security@yourorganization.com>
- **Emergency Response**: +1-555-SECURITY
- **Documentation Issues**: <docs@yourorganization.com>

---

**Last Updated**: 2025-08-16  
**Security Version**: 1.0.0  
**Threat Model Version**: 1.0.0
