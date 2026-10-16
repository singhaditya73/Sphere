/**
 * Live reactions.
 *
 * Reactions are deliberately a small, fixed vocabulary so the UI can render
 * them consistently and the server can validate cheaply. They are stored
 * separately from queue upvotes and never affect ranking.
 */

export const ALLOWED_REACTIONS = ["❤️", "🔥", "😂", "👏", "🎉", "🤯", "🙌", "💯"] as const;

export type ReactionEmoji = (typeof ALLOWED_REACTIONS)[number];

export function isAllowedReaction(value: unknown): value is ReactionEmoji {
  return typeof value === "string" && (ALLOWED_REACTIONS as readonly string[]).includes(value);
}

/** Human labels for accessibility (aria-labels on the reaction buttons). */
export const REACTION_LABELS: Record<ReactionEmoji, string> = {
  "❤️": "Love",
  "🔥": "Fire",
  "😂": "Laugh",
  "👏": "Applause",
  "🎉": "Celebrate",
  "🤯": "Mind blown",
  "🙌": "Hands up",
  "💯": "Hundred",
};
