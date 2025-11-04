/**
 * Codegen HTTP Client (TypeScript-only, no Python bridge)
 *
 * This client communicates directly with Codegen's REST API
 * to delegate tasks to Codegen agents.
 */

import type { Logger } from '../core/types.js';
import type {
  CodegenConfig,
  CodegenTask,
  CodegenTaskStatus,
  CodegenTaskResult,
  CodegenRunOptions,
  CodegenApiResponse,
  CodegenMetrics,
  CodegenTaskQuery,
} from './types.js';

/**
 * HTTP error with status code
 */
class CodegenApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown,
  ) {
    super(message);
    this.name = 'CodegenApiError';
  }
}

/**
 * Codegen API Client
 *
 * Communicates with Codegen via HTTP REST API
 */
export class CodegenClient {
  private apiToken: string;
  private orgId: string;
  private baseUrl: string;
  private logger: Logger;
  private defaultTimeout: number = 30000; // 30 seconds

  constructor(config: CodegenConfig, logger: Logger) {
    this.apiToken = config.apiToken;
    this.orgId = config.orgId;
    this.baseUrl = config.baseUrl || 'https://api.codegen.com';
    this.logger = logger;

    this.logger.info('Codegen client initialized', {
      orgId: this.orgId,
      baseUrl: this.baseUrl,
    });
  }

  /**
   * Run a new task on Codegen
   */
  async runTask(
    prompt: string,
    options?: CodegenRunOptions,
  ): Promise<CodegenTask> {
    this.logger.info('Running Codegen task', {
      promptLength: prompt.length,
      options,
    });

    try {
      const response = await this.request<CodegenTask>('/v1/tasks', {
        method: 'POST',
        body: {
          org_id: this.orgId,
          prompt: prompt,
          branch: options?.branch,
          labels: options?.labels,
          auto_merge: options?.autoMerge || false,
          priority: options?.priority || 'medium',
          timeout: options?.timeout,
          create_pr: options?.createPR !== false, // default true
          assign_reviewers: options?.assignReviewers || false,
          reviewers: options?.reviewers,
        },
      });

      this.logger.info('Codegen task created', {
        taskId: response.id,
        status: response.status,
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to run Codegen task', error as Error);
      throw error;
    }
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<CodegenTaskStatus> {
    try {
      const task = await this.request<CodegenTask>(`/v1/tasks/${taskId}`, {
        method: 'GET',
      });

      return task.status;
    } catch (error) {
      this.logger.error('Failed to get task status', error as Error, {
        taskId,
      });
      throw error;
    }
  }

  /**
   * Get task details
   */
  async getTask(taskId: string): Promise<CodegenTask> {
    try {
      return await this.request<CodegenTask>(`/v1/tasks/${taskId}`, {
        method: 'GET',
      });
    } catch (error) {
      this.logger.error('Failed to get task', error as Error, { taskId });
      throw error;
    }
  }

  /**
   * Get task result (for completed tasks)
   */
  async getTaskResult(taskId: string): Promise<CodegenTaskResult> {
    try {
      const task = await this.getTask(taskId);

      if (task.status !== 'completed') {
        throw new Error(`Task ${taskId} is not completed (status: ${task.status})`);
      }

      if (!task.result) {
        throw new Error(`Task ${taskId} has no result`);
      }

      return task.result;
    } catch (error) {
      this.logger.error('Failed to get task result', error as Error, {
        taskId,
      });
      throw error;
    }
  }

  /**
   * Cancel a running task
   */
  async cancelTask(taskId: string): Promise<void> {
    try {
      await this.request(`/v1/tasks/${taskId}/cancel`, {
        method: 'POST',
      });

      this.logger.info('Task cancelled', { taskId });
    } catch (error) {
      this.logger.error('Failed to cancel task', error as Error, { taskId });
      throw error;
    }
  }

  /**
   * List tasks with optional filters
   */
  async listTasks(query?: CodegenTaskQuery): Promise<CodegenTask[]> {
    try {
      const queryParams = new URLSearchParams();

      if (query?.status) queryParams.set('status', query.status);
      if (query?.type) queryParams.set('type', query.type);
      if (query?.limit) queryParams.set('limit', query.limit.toString());
      if (query?.offset) queryParams.set('offset', query.offset.toString());

      const url = `/v1/tasks?${queryParams.toString()}`;
      const response = await this.request<{ tasks: CodegenTask[] }>(url, {
        method: 'GET',
      });

      return response.tasks || [];
    } catch (error) {
      this.logger.error('Failed to list tasks', error as Error);
      throw error;
    }
  }

  /**
   * Get metrics for organization
   */
  async getMetrics(): Promise<CodegenMetrics> {
    try {
      return await this.request<CodegenMetrics>('/v1/metrics', {
        method: 'GET',
      });
    } catch (error) {
      this.logger.error('Failed to get metrics', error as Error);
      throw error;
    }
  }

  /**
   * Wait for task completion with polling
   */
  async waitForCompletion(
    taskId: string,
    options?: {
      pollInterval?: number;
      timeout?: number;
      onProgress?: (task: CodegenTask) => void;
    },
  ): Promise<CodegenTaskResult> {
    const pollInterval = options?.pollInterval || 30000; // 30 seconds
    const timeout = options?.timeout || 3600000; // 1 hour
    const startTime = Date.now();

    this.logger.info('Waiting for task completion', {
      taskId,
      pollInterval,
      timeout,
    });

    while (true) {
      // Check timeout
      if (Date.now() - startTime > timeout) {
        throw new Error(`Task ${taskId} timed out after ${timeout}ms`);
      }

      // Get task status
      const task = await this.getTask(taskId);

      // Call progress callback if provided
      if (options?.onProgress) {
        options.onProgress(task);
      }

      // Check if completed
      if (task.status === 'completed') {
        this.logger.info('Task completed', {
          taskId,
          duration: Date.now() - startTime,
        });

        if (!task.result) {
          throw new Error(`Task ${taskId} completed but has no result`);
        }

        return task.result;
      }

      // Check if failed
      if (task.status === 'failed') {
        const error = task.error || 'Unknown error';
        this.logger.error('Task failed', new Error(error), { taskId });
        throw new Error(`Task ${taskId} failed: ${error}`);
      }

      // Check if cancelled
      if (task.status === 'cancelled') {
        throw new Error(`Task ${taskId} was cancelled`);
      }

      // Wait before next poll
      await this.sleep(pollInterval);
    }
  }

  /**
   * Make HTTP request to Codegen API
   */
  private async request<T>(
    endpoint: string,
    options: {
      method: string;
      body?: unknown;
      timeout?: number;
    },
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = options.timeout || this.defaultTimeout;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: options.method,
        headers: this.getHeaders(),
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-2xx responses
      if (!response.ok) {
        const errorBody = await response.text();
        throw new CodegenApiError(
          `Codegen API error: ${response.statusText}`,
          response.status,
          errorBody,
        );
      }

      // Parse JSON response
      const data = await response.json();

      // Handle Codegen API error response format
      if (data.success === false) {
        throw new CodegenApiError(
          data.message || data.error || 'Unknown error',
          response.status,
          data,
        );
      }

      // Return data (handle both { data: T } and direct T formats)
      return (data.data || data) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Get HTTP headers for Codegen API
   */
  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Boss-Agent/2.0',
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if Codegen API is reachable
   */
  async ping(): Promise<boolean> {
    try {
      await this.request('/v1/health', { method: 'GET' });
      return true;
    } catch (error) {
      this.logger.error('Codegen API ping failed', error as Error);
      return false;
    }
  }

  /**
   * Get API info
   */
  getInfo(): {
    orgId: string;
    baseUrl: string;
    hasToken: boolean;
  } {
    return {
      orgId: this.orgId,
      baseUrl: this.baseUrl,
      hasToken: !!this.apiToken,
    };
  }
}
