/**
 * Small, pure queue helpers shared by the API layer and tests.
 */

export interface QueueEntry {
  id: string;
  /** Provider-specific track id (e.g. a YouTube video id). */
  extractedId: string | null;
  played?: boolean;
}

/**
 * Return the existing unplayed queue entry that represents the same provider
 * track, or null when adding it would not be a duplicate.
 *
 * Duplicates are scoped to unplayed entries only: once a track has played it is
 * legitimate to queue it again.
 */
export function findDuplicateStream<T extends QueueEntry>(
  entries: readonly T[],
  extractedId: string | null | undefined
): T | null {
  if (!extractedId) return null;
  const match = entries.find((entry) => entry.extractedId === extractedId && entry.played !== true);
  return match ?? null;
}
