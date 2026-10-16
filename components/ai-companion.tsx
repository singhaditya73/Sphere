"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Plus, Sparkles, Wand2, X } from "lucide-react";
import type { TrackResult } from "@/components/song-search-dialog";

interface AiCompanionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  /** extractedIds already in the queue, so we can mark suggestions as added. */
  queuedTrackIds: string[];
  onAdded?: (track: TrackResult) => void;
}

interface Suggestion extends TrackResult {
  matchedQuery?: string;
}

const PROMPTS = [
  "Upbeat music for a party",
  "Suggest funny videos",
  "Chill mix for studying",
  "Mix of familiar hits and new discoveries",
];

/**
 * AI room companion.
 *
 * The model only proposes search *queries*; Sphere resolves them against the
 * real provider and shows the actual tracks. Nothing is queued automatically —
 * each suggestion is added by the user through the normal add-media path.
 */
export function AiCompanion({ open, onOpenChange, roomId, queuedTrackIds, onAdded }: AiCompanionProps) {
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<"music" | "video" | "all">("music");
  const [loading, setLoading] = useState(false);
  const [intro, setIntro] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState("");
  const [unconfigured, setUnconfigured] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set(queuedTrackIds));

  const request = async () => {
    if (prompt.trim().length < 3) {
      setError("Describe what you're in the mood for.");
      return;
    }
    setLoading(true);
    setError("");
    setIntro("");
    setSuggestions([]);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, prompt: prompt.trim(), category }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503 && data?.code === "AI_NOT_CONFIGURED") {
        setUnconfigured(true);
        setError(data?.message || "The AI companion is not configured.");
        return;
      }
      if (!res.ok) {
        setError(data?.message || "Could not get suggestions.");
        return;
      }
      setIntro(data.intro || "");
      setSuggestions((data.suggestions || []) as Suggestion[]);
      if ((data.suggestions || []).length === 0) {
        setError("No matching media found. Try rephrasing your request.");
      }
    } catch {
      setError("Network error while contacting the AI companion.");
    } finally {
      setLoading(false);
    }
  };

  const add = async (track: Suggestion) => {
    setAddingId(track.id);
    try {
      const res = await fetch("/api/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, provider: track.provider, trackId: track.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || "Could not add that item.");
        return;
      }
      setAdded((prev) => new Set(prev).add(track.id));
      onAdded?.(track);
    } catch {
      setError("Network error while adding.");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="AI room companion"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#121212] border border-[#27272A] rounded-2xl w-full max-w-lg shadow-2xl max-h-[88vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272A]/60">
              <h3 className="font-heading font-black text-base text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#10B981]" /> AI Companion
              </h3>
              <button
                onClick={() => onOpenChange(false)}
                aria-label="Close"
                className="w-7 h-7 rounded-full border border-[#27272A] text-[#A1A1AA] hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="relative">
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !loading && request()}
                  placeholder="e.g. upbeat party music, or funny short videos"
                  maxLength={300}
                  className="w-full bg-[#090909] border border-[#27272A] rounded-xl h-11 pl-10 pr-3 text-sm text-white placeholder:text-[#52525B] focus:outline-none focus:border-[#10B981]/50"
                />
                <Wand2 className="w-4 h-4 text-[#52525B] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {(["music", "video", "all"] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setCategory(option)}
                    aria-pressed={category === option}
                    className={`h-7 px-3 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                      category === option
                        ? "bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]"
                        : "border-[#27272A] text-[#A1A1AA] hover:text-white"
                    }`}
                  >
                    {option === "all" ? "All media" : option === "video" ? "Videos" : "Music"}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPrompt(p)}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-[#090909] border border-[#27272A] text-[#A1A1AA] hover:text-white hover:border-[#3F3F46] transition-colors cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={request}
                disabled={loading}
                className="w-full h-10 rounded-xl bg-[#10B981] hover:bg-[#10B981]/90 text-white text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? "Thinking…" : "Suggest media"}
              </button>

              {error && (
                <p className={`text-[11px] ${unconfigured ? "text-[#F59E0B]" : "text-[#F87171]"}`}>
                  {error}
                  {unconfigured && (
                    <span className="block text-[10px] text-[#71717A] mt-1">
                      An administrator can enable this by setting <code>AI_API_KEY</code> (optionally{" "}
                      <code>AI_BASE_URL</code> / <code>AI_MODEL</code>).
                    </span>
                  )}
                </p>
              )}

              {intro && <p className="text-xs text-[#A1A1AA] italic">{intro}</p>}

              <div className="space-y-2">
                {suggestions.map((track) => {
                  const isAdded = added.has(track.id);
                  return (
                    <div
                      key={`${track.provider}:${track.id}`}
                      className="flex items-center gap-3 bg-[#090909] border border-[#27272A] rounded-xl p-2"
                    >
                      {track.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={track.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#18181B] shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#FAFAFA] truncate">{track.title}</p>
                        <p className="text-[10px] text-[#A1A1AA] truncate">
                          {track.artist || "Unknown"}
                          {track.matchedQuery && (
                            <span className="text-[#71717A]"> · matched “{track.matchedQuery}”</span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => add(track)}
                        disabled={isAdded || addingId === track.id}
                        className={`h-8 px-3 rounded-full text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-colors ${
                          isAdded
                            ? "bg-[#10B981]/15 text-[#10B981] cursor-default"
                            : "bg-[#10B981] hover:bg-[#10B981]/90 text-white cursor-pointer"
                        } disabled:opacity-70`}
                      >
                        {addingId === track.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Added
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" /> Add
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
