const DEFAULT_AUTH_REQUEST_TIMEOUT_MS = 30_000;

function getAuthRequestTimeoutMs(): number {
  const configured = Number(import.meta.env.VITE_AUTH_REQUEST_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_AUTH_REQUEST_TIMEOUT_MS;
}

export function withAuthRequestTimeout<T>(request: Promise<T>, operation: string): Promise<T> {
  const timeoutMs = getAuthRequestTimeoutMs();

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${operation} timed out. Please check your connection and try again.`));
    }, timeoutMs);

    request.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export function fetchAuthRequest(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = getAuthRequestTimeoutMs();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const signal = init.signal;

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  return fetch(input, { ...init, signal: controller.signal })
    .catch((error) => {
      if (timedOut) {
        throw new Error('Verification service timed out. Please check your connection and try again.');
      }
      throw error;
    })
    .finally(() => clearTimeout(timeout));
}
