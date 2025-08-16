/**
 * Tests for logger utility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger, createSilentLogger, createPrefixedLogger } from './logger.js';

describe('Logger', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should create logger with debug mode', () => {
    const logger = createLogger(true);
    
    logger.debug('test debug');
    logger.info('test info');
    logger.warn('test warn');
    logger.error('test error');

    expect(consoleSpy).toHaveBeenCalledTimes(4);
  });

  it('should create logger without debug mode', () => {
    const logger = createLogger(false);
    
    logger.debug('test debug');
    logger.info('test info');
    logger.warn('test warn');

    // Debug should be filtered out, only info and warn logged
    expect(consoleSpy).toHaveBeenCalledTimes(2);
  });

  it('should create silent logger', () => {
    const logger = createSilentLogger();
    
    logger.debug('test debug');
    logger.info('test info');
    logger.warn('test warn');
    logger.error('test error');

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should create prefixed logger', () => {
    const baseLogger = createLogger(true);
    const prefixedLogger = createPrefixedLogger(baseLogger, 'TEST');
    
    prefixedLogger.info('message');
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[TEST] message')
    );
  });

  it('should handle errors properly', () => {
    const logger = createLogger(true);
    const error = new Error('Test error');
    
    logger.error('Something failed', error);
    
    expect(consoleSpy).toHaveBeenCalled();
  });
});