"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  Link2,
  Loader2,
  Music2,
  Plus,
  RotateCw,
  Search,
  X,
} from "lucide-react";
import { formatDuration } from "@/lib/music/youtube-parse";

export interface TrackResult {
  provider: "youtube" | "itunes";
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  artwork: string;
  durationSeconds: number | null;
  url: string;
  embeddable: boolean | null;
  /** Provider-hosted audio preview (keyless providers such as iTunes). */
  previewUrl?: string | null;
  source: string;
  /** Universal-media kind: "music" | "video" | ... */
  mediaType?: string;
  /** Provider category id/label when reported. */
  category?: string | null;
  /** False when the provider says the item can no longer be played. */
  available?: boolean;
  /** Human explanation when unavailable. */
  unavailableReason?: string | null;
}

export type SearchCategory = "music" | "video" | "all";

export interface AddedTrackInfo {
  trackId: string;
  track: TrackResult;
  duplicate: boolean;
}

interface SongSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  /** extractedIds currently sitting in the room's unplayed queue. */
  queuedTrackIds: string[];
  /** Fired after the server confirms a track is in the queue. */
  onAdded: (info: AddedTrackInfo) => void;
}

type Status = "idle" | "loading" | "success" | "empty" | "error";

const MIN_QUERY = 2;
const DEBOUNCE_MS = 350;

export function SongSearchDialog({
  open,
  onOpenChange,
  roomId,
  queuedTrackIds,
  onAdded,
}: SongSearchDialogProps) {
  const [tab, setTab] = useState<"search" | "link">("search");
  const [category, setCategory] = useState<SearchCategory>("music");

  // Search tab
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<TrackResult[]>([]);
  const [resultProvider, setResultProvider] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorRetryable, setErrorRetryable] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [addingTrackId, setAddingTrackId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  // Link tab
  const [linkUrl, setLinkUrl] = useState("");
  const [linkAdding, setLinkAdding] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [linkAdded, setLinkAdded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const queuedSet = useMemo(() => new Set(queuedTrackIds), [queuedTrackIds]);
  const isTrackQueued = useCallback(
    (id: string) => queuedSet.has(id) || addedIds.has(id),
    [queuedSet, addedIds]
  );

  // Focus the search field whenever the dialog opens on the search tab.
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Debounce raw input into the query we actually request.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) {
      setDebouncedQuery("");
      setStatus("idle");
      setResults([]);
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const runSearch = useCallback(async (term: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setErrorMessage("");
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(term)}&category=${category}`,
        { signal: controller.signal }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus("error");
        setErrorMessage(data?.message || "Could not search right now.");
        setErrorRetryable(data?.code !== "PROVIDER_NOT_CONFIGURED" && data?.code !== "INVALID_QUERY");
        setResults([]);
        return;
      }
      const next: TrackResult[] = Array.isArray(data?.results) ? data.results : [];
      setResults(next);
      setResultProvider(typeof data?.provider === "string" ? data.provider : "");
      setSelectedIndex(0);
      setStatus(next.length > 0 ? "success" : "empty");
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") return;
      setStatus("error");
      setErrorMessage("Network error while searching. Check your connection and retry.");
      setErrorRetryable(true);
      setResults([]);
    }
  }, [category]);

  // Fetch whenever the debounced query settles.
  useEffect(() => {
    if (!open) return;
    if (debouncedQuery.length < MIN_QUERY) return;
    void runSearch(debouncedQuery);
  }, [debouncedQuery, open, runSearch]);

  // Cancel any in-flight request when the dialog unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleAdd = useCallback(
    async (track: TrackResult) => {
      if (isTrackQueued(track.id) || addingTrackId === track.id) return;
      setAddingTrackId(track.id);
      setRowErrors((prev) => {
        if (!(track.id in prev)) return prev;
        const next = { ...prev };
        delete next[track.id];
        return next;
      });
      try {
        const response = await fetch("/api/streams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, provider: track.provider, trackId: track.id }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setRowErrors((prev) => ({ ...prev, [track.id]: data?.message || "Failed to add track." }));
          return;
        }
        setAddedIds((prev) => new Set(prev).add(track.id));
        onAdded({ trackId: track.id, track, duplicate: Boolean(data?.duplicate) });
      } catch {
        setRowErrors((prev) => ({ ...prev, [track.id]: "Network error. Please retry." }));
      } finally {
        setAddingTrackId(null);
      }
    },
    [addingTrackId, isTrackQueued, onAdded, roomId]
  );

  const handleLinkAdd = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!linkUrl.trim() || linkAdding) return;
      setLinkAdding(true);
      setLinkError("");
      try {
        const response = await fetch("/api/streams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, url: linkUrl.trim() }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setLinkError(data?.message || "Failed to add track.");
          return;
        }
        setLinkUrl("");
        setLinkAdded(true);
        onAdded({
          trackId: String(data?.id ?? ""),
          track: {
            provider: "youtube",
            id: String(data?.id ?? ""),
            title: "Pasted link",
            artist: "",
            thumbnail: "",
            artwork: "",
            durationSeconds: null,
            url: linkUrl.trim(),
            embeddable: null,
            source: "link",
          },
          duplicate: Boolean(data?.duplicate),
        });
        setTimeout(() => setLinkAdded(false), 2500);
      } catch {
        setLinkError("Network error. Please retry.");
      } finally {
        setLinkAdding(false);
      }
    },
    [linkAdding, linkUrl, onAdded, roomId]
  );

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (tab !== "search") return;
    if (status !== "success" || results.length === 0) {
      if (event.key === "Escape") onOpenChange(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const track = results[selectedIndex];
      if (track) void handleAdd(track);
    } else if (event.key === "Escape") {
      onOpenChange(false);
    }
  };

  // Keep the highlighted row in view.
  useEffect(() => {
    if (status !== "success") return;
    const node = listRef.current?.children?.[selectedIndex] as HTMLElement | undefined;
    node?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, status]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="song-search-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handleKeyDown}
            className="w-full sm:max-w-xl bg-[#121212] border border-[#27272A] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center">
                  <Music2 className="w-4 h-4 text-[#10B981]" />
                </div>
                <div>
                  <h2 id="song-search-title" className="text-sm font-heading font-black text-white leading-tight">
                    Add a song
                  </h2>
                  <p className="text-[10px] text-[#A1A1AA]">Find a track or paste a link</p>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full border border-[#27272A] text-[#A1A1AA] hover:text-white hover:bg-[#18181B] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-5">
              <div className="grid grid-cols-2 gap-1 bg-[#090909] border border-[#27272A] rounded-xl p-1">
                <button
                  onClick={() => setTab("search")}
                  aria-pressed={tab === "search"}
                  className={`h-8 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    tab === "search" ? "bg-[#10B981]/15 text-[#10B981]" : "text-[#A1A1AA] hover:text-white"
                  }`}
                >
                  <Search className="w-3.5 h-3.5" /> Search
                </button>
                <button
                  onClick={() => setTab("link")}
                  aria-pressed={tab === "link"}
                  className={`h-8 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    tab === "link" ? "bg-[#10B981]/15 text-[#10B981]" : "text-[#A1A1AA] hover:text-white"
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" /> Paste link
                </button>
              </div>
            </div>

            {tab === "search" ? (
              <>
                {/* Search input */}
                <div className="px-5 pt-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                    <input
                      ref={inputRef}
                      type="text"
                      role="combobox"
                      aria-expanded={status === "success"}
                      aria-controls="song-search-results"
                      aria-autocomplete="list"
                      aria-label="Search for a song or artist"
                      placeholder="Search songs, artists, albums..."
                      value={query}
                      maxLength={100}
                      onChange={(event) => setQuery(event.target.value)}
                      className="w-full bg-[#090909] border border-[#27272A] rounded-xl h-11 pl-10 pr-10 text-sm text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#10B981]/50 transition-colors"
                    />
                    {status === "loading" && (
                      <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#10B981]" />
                    )}
                    {query.length > 0 && status !== "loading" && (
                      <button
                        onClick={() => {
                          setQuery("");
                          inputRef.current?.focus();
                        }}
                        aria-label="Clear search"
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-[#71717A] hover:text-white flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Media category filter — one search endpoint, music/video/all */}
                <div className="px-5 pt-3">
                  <div className="grid grid-cols-3 gap-1 bg-[#090909] border border-[#27272A] rounded-xl p-1">
                    {([
                      { id: "music", label: "Music" },
                      { id: "video", label: "Videos" },
                      { id: "all", label: "All media" },
                    ] as const).map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setCategory(option.id)}
                        aria-pressed={category === option.id}
                        className={`h-7 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                          category === option.id
                            ? "bg-[#10B981]/15 text-[#10B981]"
                            : "text-[#A1A1AA] hover:text-white"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Results area */}
                <div className="flex-1 overflow-y-auto px-5 py-4 min-h-[180px]">
                  {status === "idle" && (
                    <div className="h-full flex flex-col items-center justify-center text-center py-10">
                      <Search className="w-7 h-7 text-[#A1A1AA]/40 mb-3" />
                      <p className="text-xs font-semibold text-[#A1A1AA]">Search for a track to add</p>
                      <p className="text-[10px] text-[#71717A] mt-1">Try an artist, song title, or album</p>
                    </div>
                  )}

                  {status === "loading" && (
                    <ul className="space-y-2" aria-hidden="true">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <li key={index} className="flex items-center gap-3 p-2">
                          <div className="w-12 h-12 rounded-xl bg-[#18181B] animate-pulse shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 rounded bg-[#18181B] animate-pulse w-3/4" />
                            <div className="h-2.5 rounded bg-[#18181B] animate-pulse w-1/3" />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {status === "empty" && (
                    <div className="h-full flex flex-col items-center justify-center text-center py-10">
                      <Music2 className="w-7 h-7 text-[#A1A1AA]/40 mb-3" />
                      <p className="text-xs font-semibold text-[#A1A1AA]">No results for “{debouncedQuery}”</p>
                      <p className="text-[10px] text-[#71717A] mt-1">Check the spelling or try a different search</p>
                    </div>
                  )}

                  {status === "error" && (
                    <div className="h-full flex flex-col items-center justify-center text-center py-10 px-4">
                      <AlertCircle className="w-7 h-7 text-[#F59E0B] mb-3" />
                      <p className="text-xs font-semibold text-[#FAFAFA]">Search unavailable</p>
                      <p className="text-[10px] text-[#A1A1AA] mt-1 max-w-xs break-words">{errorMessage}</p>
                      {errorRetryable && (
                        <button
                          onClick={() => void runSearch(debouncedQuery || query.trim())}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#27272A] bg-[#090909] hover:bg-[#18181B] text-[#FAFAFA] text-xs font-bold px-4 py-2 transition-colors cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" /> Retry
                        </button>
                      )}
                    </div>
                  )}

                  {status === "success" && (
                    <ul id="song-search-results" ref={listRef} role="listbox" aria-label="Search results" className="space-y-1.5">
                      {results.map((track, index) => {
                        const queued = isTrackQueued(track.id);
                        const adding = addingTrackId === track.id;
                        const rowError = rowErrors[track.id];
                        const selected = index === selectedIndex;
                        const unavailable = track.available === false;
                        return (
                          <li key={track.id} role="option" aria-selected={selected}>
                            <div
                              onMouseEnter={() => setSelectedIndex(index)}
                              className={`flex items-center gap-3 p-2 rounded-xl border transition-colors ${
                                selected ? "border-[#10B981]/40 bg-[#10B981]/5" : "border-transparent hover:bg-[#18181B]"
                              }`}
                            >
                              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-black border border-[#27272A]/60">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[#FAFAFA] truncate">{track.title}</p>
                                <p className="text-[10px] text-[#A1A1AA] truncate">
                                  {track.artist || "Unknown artist"}
                                  {track.provider === "itunes" ? (
                                    <span className="text-[#71717A]"> · 30s preview</span>
                                  ) : track.durationSeconds != null ? (
                                    <span className="text-[#71717A]"> · {formatDuration(track.durationSeconds)}</span>
                                  ) : null}
                                  {track.mediaType === "video" && (
                                    <span className="text-[#818CF8]"> · Video</span>
                                  )}
                                </p>
                                {unavailable && (
                                  <p className="text-[10px] text-[#F59E0B] mt-0.5 truncate">
                                    {track.unavailableReason || "Unavailable for playback"}
                                  </p>
                                )}
                                {rowError && (
                                  <p className="text-[10px] text-[#F87171] mt-0.5 truncate">{rowError}</p>
                                )}
                              </div>
                              <button
                                onClick={() => void handleAdd(track)}
                                disabled={queued || adding || unavailable}
                                aria-label={
                                  unavailable
                                    ? `${track.title} is unavailable`
                                    : queued
                                    ? `${track.title} already added`
                                    : `Add ${track.title} to queue`
                                }
                                className={`h-8 shrink-0 rounded-full px-3.5 text-xs font-bold flex items-center gap-1.5 transition-colors ${
                                  queued
                                    ? "bg-[#10B981]/15 text-[#10B981] cursor-default"
                                    : unavailable
                                    ? "bg-[#27272A] text-[#71717A] cursor-not-allowed"
                                    : "bg-[#10B981] hover:bg-[#10B981]/90 text-white cursor-pointer"
                                } disabled:opacity-80`}
                              >
                                {adding ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : unavailable ? (
                                  <>Unavailable</>
                                ) : queued ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" /> Added
                                  </>
                                ) : rowError ? (
                                  <>
                                    <RotateCw className="w-3.5 h-3.5" /> Retry
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5" /> Add
                                  </>
                                )}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="px-5 py-3 border-t border-[#27272A]/60 flex items-center justify-between gap-2">
                  <p className="text-[9px] text-[#71717A]">
                    {resultProvider === "itunes"
                      ? "Results via the iTunes Search API. Playback uses Apple's 30-second preview."
                      : "Results via the YouTube Data API. Playback uses YouTube's embedded player."}
                  </p>
                  <div className="hidden sm:flex items-center gap-1.5 text-[9px] text-[#71717A]">
                    <kbd className="px-1.5 py-0.5 rounded border border-[#27272A] bg-[#090909]">↑↓</kbd> navigate
                    <kbd className="px-1.5 py-0.5 rounded border border-[#27272A] bg-[#090909]">↵</kbd> add
                  </div>
                </div>
              </>
            ) : (
              <form onSubmit={handleLinkAdd} className="px-5 py-5 space-y-3">
                <div>
                  <label htmlFor="link-url" className="block text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-2">
                    YouTube or Spotify link
                  </label>
                  <input
                    id="link-url"
                    type="url"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-[#090909] border border-[#27272A] rounded-xl h-11 px-3.5 text-sm text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#10B981]/50 transition-colors"
                  />
                  {linkError && <p className="text-[10px] text-[#F87171] mt-2">{linkError}</p>}
                </div>
                <button
                  type="submit"
                  disabled={linkAdding || !linkUrl.trim()}
                  className="w-full h-10 rounded-xl bg-[#10B981] hover:bg-[#10B981]/90 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {linkAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : linkAdded ? (
                    <>
                      <Check className="w-4 h-4" /> Added to queue
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Add to queue
                    </>
                  )}
                </button>
                <p className="text-[10px] text-[#71717A] leading-relaxed">
                  Pasted links keep working exactly as before and land in the same shared queue.
                </p>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
