import type { MusicErrorCode, Track } from "./types.ts";

/**
 * Pure helpers for the YouTube Data API provider.
 *
 * This module intentionally has no runtime imports so it can be unit tested
 * in isolation (and so the parsing rules stay easy to reason about).
 *
 * Docs: https://developers.google.com/youtube/v3/docs/search/list
 */

export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 100;

/** YouTube video ids are always 11 url-safe base64 characters. */
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function isValidVideoId(value: unknown): value is string {
  return typeof value === "string" && VIDEO_ID_PATTERN.test(value);
}

/** Collapse whitespace, trim, and hard-cap length to protect the provider. */
export function normalizeQuery(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
}

/** Convert an ISO 8601 duration (e.g. `PT4M13S`) into whole seconds. */
export function parseISODuration(iso: unknown): number | null {
  if (typeof iso !== "string") return null;
  const match = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!match) return null;
  const [, weeks, days, hours, minutes, seconds] = match;
  const total =
    (Number(weeks ?? 0) * 7 + Number(days ?? 0)) * 86400 +
    Number(hours ?? 0) * 3600 +
    Number(minutes ?? 0) * 60 +
    Number(seconds ?? 0);
  return Number.isFinite(total) ? total : null;
}

/** Human readable `m:ss` / `h:mm:ss`, or empty string when unknown. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}

/**
 * Build a `search.list` request focused on music discovery.
 *
 * `videoCategoryId=10` is the Music category; we only restrict to it when the
 * caller asks for the music-focused pass, because some legitimate music uploads
 * are not categorised as Music.
 *
 * NOTE: we deliberately do **not** set `videoSyndicated=true`. Official artist
 * uploads (VEVO / "- Topic") are embeddable but frequently *not* syndicated, so
 * that filter hides the real track and leaves only lyric re-uploads. Embedded
 * playback is governed by `videoEmbeddable`, which we keep.
 */
export function buildSearchUrl(
  apiKey: string,
  query: string,
  options: { limit: number; musicOnly: boolean }
): string {
  const params = new URLSearchParams();
  params.set("key", apiKey);
  params.set("part", "snippet");
  params.set("q", query);
  params.set("type", "video");
  params.set("maxResults", String(options.limit));
  params.set("safeSearch", "moderate");
  params.set("videoEmbeddable", "true");
  if (options.musicOnly) params.set("videoCategoryId", "10");
  return `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
}

/** Build the follow-up `videos.list` request used to fetch duration/status. */
export function buildVideosUrl(apiKey: string, ids: string[]): string {
  const params = new URLSearchParams();
  params.set("key", apiKey);
  params.set("part", "snippet,contentDetails,status");
  params.set("id", ids.join(","));
  params.set("maxResults", String(ids.length));
  return `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`;
}

/** Pull de-duplicated, valid video ids out of a `search.list` response. */
export function extractVideoIds(payload: unknown): string[] {
  const items = (payload as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) return [];
  const ids: string[] = [];
  for (const item of items) {
    const id = (item as { id?: { videoId?: unknown } } | null)?.id?.videoId;
    if (isValidVideoId(id) && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

const ARTWORK_ORDER = ["maxres", "standard", "high", "medium", "default"] as const;
const THUMBNAIL_ORDER = ["medium", "default", "high", "standard", "maxres"] as const;

function pickThumbnail(thumbnails: unknown, order: readonly string[]): string {
  if (!thumbnails || typeof thumbnails !== "object") return "";
  const map = thumbnails as Record<string, { url?: unknown } | undefined>;
  for (const key of order) {
    const url = map[key]?.url;
    if (typeof url === "string" && url.length > 0) return url;
  }
  return "";
}

/** Normalize a `videos.list` response into provider-agnostic `Track`s. */
export function parseVideoItems(payload: unknown): Track[] {
  const items = (payload as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) return [];

  const tracks: Track[] = [];
  for (const item of items) {
    const record = item as {
      id?: unknown;
      snippet?: { title?: unknown; channelTitle?: unknown; thumbnails?: unknown; categoryId?: unknown };
      contentDetails?: { duration?: unknown };
      status?: { embeddable?: unknown; privacyStatus?: unknown };
    } | null;

    const id = record?.id;
    if (!isValidVideoId(id)) continue;

    const snippet = record?.snippet ?? {};
    const artwork = pickThumbnail(snippet.thumbnails, ARTWORK_ORDER);
    const thumbnail = pickThumbnail(snippet.thumbnails, THUMBNAIL_ORDER);
    const title = typeof snippet.title === "string" && snippet.title.trim() ? snippet.title : "Untitled";
    const artist = typeof snippet.channelTitle === "string" ? snippet.channelTitle : "";
    const embeddable = typeof record?.status?.embeddable === "boolean" ? record.status.embeddable : null;

    // Category id 10 is "Music"; anything else is treated as general video.
    // Inlined (rather than imported) so this module keeps zero runtime imports.
    const categoryId = typeof snippet.categoryId === "string" ? snippet.categoryId : null;
    const mediaType = categoryId === "10" ? "music" : "video";

    // videos.list only returns videos the API can read, but an upload can still
    // be non-embeddable or private/unlisted. Surface that so the UI can explain
    // why playback is unavailable instead of showing a broken player.
    const privacyStatus = typeof record?.status?.privacyStatus === "string" ? record.status.privacyStatus : null;
    const available = embeddable !== false && privacyStatus !== "private";
    const unavailableReason =
      embeddable === false
        ? "The uploader has disabled embedded playback for this video."
        : privacyStatus === "private"
        ? "This video is private and cannot be played."
        : null;

    tracks.push({
      provider: "youtube",
      id,
      title,
      artist,
      thumbnail: thumbnail || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      artwork: artwork || thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      durationSeconds: parseISODuration(record?.contentDetails?.duration),
      url: `https://www.youtube.com/watch?v=${id}`,
      embeddable,
      source: "youtube-data-api",
      mediaType,
      category: categoryId,
      available,
      unavailableReason,
    });
  }
  return tracks;
}

/**
 * Restrict parsed tracks to a media category.
 *
 * `all` keeps everything; `music` / `video` split on the provider category so a
 * single search endpoint can serve songs and general videos without a second
 * search system. Falls back to the unfiltered list when the filter would empty
 * an otherwise valid result set (YouTube's category data can be missing).
 */
export function filterTracksByCategory(tracks: Track[], category: string): Track[] {
  if (category !== "music" && category !== "video") return tracks;
  const filtered = tracks.filter((track) => track.mediaType === category);
  return filtered.length > 0 ? filtered : tracks;
}

/**
 * Soft heuristic used only for ordering results.
 *
 * YouTube's API does not expose an "official artist" flag, so we never *claim*
 * a track is official — we merely float channels that look like artist-owned
 * "Topic"/VEVO/Official uploads to the top of the list.
 */
export function isLikelyMusicChannel(channelName: string): boolean {
  const name = channelName.toLowerCase();
  return (
    /-\s*topic$/.test(name) ||
    /vevo$/.test(name) ||
    name.includes("official") ||
    name.includes(" - ") ||
    name.includes("records") ||
    name.includes("music")
  );
}

/** Prefer embeddable, likely-musical results while keeping provider order stable. */
export function rankTracks(tracks: Track[]): Track[] {
  return tracks
    .map((track, index) => ({ track, index }))
    .sort((a, b) => {
      const scoreA = (a.track.embeddable === false ? -100 : 0) + (isLikelyMusicChannel(a.track.artist) ? 10 : 0);
      const scoreB = (b.track.embeddable === false ? -100 : 0) + (isLikelyMusicChannel(b.track.artist) ? 10 : 0);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.index - b.index;
    })
    .map((entry) => entry.track);
}

export interface ClassifiedProviderError {
  code: MusicErrorCode;
  retryable: boolean;
  message: string;
}

/** Extract the first `error.errors[].reason` from a Google API error body. */
export function extractErrorReason(bodyText: string): string | null {
  try {
    const parsed = JSON.parse(bodyText) as {
      error?: { errors?: Array<{ reason?: unknown }> };
    };
    const reason = parsed?.error?.errors?.[0]?.reason;
    return typeof reason === "string" ? reason : null;
  } catch {
    return null;
  }
}

/** Map HTTP status + Google error body into a stable, user-safe error. */
export function classifyYouTubeError(status: number, bodyText: string): ClassifiedProviderError {
  const reason = extractErrorReason(bodyText);

  if (
    status === 403 &&
    (reason === "quotaExceeded" || reason === "dailyLimitExceeded" || reason === "rateLimitExceeded")
  ) {
    return {
      code: "QUOTA_EXCEEDED",
      retryable: false,
      message: "YouTube search quota has been exhausted. Please try again later.",
    };
  }
  if (status === 403) {
    return {
      code: "PROVIDER_UNAVAILABLE",
      retryable: false,
      message: "The music provider refused the request.",
    };
  }
  if (status === 404) {
    return { code: "NOT_FOUND", retryable: false, message: "Track not found." };
  }
  if (status === 400) {
    return {
      code: "PROVIDER_UNAVAILABLE",
      retryable: false,
      message: "The music provider rejected the request.",
    };
  }
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
  return {
    code: "PROVIDER_UNAVAILABLE",
    retryable: false,
    message: "Unexpected response from the music provider.",
  };
}
