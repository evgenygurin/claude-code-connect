# Boss Agent Manual Testing Guide

Complete guide for manually testing the Boss Agent Integration with real Linear issues and Codegen API.

## Prerequisites

### Required Credentials

1. **Linear API**
   - Linear API Token (`LINEAR_API_TOKEN`)
   - Linear Organization ID (`LINEAR_ORGANIZATION_ID`)
   - Linear workspace with test project

2. **Codegen API**
   - Codegen API Token (`CODEGEN_API_TOKEN`)
   - Codegen Organization ID (`CODEGEN_ORG_ID`)
   - Active Codegen account with API access

3. **Git Repository**
   - GitHub repository for testing
   - Write access to create branches and PRs
   - Clean working directory

### Environment Setup

```bash
# 1. Clone repository
git clone https://github.com/yourusername/claude-code-connect
cd claude-code-connect

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env

# 4. Edit .env with your credentials
nano .env
```

### .env Configuration

```bash
# Linear Configuration
LINEAR_API_TOKEN=lin_api_xxxxxxxxxxxxxxxxxxxxx
LINEAR_ORGANIZATION_ID=org_xxxxxxxxxxxxxxxxxx
PROJECT_ROOT_DIR=/path/to/your/project

# Boss Agent Configuration (CRITICAL!)
ENABLE_BOSS_AGENT=true
BOSS_AGENT_THRESHOLD=6
MAX_CONCURRENT_AGENTS=3

# Codegen Integration
CODEGEN_API_TOKEN=cg_xxxxxxxxxxxxxxxxxxxxx
CODEGEN_ORG_ID=your-codegen-org-id
CODEGEN_BASE_URL=https://api.codegen.com
CODEGEN_DEFAULT_TIMEOUT=3600000

# Webhook Configuration (Optional but recommended)
CODEGEN_WEBHOOK_ENABLED=true
CODEGEN_WEBHOOK_SECRET=your-webhook-secret-min-32-chars
WEBHOOK_PORT=3005

# PR Management
CODEGEN_AUTO_MERGE=false
CODEGEN_REQUIRE_REVIEW=true
CODEGEN_DEFAULT_REVIEWERS=reviewer1,reviewer2

# Debug Mode (for detailed logs)
DEBUG=true
```

## Test Scenarios

### Scenario 1: Simple Bug Fix (DIRECT Strategy)

**Objective**: Test Boss Agent's ability to delegate a simple bug fix to Codegen.

#### Setup

1. Create a Linear issue with:
   - **Title**: `Fix: Typo in error message`
   - **Description**: `Error message in auth.ts line 42 has a typo: "Authentiction failed" should be "Authentication failed"`
   - **Priority**: High
   - **Labels**: `bug`, `quick-fix`

2. Start the integration server:
   ```bash
   npm run start:dev
   ```

3. Assign the issue to the Boss Agent user (or trigger via webhook)

#### Expected Behavior

1. **Boss Agent Analysis**
   ```text
   Task Type: bug_fix
   Complexity: simple
   Priority: high
   Confidence: 0.9
   ```

2. **Decision**
   ```text
   Should Delegate: true
   Strategy: DIRECT
   Estimated Duration: 300 seconds
   Delegated To: codegen
   ```

3. **Codegen Execution**
   - Task created in Codegen API
   - Branch created: `codegen/fix-1-typo-in-error-message`
   - File modified: `src/auth.ts`
   - PR created with fix

4. **Linear Updates**
   - Comment: "⏳ Boss Agent delegating to Codegen..."
   - Comment: "⏳ Task Progress: 25%"
   - Comment: "⏳ Task Progress: 50%"
   - Comment: "⏳ Task Progress: 75%"
   - Comment: "✅ Task completed successfully"

#### Verification

```bash
# 1. Check Linear issue comments
linear issue view FIX-1

# 2. Check GitHub PR
gh pr list

# 3. Check server logs
tail -f logs/integration.log | grep "Boss Agent"

# 4. Verify task session
curl http://localhost:3005/sessions
```

### Scenario 2: Feature Implementation (REVIEW_FIRST Strategy)

**Objective**: Test complex feature implementation requiring review.

#### Setup

1. Create a Linear issue with:
   - **Title**: `Implement: Real-time chat with WebSockets`
   - **Description**:
     ```markdown
     Build a real-time chat system with:
     - WebSocket server using Socket.io
     - Message persistence in database
     - User presence indicators
     - Typing indicators
     - Message reactions
     ```
   - **Priority**: Medium
   - **Labels**: `feature`, `complex`

2. Start server and assign issue

#### Expected Behavior

1. **Boss Agent Analysis**
   ```text
   Task Type: feature_implementation
   Complexity: complex
   Priority: medium
   Estimated Lines: 500+
   ```

2. **Decision**
   ```text
   Should Delegate: true
   Strategy: REVIEW_FIRST
   Reason: Complex feature requiring architectural review
   ```

3. **Codegen Execution**
   - Implementation plan created
   - Multiple files created/modified
   - Tests included
   - PR created with detailed description

4. **Review Process**
   - PR marked as "requires review"
   - Reviewers automatically assigned
   - Auto-merge disabled

#### Verification

```bash
# Check PR for "requires review" label
gh pr view <pr-number>

# Verify reviewers assigned
gh pr view <pr-number> --json reviewRequests

# Check detailed Linear comments
linear issue view FEAT-2
```

### Scenario 3: Task Below Delegation Threshold

**Objective**: Test Boss Agent's decision not to delegate simple tasks.

#### Setup

1. Create a Linear issue with:
   - **Title**: `Update README.md`
   - **Description**: `Add installation instructions to README`
   - **Priority**: Low
   - **Labels**: `documentation`

2. Start server and assign issue

#### Expected Behavior

1. **Boss Agent Analysis**
   ```text
   Task Type: documentation
   Complexity: simple
   Priority: low
   Complexity Score: 3 (below threshold of 6)
   ```

2. **Decision**
   ```text
   Should Delegate: false
   Reason: Task complexity score (3) is below delegation threshold (6)
   ```

3. **Linear Update**
   - Comment: "ℹ️ Task not delegated: complexity score (3) below threshold (6)"
   - Issue remains assigned for manual handling

#### Verification

```bash
# Check that no Codegen task was created
curl http://localhost:3005/sessions | jq '.sessions'

# Verify no PR created
gh pr list --state all | grep README

# Check Linear comment explains why not delegated
linear issue view DOC-3
```

### Scenario 4: Error Handling - Build Failure

**Objective**: Test Boss Agent's handling of Codegen execution failures.

#### Setup

1. Create a Linear issue with:
   - **Title**: `Fix: API endpoint returns 500`
   - **Description**: `POST /api/users endpoint is crashing with 500 error`
   - **Priority**: Critical
   - **Labels**: `bug`, `production`

2. Configure Codegen to fail (or use a known failing scenario)

3. Start server and assign issue

#### Expected Behavior

1. **Boss Agent Delegation**
   ```text
   Delegated to: codegen
   Strategy: DIRECT
   ```

2. **Codegen Failure**
   ```text
   Status: failed
   Error: Build failed: Type error in users.ts
   ```

3. **Linear Updates**
   - Progress comments: 25%, 50%, 75%
   - Failure comment:
     ```text
     ❌ Task failed

     Error: Build failed: Type error in users.ts:42
     Duration: 180 seconds

     Please review the error and consider manual intervention.
     ```

4. **Task Session**
   ```json
   {
     "status": "failed",
     "error": {
       "message": "Build failed: Type error in users.ts",
       "code": "BUILD_ERROR"
     }
   }
   ```

#### Verification

```bash
# Check task session status
curl http://localhost:3005/sessions | jq '.sessions[] | select(.status=="failed")'

# Verify error details in Linear
linear issue view BUG-5

# Check server error logs
grep "Task failed" logs/integration.log
```

### Scenario 5: Webhook Progress Updates

**Objective**: Test real-time webhook callbacks from Codegen.

#### Setup

1. Ensure `CODEGEN_WEBHOOK_ENABLED=true`

2. Start server with webhook endpoint exposed:
   ```bash
   # Using ngrok for public URL
   ngrok http 3005

   # Note the public URL: https://xxxxx.ngrok-free.app
   ```

3. Configure Codegen webhook:
   - URL: `https://xxxxx.ngrok-free.app/webhooks/codegen`
   - Secret: Your `CODEGEN_WEBHOOK_SECRET`
   - Events: `task.*`

4. Create a Linear issue and assign

#### Expected Behavior

1. **Webhook Events Received**
   ```text
   POST /webhooks/codegen
   Event: task.started
   Task ID: task-abc123
   ```

2. **Progress Updates**
   - 25% → Linear comment posted
   - 50% → Linear comment posted
   - 75% → Linear comment posted
   - 100% → Success comment with PR

3. **Task Session Updates**
   - Progress field updated in real-time
   - currentStep field shows current action

#### Verification

```bash
# Monitor webhook endpoint
tail -f logs/integration.log | grep "Codegen webhook"

# Check task session progress
watch -n 2 'curl -s http://localhost:3005/sessions | jq ".sessions[] | {taskId, progress, currentStep}"'

# Verify Linear comments timeline
linear issue view BUG-6 --format json | jq '.comments[] | {createdAt, body}'
```

## Test Checklist

### Unit Tests

```bash
# Run all unit tests
npm test

# Run Boss Agent tests only
npm test -- src/boss-agent/*.test.ts

# Run with coverage
npm run test:coverage
```

### Integration Tests

```bash
# Run integration tests
npm test -- src/boss-agent/integration.test.ts

# Expected: 9/21 passing (current status)
```

### Manual Test Matrix

| Scenario | Task Type | Complexity | Should Delegate | Strategy | Status |
|----------|-----------|------------|-----------------|----------|--------|
| 1. Simple Bug | bug_fix | simple | ✅ Yes | DIRECT | ⏳ Pending |
| 2. Complex Feature | feature | complex | ✅ Yes | REVIEW_FIRST | ⏳ Pending |
| 3. Documentation | docs | simple | ❌ No | N/A | ⏳ Pending |
| 4. Build Failure | bug_fix | medium | ✅ Yes | DIRECT | ⏳ Pending |
| 5. Webhook Updates | any | any | ✅ Yes | any | ⏳ Pending |

### Success Criteria

- [ ] Boss Agent correctly analyzes all 5 task types
- [ ] Decision engine applies correct delegation strategy
- [ ] Codegen delegation succeeds for eligible tasks
- [ ] Task sessions created with correct metadata
- [ ] Linear receives real-time progress updates
- [ ] PRs created with appropriate labels and reviewers
- [ ] Failed tasks are properly reported
- [ ] Webhook callbacks processed correctly
- [ ] No memory leaks or hanging processes
- [ ] All logs are structured and searchable

## Debugging Guide

### Check Boss Agent Status

```bash
# Server health
curl http://localhost:3005/health

# Boss Agent config
curl http://localhost:3005/config | jq '.bossAgent'

# Active sessions
curl http://localhost:3005/sessions/active

# All sessions (including completed/failed)
curl http://localhost:3005/sessions
```

### Common Issues

#### Issue: Boss Agent not delegating tasks

**Symptoms**: All tasks marked as "not delegated"

**Possible Causes**:
1. `ENABLE_BOSS_AGENT=false`
2. Complexity score below threshold
3. Missing Codegen credentials

**Solution**:
```bash
# Check config
curl http://localhost:3005/config | jq '.enableBossAgent'

# Check threshold
curl http://localhost:3005/config | jq '.bossAgentThreshold'

# Verify Codegen credentials
curl http://localhost:3005/config | jq '.codegenApiToken' # Should show "***" (hidden)
```

#### Issue: Codegen API errors

**Symptoms**: Tasks fail immediately with API error

**Possible Causes**:
1. Invalid Codegen API token
2. Wrong organization ID
3. Rate limiting
4. Network issues

**Solution**:
```bash
# Test Codegen API directly
curl -H "Authorization: Bearer $CODEGEN_API_TOKEN" \
  https://api.codegen.com/v1/health

# Check server logs
grep "Codegen API" logs/integration.log | tail -20

# Verify token format
echo $CODEGEN_API_TOKEN | wc -c  # Should be 40+ characters
```

#### Issue: Webhooks not received

**Symptoms**: No progress updates in Linear

**Possible Causes**:
1. Webhook URL not publicly accessible
2. Wrong webhook secret
3. Codegen webhook not configured

**Solution**:
```bash
# Test webhook endpoint
curl -X POST http://localhost:3005/webhooks/codegen \
  -H "Content-Type: application/json" \
  -H "X-Codegen-Signature: test" \
  -d '{"type":"task.started","taskId":"test-123"}'

# Check ngrok status
curl http://localhost:4040/api/tunnels

# Verify webhook secret
echo $CODEGEN_WEBHOOK_SECRET | wc -c  # Should be 32+ characters
```

#### Issue: Task sessions not created

**Symptoms**: `/sessions` returns empty array

**Possible Causes**:
1. Task not delegated
2. Codegen delegation failed before session creation
3. In-memory storage cleared

**Solution**:
```bash
# Check if any sessions were ever created
grep "Task session created" logs/integration.log

# Verify TaskSessionManager initialized
grep "TaskSessionManager" logs/integration.log | head -5

# Check for errors during session creation
grep -A 5 "createSession" logs/integration.log | grep -i error
```

## Performance Benchmarks

### Expected Response Times

| Operation | Target | Acceptable |
|-----------|--------|------------|
| Task analysis | <100ms | <500ms |
| Decision making | <50ms | <200ms |
| Codegen delegation | <2s | <5s |
| Webhook processing | <100ms | <500ms |
| Linear comment creation | <1s | <3s |

### Resource Usage

| Metric | Expected |
|--------|----------|
| Memory (idle) | <100MB |
| Memory (under load) | <500MB |
| CPU (idle) | <5% |
| CPU (delegating) | <30% |

### Monitoring

```bash
# Memory usage
ps aux | grep node | grep -v grep | awk '{print $6/1024 " MB"}'

# CPU usage
top -p $(pgrep -f "node.*integration") -n 1 | tail -1 | awk '{print $9 "%"}'

# Active sessions count
curl -s http://localhost:3005/stats | jq '.activeSessions'

# Total delegations today
grep "Delegating to Codegen" logs/integration.log | grep $(date +%Y-%m-%d) | wc -l
```

## Rollback Procedure

If Boss Agent causes issues in production:

### Immediate Rollback

```bash
# 1. Disable Boss Agent
echo "ENABLE_BOSS_AGENT=false" >> .env

# 2. Restart server
pkill -f "node.*integration"
npm run start:dev

# 3. Verify disabled
curl http://localhost:3005/config | jq '.enableBossAgent'
# Should output: false
```

### Gradual Rollback

```bash
# 1. Increase delegation threshold (delegate less)
echo "BOSS_AGENT_THRESHOLD=10" >> .env

# 2. Reduce concurrent agents
echo "MAX_CONCURRENT_AGENTS=1" >> .env

# 3. Restart and monitor
npm run start:dev
```

## Reporting Results

After completing manual testing, create a test report:

```markdown
# Boss Agent Manual Testing Report

**Date**: 2025-XX-XX
**Tester**: Your Name
**Environment**: Production/Staging

## Test Results

| Scenario | Status | Notes |
|----------|--------|-------|
| Simple Bug Fix | ✅ Pass | Completed in 2m30s |
| Complex Feature | ✅ Pass | PR required review as expected |
| Below Threshold | ✅ Pass | Correctly not delegated |
| Build Failure | ⚠️ Partial | Error reported but Linear update delayed |
| Webhook Updates | ✅ Pass | All progress updates received |

## Issues Found

1. **Webhook delay**: 5s delay between Codegen event and Linear comment
   - **Severity**: Low
   - **Workaround**: None needed
   - **Fix**: Investigate async processing

## Performance

- Average delegation time: 3.2s
- Memory usage: 180MB (acceptable)
- CPU usage: 12% average
- Webhook processing: 80ms average

## Recommendation

✅ **Approve for production** with monitoring

## Next Steps

1. Fix webhook delay issue
2. Add retry logic for Linear API failures
3. Implement auto-cleanup of old sessions
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/yourusername/claude-code-connect/issues
- Documentation: docs/BOSS-AGENT-INTEGRATION-PLAN.md
- Slack: #boss-agent channel
