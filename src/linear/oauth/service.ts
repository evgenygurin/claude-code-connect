/**
 * OAuth service for Linear integration
 */

import * as crypto from "crypto";
import type { Logger } from "../../core/types.js";
import type {
  LinearOAuthToken,
  OAuthState,
  WorkspaceMetadata,
  OAuthConfig,
} from "./types.js";
import type { OAuthTokenStorage } from "./storage.js";

/**
 * Linear OAuth service
 */
export class LinearOAuthService {
  private config: OAuthConfig;
  private logger: Logger;
  private tokenStorage: OAuthTokenStorage;
  private stateStorage: Map<string, OAuthState> = new Map();

  constructor(
    config: OAuthConfig,
    tokenStorage: OAuthTokenStorage,
    logger: Logger
  ) {
    this.config = config;
    this.tokenStorage = tokenStorage;
    this.logger = logger;
  }

  /**
   * Generate authorization URL
   */
  generateAuthorizationUrl(callbackUrl?: string): {
    url: string;
    state: string;
  } {
    // Generate state for CSRF protection
    const state = crypto.randomUUID();

    // Store state with TTL
    const stateData: OAuthState = {
      createdAt: Date.now(),
      redirectUri: callbackUrl || this.config.redirectUri,
    };
    this.stateStorage.set(state, stateData);

    // Schedule state cleanup after 10 minutes
    setTimeout(() => {
      this.stateStorage.delete(state);
    }, 10 * 60 * 1000);

    // Build Linear OAuth URL
    const authUrl = new URL("https://linear.app/oauth/authorize");
    authUrl.searchParams.set("client_id", this.config.clientId);
    authUrl.searchParams.set("redirect_uri", this.config.redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set(
      "scope",
      "read,write,app:assignable,app:mentionable"
    );
    authUrl.searchParams.set("actor", "app");
    authUrl.searchParams.set("prompt", "consent");

    return {
      url: authUrl.toString(),
      state,
    };
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(
    code: string,
    state: string
  ): Promise<{
    token: LinearOAuthToken;
    workspace: WorkspaceMetadata;
    redirectUrl?: string;
  }> {
    // Validate state
    const stateData = this.stateStorage.get(state);
    if (!stateData) {
      throw new Error("Invalid or expired state");
    }

    // Delete state after use
    this.stateStorage.delete(state);

    // Exchange code for token
    const tokenResponse = await this.exchangeCodeForToken(code);

    // Get workspace info from token
    const workspaceInfo = await this.getWorkspaceInfo(
      tokenResponse.access_token
    );

    // Create token object
    const token: LinearOAuthToken = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Date.now() + tokenResponse.expires_in * 1000,
      obtainedAt: Date.now(),
      scope: tokenResponse.scope.split(" "),
      tokenType: tokenResponse.token_type,
      userId: workspaceInfo.userId,
      userEmail: workspaceInfo.userEmail,
      workspaceName: workspaceInfo.organization.name,
    };

    // Store token
    await this.tokenStorage.saveToken(workspaceInfo.organization.id, token);

    // Create workspace metadata
    const workspace: WorkspaceMetadata = {
      id: workspaceInfo.organization.id,
      name: workspaceInfo.organization.name,
      urlKey: workspaceInfo.organization.urlKey,
      organizationId: workspaceInfo.organization.id,
      teams: workspaceInfo.organization.teams?.nodes || [],
    };

    // Determine redirect URL
    let redirectUrl: string | undefined;
    if (stateData.redirectUri && stateData.redirectUri !== this.config.redirectUri) {
      const redirectUri = new URL(stateData.redirectUri);
      redirectUri.searchParams.set("token", token.accessToken);
      redirectUri.searchParams.set("workspaceId", workspace.id);
      redirectUri.searchParams.set("workspaceName", workspace.name);
      redirectUrl = redirectUri.toString();
    }

    return {
      token,
      workspace,
      redirectUrl,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    workspaceId: string
  ): Promise<LinearOAuthToken | null> {
    // Load existing token
    const existingToken = await this.tokenStorage.loadToken(workspaceId);
    if (!existingToken || !existingToken.refreshToken) {
      this.logger.warn("No refresh token available", { workspaceId });
      return null;
    }

    try {
      // Exchange refresh token for new access token
      const response = await fetch("https://api.linear.app/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: existingToken.refreshToken,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${error}`);
      }

      const tokenResponse = await response.json();

      // Create new token object
      const newToken: LinearOAuthToken = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || existingToken.refreshToken,
        expiresAt: Date.now() + tokenResponse.expires_in * 1000,
        obtainedAt: Date.now(),
        scope: tokenResponse.scope.split(" "),
        tokenType: tokenResponse.token_type,
        userId: existingToken.userId,
        userEmail: existingToken.userEmail,
        workspaceName: existingToken.workspaceName,
      };

      // Store new token
      await this.tokenStorage.saveToken(workspaceId, newToken);

      this.logger.info("Token refreshed successfully", { workspaceId });
      return newToken;
    } catch (error) {
      this.logger.error("Failed to refresh token", error as Error, {
        workspaceId,
      });
      return null;
    }
  }

  /**
   * Get valid token (refreshing if necessary)
   */
  async getValidToken(
    workspaceId: string
  ): Promise<LinearOAuthToken | null> {
    // Load existing token
    const token = await this.tokenStorage.loadToken(workspaceId);
    if (!token) {
      return null;
    }

    // Check if token is expired or about to expire (5 minutes buffer)
    const isExpired = token.expiresAt < Date.now() + 5 * 60 * 1000;
    if (isExpired && token.refreshToken) {
      // Refresh token
      return await this.refreshToken(workspaceId);
    }

    return token;
  }

  /**
   * Revoke token
   */
  async revokeToken(workspaceId: string): Promise<boolean> {
    try {
      // Load existing token
      const token = await this.tokenStorage.loadToken(workspaceId);
      if (!token) {
        return true;
      }

      // Revoke token with Linear API
      const response = await fetch("https://api.linear.app/oauth/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          token: token.accessToken,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token revocation failed: ${error}`);
      }

      // Delete token from storage
      await this.tokenStorage.deleteToken(workspaceId);

      this.logger.info("Token revoked successfully", { workspaceId });
      return true;
    } catch (error) {
      this.logger.error("Failed to revoke token", error as Error, {
        workspaceId,
      });
      return false;
    }
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(code: string): Promise<any> {
    const response = await fetch("https://api.linear.app/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code: code,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    return await response.json();
  }

  /**
   * Get workspace information using access token
   */
  private async getWorkspaceInfo(accessToken: string): Promise<any> {
    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        query: `
          query {
            viewer {
              id
              name
              email
              organization {
                id
                name
                urlKey
                teams {
                  nodes {
                    id
                    key
                    name
                  }
                }
              }
            }
          }
        `,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get workspace info");
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return {
      userId: data.data.viewer.id,
      userEmail: data.data.viewer.email,
      organization: data.data.viewer.organization,
    };
  }
}

