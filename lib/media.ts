/**
 * Universal-media helpers.
 *
 * Sphere 2.0 plays more than songs: music tracks, music videos, general
 * videos, trailers, podcasts and user-submitted links all share one queue.
 * These pure helpers keep the "what kind of media is this?" logic in one place
 * so the UI, API and providers agree.
 */

export type MediaType = "music" | "video" | "podcast" | "trailer" | "other";

/** Search categories exposed in the Add-media dialog. */
export type SearchCategory = "music" | "video" | "all";

export const SEARCH_CATEGORIES: readonly SearchCategory[] = ["music", "video", "all"] as const;

export function normalizeSearchCategory(value: unknown): SearchCategory {
  return value === "video" || value === "all" ? value : "music";
}

/** YouTube category id 10 is "Music"; everything else is treated as video. */
export function mediaTypeForYoutubeCategory(categoryId: string | null | undefined): MediaType {
  return categoryId === "10" ? "music" : "video";
}

/** Map a stored {@link MediaType} to a short human label. */
export function mediaTypeLabel(type: string | null | undefined): string {
  switch (type) {
    case "music":
      return "Music";
    case "video":
      return "Video";
    case "podcast":
      return "Podcast";
    case "trailer":
      return "Trailer";
    default:
      return "Media";
  }
}

/**
 * Decide the media type for a stream based on the provider-specific stream
 * type plus any explicit media type the provider reported.
 */
export function resolveMediaType(
  streamType: string | null | undefined,
  reported?: string | null
): MediaType {
  if (reported && ["music", "video", "podcast", "trailer", "other"].includes(reported)) {
    return reported as MediaType;
  }
  if (streamType === "Spotify" || streamType === "Itunes") return "music";
  return "video";
}

/** True when a stream should play through the embedded YouTube player. */
export function isEmbeddedVideo(streamType: string | null | undefined): boolean {
  return streamType === "Youtube";
}

/**
 * Human explanation for why a media item cannot be played, or null when it can.
 * Used to show a clear message instead of a broken player.
 */
export function unavailableReason(item: {
  available?: boolean | null;
  embeddable?: boolean | null;
  previewUrl?: string | null;
  type?: string | null;
}): string | null {
  if (item.available === false) return "This item is no longer available.";
  if (item.type === "Youtube" && item.embeddable === false) {
    return "The uploader has disabled embedded playback for this video.";
  }
  return null;
}
