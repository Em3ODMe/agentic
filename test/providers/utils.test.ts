import { describe, it, expect, vi, afterEach } from 'vitest';
import { delay, runWithRetry } from '../../src/providers/utils';

describe('delay', () => {
  it('should resolve after specified milliseconds', async () => {
    const start = Date.now();
    await delay(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });
});

describe('runWithRetry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return result on first successful call', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await runWithRetry(fn, 3, 10);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable error with message containing 1031', async () => {
    const error = new Error('Error 1031 occurred');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');
    const info = vi.fn();

    const result = await runWithRetry(fn, 3, 10, info);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(info).toHaveBeenCalledWith('AI Error (1031/500). Retrying 1/3...');
  });

  it('should retry on retryable error with message containing 500', async () => {
    const error = new Error('Internal Server Error 500');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');
    const info = vi.fn();

    const result = await runWithRetry(fn, 3, 10, info);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(info).toHaveBeenCalledWith('AI Error (1031/500). Retrying 1/3...');
  });

  it('should retry on retryable error with toString containing 1031', async () => {
    const error = new Error();
    error.toString = () => 'Error: Something 1031';
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');
    const info = vi.fn();

    const result = await runWithRetry(fn, 3, 10, info);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(info).toHaveBeenCalledWith('AI Error (1031/500). Retrying 1/3...');
  });

  it('should use exponential backoff delays', async () => {
    const error = new Error('Error 1031');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');
    const info = vi.fn();

    const start = Date.now();
    const result = await runWithRetry(fn, 3, 50, info);
    const elapsed = Date.now() - start;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(info).toHaveBeenCalledTimes(2);
    expect(info).toHaveBeenNthCalledWith(
      1,
      'AI Error (1031/500). Retrying 1/3...'
    );
    expect(info).toHaveBeenNthCalledWith(
      2,
      'AI Error (1031/500). Retrying 2/3...'
    );
    // Should wait at least 50ms (first retry) + 100ms (second retry) = 150ms
    expect(elapsed).toBeGreaterThanOrEqual(140);
  });

  it('should not call info when info is not provided', async () => {
    const error = new Error('Error 1031');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    const result = await runWithRetry(fn, 3, 10);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw on last retry when maxRetries reached', async () => {
    const error = new Error('Error 1031');
    const fn = vi.fn().mockRejectedValue(error);
    const info = vi.fn();

    await expect(runWithRetry(fn, 2, 10, info)).rejects.toThrow('Error 1031');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith('AI Error (1031/500). Retrying 1/2...');
  });

  it('should throw immediately on non-retryable error', async () => {
    const error = new Error('Some other error');
    const fn = vi.fn().mockRejectedValue(error);
    const info = vi.fn();

    await expect(runWithRetry(fn, 3, 10, info)).rejects.toThrow(
      'Some other error'
    );
    expect(fn).toHaveBeenCalledTimes(1);
    expect(info).not.toHaveBeenCalled();
  });

  it('should throw immediately on non-Error object', async () => {
    const fn = vi.fn().mockRejectedValue('string error');
    const info = vi.fn();

    await expect(runWithRetry(fn, 3, 10, info)).rejects.toBe('string error');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(info).not.toHaveBeenCalled();
  });

  it('should use default values for maxRetries and delayMs', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await runWithRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
