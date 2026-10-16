"use client";

import { useState } from "react";
import { BarChart3, Loader2, Plus, Swords, Trophy, X } from "lucide-react";

export interface PollView {
  id: string;
  question: string;
  isClosed: boolean;
  closesAt: string | null;
  totalVotes: number;
  myOptionId: string | null;
  options: { id: string; label: string; votes: number }[];
}

export interface BattleView {
  id: string;
  totalVotes: number;
  myEntryId: string | null;
  entries: {
    id: string;
    streamId: string;
    title: string;
    artist: string | null;
    thumbnail: string;
    votes: number;
  }[];
}

export interface QueueItem {
  id: string;
  title: string;
  artist?: string | null;
  smallImg?: string;
  bigImg?: string;
}

interface RoomActivitiesProps {
  roomId: string;
  poll: PollView | null;
  battle: BattleView | null;
  queue: QueueItem[];
  isHost: boolean;
  canInteract: boolean;
  onRefresh: () => void;
  onError?: (message: string) => void;
}

function pct(votes: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((votes / total) * 100);
}

/**
 * Polls and song/video battles — the room's lightweight interactive layer.
 *
 * Both reuse existing room infrastructure and media metadata. Battle votes are
 * stored separately from queue upvotes and never affect ranking. Poll rules
 * allow exactly one vote per user (re-voting changes the choice).
 */
export function RoomActivities({
  roomId,
  poll,
  battle,
  queue,
  isHost,
  canInteract,
  onRefresh,
  onError,
}: RoomActivitiesProps) {
  const [busy, setBusy] = useState(false);
  const [showPollForm, setShowPollForm] = useState(false);
  const [showBattleForm, setShowBattleForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [selected, setSelected] = useState<string[]>([]);

  const fail = (message: string) => onError?.(message);

  const act = async (url: string, body: unknown) => {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        fail(data?.message || "That action could not be completed.");
        return false;
      }
      onRefresh();
      return true;
    } catch {
      fail("Network error.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const votePoll = (optionId: string) =>
    act(`/api/rooms/${roomId}/polls/${poll!.id}`, { action: "vote", optionId });

  const closePoll = () => act(`/api/rooms/${roomId}/polls/${poll!.id}`, { action: "close" });

  const createPoll = async () => {
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    if (question.trim().length < 3 || cleaned.length < 2) {
      fail("Add a question and at least two options.");
      return;
    }
    const ok = await act(`/api/rooms/${roomId}/polls`, { question: question.trim(), options: cleaned });
    if (ok) {
      setQuestion("");
      setOptions(["", ""]);
      setShowPollForm(false);
    }
  };

  const voteBattle = (entryId: string) =>
    act(`/api/rooms/${roomId}/battles/${battle!.id}`, { action: "vote", entryId });

  const closeBattle = () => act(`/api/rooms/${roomId}/battles/${battle!.id}`, { action: "close" });
  const playWinner = () => act(`/api/rooms/${roomId}/battles/${battle!.id}`, { action: "play-winner" });

  const createBattle = async () => {
    if (selected.length < 2) {
      fail("Pick at least two queue items to battle.");
      return;
    }
    const ok = await act(`/api/rooms/${roomId}/battles`, { streamIds: selected });
    if (ok) {
      setSelected([]);
      setShowBattleForm(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  return (
    <div className="space-y-3">
      {/* ── Poll ─────────────────────────────────────────────── */}
      {poll ? (
        <div className="bg-[#090909] border border-[#27272A] rounded-xl p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-[#818CF8]" /> {poll.question}
            </p>
            {isHost && !poll.isClosed && (
              <button
                onClick={closePoll}
                disabled={busy}
                className="text-[10px] text-[#A1A1AA] hover:text-white shrink-0 cursor-pointer disabled:opacity-60"
              >
                Close
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {poll.options.map((option) => {
              const mine = poll.myOptionId === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => !poll.isClosed && canInteract && votePoll(option.id)}
                  disabled={busy || poll.isClosed || !canInteract}
                  className={`w-full text-left relative overflow-hidden rounded-lg border px-3 py-2 transition-colors cursor-pointer disabled:cursor-default ${
                    mine ? "border-[#10B981]/50" : "border-[#27272A] hover:border-[#3F3F46]"
                  }`}
                >
                  <span
                    className="absolute inset-y-0 left-0 bg-[#10B981]/12"
                    style={{ width: `${pct(option.votes, poll.totalVotes)}%` }}
                    aria-hidden="true"
                  />
                  <span className="relative flex items-center justify-between text-[11px]">
                    <span className={mine ? "text-[#10B981] font-bold" : "text-[#FAFAFA]"}>
                      {option.label}
                    </span>
                    <span className="text-[#A1A1AA]">
                      {option.votes} · {pct(option.votes, poll.totalVotes)}%
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-[#71717A]">
            {poll.totalVotes} vote{poll.totalVotes === 1 ? "" : "s"}
            {poll.isClosed
              ? " · closed"
              : poll.closesAt
              ? ` · ends ${new Date(poll.closesAt).toLocaleTimeString()}`
              : ""}
          </p>
        </div>
      ) : null}

      {/* ── Battle ───────────────────────────────────────────── */}
      {battle ? (
        <div className="bg-[#090909] border border-[#27272A] rounded-xl p-3 space-y-2">
          <p className="text-xs font-bold text-white flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-[#F59E0B]" /> Song Battle
            <span className="text-[10px] text-[#71717A] font-medium">· {battle.totalVotes} votes</span>
          </p>
          <div className="space-y-1.5">
            {battle.entries.map((entry) => {
              const mine = battle.myEntryId === entry.id;
              return (
                <button
                  key={entry.id}
                  onClick={() => canInteract && voteBattle(entry.id)}
                  disabled={busy || !canInteract}
                  className={`w-full text-left relative overflow-hidden rounded-lg border px-2 py-1.5 flex items-center gap-2 transition-colors cursor-pointer disabled:cursor-default ${
                    mine ? "border-[#F59E0B]/50" : "border-[#27272A] hover:border-[#3F3F46]"
                  }`}
                >
                  <span
                    className="absolute inset-y-0 left-0 bg-[#F59E0B]/12"
                    style={{ width: `${pct(entry.votes, battle.totalVotes)}%` }}
                    aria-hidden="true"
                  />
                  {entry.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.thumbnail} alt="" className="relative w-8 h-8 rounded object-cover shrink-0" />
                  ) : (
                    <div className="relative w-8 h-8 rounded bg-[#18181B] shrink-0" />
                  )}
                  <span className="relative flex-1 min-w-0">
                    <span className="block text-[11px] font-semibold text-[#FAFAFA] truncate">
                      {entry.title}
                    </span>
                    <span className="block text-[9px] text-[#A1A1AA] truncate">
                      {entry.artist || "Unknown"} · {entry.votes} votes
                    </span>
                  </span>
                  {mine && <Trophy className="relative w-3.5 h-3.5 text-[#F59E0B] shrink-0" />}
                </button>
              );
            })}
          </div>
          {isHost && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={closeBattle}
                disabled={busy}
                className="text-[10px] px-3 py-1.5 rounded-lg border border-[#27272A] text-[#A1A1AA] hover:text-white cursor-pointer disabled:opacity-60"
              >
                Close & reveal
              </button>
              <button
                onClick={playWinner}
                disabled={busy}
                className="text-[10px] px-3 py-1.5 rounded-lg bg-[#F59E0B]/15 text-[#F59E0B] hover:bg-[#F59E0B]/25 cursor-pointer disabled:opacity-60"
              >
                Play winner
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* ── Create controls ──────────────────────────────────── */}
      {(canInteract || isHost) && !poll && !battle && (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowPollForm((v) => !v);
              setShowBattleForm(false);
            }}
            className="flex-1 h-9 rounded-xl border border-[#27272A] hover:border-[#818CF8]/40 text-[11px] font-bold text-[#A1A1AA] hover:text-white inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Start a poll
          </button>
          <button
            onClick={() => {
              setShowBattleForm((v) => !v);
              setShowPollForm(false);
            }}
            className="flex-1 h-9 rounded-xl border border-[#27272A] hover:border-[#F59E0B]/40 text-[11px] font-bold text-[#A1A1AA] hover:text-white inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Swords className="w-3.5 h-3.5" /> Start a battle
          </button>
        </div>
      )}

      {showPollForm && (
        <div className="bg-[#090909] border border-[#27272A] rounded-xl p-3 space-y-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What should we listen to next?"
            maxLength={140}
            className="w-full bg-[#121212] border border-[#27272A] rounded-lg h-9 px-3 text-xs text-white placeholder:text-[#52525B] focus:outline-none focus:border-[#10B981]/50"
          />
          {options.map((option, index) => (
            <input
              key={index}
              value={option}
              onChange={(e) =>
                setOptions((prev) => prev.map((o, i) => (i === index ? e.target.value : o)))
              }
              placeholder={`Option ${index + 1}`}
              maxLength={60}
              className="w-full bg-[#121212] border border-[#27272A] rounded-lg h-8 px-3 text-[11px] text-white placeholder:text-[#52525B] focus:outline-none focus:border-[#10B981]/50"
            />
          ))}
          <div className="flex items-center gap-2">
            {options.length < 6 && (
              <button
                onClick={() => setOptions((prev) => [...prev, ""])}
                className="text-[10px] text-[#A1A1AA] hover:text-white cursor-pointer"
              >
                + Add option
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={() => setShowPollForm(false)}
              className="text-[10px] text-[#71717A] hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={createPoll}
              disabled={busy}
              className="h-8 px-4 rounded-lg bg-[#10B981] hover:bg-[#10B981]/90 text-white text-[11px] font-bold cursor-pointer disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create poll"}
            </button>
          </div>
        </div>
      )}

      {showBattleForm && (
        <div className="bg-[#090909] border border-[#27272A] rounded-xl p-3 space-y-2">
          <p className="text-[10px] text-[#A1A1AA]">Pick 2–4 queue items to battle.</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {queue.length === 0 && <p className="text-[10px] text-[#71717A]">The queue is empty.</p>}
            {queue.map((item) => {
              const checked = selected.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleSelected(item.id)}
                  className={`w-full flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left cursor-pointer ${
                    checked ? "border-[#F59E0B]/50 bg-[#F59E0B]/5" : "border-[#27272A]"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      checked ? "bg-[#F59E0B] border-[#F59E0B]" : "border-[#3F3F46]"
                    }`}
                  >
                    {checked && <Trophy className="w-2.5 h-2.5 text-black" />}
                  </span>
                  <span className="text-[11px] text-[#FAFAFA] truncate">{item.title}</span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowBattleForm(false)}
              className="text-[10px] text-[#71717A] hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={createBattle}
              disabled={busy || selected.length < 2}
              className="h-8 px-4 rounded-lg bg-[#F59E0B]/15 text-[#F59E0B] hover:bg-[#F59E0B]/25 text-[11px] font-bold cursor-pointer disabled:opacity-50"
            >
              Start battle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
