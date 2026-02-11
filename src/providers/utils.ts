export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
export async function runWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000,
  info?: (msg: string) => void
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isRetryable =
        error instanceof Error &&
        (error.message?.includes('1031') ||
          error.toString().includes('1031') ||
          error.message?.includes('500'));

      if (isRetryable && i < maxRetries - 1) {
        if (info)
          info(`AI Error (1031/500). Retrying ${i + 1}/${maxRetries}...`);
        await delay(delayMs * (i + 1));
        continue;
      }
      throw error;
    }
  }
}
