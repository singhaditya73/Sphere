"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Loader2, QrCode, RefreshCw, ShieldOff, X } from "lucide-react";

interface InviteData {
  roomCode: string;
  roomUrl: string;
  qrDataUrl: string;
  visibility: "public" | "unlisted" | "private";
  invite: {
    token: string;
    url: string;
    qrDataUrl: string;
    expiresAt: string | null;
    uses: number;
    maxUses: number | null;
    usable: boolean;
  } | null;
}

interface RoomInviteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  roomCode: string;
  isHost: boolean;
}

/**
 * Share modal: QR code + copy link + room-code fallback.
 *
 * The QR is generated server-side (no third-party image service, no camera
 * permission needed to display it). Only the host can mint/rotate/revoke the
 * invitation token.
 */
export function RoomInvite({ open, onOpenChange, roomId, roomCode, isHost }: RoomInviteProps) {
  const [data, setData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"room" | "invite" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/rooms/${roomId}/invite`, { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.message || "Could not load invite details.");
        return;
      }
      setData(body);
    } catch {
      setError("Network error while loading invite.");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const copy = async (text: string, kind: "room" | "invite") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setError("Could not access the clipboard.");
    }
  };

  const mutateInvite = async (method: "POST" | "DELETE", body?: unknown) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/rooms/${roomId}/invite`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || "Action failed.");
        return;
      }
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
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
            aria-label="Invite people to this room"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#121212] border border-[#27272A] p-6 rounded-2xl max-w-md w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-heading font-black text-lg text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-[#10B981]" /> Invite people
                </h3>
                <p className="text-[#A1A1AA] text-xs mt-0.5">
                  {data?.visibility === "private"
                    ? "Private room — share the invitation link."
                    : "Scan, share the link, or read out the code."}
                </p>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                aria-label="Close"
                className="w-7 h-7 rounded-full border border-[#27272A] text-[#A1A1AA] hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-[#10B981]" />
              </div>
            ) : (
              <>
                <div className="bg-[#090909] rounded-xl p-3 border border-[#27272A] text-center">
                  <p className="text-[9px] text-[#A1A1AA] font-mono mb-0.5 uppercase tracking-wider">Room Code</p>
                  <p className="text-xl font-mono font-black text-[#10B981] tracking-widest">
                    {data?.roomCode || roomCode}
                  </p>
                </div>

                {data?.qrDataUrl && (
                  <div className="bg-white rounded-xl p-3 inline-block mx-auto border border-[#27272A] block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={data.qrDataUrl} alt="Room QR code" className="w-40 h-40 mx-auto" />
                  </div>
                )}

                <button
                  onClick={() => data && copy(data.roomUrl, "room")}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#090909] hover:bg-[#18181B] text-white transition-colors border border-[#27272A] cursor-pointer"
                >
                  {copied === "room" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#10B981]" /> <span className="text-xs font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#A1A1AA]" /> <span className="text-xs font-semibold">Copy room link</span>
                    </>
                  )}
                </button>

                {isHost && (
                  <div className="border-t border-[#27272A]/60 pt-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                      Invitation token
                    </p>
                    {data?.invite?.usable ? (
                      <>
                        {data.invite.qrDataUrl && (
                          <div className="bg-white rounded-xl p-2 inline-block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={data.invite.qrDataUrl} alt="Invitation QR code" className="w-28 h-28" />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => data.invite && copy(data.invite.url, "invite")}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#10B981] hover:bg-[#10B981]/90 text-white text-xs font-bold cursor-pointer"
                          >
                            {copied === "invite" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied === "invite" ? "Copied" : "Copy invite link"}
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => mutateInvite("POST", { rotate: true })}
                            className="px-3 py-2 rounded-xl border border-[#27272A] text-[#A1A1AA] hover:text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Rotate
                          </button>
                        </div>
                        <p className="text-[10px] text-[#71717A]">
                          {data.invite.expiresAt
                            ? `Expires ${new Date(data.invite.expiresAt).toLocaleString()}`
                            : "No expiry"}
                          {data.invite.maxUses != null && ` · ${data.invite.uses}/${data.invite.maxUses} uses`}
                        </p>
                        <button
                          disabled={busy}
                          onClick={() => mutateInvite("DELETE")}
                          className="text-[10px] text-[#F87171] hover:text-red-300 inline-flex items-center gap-1 disabled:opacity-60 cursor-pointer"
                        >
                          <ShieldOff className="w-3 h-3" /> Revoke invitation
                        </button>
                      </>
                    ) : (
                      <button
                        disabled={busy}
                        onClick={() => mutateInvite("POST", {})}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#10B981]/90 text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
                      >
                        Create invitation link
                      </button>
                    )}
                  </div>
                )}

                {error && <p className="text-[10px] text-[#F87171]">{error}</p>}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
