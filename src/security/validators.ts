/**
 * Security validation utilities for Claude Code + Linear Integration
 */

import { z } from "zod";
import { resolve, relative } from "path";
import { promises as fs } from "fs";

/**
 * Secure session ID schema - only alphanumeric and safe characters
 */
export const SecureSessionIdSchema = z
  .string()
  .regex(
    /^[a-zA-Z0-9_-]{8,64}$/,
    "Session ID must be 8-64 characters, alphanumeric, underscore, or hyphen only",
  );

/**
 * Secure branch name schema
 */
export const SecureBranchNameSchema = z
  .string()
  .regex(
    /^[a-zA-Z0-9/_-]{1,100}$/,
    "Branch name must be 1-100 characters, alphanumeric, slash, underscore, or hyphen only",
  )
  .refine(
    (name) => !name.startsWith("-") && !name.endsWith("-"),
    "Branch name cannot start or end with hyphen",
  )
  .refine(
    (name) => !name.includes(".."),
    "Branch name cannot contain double dots",
  );

/**
 * Secure file path schema
 */
export const SecureFilePathSchema = z
  .string()
  .min(1, "File path cannot be empty")
  .max(4096, "File path too long")
  .refine((path) => !path.includes("\0"), "File path cannot contain null bytes")
  .refine(
    (path) => !path.includes(".."),
    "File path cannot contain parent directory references",
  );

/**
 * Webhook payload size limit (1MB)
 */
export const MAX_WEBHOOK_PAYLOAD_SIZE = 1024 * 1024;

/**
 * Linear webhook event validation schema
 */
export const LinearWebhookEventSchema = z.object({
  action: z.enum(["create", "update", "remove"]),
  actor: z.object({
    id: z.string().uuid("Actor ID must be a valid UUID"),
    name: z.string().min(1).max(100),
    email: z.string().email().optional(),
    displayName: z.string().max(100).optional(),
  }),
  type: z.string().min(1).max(50),
  data: z.any(),
  url: z.string().url().optional(),
  organizationId: z.string().uuid("Organization ID must be a valid UUID"),
  webhookId: z.string().uuid("Webhook ID must be a valid UUID"),
  createdAt: z.string().datetime("Created at must be a valid ISO datetime"),
});

/**
 * Issue data validation schema with security constraints
 */
export const SecureIssueSchema = z.object({
  id: z.string().uuid("Issue ID must be a valid UUID"),
  identifier: z
    .string()
    .regex(
      /^[A-Z]{2,10}-\d{1,6}$/,
      "Issue identifier must follow format ABC-123",
    ),
  title: z
    .string()
    .min(1)
    .max(500)
    .refine(
      (title) => !/<script|javascript:|on\w+=/i.test(title),
      "Issue title contains potentially dangerous content",
    ),
  description: z
    .string()
    .max(50000)
    .optional()
    .refine(
      (desc) => !desc || !/<script|javascript:|on\w+=/i.test(desc),
      "Issue description contains potentially dangerous content",
    ),
  url: z.string().url(),
  state: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    type: z.string().min(1).max(50),
  }),
  assignee: z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1).max(100),
    })
    .optional(),
  creator: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
  }),
  team: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    key: z.string().min(1).max(20),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Command validation schema
 */
export const CommandValidationSchema = z.object({
  command: z.string().min(1).max(1000),
  args: z.array(z.string().max(500)).max(50),
  workingDir: SecureFilePathSchema,
  timeout: z.number().int().min(1000).max(3600000), // 1 second to 1 hour
});

/**
 * Security validation utilities
 */
export class SecurityValidator {
  private blockedCommands: Set<string>;
  private blockedPaths: Set<string>;
  private maxPathDepth: number;

  constructor(
    options: {
      blockedCommands?: string[];
      blockedPaths?: string[];
      maxPathDepth?: number;
    } = {},
  ) {
    this.blockedCommands = new Set(
      options.blockedCommands || [
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
    );

    this.blockedPaths = new Set(
      options.blockedPaths || [
        "/etc",
        "/var",
        "/usr",
        "/sys",
        "/proc",
        "/dev",
        "/root",
        "/boot",
      ],
    );

    this.maxPathDepth = options.maxPathDepth || 10;
  }

  /**
   * Validate and sanitize branch name
   */
  validateBranchName(name: string): {
    valid: boolean;
    sanitized?: string;
    error?: string;
  } {
    try {
      // First sanitize
      let sanitized = name
        .toLowerCase()
        .replace(/[^a-zA-Z0-9/_-]/g, "-") // Replace invalid chars with hyphens
        .replace(/--+/g, "-") // Collapse multiple hyphens
        .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
        .substring(0, 100); // Limit length

      // Validate the sanitized version
      const result = SecureBranchNameSchema.safeParse(sanitized);

      if (!result.success) {
        return {
          valid: false,
          error: `Invalid branch name: ${result.error.issues[0].message}`,
        };
      }

      return {
        valid: true,
        sanitized,
      };
    } catch (error) {
      return {
        valid: false,
        error: `Branch name validation error: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Validate file path for security
   */
  validateFilePath(
    filePath: string,
    projectRoot: string,
  ): { valid: boolean; resolved?: string; error?: string } {
    try {
      // Basic schema validation
      const schemaResult = SecureFilePathSchema.safeParse(filePath);
      if (!schemaResult.success) {
        return {
          valid: false,
          error: `Invalid file path: ${schemaResult.error.issues[0].message}`,
        };
      }

      // Resolve paths
      const resolvedPath = resolve(filePath);
      const resolvedProjectRoot = resolve(projectRoot);

      // Check if path is within project bounds
      if (!resolvedPath.startsWith(resolvedProjectRoot)) {
        return {
          valid: false,
          error: "File path is outside project directory",
        };
      }

      // Check for blocked paths
      for (const blockedPath of this.blockedPaths) {
        if (resolvedPath.startsWith(blockedPath)) {
          return {
            valid: false,
            error: `Access to ${blockedPath} is blocked`,
          };
        }
      }

      // Check path depth
      const relativePath = relative(resolvedProjectRoot, resolvedPath);
      const depth = relativePath.split("/").length;

      if (depth > this.maxPathDepth) {
        return {
          valid: false,
          error: `Path depth ${depth} exceeds maximum ${this.maxPathDepth}`,
        };
      }

      return {
        valid: true,
        resolved: resolvedPath,
      };
    } catch (error) {
      return {
        valid: false,
        error: `Path validation error: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Validate command for execution
   */
  validateCommand(
    command: string,
    args: string[] = [],
  ): {
    valid: boolean;
    sanitized?: { command: string; args: string[] };
    error?: string;
  } {
    try {
      // SECURITY: Check for injection attempts in command
      const commandInjectionCheck = this.detectInjectionAttempts(command);
      if (
        commandInjectionCheck.detected &&
        commandInjectionCheck.severity === "high"
      ) {
        return {
          valid: false,
          error: `Command contains security threats: ${commandInjectionCheck.threats.join(", ")}`,
        };
      }

      // SECURITY: Check for injection attempts in arguments
      for (const arg of args) {
        const argInjectionCheck = this.detectInjectionAttempts(arg);
        if (
          argInjectionCheck.detected &&
          argInjectionCheck.severity === "high"
        ) {
          return {
            valid: false,
            error: `Argument contains security threats: ${argInjectionCheck.threats.join(", ")}`,
          };
        }
      }

      // Extract base command
      const baseCommand = command.split(" ")[0].toLowerCase();

      // Check blocked commands
      if (this.blockedCommands.has(baseCommand)) {
        return {
          valid: false,
          error: `Command '${baseCommand}' is blocked for security reasons`,
        };
      }

      // Only allow allowlisted commands for security
      const allowedCommands = new Set([
        "git",
        "npm",
        "node",
        "python",
        "python3",
        "pip",
        "pip3",
        "ls",
        "cd",
        "pwd",
        "mkdir",
        "touch",
        "cat",
        "echo",
        "claude",
        "claude-code",
      ]);

      if (!allowedCommands.has(baseCommand)) {
        return {
          valid: false,
          error: `Command '${baseCommand}' is not in the allowed command list`,
        };
      }

      // Validate against schema
      const validationResult = CommandValidationSchema.safeParse({
        command,
        args,
        workingDir: "/tmp", // placeholder for schema validation
        timeout: 30000,
      });

      if (!validationResult.success) {
        return {
          valid: false,
          error: `Command validation failed: ${validationResult.error.issues[0].message}`,
        };
      }

      // SECURITY: Strict sanitization - reject instead of sanitize if dangerous chars found
      for (const arg of args) {
        if (/[;&|`$(){}]/.test(arg)) {
          return {
            valid: false,
            error: `Argument contains forbidden shell metacharacters: ${arg}`,
          };
        }
      }

      // Sanitize arguments (only safe operations)
      const sanitizedArgs = args.map(
        (arg) =>
          arg
            .replace(/\0/g, "") // Remove null bytes
            .substring(0, 500), // Limit length
      );

      return {
        valid: true,
        sanitized: {
          command: command.substring(0, 1000),
          args: sanitizedArgs,
        },
      };
    } catch (error) {
      return {
        valid: false,
        error: `Command validation error: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Validate working directory
   */
  async validateWorkingDirectory(
    workingDir: string,
    projectRoot: string,
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Basic path validation
      const pathResult = this.validateFilePath(workingDir, projectRoot);
      if (!pathResult.valid) {
        return pathResult;
      }

      // Check if directory exists and is accessible
      try {
        const stats = await fs.stat(pathResult.resolved!);
        if (!stats.isDirectory()) {
          return {
            valid: false,
            error: "Working directory path is not a directory",
          };
        }
      } catch (error) {
        if ((error as { code?: string }).code === "ENOENT") {
          // Directory doesn't exist - this might be OK for new sessions
          return { valid: true };
        }

        return {
          valid: false,
          error: `Cannot access working directory: ${(error as Error).message}`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Working directory validation error: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Validate webhook payload size
   */
  validateWebhookPayloadSize(payload: string): {
    valid: boolean;
    error?: string;
  } {
    const size = Buffer.byteLength(payload, "utf8");

    if (size > MAX_WEBHOOK_PAYLOAD_SIZE) {
      return {
        valid: false,
        error: `Webhook payload size ${size} exceeds maximum ${MAX_WEBHOOK_PAYLOAD_SIZE} bytes`,
      };
    }

    return { valid: true };
  }

  /**
   * Sanitize issue description for safe processing
   */
  sanitizeIssueDescription(description: string): string {
    return (
      description
        // Remove script tags
        .replace(/<script[^>]*>.*?<\/script>/gi, "")
        // Remove javascript: protocols
        .replace(/javascript:/gi, "")
        // Remove event handlers
        .replace(/on\w+\s*=/gi, "")
        // Remove null bytes
        .replace(/\0/g, "")
        // Limit length
        .substring(0, 50000)
    );
  }

  /**
   * Validate session metadata
   */
  validateSessionMetadata(metadata: Record<string, unknown>): {
    valid: boolean;
    sanitized?: Record<string, unknown>;
    error?: string;
  } {
    try {
      const sanitized: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(metadata)) {
        // Validate key
        if (!/^[a-zA-Z0-9_-]{1,50}$/.test(key)) {
          return {
            valid: false,
            error: `Invalid metadata key: ${key}`,
          };
        }

        // Sanitize value based on type
        if (typeof value === "string") {
          sanitized[key] = value.substring(0, 1000).replace(/\0/g, "");
        } else if (typeof value === "number") {
          sanitized[key] = Number.isFinite(value) ? value : 0;
        } else if (typeof value === "boolean") {
          sanitized[key] = value;
        } else if (value === null || value === undefined) {
          sanitized[key] = value;
        } else {
          // For complex objects, convert to string and sanitize
          sanitized[key] = JSON.stringify(value).substring(0, 1000);
        }
      }

      return {
        valid: true,
        sanitized,
      };
    } catch (error) {
      return {
        valid: false,
        error: `Metadata validation error: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Validate environment variables for Claude process
   */
  validateEnvironmentVariables(
    env: Record<string, string>,
    allowedVars: string[],
  ): { valid: boolean; sanitized?: Record<string, string>; error?: string } {
    try {
      const sanitized: Record<string, string> = {};
      const allowedVarsSet = new Set(allowedVars);

      for (const [key, value] of Object.entries(env)) {
        // Check if variable is allowed
        if (!allowedVarsSet.has(key)) {
          continue; // Skip disallowed variables
        }

        // Validate key format
        if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
          return {
            valid: false,
            error: `Invalid environment variable name: ${key}`,
          };
        }

        // Sanitize value
        const sanitizedValue = value
          .replace(/\0/g, "") // Remove null bytes
          .substring(0, 4096); // Limit length

        sanitized[key] = sanitizedValue;
      }

      return {
        valid: true,
        sanitized,
      };
    } catch (error) {
      return {
        valid: false,
        error: `Environment validation error: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Check if string contains potential injection attempts
   */
  detectInjectionAttempts(input: string): {
    detected: boolean;
    threats: string[];
    severity: "low" | "medium" | "high";
  } {
    const threats: string[] = [];
    let severity: "low" | "medium" | "high" = "low";

    // Command injection patterns
    const commandPatterns = [/[;&|`$()]/g, /\$\{.*\}/g, /\$\(.*\)/g, /`.*`/g];

    for (const pattern of commandPatterns) {
      if (pattern.test(input)) {
        threats.push("Command injection attempt");
        severity = "high";
        break;
      }
    }

    // Path traversal patterns
    if (/\.\.\/|\.\.\\/.test(input)) {
      threats.push("Path traversal attempt");
      severity = severity === "high" ? "high" : "medium";
    }

    // Script injection patterns
    if (/<script|javascript:|on\w+=/i.test(input)) {
      threats.push("Script injection attempt");
      severity = severity === "high" ? "high" : "medium";
    }

    // Null byte injection
    if (/\0/.test(input)) {
      threats.push("Null byte injection");
      severity = severity === "high" ? "high" : "medium";
    }

    // SQL injection patterns (basic)
    if (
      /(\b(union|select|insert|update|delete|drop|create|alter)\b)/i.test(input)
    ) {
      threats.push("Potential SQL injection");
      severity = severity === "high" ? "high" : "medium";
    }

    return {
      detected: threats.length > 0,
      threats,
      severity,
    };
  }

  /**
   * Generate secure session ID
   */
  generateSecureSessionId(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
    let result = "";

    // Use crypto.getRandomValues for secure randomness
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);

    for (let i = 0; i < 32; i++) {
      result += chars[randomBytes[i] % chars.length];
    }

    return result;
  }

  /**
   * Update blocked commands list
   */
  updateBlockedCommands(commands: string[]): void {
    this.blockedCommands = new Set(commands);
  }

  /**
   * Update blocked paths list
   */
  updateBlockedPaths(paths: string[]): void {
    this.blockedPaths = new Set(paths);
  }

  /**
   * Get current security configuration
   */
  getConfiguration(): {
    blockedCommands: string[];
    blockedPaths: string[];
    maxPathDepth: number;
  } {
    return {
      blockedCommands: Array.from(this.blockedCommands),
      blockedPaths: Array.from(this.blockedPaths),
      maxPathDepth: this.maxPathDepth,
    };
  }
}

/**
 * Default security validator instance
 */
export const defaultSecurityValidator = new SecurityValidator();

/**
 * Utility functions for common validation tasks
 */
export const SecurityUtils = {
  /**
   * Quick validation for session ID
   */
  isValidSessionId: (id: string): boolean => {
    return SecureSessionIdSchema.safeParse(id).success;
  },

  /**
   * Quick validation for UUID
   */
  isValidUUID: (id: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    );
  },

  /**
   * Quick validation for email
   */
  isValidEmail: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  /**
   * Safe string truncation
   */
  truncateString: (str: string, maxLength: number): string => {
    return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
  },

  /**
   * Remove dangerous characters
   */
  sanitizeString: (str: string): string => {
    return str
      .replace(/[<>'"&]/g, "") // Remove HTML/XML characters
      .replace(/\0/g, "") // Remove null bytes
      .replace(/[\r\n]/g, " ") // Replace line breaks with spaces
      .trim();
  },
};
