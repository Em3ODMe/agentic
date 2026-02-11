import type { ModelRunnerProvider } from '../types';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
  retryableStatusCodes: number[];
}

export class RetryHandler {
  private static defaultConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryableErrors: ['1031', '500', '502', '503', '504', 'timeout', 'network'],
    retryableStatusCodes: [500, 502, 503, 504, 429],
  };

  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    context?: string
  ): Promise<T> {
    const fullConfig = { ...this.defaultConfig, ...config };
    let lastError: unknown;

    for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === fullConfig.maxRetries) {
          break; // No more retries
        }

        if (!this.shouldRetry(error, fullConfig)) {
          break; // Error is not retryable
        }

        const delay = this.calculateDelay(attempt, fullConfig);
        if (context) {
          console.warn(
            `${context} - Attempt ${attempt + 1}/${fullConfig.maxRetries + 1} failed. Retrying in ${delay}ms...`
          );
        }
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private static shouldRetry(error: unknown, config: RetryConfig): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorString = errorMessage.toLowerCase();

    // Check for retryable error messages
    if (
      config.retryableErrors.some((retryableError) =>
        errorString.includes(retryableError.toLowerCase())
      )
    ) {
      return true;
    }

    // Check for retryable HTTP status codes
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      typeof error.status === 'number'
    ) {
      return config.retryableStatusCodes.includes(error.status);
    }

    // Check for network-related errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }

    return false;
  }

  private static calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay =
      config.baseDelay * Math.pow(config.backoffFactor, attempt);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * exponentialDelay;

    return Math.min(exponentialDelay + jitter, config.maxDelay);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class ErrorHandler {
  static wrapProviderError(
    error: unknown,
    provider: ModelRunnerProvider,
    context?: string
  ): Error {
    const contextMessage = context ? ` (${context})` : '';

    if (error instanceof Error) {
      return new Error(
        `[${provider.toUpperCase()}]${contextMessage} ${error.message}`
      );
    }

    if (typeof error === 'string') {
      return new Error(`[${provider.toUpperCase()}]${contextMessage} ${error}`);
    }

    return new Error(
      `[${provider.toUpperCase()}]${contextMessage} Unknown error occurred`
    );
  }

  static isNetworkError(error: unknown): boolean {
    return (
      error instanceof TypeError &&
      (error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('ECONNREFUSED'))
    );
  }

  static isTimeoutError(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorMessage.toLowerCase().includes('timeout');
  }

  static isRateLimitError(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return (
      errorMessage.toLowerCase().includes('rate limit') ||
      Boolean(
        error &&
        typeof error === 'object' &&
        'status' in error &&
        error.status === 429
      )
    );
  }
}
