/**
 * Codegen webhook handler for processing callbacks
 */

import { createHmac } from 'crypto';
import type { Logger } from '../core/types.js';
import type { CodegenTask, CodegenTaskResult } from './types.js';

/**
 * Codegen webhook event types
 */
export enum CodegenWebhookEventType {
  TASK_STARTED = 'task.started',
  TASK_PROGRESS = 'task.progress',
  TASK_COMPLETED = 'task.completed',
  TASK_FAILED = 'task.failed',
  TASK_CANCELLED = 'task.cancelled',
}

/**
 * Codegen webhook event payload
 */
export interface CodegenWebhookEvent {
  /** Event type */
  type: CodegenWebhookEventType;
  /** Task ID */
  taskId: string;
  /** Organization ID */
  organizationId: string;
  /** Event timestamp */
  timestamp: string;
  /** Event data */
  data: {
    task?: CodegenTask;
    result?: CodegenTaskResult;
    progress?: {
      percentage: number;
      currentStep: string;
      details?: string;
    };
    error?: {
      message: string;
      code?: string;
      details?: any;
    };
  };
}

/**
 * Processed Codegen webhook event
 */
export interface ProcessedCodegenEvent {
  type: CodegenWebhookEventType;
  taskId: string;
  organizationId: string;
  timestamp: Date;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  task?: CodegenTask;
  result?: CodegenTaskResult;
  progress?: {
    percentage: number;
    currentStep: string;
    details?: string;
  };
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  shouldNotify: boolean;
}

/**
 * Webhook handler options
 */
export interface CodegenWebhookHandlerOptions {
  /** Webhook secret for signature verification */
  secret?: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Codegen webhook handler
 * Processes webhook callbacks from Codegen API
 */
export class CodegenWebhookHandler {
  private logger: Logger;
  private secret?: string;
  private debug: boolean;
  private eventCallbacks = new Map<string, Set<(event: ProcessedCodegenEvent) => void>>();

  constructor(logger: Logger, options: CodegenWebhookHandlerOptions = {}) {
    this.logger = logger;
    this.secret = options.secret;
    this.debug = options.debug || false;

    this.logger.info('Codegen webhook handler initialized', {
      hasSecret: !!this.secret,
      debug: this.debug,
    });
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!this.secret) {
      this.logger.warn('Webhook secret not configured, skipping signature verification');
      return true;
    }

    try {
      const expectedSignature = createHmac('sha256', this.secret)
        .update(payload)
        .digest('hex');

      // Support both 'sha256=...' and direct hex formats
      const providedSignature = signature.startsWith('sha256=')
        ? signature.substring(7)
        : signature;

      const isValid = expectedSignature === providedSignature;

      if (!isValid) {
        this.logger.warn('Webhook signature verification failed', {
          expected: expectedSignature.substring(0, 10) + '...',
          provided: providedSignature.substring(0, 10) + '...',
        });
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error verifying webhook signature', error as Error);
      return false;
    }
  }

  /**
   * Validate webhook payload
   */
  validateWebhook(body: unknown): CodegenWebhookEvent | null {
    try {
      const event = body as CodegenWebhookEvent;

      // Validate required fields
      if (!event.type || !event.taskId || !event.organizationId || !event.timestamp) {
        this.logger.warn('Invalid webhook payload: missing required fields', {
          hasType: !!event.type,
          hasTaskId: !!event.taskId,
          hasOrgId: !!event.organizationId,
          hasTimestamp: !!event.timestamp,
        });
        return null;
      }

      // Validate event type
      const validTypes = Object.values(CodegenWebhookEventType);
      if (!validTypes.includes(event.type)) {
        this.logger.warn('Invalid webhook event type', {
          type: event.type,
          validTypes,
        });
        return null;
      }

      return event;
    } catch (error) {
      this.logger.error('Error validating webhook payload', error as Error);
      return null;
    }
  }

  /**
   * Process webhook event
   */
  async processWebhook(event: CodegenWebhookEvent): Promise<ProcessedCodegenEvent | null> {
    try {
      this.logger.info('Processing Codegen webhook', {
        type: event.type,
        taskId: event.taskId,
        organizationId: event.organizationId,
      });

      // Map event type to status
      let status: ProcessedCodegenEvent['status'];
      switch (event.type) {
        case CodegenWebhookEventType.TASK_STARTED:
          status = 'in_progress';
          break;
        case CodegenWebhookEventType.TASK_PROGRESS:
          status = 'in_progress';
          break;
        case CodegenWebhookEventType.TASK_COMPLETED:
          status = 'completed';
          break;
        case CodegenWebhookEventType.TASK_FAILED:
          status = 'failed';
          break;
        case CodegenWebhookEventType.TASK_CANCELLED:
          status = 'cancelled';
          break;
      }

      const processedEvent: ProcessedCodegenEvent = {
        type: event.type,
        taskId: event.taskId,
        organizationId: event.organizationId,
        timestamp: new Date(event.timestamp),
        status,
        task: event.data.task,
        result: event.data.result,
        progress: event.data.progress,
        error: event.data.error,
        shouldNotify: this.shouldNotify(event),
      };

      // Log detailed event data in debug mode
      if (this.debug) {
        this.logger.debug('Codegen webhook event details', {
          event: processedEvent,
        });
      }

      // Trigger callbacks for this event type
      await this.triggerCallbacks(processedEvent);

      return processedEvent;
    } catch (error) {
      this.logger.error('Error processing Codegen webhook', error as Error, {
        eventType: event.type,
        taskId: event.taskId,
      });
      return null;
    }
  }

  /**
   * Determine if event should trigger notification
   */
  private shouldNotify(event: CodegenWebhookEvent): boolean {
    // Always notify on completion, failure, or cancellation
    if (
      event.type === CodegenWebhookEventType.TASK_COMPLETED ||
      event.type === CodegenWebhookEventType.TASK_FAILED ||
      event.type === CodegenWebhookEventType.TASK_CANCELLED
    ) {
      return true;
    }

    // Notify on progress if percentage is multiple of 25
    if (
      event.type === CodegenWebhookEventType.TASK_PROGRESS &&
      event.data.progress?.percentage
    ) {
      const percentage = event.data.progress.percentage;
      return percentage % 25 === 0 || percentage === 100;
    }

    // Don't notify on task started
    return false;
  }

  /**
   * Register event callback
   */
  on(
    eventType: CodegenWebhookEventType | 'all',
    callback: (event: ProcessedCodegenEvent) => void
  ): void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, new Set());
    }

    this.eventCallbacks.get(eventType)!.add(callback);

    this.logger.debug('Registered Codegen webhook callback', {
      eventType,
      totalCallbacks: this.eventCallbacks.get(eventType)!.size,
    });
  }

  /**
   * Unregister event callback
   */
  off(
    eventType: CodegenWebhookEventType | 'all',
    callback: (event: ProcessedCodegenEvent) => void
  ): void {
    const callbacks = this.eventCallbacks.get(eventType);
    if (callbacks) {
      callbacks.delete(callback);

      this.logger.debug('Unregistered Codegen webhook callback', {
        eventType,
        remainingCallbacks: callbacks.size,
      });
    }
  }

  /**
   * Trigger callbacks for event
   */
  private async triggerCallbacks(event: ProcessedCodegenEvent): Promise<void> {
    // Trigger specific event callbacks
    const specificCallbacks = this.eventCallbacks.get(event.type);
    if (specificCallbacks) {
      for (const callback of specificCallbacks) {
        try {
          await callback(event);
        } catch (error) {
          this.logger.error('Error in Codegen webhook callback', error as Error, {
            eventType: event.type,
            taskId: event.taskId,
          });
        }
      }
    }

    // Trigger 'all' event callbacks
    const allCallbacks = this.eventCallbacks.get('all');
    if (allCallbacks) {
      for (const callback of allCallbacks) {
        try {
          await callback(event);
        } catch (error) {
          this.logger.error('Error in Codegen webhook "all" callback', error as Error, {
            eventType: event.type,
            taskId: event.taskId,
          });
        }
      }
    }
  }

  /**
   * Get callback count for event type
   */
  getCallbackCount(eventType: CodegenWebhookEventType | 'all'): number {
    return this.eventCallbacks.get(eventType)?.size || 0;
  }

  /**
   * Clear all callbacks
   */
  clearCallbacks(eventType?: CodegenWebhookEventType | 'all'): void {
    if (eventType) {
      this.eventCallbacks.delete(eventType);
      this.logger.debug('Cleared Codegen webhook callbacks', { eventType });
    } else {
      this.eventCallbacks.clear();
      this.logger.debug('Cleared all Codegen webhook callbacks');
    }
  }

  /**
   * Format event for logging
   */
  formatEventForLogging(event: ProcessedCodegenEvent): string {
    const parts = [
      `[${event.type}]`,
      `Task ${event.taskId}`,
    ];

    if (event.progress) {
      parts.push(`${event.progress.percentage}%`);
      if (event.progress.currentStep) {
        parts.push(`- ${event.progress.currentStep}`);
      }
    }

    if (event.result) {
      parts.push(`✓ Completed`);
      if (event.result.prUrl) {
        parts.push(`PR: ${event.result.prUrl}`);
      }
    }

    if (event.error) {
      parts.push(`✗ Error: ${event.error.message}`);
    }

    return parts.join(' ');
  }
}
