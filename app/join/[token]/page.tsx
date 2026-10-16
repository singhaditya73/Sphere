"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2, LogIn, QrCode } from "lucide-react";

type JoinState = "loading" | "redirecting" | "auth" | "invalid";

interface InviteInfo {
  roomName?: string;
  code?: string;
  reason?: string;
}

const REASON_COPY: Record<string, string> = {
  not_found: "This invitation link is not valid.",
  revoked: "This invitation has been revoked by the host.",
  expired: "This invitation has expired. Ask the host for a new link.",
  exhausted: "This invitation has reached its maximum number of uses.",
  room_inactive: "This room is no longer active.",
  error: "Something went wrong validating this invitation.",
};

/**
 * Invitation landing page.
 *
 * Validates the token server-side. Signed-out visitors are asked to sign in
 * first (Sphere has no anonymous guest accounts), then the same link completes
 * the join. A token never grants access by itself on the client.
 */
export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [state, setState] = useState<JoinState>("loading");
  const [info, setInfo] = useState<InviteInfo>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/invite/${encodeURIComponent(token)}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (data?.valid && !data.requiresAuth) {
          setState("redirecting");
          router.replace(`/room/${data.code || data.roomId}`);
          return;
        }
        if (data?.valid && data.requiresAuth) {
          setInfo({ roomName: data.roomName, code: data.code });
          setState("auth");
          return;
        }
        setInfo({ reason: data?.reason });
        setState("invalid");
      } catch {
        if (!cancelled) {
          setInfo({ reason: "error" });
          setState("invalid");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#090909] p-6">
      <header className="absolute top-0 left-0 w-full p-8">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors font-bold text-xs uppercase tracking-wider"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
      </header>

      <main className="w-full max-w-sm">
        <div className="bg-[#121212] border border-[#27272A] shadow-lg rounded-2xl p-8 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-[#10B981]/10 rounded-full flex items-center justify-center">
              <QrCode className="h-6 w-6 text-[#10B981]" />
            </div>
          </div>

          {state === "loading" && (
            <div className="space-y-3 py-4">
              <Loader2 className="h-6 w-6 animate-spin text-[#10B981] mx-auto" />
              <p className="text-xs text-[#A1A1AA]">Checking your invitation…</p>
            </div>
          )}

          {state === "redirecting" && (
            <div className="space-y-3 py-4">
              <Loader2 className="h-6 w-6 animate-spin text-[#10B981] mx-auto" />
              <p className="text-xs text-[#A1A1AA]">Joining the room…</p>
            </div>
          )}

          {state === "auth" && (
            <>
              <div className="space-y-2">
                <h1 className="text-xl font-heading font-black tracking-tight text-white">
                  You&apos;re invited
                </h1>
                <p className="text-xs text-[#A1A1AA]">
                  Join <span className="text-white font-semibold">{info.roomName}</span>
                  {info.code ? <span className="text-[#10B981] font-mono"> · {info.code}</span> : null}
                </p>
              </div>
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(`/join/${token}`)}`}
                className="w-full h-11 bg-[#10B981] hover:bg-[#10B981]/90 text-white font-bold text-xs flex items-center justify-center gap-2 rounded-xl transition-colors"
              >
                <LogIn className="h-4 w-4" /> Sign in to join
              </Link>
              <p className="text-[10px] text-[#71717A]">
                You&apos;ll return to this invitation automatically after signing in.
              </p>
            </>
          )}

          {state === "invalid" && (
            <>
              <div className="space-y-2">
                <h1 className="text-xl font-heading font-black tracking-tight text-white">
                  Invitation unavailable
                </h1>
                <p className="text-xs text-[#A1A1AA] flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4 text-[#F59E0B]" />
                  {REASON_COPY[info.reason ?? ""] || "This invitation cannot be used."}
                </p>
              </div>
              <Link
                href="/dashboard"
                className="w-full h-11 bg-[#090909] border border-[#27272A] hover:bg-[#18181B] text-white font-bold text-xs flex items-center justify-center gap-2 rounded-xl transition-colors"
              >
                Go to dashboard
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
