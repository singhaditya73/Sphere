"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ALLOWED_REACTIONS, REACTION_LABELS, type ReactionEmoji } from "@/lib/reactions";

export interface RoomReaction {
  id: string;
  emoji: string;
  username: string;
  createdAt: string;
}

interface RoomReactionsProps {
  reactions: RoomReaction[];
  onSend: (emoji: ReactionEmoji) => void;
  disabled?: boolean;
  /** When true, renders the compact bar used inside the party display. */
  readOnly?: boolean;
}

/**
 * Quick-reaction bar plus a lightweight floating overlay of recent reactions.
 *
 * Reactions are intentionally separate from upvotes: they never touch the queue
 * order. The bar is keyboard-accessible (each emoji is a labelled button).
 */
export function RoomReactions({ reactions, onSend, disabled, readOnly }: RoomReactionsProps) {
  return (
    <div className="relative">
      {/* Floating overlay — the most recent handful of reactions. */}
      <div className="pointer-events-none absolute inset-x-0 -top-2 h-0 overflow-visible" aria-hidden="true">
        <AnimatePresence>
          {reactions.slice(0, 6).map((reaction, index) => (
            <motion.span
              key={reaction.id}
              initial={{ opacity: 0, y: 8, scale: 0.6 }}
              animate={{ opacity: [0, 1, 1, 0], y: -60 - index * 6, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.4, times: [0, 0.15, 0.7, 1] }}
              className="absolute text-lg"
              style={{ left: `${12 + ((index * 13) % 70)}%` }}
            >
              {reaction.emoji}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-1 flex-wrap" role="group" aria-label="Send a reaction">
          {ALLOWED_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSend(emoji)}
              disabled={disabled}
              aria-label={`React with ${REACTION_LABELS[emoji]}`}
              title={REACTION_LABELS[emoji]}
              className="h-8 w-8 rounded-full border border-[#27272A] bg-[#090909] hover:bg-[#18181B] hover:border-[#10B981]/40 text-sm flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
