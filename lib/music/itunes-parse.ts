import type { MusicErrorCode, Track } from "./types.ts";

/**
 * Pure helpers for the keyless iTunes Search provider.
 *
 * This module intentionally has no runtime imports so it can be unit tested in
 * isolation (and so the parsing rules stay easy to reason about).
 *
 * Docs: https://performance-partners.apple.com/search-api
 */

export const ITUNES_SEARCH_ENDPOINT = "https://itunes.apple.com/search";
export const ITUNES_LOOKUP_ENDPOINT = "https://itunes.apple.com/lookup";

/** iTunes track ids are positive integers (e.g. `1440857784`). */
const ITUNES_ID_PATTERN = /^\d+$/;

export function isValidItunesId(value: unknown): value is string {
  return typeof value === "string" && ITUNES_ID_PATTERN.test(value);
}

/**
 * Build a `search` request focused on songs.
 *
 * `media=music&entity=song` keeps podcasts/audiobooks/TV out of the results, so
 * every item has a `trackId`, artist and (usually) a 30-second preview.
 */
export function buildItunesSearchUrl(term: string, limit: number, country?: string): string {
  const params = new URLSearchParams();
  params.set("term", term);
  params.set("media", "music");
  params.set("entity", "song");
  params.set("limit", String(limit));
  if (country) params.set("country", country);
  return `${ITUNES_SEARCH_ENDPOINT}?${params.toString()}`;
}

/** Build the follow-up `lookup` request used to resolve a single track id. */
export function buildItunesLookupUrl(id: string, country?: string): string {
  const params = new URLSearchParams();
  params.set("id", id);
  params.set("entity", "song");
  if (country) params.set("country", country);
  return `${ITUNES_LOOKUP_ENDPOINT}?${params.toString()}`;
}

/**
 * iTunes only serves small artwork. The `100x100bb` token in the URL can be
 * swapped for a larger render without another API call.
 */
export function upscaleArtwork(url: string, size = 600): string {
  if (!url) return "";
  return url.replace(/\/\d+x\d+bb\.(jpg|png)/i, `/${size}x${size}bb.$1`);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Normalize an iTunes `search`/`lookup` response into provider-agnostic `Track`s. */
export function parseItunesItems(payload: unknown): Track[] {
  const results = (payload as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return [];

  const tracks: Track[] = [];
  for (const item of results) {
    const record = item as Record<string, unknown> | null;
    if (!record) continue;

    // Only songs carry a numeric trackId; collections/artists are skipped.
    const rawId = record.trackId;
    if (typeof rawId !== "number" || !Number.isFinite(rawId)) continue;
    const id = String(Math.trunc(rawId));
    if (!isValidItunesId(id)) continue;

    const artworkUrl = asString(record.artworkUrl100) || asString(record.artworkUrl60);
    const artwork = upscaleArtwork(artworkUrl, 600) || artworkUrl;
    const thumbnail = upscaleArtwork(artworkUrl, 100) || artworkUrl;
    const preview = asString(record.previewUrl);
    const millis = typeof record.trackTimeMillis === "number" ? record.trackTimeMillis : null;
    const trackViewUrl = asString(record.trackViewUrl);

    tracks.push({
      provider: "itunes",
      id,
      title: asString(record.trackName).trim() || "Untitled",
      artist: asString(record.artistName).trim(),
      thumbnail,
      artwork,
      durationSeconds: millis != null && millis > 0 ? Math.round(millis / 1000) : null,
      url: trackViewUrl || `https://music.apple.com/song/${id}`,
      embeddable: preview ? true : null,
      previewUrl: preview || null,
      source: "itunes-search-api",
      mediaType: "music",
      category: asString(record.primaryGenreName) || null,
      available: true,
    });
  }
  return tracks;
}

export interface ClassifiedItunesError {
  code: MusicErrorCode;
  retryable: boolean;
  message: string;
}

/** Map an HTTP status from the iTunes API into a stable, user-safe error. */
export function classifyItunesError(status: number): ClassifiedItunesError {
  if (status === 429) {
    return { code: "RATE_LIMITED", retryable: true, message: "Too many requests to the music provider." };
  }
  if (status >= 500) {
    return {
      code: "PROVIDER_UNAVAILABLE",
      retryable: true,
      message: "The music provider is temporarily unavailable.",
    };
  }
  if (status === 404) {
    return { code: "NOT_FOUND", retryable: false, message: "Track not found." };
  }
  return {
    code: "PROVIDER_UNAVAILABLE",
    retryable: false,
    message: "Unexpected response from the music provider.",
  };
}
