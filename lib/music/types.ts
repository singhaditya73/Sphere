/**
 * Provider-agnostic types for Sphere's native song discovery.
 *
 * The search UI and the queue only ever see these shapes, so a new provider
 * can be added later without touching components or API consumers.
 */

import type { SearchCategory } from "../media.ts";

export type MusicProviderId = "youtube" | "itunes";

/** Where a normalized track came from. Useful for debugging and analytics. */
export type TrackSource = "youtube-data-api" | "itunes-search-api";

export interface Track {
  /** Which provider produced this track. */
  provider: MusicProviderId;
  /** Stable, provider-specific identifier (a YouTube video id or iTunes track id). */
  id: string;
  /** Track/video title. */
  title: string;
  /**
   * Artist / uploader name.
   *
   * NOTE: a YouTube channel name is not proof of the verified artist, so for
   * YouTube the UI labels this as the uploading channel rather than claiming
   * artist identity. iTunes reports the actual track artist.
   */
  artist: string;
  /** Smaller image suitable for queue/list rows. */
  thumbnail: string;
  /** Larger artwork suitable for now-playing / dialog preview. */
  artwork: string;
  /** Duration in whole seconds, or null when the provider does not report it. */
  durationSeconds: number | null;
  /** Canonical, shareable watch URL. */
  url: string;
  /** Whether the provider reports the item as embeddable, when known. */
  embeddable: boolean | null;
  /**
   * A short (≈30s), provider-hosted audio preview, when the provider offers
   * one. The room player uses this for keyless providers that cannot stream
   * full-length audio in an embedded player (e.g. iTunes).
   */
  previewUrl?: string | null;
  source: TrackSource;
  /**
   * Universal-media kind reported by the provider (`music`, `video`, ...).
   * Lets the one shared queue hold songs and videos without a second system.
   */
  mediaType?: string;
  /** Provider category id/label when the provider reports one. */
  category?: string | null;
  /** False when the provider says the item can no longer be played. */
  available?: boolean;
  /** Human explanation shown when {@link available} is false. */
  unavailableReason?: string | null;
}

export interface SearchOptions {
  /** Maximum number of results (provider clamps to a sane ceiling). */
  limit?: number;
  /** Caller cancellation signal, combined with the provider timeout. */
  signal?: AbortSignal;
  /**
   * Restrict results to a media category. When omitted, providers keep their
   * legacy behaviour (a music-focused first pass, no post-filter) so existing
   * callers and tests are unaffected.
   */
  category?: SearchCategory;
}

export interface MusicProvider {
  readonly id: MusicProviderId;
  searchTracks(query: string, options?: SearchOptions): Promise<Track[]>;
  getTrackDetails(trackId: string, options?: SearchOptions): Promise<Track | null>;
  validateTrack(trackId: string, options?: SearchOptions): Promise<boolean>;
}

/** Machine-readable error codes surfaced to the API layer and the client. */
export type MusicErrorCode =
  | "PROVIDER_NOT_CONFIGURED"
  | "INVALID_QUERY"
  | "INVALID_TRACK_ID"
  | "NOT_FOUND"
  | "QUOTA_EXCEEDED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_RESPONSE";
