/**
 * Logger utility for the Claude Code + Linear integration
 */

import type { Logger } from "../core/types.js";

/**
 * ANSI color codes for console output
 */
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
} as const;

/**
 * Log levels with priority
 */
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Format timestamp for logging
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Create console logger implementation
 */
export function createLogger(debug = false): Logger {
  const minLevel = debug ? LogLevel.DEBUG : LogLevel.INFO;

  function log(
    level: LogLevel,
    color: string,
    prefix: string,
    message: string,
    extra?: any,
  ): void {
    if (level < minLevel) return;

    const timestamp = formatTimestamp();
    const formattedMessage = `${colors.gray}${timestamp}${colors.reset} ${color}${prefix}${colors.reset} ${message}`;

    if (extra) {
      if (extra instanceof Error) {
        console.log(formattedMessage);
        console.log(`${colors.gray}Stack:${colors.reset}`, extra.stack);
      } else {
        console.log(formattedMessage, extra);
      }
    } else {
      console.log(formattedMessage);
    }
  }

  return {
    debug: (message: string, extra?: any) => {
      log(LogLevel.DEBUG, colors.cyan, "[DEBUG]", message, extra);
    },

    info: (message: string, extra?: any) => {
      log(LogLevel.INFO, colors.green, "[INFO] ", message, extra);
    },

    warn: (message: string, extra?: any) => {
      log(LogLevel.WARN, colors.yellow, "[WARN] ", message, extra);
    },

    error: (message: string, error?: Error, extra?: any) => {
      if (error && extra) {
        log(LogLevel.ERROR, colors.red, "[ERROR]", message, {
          error: error.message,
          ...extra,
        });
        if (debug && error.stack) {
          console.log(`${colors.gray}Stack:${colors.reset}`, error.stack);
        }
      } else if (error) {
        log(LogLevel.ERROR, colors.red, "[ERROR]", message, error);
      } else {
        log(LogLevel.ERROR, colors.red, "[ERROR]", message, extra);
      }
    },
  };
}

/**
 * Create a logger with a specific prefix
 */
export function createPrefixedLogger(
  baseLogger: Logger,
  prefix: string,
): Logger {
  return {
    debug: (message: string, extra?: any) =>
      baseLogger.debug(`[${prefix}] ${message}`, extra),
    info: (message: string, extra?: any) =>
      baseLogger.info(`[${prefix}] ${message}`, extra),
    warn: (message: string, extra?: any) =>
      baseLogger.warn(`[${prefix}] ${message}`, extra),
    error: (message: string, error?: Error, extra?: any) =>
      baseLogger.error(`[${prefix}] ${message}`, error, extra),
  };
}

/**
 * Create a silent logger (for testing)
 */
export function createSilentLogger(): Logger {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}
