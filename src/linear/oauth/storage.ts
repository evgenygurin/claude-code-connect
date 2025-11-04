/**
 * OAuth token storage for Linear integration
 */

import { promises as fs } from "fs";
import { join } from "path";
import * as crypto from "crypto";
import type { Logger } from "../../core/types.js";
import type { LinearOAuthToken, EncryptedOAuthToken } from "./types.js";

/**
 * OAuth token storage interface
 */
export interface OAuthTokenStorage {
  /** Save token for workspace */
  saveToken(workspaceId: string, token: LinearOAuthToken): Promise<void>;
  /** Load token for workspace */
  loadToken(workspaceId: string): Promise<LinearOAuthToken | null>;
  /** Delete token for workspace */
  deleteToken(workspaceId: string): Promise<void>;
  /** List all workspace IDs with tokens */
  listWorkspaces(): Promise<string[]>;
}

/**
 * File-based OAuth token storage
 */
export class FileOAuthStorage implements OAuthTokenStorage {
  private storageDir: string;
  private encryptionKey: string;
  private logger: Logger;

  constructor(storageDir: string, encryptionKey: string, logger: Logger) {
    this.storageDir = storageDir;
    this.encryptionKey = encryptionKey;
    this.logger = logger;
  }

  /**
   * Initialize storage
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      this.logger.debug("OAuth token storage initialized", {
        storageDir: this.storageDir,
      });
    } catch (error) {
      this.logger.error(
        "Failed to initialize OAuth token storage",
        error as Error,
      );
      throw error;
    }
  }

  /**
   * Save token for workspace
   */
  async saveToken(workspaceId: string, token: LinearOAuthToken): Promise<void> {
    try {
      // Encrypt sensitive fields
      const encryptedToken = this.encryptToken(token);

      // Save to file
      const tokenPath = this.getTokenPath(workspaceId);
      await fs.writeFile(
        tokenPath,
        JSON.stringify(encryptedToken, null, 2),
        "utf-8",
      );

      this.logger.debug("OAuth token saved", { workspaceId });
    } catch (error) {
      this.logger.error("Failed to save OAuth token", error as Error, {
        workspaceId,
      });
      throw error;
    }
  }

  /**
   * Load token for workspace
   */
  async loadToken(workspaceId: string): Promise<LinearOAuthToken | null> {
    try {
      const tokenPath = this.getTokenPath(workspaceId);

      // Check if token file exists
      try {
        await fs.access(tokenPath);
      } catch {
        return null;
      }

      // Read and parse token
      const tokenData = await fs.readFile(tokenPath, "utf-8");
      const encryptedToken = JSON.parse(tokenData) as EncryptedOAuthToken;

      // Decrypt token
      return this.decryptToken(encryptedToken);
    } catch (error) {
      this.logger.error("Failed to load OAuth token", error as Error, {
        workspaceId,
      });
      return null;
    }
  }

  /**
   * Delete token for workspace
   */
  async deleteToken(workspaceId: string): Promise<void> {
    try {
      const tokenPath = this.getTokenPath(workspaceId);

      // Check if token file exists
      try {
        await fs.access(tokenPath);
      } catch {
        return;
      }

      // Delete token file
      await fs.unlink(tokenPath);
      this.logger.debug("OAuth token deleted", { workspaceId });
    } catch (error) {
      this.logger.error("Failed to delete OAuth token", error as Error, {
        workspaceId,
      });
      throw error;
    }
  }

  /**
   * List all workspace IDs with tokens
   */
  async listWorkspaces(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.storageDir);
      return files
        .filter((file) => file.endsWith(".token.json"))
        .map((file) => file.replace(".token.json", ""));
    } catch (error) {
      this.logger.error("Failed to list OAuth tokens", error as Error);
      return [];
    }
  }

  /**
   * Get token file path for workspace
   */
  private getTokenPath(workspaceId: string): string {
    return join(this.storageDir, `${workspaceId}.token.json`);
  }

  /**
   * Encrypt OAuth token
   */
  private encryptToken(token: LinearOAuthToken): EncryptedOAuthToken {
    // Validate encryption key length (must be 32 bytes for AES-256)
    if (this.encryptionKey.length !== 32) {
      throw new Error("Encryption key must be exactly 32 bytes for AES-256");
    }

    // Generate random IV for each encryption operation
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(this.encryptionKey),
      iv,
    );

    // Encrypt access token
    let encryptedAccessToken = cipher.update(token.accessToken, "utf8", "hex");
    encryptedAccessToken += cipher.final("hex");

    // Encrypt refresh token if available
    let encryptedRefreshToken: string | undefined;
    if (token.refreshToken) {
      const refreshCipher = crypto.createCipheriv(
        "aes-256-cbc",
        Buffer.from(this.encryptionKey),
        iv,
      );
      encryptedRefreshToken = refreshCipher.update(
        token.refreshToken,
        "utf8",
        "hex",
      );
      encryptedRefreshToken += refreshCipher.final("hex");
    }

    // Return encrypted token
    return {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: token.expiresAt,
      obtainedAt: token.obtainedAt,
      scope: token.scope,
      tokenType: token.tokenType,
      userId: token.userId,
      userEmail: token.userEmail,
      workspaceName: token.workspaceName,
      iv: iv.toString("hex"),
    };
  }

  /**
   * Decrypt OAuth token
   */
  private decryptToken(token: EncryptedOAuthToken): LinearOAuthToken {
    // Parse IV
    const iv = Buffer.from(token.iv, "hex");

    // Create decipher
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(this.encryptionKey),
      iv,
    );

    // Decrypt access token
    let decryptedAccessToken = decipher.update(
      token.accessToken,
      "hex",
      "utf8",
    );
    decryptedAccessToken += decipher.final("utf8");

    // Decrypt refresh token if available
    let decryptedRefreshToken: string | undefined;
    if (token.refreshToken) {
      const refreshDecipher = crypto.createDecipheriv(
        "aes-256-cbc",
        Buffer.from(this.encryptionKey),
        iv,
      );
      decryptedRefreshToken = refreshDecipher.update(
        token.refreshToken,
        "hex",
        "utf8",
      );
      decryptedRefreshToken += refreshDecipher.final("utf8");
    }

    // Return decrypted token
    return {
      accessToken: decryptedAccessToken,
      refreshToken: decryptedRefreshToken,
      expiresAt: token.expiresAt,
      obtainedAt: token.obtainedAt,
      scope: token.scope,
      tokenType: token.tokenType,
      userId: token.userId,
      userEmail: token.userEmail,
      workspaceName: token.workspaceName,
    };
  }
}

/**
 * Memory-based OAuth token storage (for testing)
 */
export class MemoryOAuthStorage implements OAuthTokenStorage {
  private tokens: Map<string, LinearOAuthToken> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Save token for workspace
   */
  async saveToken(workspaceId: string, token: LinearOAuthToken): Promise<void> {
    this.tokens.set(workspaceId, { ...token });
    this.logger.debug("OAuth token saved in memory", { workspaceId });
  }

  /**
   * Load token for workspace
   */
  async loadToken(workspaceId: string): Promise<LinearOAuthToken | null> {
    const token = this.tokens.get(workspaceId);
    return token ? { ...token } : null;
  }

  /**
   * Delete token for workspace
   */
  async deleteToken(workspaceId: string): Promise<void> {
    this.tokens.delete(workspaceId);
    this.logger.debug("OAuth token deleted from memory", { workspaceId });
  }

  /**
   * List all workspace IDs with tokens
   */
  async listWorkspaces(): Promise<string[]> {
    return Array.from(this.tokens.keys());
  }
}

/**
 * Create OAuth token storage based on type
 */
export function createOAuthStorage(
  type: "file" | "memory",
  logger: Logger,
  options?: {
    storageDir?: string;
    encryptionKey?: string;
  },
): OAuthTokenStorage {
  if (type === "file") {
    if (!options?.storageDir) {
      throw new Error("Storage directory is required for file storage");
    }
    if (!options?.encryptionKey) {
      throw new Error("Encryption key is required for file storage");
    }
    return new FileOAuthStorage(
      options.storageDir,
      options.encryptionKey,
      logger,
    );
  } else {
    return new MemoryOAuthStorage(logger);
  }
}
