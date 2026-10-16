import type { MusicErrorCode } from "./types.ts";

interface MusicErrorOptions {
  retryable?: boolean;
  /** HTTP status the API layer should use for this error. */
  status?: number;
}

/**
 * Typed error for everything that can go wrong while talking to a music
 * provider. The API routes translate this into a stable, non-leaky response.
 */
export class MusicError extends Error {
  code: MusicErrorCode;
  retryable: boolean;
  status: number;

  constructor(code: MusicErrorCode, message: string, options: MusicErrorOptions = {}) {
    super(message);
    this.name = "MusicError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.status = options.status ?? 500;
  }
}

export function isMusicError(value: unknown): value is MusicError {
  return value instanceof MusicError;
}
