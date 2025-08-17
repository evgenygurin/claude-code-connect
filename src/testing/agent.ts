/**
 * Testing Agent for analyzing codebase and generating test recommendations
 */

import { readFile } from "fs/promises";
import { join, relative } from "path";
import { glob } from "glob";
import type { IntegrationConfig, Logger } from "../core/types.js";

/**
 * Test coverage analysis result
 */
export interface TestCoverageAnalysis {
  /** Total number of source files */
  totalSourceFiles: number;
  /** Number of files with tests */
  testedFiles: number;
  /** Coverage percentage */
  coveragePercentage: number;
  /** Files missing tests */
  missingTests: string[];
  /** Test files found */
  existingTests: string[];
  /** Recommendations for new tests */
  recommendations: TestRecommendation[];
}

/**
 * Test recommendation for a specific component
 */
export interface TestRecommendation {
  /** Target file to test */
  targetFile: string;
  /** Component/class name */
  componentName: string;
  /** Test priority (1-10, 10 being highest) */
  priority: number;
  /** Reason for testing */
  reason: string;
  /** Suggested test scenarios */
  scenarios: TestScenario[];
  /** Suggested test file path */
  suggestedTestFile: string;
}

/**
 * Individual test scenario
 */
export interface TestScenario {
  /** Test description */
  description: string;
  /** Test type (unit, integration, e2e) */
  type: "unit" | "integration" | "e2e";
  /** Test complexity (simple, medium, complex) */
  complexity: "simple" | "medium" | "complex";
  /** Dependencies required */
  dependencies: string[];
  /** Mock requirements */
  mocks: string[];
}

/**
 * Code analysis result
 */
export interface CodeAnalysis {
  /** File path */
  filePath: string;
  /** Exported classes */
  classes: string[];
  /** Exported functions */
  functions: string[];
  /** Imported dependencies */
  imports: string[];
  /** Async functions detected */
  asyncFunctions: string[];
  /** Complexity score (1-10) */
  complexity: number;
  /** Lines of code */
  linesOfCode: number;
}

/**
 * Testing Agent - analyzes codebase and provides testing recommendations
 */
export class TestingAgent {
  private config: IntegrationConfig;
  private logger: Logger;
  private projectRoot: string;

  constructor(config: IntegrationConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.projectRoot = config.projectRootDir;
  }

  /**
   * Analyze codebase test coverage
   */
  async analyzeCoverage(): Promise<TestCoverageAnalysis> {
    this.logger.info("Starting test coverage analysis");

    try {
      // Find all TypeScript source files (excluding node_modules, dist, tests)
      const sourceFiles = await this.findSourceFiles();

      // Find existing test files
      const testFiles = await this.findTestFiles();

      // Analyze which source files have corresponding tests
      const testedFiles = this.mapTestsToSource(sourceFiles, testFiles);
      const missingTests = sourceFiles.filter(
        (file) => !testedFiles.includes(file),
      );

      // Generate recommendations for missing tests
      const recommendations = await this.generateRecommendations(missingTests);

      const coverage: TestCoverageAnalysis = {
        totalSourceFiles: sourceFiles.length,
        testedFiles: testedFiles.length,
        coveragePercentage: Math.round(
          (testedFiles.length / sourceFiles.length) * 100,
        ),
        missingTests,
        existingTests: testFiles,
        recommendations,
      };

      this.logger.info("Test coverage analysis completed", {
        totalFiles: coverage.totalSourceFiles,
        coverage: coverage.coveragePercentage,
        missingTests: coverage.missingTests.length,
      });

      return coverage;
    } catch (error) {
      this.logger.error("Failed to analyze test coverage", error as Error);
      throw error;
    }
  }

  /**
   * Generate test recommendations for specific components
   */
  async generateRecommendations(
    files: string[],
  ): Promise<TestRecommendation[]> {
    const recommendations: TestRecommendation[] = [];

    for (const file of files) {
      try {
        const analysis = await this.analyzeCodeFile(file);
        const recommendation = this.createRecommendation(file, analysis);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      } catch (error) {
        this.logger.warn(`Failed to analyze file ${file}`, {
          error: (error as Error).message,
        });
      }
    }

    // Sort by priority (highest first)
    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Generate sample test file for a component
   */
  async generateSampleTest(
    recommendation: TestRecommendation,
  ): Promise<string> {
    const { targetFile, componentName, scenarios } = recommendation;

    // Determine if it's a class or module
    const analysis = await this.analyzeCodeFile(targetFile);
    const isClass = analysis.classes.includes(componentName);

    let testContent = this.generateTestFileHeader(targetFile, componentName);

    if (isClass) {
      testContent += this.generateClassTestTemplate(
        componentName,
        scenarios,
        analysis,
      );
    } else {
      testContent += this.generateFunctionTestTemplate(
        componentName,
        scenarios,
        analysis,
      );
    }

    testContent += this.generateTestFileFooter();

    return testContent;
  }

  /**
   * Find all TypeScript source files
   */
  private async findSourceFiles(): Promise<string[]> {
    const pattern = join(this.projectRoot, "src/**/*.ts");
    const files = await glob(pattern, {
      ignore: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/*.d.ts",
      ],
    });

    return files.map((file) => relative(this.projectRoot, file));
  }

  /**
   * Find all test files
   */
  private async findTestFiles(): Promise<string[]> {
    const patterns = [
      join(this.projectRoot, "src/**/*.test.ts"),
      join(this.projectRoot, "src/**/*.spec.ts"),
      join(this.projectRoot, "test/**/*.ts"),
      join(this.projectRoot, "tests/**/*.ts"),
    ];

    const allFiles: string[] = [];
    for (const pattern of patterns) {
      const files = await glob(pattern);
      if (files && Array.isArray(files)) {
        allFiles.push(...files.map((file) => relative(this.projectRoot, file)));
      }
    }

    return allFiles;
  }

  /**
   * Map test files to their corresponding source files
   */
  private mapTestsToSource(
    sourceFiles: string[],
    testFiles: string[],
  ): string[] {
    const testedFiles: string[] = [];

    for (const sourceFile of sourceFiles) {
      const baseName = sourceFile.replace(/\.ts$/, "");
      const hasTest = testFiles.some((testFile) => {
        const testBaseName = testFile.replace(/\.(test|spec)\.ts$/, "");
        return (
          testBaseName.includes(baseName) || baseName.includes(testBaseName)
        );
      });

      if (hasTest) {
        testedFiles.push(sourceFile);
      }
    }

    return testedFiles;
  }

  /**
   * Analyze a single code file
   */
  private async analyzeCodeFile(filePath: string): Promise<CodeAnalysis> {
    const fullPath = join(this.projectRoot, filePath);
    const content = await readFile(fullPath, "utf-8");
    const lines = content.split("\n");

    // Extract classes, functions, imports using regex
    const classMatches = content.match(/export\s+class\s+(\w+)/g) || [];
    const classes = classMatches.map((match) =>
      match.replace(/export\s+class\s+/, ""),
    );

    const functionMatches =
      content.match(/export\s+(?:async\s+)?function\s+(\w+)/g) || [];
    const functions = functionMatches.map((match) =>
      match.replace(/export\s+(?:async\s+)?function\s+/, ""),
    );

    const importMatches =
      content.match(/import\s+.*\s+from\s+["']([^"']+)["']/g) || [];
    const imports = importMatches
      .map((match) => {
        const fromMatch = match.match(/from\s+["']([^"']+)["']/);
        return fromMatch ? fromMatch[1] : "";
      })
      .filter(Boolean);

    const asyncMatches = content.match(/async\s+\w+/g) || [];
    const asyncFunctions = asyncMatches.map((match) =>
      match.replace(/async\s+/, ""),
    );

    // Calculate complexity (simple heuristic)
    const complexity = this.calculateComplexity(content);

    return {
      filePath,
      classes,
      functions,
      imports,
      asyncFunctions,
      complexity,
      linesOfCode: lines.length,
    };
  }

  /**
   * Create test recommendation for a file
   */
  private createRecommendation(
    filePath: string,
    analysis: CodeAnalysis,
  ): TestRecommendation | null {
    // Skip if no exportable components
    if (analysis.classes.length === 0 && analysis.functions.length === 0) {
      return null;
    }

    const componentName = analysis.classes[0] || analysis.functions[0];
    const priority = this.calculatePriority(filePath, analysis);
    const reason = this.getPriorityReason(filePath, analysis);

    const scenarios = this.generateTestScenarios(analysis);
    const suggestedTestFile = this.generateTestFilePath(filePath);

    return {
      targetFile: filePath,
      componentName,
      priority,
      reason,
      scenarios,
      suggestedTestFile,
    };
  }

  /**
   * Calculate test priority for a component
   */
  private calculatePriority(filePath: string, analysis: CodeAnalysis): number {
    let priority = 5; // Base priority

    // Higher priority for core components
    if (filePath.includes("session") || filePath.includes("manager"))
      priority += 3;
    if (filePath.includes("webhook") || filePath.includes("handler"))
      priority += 3;
    if (filePath.includes("executor") || filePath.includes("claude"))
      priority += 2;
    if (filePath.includes("storage") || filePath.includes("client"))
      priority += 2;

    // Higher priority for complex code
    if (analysis.complexity >= 7) priority += 2;
    if (analysis.complexity >= 9) priority += 1;

    // Higher priority for async code
    if (analysis.asyncFunctions.length > 0) priority += 1;

    // Higher priority for larger files
    if (analysis.linesOfCode > 200) priority += 1;
    if (analysis.linesOfCode > 500) priority += 1;

    return Math.min(priority, 10);
  }

  /**
   * Get reason for priority rating
   */
  private getPriorityReason(filePath: string, analysis: CodeAnalysis): string {
    const reasons: string[] = [];

    if (filePath.includes("session") || filePath.includes("manager")) {
      reasons.push("Core session management logic");
    }
    if (filePath.includes("webhook") || filePath.includes("handler")) {
      reasons.push("Critical webhook processing");
    }
    if (analysis.complexity >= 7) {
      reasons.push("High complexity code");
    }
    if (analysis.asyncFunctions.length > 0) {
      reasons.push("Async operations requiring careful testing");
    }
    if (analysis.linesOfCode > 200) {
      reasons.push("Large codebase requiring coverage");
    }

    return reasons.length > 0
      ? reasons.join(", ")
      : "Standard component testing";
  }

  /**
   * Generate test scenarios for a component
   */
  private generateTestScenarios(analysis: CodeAnalysis): TestScenario[] {
    const scenarios: TestScenario[] = [];

    // Add basic instantiation/setup tests
    if (analysis.classes.length > 0) {
      scenarios.push({
        description: "Component instantiation and initialization",
        type: "unit",
        complexity: "simple",
        dependencies: [],
        mocks: [],
      });
    }

    // Add async function tests
    if (analysis.asyncFunctions.length > 0) {
      scenarios.push({
        description: "Async operations success scenarios",
        type: "unit",
        complexity: "medium",
        dependencies: [],
        mocks: ["Logger", "Storage"],
      });

      scenarios.push({
        description: "Async operations error handling",
        type: "unit",
        complexity: "medium",
        dependencies: [],
        mocks: ["Logger", "Storage"],
      });
    }

    // Add integration tests for external dependencies
    if (analysis.imports.some((imp) => imp.includes("@linear/sdk"))) {
      scenarios.push({
        description: "Linear SDK integration",
        type: "integration",
        complexity: "complex",
        dependencies: ["@linear/sdk"],
        mocks: ["LinearClient"],
      });
    }

    // Add validation tests if zod is used
    if (analysis.imports.some((imp) => imp.includes("zod"))) {
      scenarios.push({
        description: "Input validation and schema parsing",
        type: "unit",
        complexity: "medium",
        dependencies: ["zod"],
        mocks: [],
      });
    }

    return scenarios;
  }

  /**
   * Generate test file path from source file path
   */
  private generateTestFilePath(sourceFile: string): string {
    const dir = sourceFile.replace(/\/[^/]+\.ts$/, "");
    const fileName = sourceFile.replace(/.*\//, "").replace(/\.ts$/, "");
    return `${dir}/${fileName}.test.ts`;
  }

  /**
   * Calculate code complexity (simple heuristic)
   */
  private calculateComplexity(content: string): number {
    let complexity = 1;

    // Count decision points
    const decisionKeywords = [
      "if",
      "else",
      "switch",
      "case",
      "for",
      "while",
      "catch",
      "&&",
      "||",
    ];
    for (const keyword of decisionKeywords) {
      const matches = content.match(new RegExp(`\\b${keyword}\\b`, "g"));
      if (matches) complexity += matches.length;
    }

    // Count async operations
    const asyncMatches = content.match(/await\s+/g);
    if (asyncMatches) complexity += asyncMatches.length * 0.5;

    // Count classes and functions
    const classMatches = content.match(/class\s+\w+/g);
    const functionMatches = content.match(/function\s+\w+/g);
    complexity += (classMatches?.length || 0) * 2;
    complexity += functionMatches?.length || 0;

    return Math.min(Math.round(complexity), 10);
  }

  /**
   * Generate test file header
   */
  private generateTestFileHeader(
    targetFile: string,
    componentName: string,
  ): string {
    const importPath = targetFile.replace(/\.ts$/, ".js");

    return `/**
 * Tests for ${componentName}
 * Generated by TestingAgent
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ${componentName} } from "../${importPath}";
import type { IntegrationConfig, Logger } from "../core/types.js";

// Mock implementations
const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

const mockConfig: IntegrationConfig = {
  linearApiToken: "test-token",
  linearOrganizationId: "test-org",
  claudeExecutablePath: "claude",
  webhookPort: 3000,
  projectRootDir: "/test/project",
  defaultBranch: "main",
  createBranches: true,
  timeoutMinutes: 30
};

describe("${componentName}", () => {
  let instance: ${componentName};

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

`;
  }

  /**
   * Generate class test template
   */
  private generateClassTestTemplate(
    className: string,
    _scenarios: TestScenario[],
    _analysis: CodeAnalysis,
  ): string {
    let template = `  describe("instantiation", () => {
    it("should create instance with valid config", () => {
      instance = new ${className}(mockConfig, mockLogger);
      expect(instance).toBeInstanceOf(${className});
    });

    it("should throw error with invalid config", () => {
      const invalidConfig = { ...mockConfig, linearApiToken: "" };
      expect(() => new ${className}(invalidConfig, mockLogger)).toThrow();
    });
  });

`;

    // Add method tests based on analysis
    if (_analysis.asyncFunctions.length > 0) {
      template += `  describe("async operations", () => {
    beforeEach(() => {
      instance = new ${className}(mockConfig, mockLogger);
    });

    it("should handle successful async operations", async () => {
      // TODO: Implement test for successful async operation
      expect(true).toBe(true);
    });

    it("should handle async operation errors", async () => {
      // TODO: Implement test for async operation error handling
      expect(true).toBe(true);
    });
  });

`;
    }

    return template;
  }

  /**
   * Generate function test template
   */
  private generateFunctionTestTemplate(
    functionName: string,
    _scenarios: TestScenario[],
    _analysis: CodeAnalysis,
  ): string {
    return `  describe("${functionName}", () => {
    it("should execute successfully with valid input", () => {
      // TODO: Implement test for ${functionName}
      expect(true).toBe(true);
    });

    it("should handle invalid input gracefully", () => {
      // TODO: Implement error handling test for ${functionName}
      expect(true).toBe(true);
    });
  });

`;
  }

  /**
   * Generate test file footer
   */
  private generateTestFileFooter(): string {
    return `});
`;
  }
}
