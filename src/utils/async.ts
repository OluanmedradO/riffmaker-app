type RetryOptions = {
  maxAttempts?: number;
  delayMs?: number;
  onRetry?: (attempt: number, error: any) => void;
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000, onRetry } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        onRetry?.(attempt, error);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

export function isNetworkError(error: any): boolean {
  return (
    error?.message?.includes("network") ||
    error?.message?.includes("fetch") ||
    error?.code === "NETWORK_ERROR"
  );
}
