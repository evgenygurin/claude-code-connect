# GitHub PR Comment Agent

## Overview

The GitHub PR Comment Agent enables Claude to automatically respond to comments on pull requests. When someone mentions Claude in a PR comment, the agent analyzes the PR context (diff, files, comments) and generates an intelligent response.

**Status**: ✅ **Ready for Testing**

## Features

- ✅ **Automatic PR Comment Responses** - Claude responds when mentioned in PR comments
- ✅ **Context-Aware** - Analyzes PR diff, files, and existing comments
- ✅ **Intelligent Analysis** - Uses Claude to understand questions and provide helpful answers
- ✅ **Reaction Feedback** - Uses GitHub reactions to show processing status
- ✅ **Security** - Webhook signature validation and rate limiting
- ✅ **Error Handling** - Graceful error messages in PR comments

## Quick Setup

### 1. Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Select scopes:
   - `repo` - Full control of private repositories
   - `write:discussion` - Write access to discussions
4. Copy the token

### 2. Configure Environment

Add to your `.env` file:

```bash
# Required: GitHub personal access token
GITHUB_TOKEN=ghp_your_github_token_here

# Optional: Webhook secret for signature validation
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# Optional: Default repository (overridden by webhook)
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name
```

### 3. Start the Server

```bash
npm run start:dev
```

The GitHub webhook endpoint will be available at:

```text
http://localhost:3005/webhooks/github
```

### 4. Setup ngrok Tunnel (for testing)

```bash
ngrok http 3005
```

Copy the ngrok URL (e.g., `https://abc123.ngrok-free.app`)

### 5. Configure GitHub Webhook

1. Go to your repository → Settings → Webhooks → Add webhook
2. Configure:
   - **Payload URL**: `https://your-ngrok-url.ngrok-free.app/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: Your `GITHUB_WEBHOOK_SECRET` (optional but recommended)
   - **Events**: Select individual events:
     - ✅ Issue comments
     - ✅ Pull request review comments
3. Click "Add webhook"

## Usage

### Trigger Patterns

The agent responds when PR comments contain:

- `@claude` - Direct mention
- `@agent` or `@bot` - Generic agent mentions
- `claude` - Name mention
- `hey claude` - Casual greeting
- `please help` - Help request
- `can you` or `could you` - Questions

### Example Workflow

1. **User creates a PR comment**:

   ```text
   @claude can you explain why we need to use async/await here?
   ```

2. **Agent responds**:
   - Adds 👀 reaction to show processing
   - Analyzes PR context (diff, files, comments)
   - Generates response using Claude
   - Posts comment with answer
   - Adds 👍 reaction on success

3. **Response example**:

   ```markdown
   The `async/await` pattern is used here because:

   1. The `fetchUserData()` function returns a Promise
   2. We need to wait for the API call to complete before proceeding
   3. Using `async/await` makes the code more readable than `.then()` chains

   In `src/api/users.ts:42-45`, you're making a fetch call that's inherently asynchronous:

   ```javascript
   const response = await fetch('/api/users');
   const data = await response.json();
   ```

   This pattern ensures the data is available before we use it in line 46.
   ```

## Architecture

### Components

```text
src/github/
├── client.ts          # GitHub API client (Octokit wrapper)
├── webhook-handler.ts # Webhook validation and processing
└── pr-agent.ts       # Comment analysis and response generation
```

### Event Flow

```text
1. GitHub Webhook → /webhooks/github endpoint
2. Signature verification (if secret configured)
3. Rate limiting check
4. Payload validation
5. Event type filtering (issue_comment, pull_request_review_comment)
6. Trigger detection (contains agent mention?)
7. PR context gathering (diff, files, comments)
8. Claude analysis
9. Response generation
10. Comment posting
11. Reaction feedback
```

### Security Features

- **Webhook Signature Validation**: Verifies GitHub webhook signatures using HMAC SHA-256
- **Rate Limiting**: Global and per-IP rate limiting
- **Bot Detection**: Prevents agent from responding to its own comments
- **Error Handling**: Graceful error messages with reaction feedback

## API Endpoints

### GitHub Webhook Endpoint

**POST** `/webhooks/github`

Receives GitHub webhook events for PR comments.

**Headers**:

- `x-github-event`: Event type (e.g., `issue_comment`)
- `x-hub-signature-256`: HMAC SHA-256 signature (if secret configured)

**Response**:

```json
{
  "received": true,
  "processed": true
}
```

## Testing

### Manual Testing

1. Start the server with debug mode:

   ```bash
   DEBUG=true npm run start:dev
   ```

2. Create a test PR

3. Add a comment mentioning Claude:

   ```text
   @claude can you review this code?
   ```

4. Check the server logs for processing details

### Testing with curl

```bash
# Test webhook endpoint
curl -X POST http://localhost:3005/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: issue_comment" \
  -d '{
    "action": "created",
    "comment": {
      "id": 123,
      "body": "@claude please help with this",
      "user": {
        "id": 456,
        "login": "test-user"
      },
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z",
      "html_url": "https://github.com/owner/repo/pull/1#issuecomment-123"
    },
    "pull_request": {
      "id": 789,
      "number": 1,
      "title": "Test PR",
      "state": "open",
      "user": {
        "id": 456,
        "login": "test-user"
      },
      "html_url": "https://github.com/owner/repo/pull/1",
      "head": {
        "ref": "feature-branch",
        "sha": "abc123"
      },
      "base": {
        "ref": "main",
        "sha": "def456"
      }
    },
    "repository": {
      "id": 999,
      "name": "repo",
      "full_name": "owner/repo",
      "owner": {
        "id": 111,
        "login": "owner"
      }
    },
    "sender": {
      "id": 456,
      "login": "test-user"
    }
  }'
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub personal access token with `repo` scope |
| `GITHUB_WEBHOOK_SECRET` | No | Webhook secret for signature validation (recommended) |
| `GITHUB_OWNER` | No | Default repository owner |
| `GITHUB_REPO` | No | Default repository name |

### Claude Configuration

The agent uses the Claude executable configured in `CLAUDE_EXECUTABLE_PATH` (defaults to `claude`).

## Troubleshooting

### "GitHub integration not configured"

- Verify `GITHUB_TOKEN` is set in `.env`
- Check server logs for initialization errors
- Ensure token has correct scopes (`repo`, `write:discussion`)

### "Webhook signature verification failed"

- Ensure `GITHUB_WEBHOOK_SECRET` in `.env` matches GitHub webhook secret
- Check for extra whitespace in secret values

### "Rate limit exceeded"

- Default rate limits: 60 requests/minute globally, 30/minute per IP
- Wait a minute and try again
- Adjust rate limits in `IntegrationServer` constructor if needed

### Agent doesn't respond to comments

- Check if comment contains trigger patterns (`@claude`, `claude`, etc.)
- Verify webhook is configured with correct events
- Check server logs for processing details
- Ensure agent isn't trying to respond to its own comments

### Claude execution failed

- Verify `CLAUDE_EXECUTABLE_PATH` points to valid Claude executable
- Check if Claude CLI is installed and accessible
- Review Claude execution logs in server output

## Roadmap

**Planned Features**:

- [ ] Support for inline code review comments
- [ ] Multi-turn conversation support
- [ ] Integration with Linear issues
- [ ] Code suggestions and fixes
- [ ] PR summary generation
- [ ] Automatic test generation

**Known Limitations**:

- Currently only responds to new comments, not edits
- No support for threaded replies
- Limited to 5000 character diff context
- Requires Claude CLI installation

## Examples

### Question about code

**Comment**:

```text
@claude why do we need the useCallback hook here?
```

**Response**:

```markdown
The `useCallback` hook is used here to prevent unnecessary re-renders of child components.

In `src/components/Form.tsx:28-32`, the `handleSubmit` function is wrapped with `useCallback`:

```javascript
const handleSubmit = useCallback((data) => {
  // ...
}, [dependency1, dependency2]);
```

Without `useCallback`, a new function would be created on every render, causing any child components that receive this function as a prop to re-render unnecessarily.

The dependency array `[dependency1, dependency2]` ensures the function is only recreated when those values change.
```

### Request for explanation

**Comment**:

```text
@claude can you explain what this regex pattern does?
```

**Response**:

```markdown
The regex pattern in `src/utils/validators.ts:15` is:

```javascript
/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
```

This validates email addresses:

- `^` - Start of string
- `[a-zA-Z0-9._%+-]+` - Local part (before @): letters, numbers, and special chars
- `@` - Literal @ symbol
- `[a-zA-Z0-9.-]+` - Domain name: letters, numbers, dots, hyphens
- `\.` - Literal dot
- `[a-zA-Z]{2,}` - TLD: at least 2 letters (com, org, etc.)
- `$` - End of string

**Valid**: john.doe+filter@example.com
**Invalid**: invalid@domain (missing TLD)
```

## Contributing

To add new features to the GitHub PR Agent:

1. Add new methods to `GitHubClient` for API interactions
2. Update `GitHubWebhookHandler` for new event types
3. Extend `GitHubPRAgent` for new response patterns
4. Update this documentation

## Support

For issues or questions:

1. Check server logs with `DEBUG=true`
2. Review GitHub webhook delivery logs
3. Test webhook signature validation
4. Verify Claude CLI is working
