/**
 * Types for Linear OAuth integration
 */

/**
 * Linear OAuth token response
 */
export interface LinearOAuthToken {
  /** Access token for Linear API */
  accessToken: string;
  /** Refresh token for obtaining new access tokens */
  refreshToken?: string;
  /** Token expiration timestamp in milliseconds */
  expiresAt: number;
  /** Token obtained timestamp in milliseconds */
  obtainedAt: number;
  /** Scopes granted to the token */
  scope: string[];
  /** Token type (usually "Bearer") */
  tokenType: string;
  /** Linear user ID associated with the token */
  userId: string;
  /** Linear user email (if available) */
  userEmail?: string;
  /** Linear workspace name (if available) */
  workspaceName?: string;
}

/**
 * Encrypted OAuth token for storage
 */
export interface EncryptedOAuthToken
  extends Omit<LinearOAuthToken, "accessToken" | "refreshToken"> {
  /** Encrypted access token */
  accessToken: string;
  /** Encrypted refresh token (if available) */
  refreshToken?: string;
  /** Initialization vector used for encryption */
  iv: string;
}

/**
 * OAuth state for CSRF protection
 */
export interface OAuthState {
  /** State creation timestamp */
  createdAt: number;
  /** Redirect URI after OAuth completion */
  redirectUri: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Linear workspace metadata
 */
export interface WorkspaceMetadata {
  /** Workspace ID */
  id: string;
  /** Workspace name */
  name: string;
  /** Workspace URL key */
  urlKey: string;
  /** Organization ID (same as workspace ID) */
  organizationId: string;
  /** Teams in the workspace */
  teams: Array<{
    id: string;
    name: string;
    key: string;
  }>;
}

/**
 * OAuth configuration
 */
export interface OAuthConfig {
  /** Linear client ID */
  clientId: string;
  /** Linear client secret */
  clientSecret: string;
  /** OAuth redirect URI */
  redirectUri: string;
  /** Encryption key for token storage */
  encryptionKey: string;
}
