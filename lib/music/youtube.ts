import type { MusicProvider, SearchOptions, Track } from "./types.ts";
import { MusicError } from "./errors.ts";
import { TtlCache } from "./cache.ts";
import { requestJson } from "./http.ts";
import {
  MIN_QUERY_LENGTH,
  buildSearchUrl,
  buildVideosUrl,
  classifyYouTubeError,
  extractVideoIds,
  filterTracksByCategory,
  isValidVideoId,
  normalizeQuery,
  parseVideoItems,
  rankTracks,
} from "./youtube-parse.ts";
import { normalizeSearchCategory } from "../media.ts";

export const DEFAULT_SEARCH_LIMIT = 12;
export const MAX_SEARCH_LIMIT = 25;

/** Search responses are cached for 5 minutes to protect the daily quota. */
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 8000;

export interface YouTubeProviderConfig {
  apiKey: string;
  /** Injectable fetch so tests can mock the network. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  cache?: TtlCache<Track[]>;
}

/**
 * YouTube Data API implementation of {@link MusicProvider}.
 *
 * Credentials stay on the server: this module is only imported from Next.js
 * route handlers. Only the official Data API and permitted embedded playback
 * are used — no audio extraction or stream scraping.
 */
export class YouTubeMusicProvider implements MusicProvider {
  readonly id = "youtube" as const;

  private apiKey: string;
  private fetchImpl: typeof fetch;
  private timeoutMs: number;
  private cache: TtlCache<Track[]>;

  constructor(config: YouTubeProviderConfig) {
    this.apiKey = config.apiKey;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.cache = config.cache ?? new TtlCache<Track[]>(SEARCH_CACHE_TTL_MS);
  }

  async searchTracks(query: string, options: SearchOptions = {}): Promise<Track[]> {
    const normalized = normalizeQuery(query);
    if (normalized.length < MIN_QUERY_LENGTH) {
      throw new MusicError("INVALID_QUERY", `Search query must be at least ${MIN_QUERY_LENGTH} characters.`, {
        status: 400,
      });
    }

    const limit = clampLimit(options.limit);
    // `undefined` keeps the legacy music-first behaviour; an explicit category
    // scopes the result set (music vs general video vs everything).
    const category = options.category ? normalizeSearchCategory(options.category) : null;
    const cacheKey = `${normalized.toLowerCase()}::${limit}::${category ?? "default"}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const musicOnly = category !== "video" && category !== "all";
    let ids = await this.searchVideoIds(normalized, limit, musicOnly, options.signal);
    if (ids.length === 0 && musicOnly) {
      // Nothing in the Music category — widen once before giving up.
      ids = await this.searchVideoIds(normalized, limit, false, options.signal);
    }
    if (ids.length === 0) return [];

    const tracks = await this.fetchTrackDetails(ids, options.signal);
    const scoped = category ? filterTracksByCategory(tracks, category) : tracks;
    const ranked = rankTracks(scoped).slice(0, limit);
    this.cache.set(cacheKey, ranked);
    return ranked;
  }

  async getTrackDetails(trackId: string, options: SearchOptions = {}): Promise<Track | null> {
    if (!isValidVideoId(trackId)) {
      throw new MusicError("INVALID_TRACK_ID", "Invalid track id.", { status: 400 });
    }
    const tracks = await this.fetchTrackDetails([trackId], options.signal);
    return tracks[0] ?? null;
  }

  async validateTrack(trackId: string, options: SearchOptions = {}): Promise<boolean> {
    if (!isValidVideoId(trackId)) return false;
    try {
      return (await this.getTrackDetails(trackId, options)) !== null;
    } catch {
      return false;
    }
  }

  private async searchVideoIds(
    query: string,
    limit: number,
    musicOnly: boolean,
    signal?: AbortSignal
  ): Promise<string[]> {
    const url = buildSearchUrl(this.apiKey, query, { limit, musicOnly });
    const payload = await this.requestJson(url, signal);
    return extractVideoIds(payload);
  }

  private async fetchTrackDetails(ids: string[], signal?: AbortSignal): Promise<Track[]> {
    const unique = ids.filter(isValidVideoId).slice(0, MAX_SEARCH_LIMIT);
    if (unique.length === 0) return [];
    const url = buildVideosUrl(this.apiKey, unique);
    const payload = await this.requestJson(url, signal);
    return parseVideoItems(payload);
  }

  private requestJson(url: string, signal?: AbortSignal): Promise<unknown> {
    return requestJson(url, {
      fetchImpl: this.fetchImpl,
      timeoutMs: this.timeoutMs,
      signal,
      classify: classifyYouTubeError,
    });
  }
}

function clampLimit(limit?: number): number {
  if (!limit || !Number.isFinite(limit)) return DEFAULT_SEARCH_LIMIT;
  return Math.min(MAX_SEARCH_LIMIT, Math.max(1, Math.floor(limit)));
}
