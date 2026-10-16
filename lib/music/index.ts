import type { MusicProvider, MusicProviderId } from "./types.ts";
import { MusicError } from "./errors.ts";
import { YouTubeMusicProvider } from "./youtube.ts";
import { ItunesMusicProvider } from "./itunes.ts";

export type { MusicProvider, MusicProviderId, SearchOptions, Track, TrackSource, MusicErrorCode } from "./types.ts";
export { MusicError, isMusicError } from "./errors.ts";
export { YouTubeMusicProvider } from "./youtube.ts";
export { ItunesMusicProvider } from "./itunes.ts";
export {
  MIN_QUERY_LENGTH,
  MAX_QUERY_LENGTH,
  formatDuration,
  isValidVideoId,
  normalizeQuery,
} from "./youtube-parse.ts";

type EnvLike = Record<string, string | undefined>;

export function getYouTubeApiKey(env: EnvLike = process.env): string | null {
  const key = env.YOUTUBE_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

/** Whether full-length YouTube playback is available (requires an API key). */
export function isYouTubeSearchConfigured(env: EnvLike = process.env): boolean {
  return getYouTubeApiKey(env) !== null;
}

/**
 * Song search is always available: with a `YOUTUBE_API_KEY` Sphere searches and
 * plays full-length YouTube; without one it falls back to the keyless iTunes
 * provider (30-second previews). Kept for callers that used to gate on config.
 */
export function isMusicSearchConfigured(): boolean {
  return true;
}

let cachedYouTube: { apiKey: string; provider: MusicProvider } | null = null;
let cachedItunes: MusicProvider | null = null;

function getYouTubeProvider(apiKey: string): MusicProvider {
  if (cachedYouTube?.apiKey === apiKey) return cachedYouTube.provider;
  const provider = new YouTubeMusicProvider({ apiKey });
  cachedYouTube = { apiKey, provider };
  return provider;
}

function getItunesProvider(): MusicProvider {
  if (!cachedItunes) cachedItunes = new ItunesMusicProvider();
  return cachedItunes;
}

/**
 * Resolve the default provider for search: YouTube when a key is configured,
 * otherwise the keyless iTunes provider.
 */
export function getMusicProvider(env: EnvLike = process.env): MusicProvider {
  const apiKey = getYouTubeApiKey(env);
  return apiKey ? getYouTubeProvider(apiKey) : getItunesProvider();
}

/**
 * Resolve a specific provider by id.
 *
 * Throws a typed {@link MusicError} when the requested provider is not
 * configured (only YouTube can be unavailable — iTunes needs no credentials).
 */
export function getMusicProviderById(id: MusicProviderId, env: EnvLike = process.env): MusicProvider {
  if (id === "youtube") {
    const apiKey = getYouTubeApiKey(env);
    if (!apiKey) {
      throw new MusicError(
        "PROVIDER_NOT_CONFIGURED",
        "YouTube search is not configured on the server. Set YOUTUBE_API_KEY to enable it.",
        { status: 503 }
      );
    }
    return getYouTubeProvider(apiKey);
  }
  return getItunesProvider();
}

/** Test helper: forget the memoized providers. */
export function resetMusicProvider(): void {
  cachedYouTube = null;
  cachedItunes = null;
}
