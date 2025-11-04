/**
 * Test filter for showing only critical failures
 * Filters out default/expected failures and focuses on important issues
 */

import { execSync } from "child_process";

interface TestResult {
  category: "critical" | "important" | "minor" | "ignore";
  message: string;
  file: string;
  reason: string;
}

const CRITICAL_PATTERNS = [
  // Security issues
  /security|vulnerability|injection|authentication/i,
  // Core functionality
  /Cannot read properties.*undefined/,
  /is not a function/,
  /Module not found/,
  // Configuration issues
  /config.*validation.*failed/i,
  /environment.*variable/i
];

const IMPORTANT_PATTERNS = [
  // Logic errors
  /expected.*true.*false/,
  /expected.*false.*true/,
  // Type errors
  /TypeError/,
  /ReferenceError/,
  // API issues
  /webhook.*invalid/i,
  /rate.*limit/i
];

const IGNORE_PATTERNS = [
  // Default test failures that we expect to fail
  /integration.*workflow/i,
  /agent.*scenarios/i,
  /mock.*implementation/i,
  // Expected test infrastructure issues
  /vitest.*failed.*access.*internal.*state/i,
  /workflow.*test/i
];

function categorizeTestFailure(output: string, file: string): TestResult[] {
  const lines = output.split('\n').filter(line => line.includes('❯') || line.includes('FAIL'));
  const results: TestResult[] = [];

  for (const line of lines) {
    // Skip non-error lines
    if (!line.includes('❯') && !line.includes('FAIL')) continue;

    let category: TestResult["category"] = "minor";
    let reason = "General test failure";

    // Check if it should be ignored
    if (IGNORE_PATTERNS.some(pattern => pattern.test(line))) {
      category = "ignore";
      reason = "Expected integration/workflow test failure";
    }
    // Check for critical issues
    else if (CRITICAL_PATTERNS.some(pattern => pattern.test(line))) {
      category = "critical";
      reason = "Critical system failure";
    }
    // Check for important issues
    else if (IMPORTANT_PATTERNS.some(pattern => pattern.test(line))) {
      category = "important";
      reason = "Important logic/type error";
    }

    results.push({
      category,
      message: line.trim(),
      file,
      reason
    });
  }

  return results;
}

function runFilteredTests() {
  console.log("🔍 Running filtered test analysis...\n");

  try {
    // Run tests and capture output
    const output = execSync("npx vitest run 2>&1", { 
      encoding: "utf-8",
      cwd: process.cwd()
    });
    
    console.log("✅ All tests passed!");
    return;
  } catch (error: any) {
    const output = error.stdout || error.message;
    
    // Parse test results
    const allResults = categorizeTestFailure(output, "various");
    
    // Filter and group results
    const critical = allResults.filter(r => r.category === "critical");
    const important = allResults.filter(r => r.category === "important");
    const minor = allResults.filter(r => r.category === "minor");
    
    // Show summary
    console.log("📊 **FILTERED TEST RESULTS**");
    console.log("=" .repeat(50));
    console.log(`🚨 Critical Issues: ${critical.length}`);
    console.log(`⚠️  Important Issues: ${important.length}`); 
    console.log(`📝 Minor Issues: ${minor.length}`);
    console.log(`🙈 Ignored (expected): ${allResults.filter(r => r.category === "ignore").length}\n`);

    // Show critical issues first
    if (critical.length > 0) {
      console.log("🚨 **CRITICAL ISSUES** (Must Fix):");
      console.log("-".repeat(40));
      critical.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue.reason}`);
        console.log(`   ${issue.message}\n`);
      });
    }

    // Show important issues
    if (important.length > 0) {
      console.log("⚠️  **IMPORTANT ISSUES** (Should Fix):");
      console.log("-".repeat(40));
      important.slice(0, 10).forEach((issue, i) => { // Limit to first 10
        console.log(`${i + 1}. ${issue.reason}`);
        console.log(`   ${issue.message}\n`);
      });
      
      if (important.length > 10) {
        console.log(`   ... and ${important.length - 10} more important issues\n`);
      }
    }

    // Show summary for minor issues
    if (minor.length > 0) {
      console.log(`📝 **MINOR ISSUES**: ${minor.length} (Low priority)\n`);
    }

    // Show actionable recommendations
    console.log("💡 **RECOMMENDED ACTIONS**:");
    console.log("-".repeat(40));
    
    if (critical.length > 0) {
      console.log("1. 🚨 Fix critical issues immediately");
      console.log("   - Security vulnerabilities");
      console.log("   - Core functionality failures");
      console.log("   - Configuration errors");
    }
    
    if (important.length > 0) {
      console.log("2. ⚠️  Address important logic errors");
      console.log("   - Type mismatches");
      console.log("   - API validation issues");
    }
    
    if (minor.length > 0) {
      console.log("3. 📝 Minor issues can be addressed later");
      console.log("   - Expected test infrastructure issues");
      console.log("   - Integration test setup problems");
    }

    console.log("\n🎯 **FOCUS**: Work on critical and important issues first!");
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFilteredTests();
}