"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Ban, Loader2, Lock, LockOpen, MicOff, Shield, UserX, X } from "lucide-react";

export interface ParticipantView {
  userId: string;
  username: string;
  role: "host" | "guest";
  isMuted: boolean;
}

interface RoomModerationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  isHost: boolean;
  participants: ParticipantView[];
  hostUserId: string | null;
  isLocked: boolean;
  chatMode: "all" | "hosts" | "muted";
  addMode: "all" | "hosts";
  onRefresh: () => void;
  onError?: (message: string) => void;
}

/**
 * Host-only room moderation: remove/ban participants, mute them in the call,
 * lock the room, and restrict chat or media-adding. All of these are enforced
 * server-side by /api/rooms/[roomId]/moderation.
 */
export function RoomModeration({
  open,
  onOpenChange,
  roomId,
  isHost,
  participants,
  hostUserId,
  isLocked,
  chatMode,
  addMode,
  onRefresh,
  onError,
}: RoomModerationProps) {
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (key: string, body: unknown) => {
    setBusy(key);
    try {
      const res = await fetch(`/api/rooms/${roomId}/moderation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError?.(data?.message || "Action failed.");
        return;
      }
      onRefresh();
    } catch {
      onError?.("Network error.");
    } finally {
      setBusy(null);
    }
  };

  const others = participants.filter((p) => p.userId !== hostUserId);

  return (
    <AnimatePresence>
      {open && isHost && (
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
            aria-label="Room moderation"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#121212] border border-[#27272A] rounded-2xl w-full max-w-md shadow-2xl max-h-[88vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272A]/60">
              <h3 className="font-heading font-black text-base text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#10B981]" /> Host Controls
              </h3>
              <button
                onClick={() => onOpenChange(false)}
                aria-label="Close"
                className="w-7 h-7 rounded-full border border-[#27272A] text-[#A1A1AA] hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => act("lock", { action: "lock", locked: !isLocked })}
                  disabled={busy === "lock"}
                  className={`h-10 rounded-xl border text-[11px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 ${
                    isLocked
                      ? "bg-[#7F1D1D]/20 border-[#EF4444]/30 text-[#F87171]"
                      : "border-[#27272A] text-[#A1A1AA] hover:text-white"
                  }`}
                >
                  {busy === "lock" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isLocked ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <LockOpen className="w-3.5 h-3.5" />
                  )}
                  {isLocked ? "Unlock room" : "Lock room"}
                </button>
                <button
                  onClick={() => act("end", { action: "end" })}
                  disabled={busy === "end"}
                  className="h-10 rounded-xl border border-[#27272A] text-[#F87171] text-[11px] font-bold inline-flex items-center justify-center gap-1.5 hover:bg-[#7F1D1D]/20 cursor-pointer disabled:opacity-60"
                >
                  {busy === "end" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                  End session
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-[#A1A1AA]">Who can chat</label>
                <div className="grid grid-cols-3 gap-1 bg-[#090909] border border-[#27272A] rounded-xl p-1">
                  {(["all", "hosts", "muted"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => act("chat", { action: "set-chat", chatMode: mode })}
                      aria-pressed={chatMode === mode}
                      className={`h-8 rounded-lg text-[10px] font-bold capitalize transition-colors cursor-pointer ${
                        chatMode === mode ? "bg-[#10B981]/15 text-[#10B981]" : "text-[#A1A1AA] hover:text-white"
                      }`}
                    >
                      {mode === "all" ? "Everyone" : mode === "hosts" ? "Host only" : "Muted"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-[#A1A1AA]">Who can add media</label>
                <div className="grid grid-cols-2 gap-1 bg-[#090909] border border-[#27272A] rounded-xl p-1">
                  {(["all", "hosts"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => act("add", { action: "set-add", addMode: mode })}
                      aria-pressed={addMode === mode}
                      className={`h-8 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                        addMode === mode ? "bg-[#10B981]/15 text-[#10B981]" : "text-[#A1A1AA] hover:text-white"
                      }`}
                    >
                      {mode === "all" ? "Everyone" : "Host only"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-[#A1A1AA]">
                  Participants ({others.length})
                </label>
                {others.length === 0 && (
                  <p className="text-[11px] text-[#71717A]">No other participants are here right now.</p>
                )}
                <div className="space-y-1.5">
                  {others.map((p) => (
                    <div
                      key={p.userId}
                      className="flex items-center gap-2 bg-[#090909] border border-[#27272A] rounded-xl px-3 py-2"
                    >
                      <span className="w-6 h-6 rounded-full bg-[#10B981]/15 text-[#10B981] text-[10px] font-bold flex items-center justify-center shrink-0">
                        {p.username.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="flex-1 min-w-0 text-[11px] text-white truncate">{p.username}</span>
                      <button
                        onClick={() => act(`mute-${p.userId}`, { action: "mute", userId: p.userId, muted: !p.isMuted })}
                        disabled={busy === `mute-${p.userId}`}
                        aria-label={p.isMuted ? `Unmute ${p.username}` : `Mute ${p.username}`}
                        className={`h-7 w-7 rounded-full border flex items-center justify-center cursor-pointer disabled:opacity-60 ${
                          p.isMuted ? "border-[#EF4444]/40 text-[#F87171]" : "border-[#27272A] text-[#A1A1AA] hover:text-white"
                        }`}
                      >
                        <MicOff className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => act(`kick-${p.userId}`, { action: "kick", userId: p.userId })}
                        disabled={busy === `kick-${p.userId}`}
                        aria-label={`Remove ${p.username}`}
                        className="h-7 px-2 rounded-full border border-[#27272A] text-[#A1A1AA] hover:text-white text-[10px] cursor-pointer disabled:opacity-60"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => act(`ban-${p.userId}`, { action: "ban", userId: p.userId })}
                        disabled={busy === `ban-${p.userId}`}
                        aria-label={`Ban ${p.username}`}
                        className="h-7 w-7 rounded-full border border-[#EF4444]/30 text-[#F87171] flex items-center justify-center cursor-pointer disabled:opacity-60"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
