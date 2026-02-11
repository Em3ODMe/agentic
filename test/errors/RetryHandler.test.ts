import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetryHandler, ErrorHandler } from '@/errors/RetryHandler';

describe(RetryHandler.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {
      /* noop */
    });
  });

  describe('executeWithRetry', () => {
    it('should return result on first successful attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const result = await RetryHandler.executeWithRetry(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error and eventually succeed', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('500 server error'))
        .mockResolvedValue('success');
      const result = await RetryHandler.executeWithRetry(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries exceeded', async () => {
      const error = new Error('503 service unavailable');
      const operation = vi.fn().mockRejectedValue(error);
      await expect(
        RetryHandler.executeWithRetry(operation, { maxRetries: 2 })
      ).rejects.toBe(error);
      expect(operation).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const error = new Error('some other error');
      const operation = vi.fn().mockRejectedValue(error);
      await expect(RetryHandler.executeWithRetry(operation)).rejects.toBe(
        error
      );
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should log retry attempts when context is provided', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('success');
      await RetryHandler.executeWithRetry(
        operation,
        { maxRetries: 2 },
        'TestContext'
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('TestContext - Attempt 1/3 failed. Retrying in')
      );
    });

    it('should respect custom config', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('500'));
      await expect(
        RetryHandler.executeWithRetry(operation, { maxRetries: 1 })
      ).rejects.toThrow('500');
      expect(operation).toHaveBeenCalledTimes(2); // initial + 1 retry
    });
  });

  describe('shouldRetry logic', () => {
    it('should retry on retryable error messages', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('timeout occurred'))
        .mockResolvedValue('success');
      const result = await RetryHandler.executeWithRetry(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 status code error', async () => {
      const error = { status: 500, message: 'Internal Server Error' };
      const operation = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      const result = await RetryHandler.executeWithRetry(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 status code error', async () => {
      const error = { status: 429, message: 'Rate Limited' };
      const operation = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      const result = await RetryHandler.executeWithRetry(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on fetch TypeError', async () => {
      const error = new TypeError('fetch failed');
      const operation = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      const result = await RetryHandler.executeWithRetry(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable status codes', async () => {
      const error = { status: 400, message: 'Bad Request' };
      const operation = vi.fn().mockRejectedValue(error);
      await expect(RetryHandler.executeWithRetry(operation)).rejects.toBe(
        error
      );
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('500'));
      const startTime = Date.now();
      try {
        await RetryHandler.executeWithRetry(operation, {
          maxRetries: 1,
          baseDelay: 100,
        });
      } catch {
        // expected
      }
      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('should respect maxDelay', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('500'));
      const startTime = Date.now();
      try {
        await RetryHandler.executeWithRetry(operation, {
          maxRetries: 2,
          baseDelay: 100,
          maxDelay: 150,
          backoffFactor: 10,
        });
      } catch {
        // expected
      }
      const duration = Date.now() - startTime;
      // With maxDelay of 150, both delays should be capped
      expect(duration).toBeLessThan(500);
    });
  });

  describe('custom retryable errors', () => {
    it('should use custom retryable errors from config', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('custom error'))
        .mockResolvedValue('success');
      const result = await RetryHandler.executeWithRetry(operation, {
        retryableErrors: ['custom error'],
      });
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should use custom retryable status codes from config', async () => {
      const error = { status: 418, message: 'I am a teapot' };
      const operation = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      const result = await RetryHandler.executeWithRetry(operation, {
        retryableStatusCodes: [418],
      });
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});

describe(ErrorHandler.name, () => {
  describe('wrapProviderError', () => {
    it('should wrap Error instances with provider prefix', () => {
      const error = new Error('Test error message');
      const wrapped = ErrorHandler.wrapProviderError(error, 'groq');
      expect(wrapped.message).toBe('[GROQ] Test error message');
    });

    it('should wrap string errors with provider prefix', () => {
      const wrapped = ErrorHandler.wrapProviderError(
        'string error',
        'cloudflare'
      );
      expect(wrapped.message).toBe('[CLOUDFLARE] string error');
    });

    it('should wrap unknown errors with provider prefix', () => {
      const wrapped = ErrorHandler.wrapProviderError(null, 'groq');
      expect(wrapped.message).toBe('[GROQ] Unknown error occurred');
    });

    it('should include context in wrapped error', () => {
      const error = new Error('Test error');
      const wrapped = ErrorHandler.wrapProviderError(error, 'groq', 'API call');
      expect(wrapped.message).toBe('[GROQ] (API call) Test error');
    });
  });

  describe('isNetworkError', () => {
    it('should return true for fetch TypeError', () => {
      const error = new TypeError('fetch failed');
      expect(ErrorHandler.isNetworkError(error)).toBe(true);
    });

    it('should return true for network errors', () => {
      const error = new TypeError('network error occurred');
      expect(ErrorHandler.isNetworkError(error)).toBe(true);
    });

    it('should return true for ECONNREFUSED errors', () => {
      const error = new TypeError('ECONNREFUSED');
      expect(ErrorHandler.isNetworkError(error)).toBe(true);
    });

    it('should return false for non-network errors', () => {
      const error = new Error('some error');
      expect(ErrorHandler.isNetworkError(error)).toBe(false);
    });

    it('should return false for non-TypeError', () => {
      const error = new Error('fetch failed');
      expect(ErrorHandler.isNetworkError(error)).toBe(false);
    });
  });

  describe('isTimeoutError', () => {
    it('should return true for timeout in error message', () => {
      const error = new Error('Request timeout');
      expect(ErrorHandler.isTimeoutError(error)).toBe(true);
    });

    it('should return true for timeout in lowercase', () => {
      const error = new Error('connection TIMEOUT');
      expect(ErrorHandler.isTimeoutError(error)).toBe(true);
    });

    it('should return false for non-timeout errors', () => {
      const error = new Error('some error');
      expect(ErrorHandler.isTimeoutError(error)).toBe(false);
    });

    it('should handle string errors', () => {
      expect(ErrorHandler.isTimeoutError('timeout occurred')).toBe(true);
    });
  });

  describe('isRateLimitError', () => {
    it('should return true for rate limit in error message', () => {
      const error = new Error('Rate limit exceeded');
      expect(ErrorHandler.isRateLimitError(error)).toBe(true);
    });

    it('should return true for status code 429', () => {
      const error = { status: 429 };
      expect(ErrorHandler.isRateLimitError(error)).toBe(true);
    });

    it('should return false for non-rate-limit errors', () => {
      const error = new Error('some error');
      expect(ErrorHandler.isRateLimitError(error)).toBe(false);
    });

    it('should return false for non-429 status codes', () => {
      const error = { status: 500 };
      expect(ErrorHandler.isRateLimitError(error)).toBe(false);
    });

    it('should handle string errors', () => {
      expect(ErrorHandler.isRateLimitError('rate limit hit')).toBe(true);
    });
  });
});
