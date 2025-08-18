# Linear App Setup Guide

This guide will walk you through the process of setting up the Claude Code integration with Linear as a full-fledged Linear application.

## Prerequisites

- A Linear account with admin privileges
- A server to host the Claude Code integration
- A domain name for your application (for production use)

## Step 1: Register Your Application in Linear

1. Log in to your Linear account
2. Go to **Settings** > **API** > **Applications**
3. Click **Create New**
4. Fill in the application details:
   - **Name**: Claude Code
   - **Description**: Integrate Claude Code with Linear to automate software development tasks
   - **Icon**: Upload a suitable icon for your application
   - **Application URL**: The URL where your application is hosted (e.g., `https://your-app-url.com`)
   - **Redirect URL**: The OAuth callback URL (e.g., `https://your-app-url.com/oauth/callback`)
   - **Developer**: Your name or company name
   - **Developer URL**: Your website URL
   - **Terms URL**: URL to your terms of service
   - **Privacy URL**: URL to your privacy policy
   - **Support URL**: URL to your support page
5. Select the required scopes:
   - `read`
   - `write`
   - `app:assignable`
   - `app:mentionable`
6. Click **Create Application**

## Step 2: Configure Webhook

1. In your application settings, go to the **Webhooks** tab
2. Click **Create Webhook**
3. Fill in the webhook details:
   - **URL**: The webhook URL for your application (e.g., `https://your-app-url.com/webhooks/linear`)
   - **Events**: Select the events you want to receive:
     - `Issue`
     - `Comment`
4. Click **Create Webhook**
5. Copy the **Webhook Secret** - you'll need this for your application configuration

## Step 3: Configure Your Application

1. Update your `.env` file with the following values:
   ```
   # OAuth Configuration
   ENABLE_OAUTH=true
   LINEAR_CLIENT_ID=your-linear-client-id
   LINEAR_CLIENT_SECRET=your-linear-client-secret
   OAUTH_REDIRECT_URI=https://your-app-url.com/oauth/callback
   
   # Webhook Configuration
   LINEAR_WEBHOOK_SECRET=your-webhook-secret
   ```

2. Make sure your server is accessible from the internet and the webhook URL is reachable

## Step 4: Deploy Your Application

1. Deploy your application to your server
2. Make sure the OAuth callback URL and webhook URL are correctly configured and accessible

## Step 5: Install the Application in Linear

1. Go to your Linear workspace
2. Go to **Settings** > **Integrations**
3. Find your application in the list or search for it
4. Click **Install**
5. Follow the OAuth flow to authorize the application

## Step 6: Test the Integration

1. Create a new issue in Linear
2. Assign it to Claude Code or mention Claude Code in a comment
3. Verify that Claude Code responds and processes the issue

## Troubleshooting

### OAuth Issues

- Make sure your redirect URL is correctly configured in both Linear and your application
- Check that your client ID and client secret are correct
- Verify that your application is accessible from the internet

### Webhook Issues

- Make sure your webhook URL is accessible from the internet
- Check that your webhook secret is correctly configured
- Verify that you've selected the correct events for your webhook

### Application Issues

- Check your application logs for any errors
- Verify that your application is correctly configured
- Make sure your application has the necessary permissions

## Advanced Configuration

### Custom Branding

You can customize the appearance of your application in Linear by updating the following in your Linear application settings:

- **Icon**: Upload a high-resolution icon (at least 512x512 pixels)
- **Screenshots**: Add screenshots of your application in action
- **Features**: List the key features of your application

### Multiple Environments

If you want to run your application in multiple environments (development, staging, production), you can create separate applications in Linear for each environment:

1. Create a new application for each environment
2. Configure each application with the appropriate URLs
3. Use environment-specific configuration files for your application

## Security Considerations

### Token Storage

OAuth tokens should be securely stored and encrypted. The integration uses encryption to protect tokens stored on disk.

### Webhook Validation

Always validate webhook signatures to ensure that webhook requests are coming from Linear.

### Rate Limiting

Implement rate limiting to prevent abuse of your application.

## Support

If you encounter any issues with the integration, please contact our support team at support@example.com.

