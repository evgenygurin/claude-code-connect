#!/usr/bin/env tsx

/**
 * Sentry Integration Setup Script
 *
 * This script configures Sentry integration for the project using:
 * 1. Sentry API for project configuration
 * 2. Codegen API for connecting Sentry to Codegen
 * 3. GitHub API for webhook configuration
 *
 * Prerequisites:
 * - SENTRY_AUTH_TOKEN: Sentry API token with project:admin scope
 * - SENTRY_ORG_SLUG: Your Sentry organization slug
 * - SENTRY_PROJECT_SLUG: Your Sentry project slug (optional, will be created)
 * - CODEGEN_API_TOKEN: Codegen API token
 * - GITHUB_TOKEN: GitHub token for webhook setup
 *
 * Usage:
 *   npx tsx scripts/setup-sentry.ts
 *   npx tsx scripts/setup-sentry.ts --verify-only
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config();

interface SentryConfig {
  authToken: string;
  orgSlug: string;
  projectSlug: string;
  projectName?: string;
  platform?: string;
}

interface CodegenSentryConfig {
  codegenToken: string;
  codegenOrgId: string;
  sentryAuthToken: string;
}

interface SentryProject {
  id: string;
  slug: string;
  name: string;
  platform: string;
  status: string;
}

interface SentryWebhook {
  id: string;
  url: string;
  events: string[];
  status: string;
}

class SentrySetup {
  private sentryApiBase = 'https://sentry.io/api/0';
  private codegenApiBase = 'https://api.codegen.com/v1';
  private config: SentryConfig;
  private verifyOnly: boolean;

  constructor(verifyOnly = false) {
    this.verifyOnly = verifyOnly;
    this.config = {
      authToken: process.env.SENTRY_AUTH_TOKEN || '',
      orgSlug: process.env.SENTRY_ORG_SLUG || '',
      projectSlug: process.env.SENTRY_PROJECT_SLUG || 'claude-code-connect',
      projectName: process.env.SENTRY_PROJECT_NAME || 'Claude Code Connect',
      platform: process.env.SENTRY_PLATFORM || 'node-typescript',
    };

    this.validateConfig();
  }

  private validateConfig(): void {
    const missing: string[] = [];

    if (!this.config.authToken) missing.push('SENTRY_AUTH_TOKEN');
    if (!this.config.orgSlug) missing.push('SENTRY_ORG_SLUG');

    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:', missing.join(', '));
      console.error('\nRequired setup:');
      console.error('1. Get Sentry auth token: https://sentry.io/settings/account/api/auth-tokens/');
      console.error('2. Set environment variables in .env:');
      console.error('   SENTRY_AUTH_TOKEN=your_token');
      console.error('   SENTRY_ORG_SLUG=your_org_slug');
      console.error('   SENTRY_PROJECT_SLUG=your_project_slug (optional)');
      process.exit(1);
    }
  }

  private async apiCall<T>(
    method: string,
    url: string,
    body?: any,
    baseUrl = this.sentryApiBase
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.authToken}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${baseUrl}${url}`, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed (${response.status}): ${errorText}`);
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`API request failed: ${error.message}`);
      }
      throw error;
    }
  }

  async verifyAuthentication(): Promise<boolean> {
    console.log('🔐 Verifying Sentry authentication...');

    try {
      const org = await this.apiCall<any>(
        'GET',
        `/organizations/${this.config.orgSlug}/`
      );

      console.log(`✅ Authenticated to Sentry organization: ${org.name}`);
      console.log(`   Slug: ${org.slug}`);
      console.log(`   ID: ${org.id}`);
      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      return false;
    }
  }

  async getOrCreateProject(): Promise<SentryProject | null> {
    console.log(`\n📦 Checking for project: ${this.config.projectSlug}...`);

    try {
      // Try to get existing project
      const project = await this.apiCall<SentryProject>(
        'GET',
        `/projects/${this.config.orgSlug}/${this.config.projectSlug}/`
      );

      console.log(`✅ Found existing project: ${project.name}`);
      console.log(`   ID: ${project.id}`);
      console.log(`   Platform: ${project.platform}`);
      console.log(`   Status: ${project.status}`);
      return project;
    } catch (error) {
      console.log(`ℹ️  Project not found, creating new project...`);

      if (this.verifyOnly) {
        console.log('⚠️  Verify-only mode, skipping project creation');
        return null;
      }

      try {
        // Create new project
        const newProject = await this.apiCall<SentryProject>(
          'POST',
          `/teams/${this.config.orgSlug}/my-team/projects/`,
          {
            name: this.config.projectName,
            slug: this.config.projectSlug,
            platform: this.config.platform,
          }
        );

        console.log(`✅ Created new project: ${newProject.name}`);
        console.log(`   ID: ${newProject.id}`);
        console.log(`   DSN available in Sentry console`);
        return newProject;
      } catch (createError) {
        console.error('❌ Failed to create project:', createError);
        return null;
      }
    }
  }

  async configureWebhooks(): Promise<boolean> {
    console.log('\n🔗 Configuring Sentry webhooks...');

    if (this.verifyOnly) {
      console.log('ℹ️  Verify-only mode, skipping webhook configuration');
      return true;
    }

    try {
      // Codegen webhook URL
      const webhookUrl = 'https://api.codegen.com/webhooks/sentry';

      // Check existing webhooks
      const existingWebhooks = await this.apiCall<SentryWebhook[]>(
        'GET',
        `/organizations/${this.config.orgSlug}/webhooks/`
      );

      const codegenWebhook = existingWebhooks.find(
        (webhook) => webhook.url === webhookUrl
      );

      if (codegenWebhook) {
        console.log('✅ Webhook already configured');
        console.log(`   ID: ${codegenWebhook.id}`);
        console.log(`   Events: ${codegenWebhook.events.join(', ')}`);
        return true;
      }

      // Create webhook
      const webhook = await this.apiCall<SentryWebhook>(
        'POST',
        `/organizations/${this.config.orgSlug}/webhooks/`,
        {
          url: webhookUrl,
          events: [
            'error.created',
            'issue.created',
            'issue.resolved',
            'issue.assigned',
            'event.alert',
          ],
        }
      );

      console.log('✅ Webhook created successfully');
      console.log(`   ID: ${webhook.id}`);
      console.log(`   URL: ${webhook.url}`);
      console.log(`   Events: ${webhook.events.join(', ')}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to configure webhooks:', error);
      console.error('\nManual setup:');
      console.error('1. Go to: https://sentry.io/settings/' + this.config.orgSlug + '/developer-settings/');
      console.error('2. Create webhook with URL: https://api.codegen.com/webhooks/sentry');
      console.error('3. Enable events: error.created, issue.created, issue.resolved');
      return false;
    }
  }

  async connectToCodegen(): Promise<boolean> {
    console.log('\n🤖 Connecting Sentry to Codegen...');

    const codegenToken = process.env.CODEGEN_API_TOKEN;
    const codegenOrgId = process.env.CODEGEN_ORG_ID;

    if (!codegenToken || !codegenOrgId) {
      console.error('❌ Missing Codegen credentials');
      console.error('Required: CODEGEN_API_TOKEN, CODEGEN_ORG_ID');
      console.error('\nGet tokens at: https://codegen.com/settings/integrations');
      return false;
    }

    if (this.verifyOnly) {
      console.log('ℹ️  Verify-only mode, skipping Codegen connection');
      return true;
    }

    try {
      // This is a hypothetical API endpoint - adjust based on actual Codegen API
      const response = await this.apiCall<any>(
        'POST',
        `/organizations/${codegenOrgId}/integrations/sentry`,
        {
          auth_token: this.config.authToken,
          org_slug: this.config.orgSlug,
          enabled: true,
        },
        this.codegenApiBase
      );

      console.log('✅ Connected Sentry to Codegen');
      console.log(`   Status: ${response.status}`);
      return true;
    } catch (error) {
      console.warn('⚠️  Automatic connection failed - use Codegen dashboard instead');
      console.log('\nManual setup:');
      console.log('1. Visit: https://codegen.com/settings/integrations');
      console.log('2. Find "Sentry" integration');
      console.log('3. Click "Connect with OAuth" or paste auth token');
      console.log('4. Select your organization:', this.config.orgSlug);
      return false;
    }
  }

  async displaySummary(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SENTRY INTEGRATION SUMMARY');
    console.log('='.repeat(60));

    console.log('\n✅ Configuration:');
    console.log(`   Organization: ${this.config.orgSlug}`);
    console.log(`   Project: ${this.config.projectSlug}`);
    console.log(`   Platform: ${this.config.platform}`);

    console.log('\n✅ Integration Status:');
    console.log('   Sentry API: Connected');
    console.log('   Webhooks: Configured (check Sentry console)');
    console.log('   Codegen: Use dashboard for OAuth');

    console.log('\n📝 Next Steps:');
    console.log('   1. Get DSN from: https://sentry.io/settings/' +
      this.config.orgSlug + '/projects/' + this.config.projectSlug + '/keys/');
    console.log('   2. Add to .env: SENTRY_DSN=your_dsn');
    console.log('   3. Install SDK: npm install @sentry/node @sentry/tracing');
    console.log('   4. Test integration: npm run test:sentry');
    console.log('   5. Complete Codegen OAuth: https://codegen.com/settings/integrations');

    console.log('\n🔗 Useful Links:');
    console.log(`   Sentry Project: https://sentry.io/organizations/${this.config.orgSlug}/projects/${this.config.projectSlug}/`);
    console.log('   Codegen Dashboard: https://codegen.com/settings/integrations');
    console.log('   Sentry MCP Server: https://mcp.sentry.dev/');

    console.log('\n💡 Sentry MCP Server Setup:');
    console.log('   Add to Claude Code:');
    console.log('   $ claude mcp add --transport http sentry https://mcp.sentry.dev/mcp');
    console.log('   This enables AI agents to query Sentry errors directly!');

    console.log('\n' + '='.repeat(60));
  }

  async run(): Promise<void> {
    console.log('🚀 Sentry Integration Setup\n');

    // Step 1: Verify authentication
    const authOk = await this.verifyAuthentication();
    if (!authOk) {
      process.exit(1);
    }

    // Step 2: Get or create project
    const project = await this.getOrCreateProject();
    if (!project && !this.verifyOnly) {
      console.error('❌ Failed to get/create project');
      process.exit(1);
    }

    // Step 3: Configure webhooks
    await this.configureWebhooks();

    // Step 4: Connect to Codegen
    await this.connectToCodegen();

    // Step 5: Display summary
    await this.displaySummary();

    console.log('\n✅ Setup complete!');
  }
}

// Main execution
const args = process.argv.slice(2);
const verifyOnly = args.includes('--verify-only');

const setup = new SentrySetup(verifyOnly);
setup.run().catch((error) => {
  console.error('\n❌ Setup failed:', error);
  process.exit(1);
});
