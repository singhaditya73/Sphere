import type { MusicProvider, SearchOptions, Track } from "./types.ts";
import { MusicError } from "./errors.ts";
import { TtlCache } from "./cache.ts";
import { requestJson } from "./http.ts";
import { MIN_QUERY_LENGTH, normalizeQuery } from "./youtube-parse.ts";
import {
  buildItunesLookupUrl,
  buildItunesSearchUrl,
  classifyItunesError,
  isValidItunesId,
  parseItunesItems,
} from "./itunes-parse.ts";

export const DEFAULT_ITUNES_LIMIT = 12;
export const MAX_ITUNES_LIMIT = 25;

/** Search responses are cached for 5 minutes to be a good API citizen. */
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 8000;

export interface ItunesProviderConfig {
  /** Injectable fetch so tests can mock the network. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  cache?: TtlCache<Track[]>;
  /** Optional iTunes storefront country code (e.g. `US`, `IN`). */
  country?: string;
}

/**
 * Keyless iTunes Search API implementation of {@link MusicProvider}.
 *
 * This is the default provider when no `YOUTUBE_API_KEY` is set, so in-app
 * search works with zero setup. Only the public Search API and Apple's own
 * 30-second preview clips are used — no audio extraction or stream scraping.
 */
export class ItunesMusicProvider implements MusicProvider {
  readonly id = "itunes" as const;

  private fetchImpl: typeof fetch;
  private timeoutMs: number;
  private cache: TtlCache<Track[]>;
  private country?: string;

  constructor(config: ItunesProviderConfig = {}) {
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.cache = config.cache ?? new TtlCache<Track[]>(SEARCH_CACHE_TTL_MS);
    this.country = config.country;
  }

  async searchTracks(query: string, options: SearchOptions = {}): Promise<Track[]> {
    const normalized = normalizeQuery(query);
    if (normalized.length < MIN_QUERY_LENGTH) {
      throw new MusicError("INVALID_QUERY", `Search query must be at least ${MIN_QUERY_LENGTH} characters.`, {
        status: 400,
      });
    }

    const limit = clampLimit(options.limit);
    const cacheKey = `${normalized.toLowerCase()}::${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const url = buildItunesSearchUrl(normalized, limit, this.country);
    const payload = await this.requestJson(url, options.signal);
    const tracks = parseItunesItems(payload).slice(0, limit);
    this.cache.set(cacheKey, tracks);
    return tracks;
  }

  async getTrackDetails(trackId: string, options: SearchOptions = {}): Promise<Track | null> {
    if (!isValidItunesId(trackId)) {
      throw new MusicError("INVALID_TRACK_ID", "Invalid track id.", { status: 400 });
    }
    const payload = await this.requestJson(buildItunesLookupUrl(trackId, this.country), options.signal);
    const tracks = parseItunesItems(payload);
    return tracks.find((track) => track.id === trackId) ?? tracks[0] ?? null;
  }

  async validateTrack(trackId: string, options: SearchOptions = {}): Promise<boolean> {
    if (!isValidItunesId(trackId)) return false;
    try {
      return (await this.getTrackDetails(trackId, options)) !== null;
    } catch {
      return false;
    }
  }

  private requestJson(url: string, signal?: AbortSignal): Promise<unknown> {
    return requestJson(url, {
      fetchImpl: this.fetchImpl,
      timeoutMs: this.timeoutMs,
      signal,
      classify: (status) => classifyItunesError(status),
    });
  }
}

function clampLimit(limit?: number): number {
  if (!limit || !Number.isFinite(limit)) return DEFAULT_ITUNES_LIMIT;
  return Math.min(MAX_ITUNES_LIMIT, Math.max(1, Math.floor(limit)));
}
