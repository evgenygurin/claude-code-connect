/**
 * OAuth controller for Linear integration
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { Logger } from "../../core/types.js";
import { LinearOAuthService } from "./service.js";

/**
 * OAuth controller for Linear integration
 */
export class LinearOAuthController {
  private oauthService: LinearOAuthService;
  private logger: Logger;

  constructor(oauthService: LinearOAuthService, logger: Logger) {
    this.oauthService = oauthService;
    this.logger = logger;
  }

  /**
   * Register routes with Fastify
   */
  registerRoutes(app: FastifyInstance): void {
    // Start OAuth flow
    app.get("/oauth/authorize", this.handleAuthorize.bind(this));

    // OAuth callback
    app.get("/oauth/callback", this.handleCallback.bind(this));

    // Disconnect workspace
    app.post("/oauth/disconnect", this.handleDisconnect.bind(this));

    // Get workspace status
    app.get("/oauth/status/:workspaceId", this.handleStatus.bind(this));
  }

  /**
   * Handle OAuth authorization request
   */
  async handleAuthorize(
    request: FastifyRequest<{
      Querystring: { callback?: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const callbackUrl = request.query.callback;
      const { url } = this.oauthService.generateAuthorizationUrl(callbackUrl);

      this.logger.debug("Redirecting to Linear OAuth", {
        redirectUrl: url,
      });

      return reply.redirect(url);
    } catch (error) {
      this.logger.error("OAuth authorization error", error as Error);
      return reply.code(500).send({
        error: "Failed to start OAuth flow",
        message: (error as Error).message,
      });
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(
    request: FastifyRequest<{
      Querystring: { code?: string; state?: string; error?: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { code, state, error } = request.query;

      if (error) {
        this.logger.warn("OAuth error from Linear", { error });
        return reply.code(400).send({
          error: "OAuth error",
          message: error,
        });
      }

      if (!code || !state) {
        this.logger.warn("Missing code or state in OAuth callback", {
          code: !!code,
          state: !!state,
        });
        return reply.code(400).send({
          error: "Missing parameters",
          message: "Code and state are required",
        });
      }

      // Process OAuth callback
      const result = await this.oauthService.handleCallback(code, state);

      // If there's a custom redirect URL, use it
      if (result.redirectUrl) {
        return reply.redirect(result.redirectUrl);
      }

      // Otherwise, return success HTML
      const html = this.generateSuccessHtml(result.workspace.name);
      return reply
        .code(200)
        .header("Content-Type", "text/html; charset=utf-8")
        .send(html);
    } catch (error) {
      this.logger.error("OAuth callback error", error as Error);
      return reply.code(500).send({
        error: "OAuth callback failed",
        message: (error as Error).message,
      });
    }
  }

  /**
   * Handle workspace disconnection
   */
  async handleDisconnect(
    request: FastifyRequest<{
      Body: { workspaceId: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { workspaceId } = request.body;

      if (!workspaceId) {
        return reply.code(400).send({
          error: "Missing workspaceId",
          message: "Workspace ID is required",
        });
      }

      const success = await this.oauthService.revokeToken(workspaceId);

      if (success) {
        return reply.code(200).send({
          success: true,
          message: "Workspace disconnected successfully",
        });
      } else {
        return reply.code(500).send({
          error: "Failed to disconnect workspace",
          message: "Token revocation failed",
        });
      }
    } catch (error) {
      this.logger.error("Workspace disconnection error", error as Error);
      return reply.code(500).send({
        error: "Failed to disconnect workspace",
        message: (error as Error).message,
      });
    }
  }

  /**
   * Handle workspace status check
   */
  async handleStatus(
    request: FastifyRequest<{
      Params: { workspaceId: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const { workspaceId } = request.params;

      const token = await this.oauthService.getValidToken(workspaceId);

      return reply.code(200).send({
        connected: !!token,
        expiresAt: token?.expiresAt,
        userId: token?.userId,
        workspaceName: token?.workspaceName,
      });
    } catch (error) {
      this.logger.error("Workspace status check error", error as Error);
      return reply.code(500).send({
        error: "Failed to check workspace status",
        message: (error as Error).message,
      });
    }
  }

  /**
   * Generate success HTML
   */
  private generateSuccessHtml(workspaceName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Linear Integration Connected</title>
        <style>
          body { 
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", sans-serif;
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px; 
            text-align: center;
            color: #333;
            line-height: 1.5;
          }
          .success { 
            background-color: #d4edda; 
            color: #155724; 
            border: 1px solid #c3e6cb; 
            padding: 30px; 
            border-radius: 8px;
            margin-bottom: 30px;
          }
          h1 { 
            margin-top: 0;
            font-weight: 600;
          }
          .icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
          .info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
          }
          .btn {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 20px;
            background-color: #5E6AD2;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
          }
          .btn:hover {
            background-color: #4F58B8;
          }
        </style>
      </head>
      <body>
        <div class="success">
          <div class="icon">✅</div>
          <h1>Connection Successful!</h1>
          <p>Your Linear workspace <strong>${workspaceName}</strong> has been successfully connected to Claude Code.</p>
          <p>You can now close this window and return to the application.</p>
        </div>
        
        <div class="info">
          <h2>What's Next?</h2>
          <p>Claude Code is now ready to help with your Linear issues. You can:</p>
          <ul style="text-align: left;">
            <li>Assign issues to Claude</li>
            <li>Mention Claude in comments (@claude)</li>
            <li>Use Claude to analyze, implement, and fix issues</li>
          </ul>
          <a href="https://linear.app" class="btn">Return to Linear</a>
        </div>
      </body>
      </html>
    `;
  }
}
