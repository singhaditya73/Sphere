import type { MusicErrorCode } from "./types.ts";
import { MusicError } from "./errors.ts";

/**
 * Shared JSON transport for music providers.
 *
 * Keeping this in one place means every provider gets the same timeout,
 * cancellation, and error-mapping behaviour (and the same test seam via an
 * injectable `fetch`).
 */

export interface ClassifiedHttpError {
  code: MusicErrorCode;
  retryable: boolean;
  message: string;
}

export interface RequestJsonOptions {
  /** Injectable fetch so tests can mock the network. */
  fetchImpl?: typeof fetch;
  /** Abort the request after this many milliseconds. */
  timeoutMs: number;
  /** Caller cancellation signal, combined with the provider timeout. */
  signal?: AbortSignal;
  /** Maps a non-2xx response into a typed, user-safe error. */
  classify: (status: number, bodyText: string) => ClassifiedHttpError;
}

export async function requestJson(url: string, options: RequestJsonOptions): Promise<unknown> {
  const { fetchImpl = fetch, timeoutMs, signal: externalSignal, classify } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();

  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", onExternalAbort);
  }

  let response: Response;
  try {
    response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
  } catch (error) {
    if (isAbortError(error)) {
      if (externalSignal?.aborted) throw error; // propagate caller cancellation
      throw new MusicError("TIMEOUT", "The music provider took too long to respond.", {
        retryable: true,
        status: 504,
      });
    }
    throw new MusicError("PROVIDER_UNAVAILABLE", "Could not reach the music provider.", {
      retryable: true,
      status: 502,
    });
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener?.("abort", onExternalAbort);
  }

  if (!response.ok) {
    const bodyText = await safeText(response);
    const classified = classify(response.status, bodyText);
    throw new MusicError(classified.code, classified.message, {
      retryable: classified.retryable,
      status: response.status,
    });
  }

  try {
    return await response.json();
  } catch {
    throw new MusicError("INVALID_RESPONSE", "The music provider returned an unreadable response.", {
      retryable: true,
      status: 502,
    });
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
