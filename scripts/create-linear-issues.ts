/**
 * Script to create Linear issues for test failures
 */

import { LinearClient } from "@linear/sdk";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const client = new LinearClient({
  apiKey: process.env.LINEAR_API_TOKEN!
});

interface IssueData {
  title: string;
  description: string;
  priority: number; // 1=Urgent, 2=High, 3=Medium, 4=Low
  labels?: string[];
}

const testIssues: IssueData[] = [
  {
    title: "🚨 CRITICAL: Fix Security Vulnerabilities (10 issues found)",
    description: `**Priority: CRITICAL**

Found 10 security vulnerabilities in our system:

## Command Injection Issues:
1. Command validation allows command injection
2. Command injection not prevented: git clone repo; rm -rf /
3. Command injection not prevented: innocent_command && evil_command  
4. Command injection not prevented: command | malicious_pipe
5. Command injection not prevented: command $(malicious_substitution)
6. Command injection not prevented: command \`malicious_backticks\`
7. Command injection not prevented: command $((malicious_arithmetic))
8. Command injection not prevented: command \${malicious_parameter}

## Other Security Issues:
9. Rate limiting not working - no requests blocked
10. API token appears to be weak or missing

## Recommended Actions:
- Implement comprehensive input sanitization
- Use allowlist-based validation for commands
- Fix rate limiting implementation
- Strengthen API token validation
- Regular security testing implementation

**Files to investigate:**
- \`src/security/\` - security validation modules
- \`src/utils/config.ts\` - configuration security
- \`src/webhooks/handler.ts\` - webhook security`,
    priority: 1,
    labels: ["security", "critical", "vulnerability"]
  },
  {
    title: "🛠️ Fix Unit Test Mocking Issues (59 failing tests)",
    description: `**Priority: HIGH**

59 unit tests are failing due to incorrect mock setup.

## Primary Issues:
- Mock methods not properly configured
- \`mockResolvedValue\`, \`mockImplementation\`, \`mockRejectedValue\` undefined errors
- Session manager tests completely broken
- Webhook handler tests failing

## Files to Fix:
- \`src/sessions/manager.test.ts\` - All session management tests failing
- \`src/webhooks/handler.test.ts\` - Webhook processing tests failing
- \`src/testing/workflow.test.ts\` - Workflow integration tests
- \`src/testing/integration-workflow.test.ts\` - Integration tests

## Action Items:
1. Review and fix mock setup in test files
2. Ensure proper vitest mock configuration
3. Fix mock import patterns
4. Validate test isolation
5. Run tests individually to identify specific failures

**Current Status:** 59 failed / 111 passed (170 total)`,
    priority: 2,
    labels: ["testing", "unit-tests", "mocking"]
  },
  {
    title: "🔧 Fix Vitest Integration Test Framework Issues",
    description: `**Priority: HIGH**

Integration tests fail to run due to Vitest configuration issues.

## Error Details:
\`\`\`
Error: Vitest failed to access its internal state.
One of the following is possible:
- "vitest" is imported directly without running "vitest" command
- "vitest" is imported inside "globalSetup"
- Otherwise, it might be a Vitest bug
\`\`\`

## Files Affected:
- \`src/testing/run-integration-tests.ts\` - Cannot execute
- \`src/testing/integration-workflow.test.ts\` - 11/16 tests failing
- \`src/testing/workflow.test.ts\` - Multiple assertion failures

## Root Cause:
- Incorrect vitest import in non-test context
- Integration test setup conflicts with unit test runner
- Possible globalSetup vs setupFiles configuration issue

## Action Items:
1. Separate integration test runner from vitest unit tests
2. Fix vitest import patterns in integration test files
3. Review test configuration in \`vitest.config.ts\`
4. Implement proper test isolation between unit and integration tests`,
    priority: 2,
    labels: ["testing", "integration-tests", "vitest", "configuration"]
  },
  {
    title: "📋 Fix Configuration Validation Issues",
    description: `**Priority: MEDIUM**

Configuration validation is not working correctly, causing potential runtime issues.

## Issues Found:
- Required field validation not throwing errors when expected
- Path validation problems
- Config loading inconsistencies

## Files to Investigate:
- \`src/utils/config.test.ts\` - 1 test failing
- \`src/utils/config.ts\` - validation logic
- \`.env\` file handling and validation

## Expected Behavior:
- Config should throw errors for missing required fields
- Path validation should prevent invalid directory paths
- Environment variable loading should be consistent

## Action Items:
1. Review and fix validation logic in config.ts
2. Ensure proper error throwing for invalid configurations
3. Add comprehensive config validation tests
4. Validate environment variable parsing`,
    priority: 3,
    labels: ["configuration", "validation", "environment"]
  },
  {
    title: "🏗️ Improve Test Infrastructure and Documentation",
    description: `**Priority: MEDIUM**

Overall test infrastructure needs improvement for better maintainability.

## Areas for Improvement:
1. **Test Documentation**: Add clear testing guidelines
2. **Test Structure**: Organize tests by feature/component
3. **Mock Libraries**: Standardize mocking approach
4. **Test Data**: Create shared test fixtures
5. **CI/CD Integration**: Ensure tests run properly in CI

## Benefits:
- Easier debugging of test failures
- Better developer onboarding
- Consistent test patterns across codebase
- Reduced test maintenance overhead

## Deliverables:
1. Test documentation in \`docs/testing.md\`
2. Shared test utilities in \`src/testing/utils/\`
3. Standardized mock patterns
4. Test fixture management
5. CI/CD test configuration`,
    priority: 3,
    labels: ["testing", "documentation", "infrastructure"]
  }
];

async function createLinearIssues() {
  try {
    console.log("🚀 Creating Linear issues for test failures...\n");

    // Get teams to find the right team for issues
    const teams = await client.teams();
    const team = teams.nodes[0]; // Use first team, or specify team ID

    if (!team) {
      throw new Error("No teams found");
    }

    console.log(`📋 Using team: ${team.name} (${team.id})\n`);

    // Create issues
    for (const issueData of testIssues) {
      console.log(`Creating: ${issueData.title}`);
      
      const result = await client.createIssue({
        teamId: team.id,
        title: issueData.title,
        description: issueData.description,
        priority: issueData.priority,
        // Add labels if team supports them
        // labelIds: [] // You would need to get label IDs from team
      });

      if (result.success) {
        console.log(`✅ Created: ${result.issue?.identifier} - ${result.issue?.title}`);
        console.log(`   URL: ${result.issue?.url}\n`);
      } else {
        console.log(`❌ Failed to create issue: ${issueData.title}\n`);
      }
    }

    console.log("🎉 Linear issues creation completed!");

  } catch (error) {
    console.error("❌ Error creating Linear issues:", error);
    process.exit(1);
  }
}

// Run the script
createLinearIssues();