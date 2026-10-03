export type Attempt<T> = { name: string; run: (signal: AbortSignal) => Promise<T> };

export class AllProvidersFailed extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super(`All providers failed: ${errors.join("; ")}`);
    this.errors = errors;
  }
}

export async function tryInOrder<T>(
  attempts: Attempt<T>[],
  timeoutMs: number,
): Promise<{ value: T; provider: string }> {
  const errors: string[] = [];
  for (const attempt of attempts) {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error(`timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    try {
      const value = await Promise.race([attempt.run(controller.signal), timeout]);
      return { value, provider: attempt.name };
    } catch (err) {
      errors.push(`${attempt.name}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new AllProvidersFailed(errors);
}
