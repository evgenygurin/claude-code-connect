/**
 * Script to find duplicate/repetitive code patterns
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

interface DuplicatePattern {
  pattern: string;
  occurrences: Array<{
    file: string;
    line: number;
    context: string;
  }>;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
}

function findDuplicates(rootDir: string): DuplicatePattern[] {
  const patterns: DuplicatePattern[] = [];
  const files = getAllTypeScriptFiles(rootDir);
  
  // Common duplicate patterns to look for
  const duplicateChecks = [
    {
      name: "Mock setup patterns",
      regex: /vi\.mock\(.*ClaudeExecutor.*\)/g,
      severity: "high" as const,
      description: "Repeated mock setup for ClaudeExecutor"
    },
    {
      name: "beforeEach mock reset",
      regex: /beforeEach\(\(\) => \{[\s\S]*?vi\.clearAllMocks/g,
      severity: "medium" as const,
      description: "Repeated beforeEach mock reset pattern"
    },
    {
      name: "Logger mock creation",
      regex: /createMockLogger\(\)/g,
      severity: "medium" as const,
      description: "Repeated logger mock creation"
    },
    {
      name: "Config mock creation",
      regex: /mockIntegrationConfig/g,
      severity: "medium" as const,
      description: "Repeated config mock usage"
    },
    {
      name: "Session creation pattern",
      regex: /sessionManager\.createSession\(mockIssue\)/g,
      severity: "low" as const,
      description: "Repeated session creation pattern"
    },
    {
      name: "Crypto mock patterns",
      regex: /mockCrypto\.timingSafeEqual\.mockReturnValue/g,
      severity: "high" as const,
      description: "Repeated crypto mock setup"
    },
    {
      name: "Executor mock setup",
      regex: /mockExecutor\s*=\s*\{[\s\S]*?execute:\s*vi\.fn\(\)/g,
      severity: "high" as const,
      description: "Repeated executor mock object creation"
    },
    {
      name: "Test describe blocks",
      regex: /describe\(".*", \(\) => \{[\s\S]*?let mockExecutor/g,
      severity: "medium" as const,
      description: "Similar test structure patterns"
    }
  ];

  for (const check of duplicateChecks) {
    const occurrences: Array<{ file: string; line: number; context: string }> = [];
    
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        
        let match;
        while ((match = check.regex.exec(content)) !== null) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          const context = lines.slice(Math.max(0, lineNumber - 2), lineNumber + 2).join('\n');
          
          occurrences.push({
            file: relative(rootDir, file),
            line: lineNumber,
            context: match[0].substring(0, 100) + (match[0].length > 100 ? '...' : '')
          });
        }
        
        // Reset regex lastIndex
        check.regex.lastIndex = 0;
      } catch (error) {
        console.warn(`Error reading file ${file}:`, error);
      }
    }
    
    if (occurrences.length > 1) {
      patterns.push({
        pattern: check.name,
        occurrences,
        severity: check.severity,
        description: check.description
      });
    }
  }

  return patterns;
}

function getAllTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  
  function walk(currentDir: string) {
    const items = readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and dist
        if (!['node_modules', 'dist', '.git'].includes(item)) {
          walk(fullPath);
        }
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js'))) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

function findLargeFunctions(rootDir: string): Array<{
  file: string;
  functionName: string;
  lines: number;
  startLine: number;
}> {
  const largeFunctions: Array<{
    file: string;
    functionName: string;
    lines: number;
    startLine: number;
  }> = [];
  
  const files = getAllTypeScriptFiles(rootDir);
  
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      // Find function definitions
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const functionMatch = line.match(/(function\s+\w+|const\s+\w+\s*=.*=>\s*\{|\w+\s*\([^)]*\)\s*:\s*.*\{|\w+\s*\([^)]*\)\s*\{)/);
        
        if (functionMatch) {
          const functionName = functionMatch[0];
          let braceCount = 0;
          let functionEnd = i;
          let foundOpenBrace = false;
          
          // Count lines until function ends
          for (let j = i; j < lines.length; j++) {
            const currentLine = lines[j];
            
            for (const char of currentLine) {
              if (char === '{') {
                braceCount++;
                foundOpenBrace = true;
              } else if (char === '}') {
                braceCount--;
                if (foundOpenBrace && braceCount === 0) {
                  functionEnd = j;
                  break;
                }
              }
            }
            
            if (foundOpenBrace && braceCount === 0) {
              break;
            }
          }
          
          const functionLines = functionEnd - i + 1;
          
          // Flag functions longer than 50 lines
          if (functionLines > 50) {
            largeFunctions.push({
              file: relative(rootDir, file),
              functionName: functionName.substring(0, 50),
              lines: functionLines,
              startLine: i + 1
            });
          }
        }
      }
    } catch (error) {
      console.warn(`Error analyzing ${file}:`, error);
    }
  }
  
  return largeFunctions.sort((a, b) => b.lines - a.lines);
}

function main() {
  const rootDir = process.cwd();
  
  console.log("🔍 Searching for duplicate code patterns...\n");
  
  const duplicates = findDuplicates(rootDir);
  const largeFunctions = findLargeFunctions(rootDir);
  
  console.log("📊 **DUPLICATE CODE ANALYSIS**");
  console.log("=" .repeat(50));
  
  if (duplicates.length === 0) {
    console.log("✅ No significant duplicate patterns found!\n");
  } else {
    console.log(`Found ${duplicates.length} duplicate patterns:\n`);
    
    // Group by severity
    const critical = duplicates.filter(d => d.severity === "critical");
    const high = duplicates.filter(d => d.severity === "high");
    const medium = duplicates.filter(d => d.severity === "medium");
    const low = duplicates.filter(d => d.severity === "low");
    
    if (critical.length > 0) {
      console.log("🚨 **CRITICAL DUPLICATES** (Must refactor):");
      critical.forEach(dup => {
        console.log(`   ${dup.pattern} (${dup.occurrences.length} occurrences)`);
        console.log(`   ${dup.description}`);
        dup.occurrences.forEach(occ => {
          console.log(`     - ${occ.file}:${occ.line}`);
        });
        console.log();
      });
    }
    
    if (high.length > 0) {
      console.log("⚠️  **HIGH PRIORITY DUPLICATES**:");
      high.forEach(dup => {
        console.log(`   ${dup.pattern} (${dup.occurrences.length} occurrences)`);
        console.log(`   ${dup.description}`);
        dup.occurrences.forEach(occ => {
          console.log(`     - ${occ.file}:${occ.line}`);
        });
        console.log();
      });
    }
    
    if (medium.length > 0) {
      console.log("📋 **MEDIUM PRIORITY** (Should refactor):");
      medium.forEach(dup => {
        console.log(`   ${dup.pattern} (${dup.occurrences.length} occurrences)`);
        dup.occurrences.slice(0, 3).forEach(occ => {
          console.log(`     - ${occ.file}:${occ.line}`);
        });
        if (dup.occurrences.length > 3) {
          console.log(`     ... and ${dup.occurrences.length - 3} more`);
        }
        console.log();
      });
    }
  }
  
  // Large functions analysis
  if (largeFunctions.length > 0) {
    console.log("📏 **LARGE FUNCTIONS** (Consider splitting):");
    console.log("-".repeat(40));
    largeFunctions.slice(0, 10).forEach(fn => {
      console.log(`   ${fn.file}:${fn.startLine} - ${fn.functionName} (${fn.lines} lines)`);
    });
    
    if (largeFunctions.length > 10) {
      console.log(`   ... and ${largeFunctions.length - 10} more large functions`);
    }
    console.log();
  }
  
  // Recommendations
  console.log("💡 **REFACTORING RECOMMENDATIONS**:");
  console.log("-".repeat(40));
  
  if (duplicates.some(d => d.pattern.includes("Mock"))) {
    console.log("1. 🔧 Create shared test utilities:");
    console.log("   - Centralize mock setup in src/testing/test-utils.ts");
    console.log("   - Create reusable mock factories");
    console.log("   - Standardize beforeEach patterns");
  }
  
  if (duplicates.some(d => d.pattern.includes("Executor"))) {
    console.log("2. 🏭 Create mock executor factory:");
    console.log("   - Single source for executor mocks");
    console.log("   - Reduce test setup boilerplate");
  }
  
  if (largeFunctions.length > 0) {
    console.log("3. ✂️  Split large functions:");
    console.log("   - Extract helper functions");
    console.log("   - Use composition over large functions");
    console.log("   - Improve readability and testability");
  }
  
  console.log("\n🎯 **PRIORITY**: Focus on critical and high priority duplicates first!");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}