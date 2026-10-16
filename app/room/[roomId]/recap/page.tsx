"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Clock,
  ListMusic,
  Loader2,
  MessageSquare,
  Mic2,
  Play,
  Sparkles,
  ThumbsUp,
  Trophy,
  Users,
} from "lucide-react";

interface Recap {
  room: { id: string; name: string; code: string };
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  isEnded: boolean;
  totals: {
    itemsQueued: number;
    itemsPlayed: number;
    participants: number;
    messages: number;
  };
  topVoted: {
    id: string;
    title: string;
    artist: string | null;
    mediaType: string;
    upvotes: number;
    played: boolean;
  }[];
  popularArtists: { artist: string; count: number }[];
  topContributors: { name: string; added: number; messages: number }[];
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" as const },
  }),
};

export default function RecapPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}/recap`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(data?.message || "This recap could not be loaded.");
          return;
        }
        setRecap(data.recap);
      } catch {
        if (!cancelled) setError("Network error while loading the recap.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090909]">
        <Loader2 className="h-5 w-5 animate-spin text-[#10B981]" />
      </div>
    );
  }

  if (error || !recap) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#090909] px-6 text-center">
        <p className="text-sm font-semibold text-[#FAFAFA]">{error || "Recap unavailable."}</p>
        <Link
          href={`/room/${roomId}`}
          className="text-xs font-bold text-[#10B981] hover:underline inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to the room
        </Link>
      </div>
    );
  }

  const stats = [
    { label: "Session length", value: formatClock(recap.durationSeconds), icon: Clock },
    { label: "Items queued", value: recap.totals.itemsQueued, icon: ListMusic },
    { label: "Items played", value: recap.totals.itemsPlayed, icon: Play },
    { label: "Participants", value: recap.totals.participants, icon: Users },
    { label: "Messages", value: recap.totals.messages, icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-[#090909] text-[#FAFAFA] font-sans pb-24">
      <div className="relative overflow-hidden border-b border-[#27272A]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#10B981]/10 via-transparent to-[#818CF8]/10 pointer-events-none" />
        <div className="relative container max-w-4xl mx-auto px-6 py-14">
          <Link
            href={`/room/${recap.room.code || recap.room.id}`}
            className="text-xs font-bold text-[#A1A1AA] hover:text-white inline-flex items-center gap-1.5 mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to room
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#10B981] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Session Recap
          </span>
          <h1 className="text-3xl md:text-4xl font-heading font-black tracking-tight mt-2">
            {recap.room.name}
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-2">
            {new Date(recap.startedAt).toLocaleString()} ·{" "}
            {recap.isEnded ? "ended" : "still in progress"}
          </p>
        </div>
      </div>

      <main className="container max-w-4xl mx-auto px-6 py-10 space-y-12">
        {/* Stat grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                custom={i}
                initial="hidden"
                animate="show"
                variants={fadeUp}
                className="bg-[#121212] border border-[#27272A] rounded-2xl p-4"
              >
                <Icon className="w-4 h-4 text-[#10B981] mb-3" />
                <p className="text-xl font-heading font-black text-white leading-none">{stat.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-[#A1A1AA] mt-1.5">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Top voted */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-4 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-[#F59E0B]" /> Most upvoted
          </h2>
          {recap.topVoted.length === 0 ? (
            <p className="text-xs text-[#71717A]">Nothing was queued in this session.</p>
          ) : (
            <div className="space-y-2">
              {recap.topVoted.map((track, i) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 bg-[#121212] border border-[#27272A] rounded-xl px-4 py-3"
                >
                  <span className="text-[11px] font-mono text-[#52525B] w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{track.title}</p>
                    <p className="text-[10px] text-[#A1A1AA] truncate">
                      {track.artist || track.mediaType}
                      {track.played && <span className="text-[#10B981]"> · played</span>}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold text-[#10B981] shrink-0">
                    <ThumbsUp className="w-3.5 h-3.5" /> {track.upvotes}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Popular artists */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-4 flex items-center gap-1.5">
              <Mic2 className="w-3.5 h-3.5 text-[#818CF8]" /> Artists on rotation
            </h2>
            {recap.popularArtists.length === 0 ? (
              <p className="text-xs text-[#71717A]">No artist data for this session.</p>
            ) : (
              <div className="space-y-1.5">
                {recap.popularArtists.map((artist) => (
                  <div
                    key={artist.artist}
                    className="flex items-center justify-between bg-[#121212] border border-[#27272A] rounded-xl px-4 py-2.5"
                  >
                    <span className="text-xs font-semibold text-white truncate">{artist.artist}</span>
                    <span className="text-[10px] text-[#A1A1AA] shrink-0">
                      {artist.count} track{artist.count === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Top contributors */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-4 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-[#10B981]" /> Top contributors
            </h2>
            {recap.topContributors.length === 0 ? (
              <p className="text-xs text-[#71717A]">No contributions recorded.</p>
            ) : (
              <div className="space-y-1.5">
                {recap.topContributors.map((person) => (
                  <div
                    key={person.name}
                    className="flex items-center gap-3 bg-[#121212] border border-[#27272A] rounded-xl px-4 py-2.5"
                  >
                    <span className="w-7 h-7 rounded-full bg-[#10B981]/15 text-[#10B981] text-[10px] font-bold flex items-center justify-center shrink-0">
                      {person.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0 text-xs font-semibold text-white truncate">
                      {person.name}
                    </span>
                    <span className="text-[10px] text-[#A1A1AA] shrink-0">
                      {person.added} added · {person.messages} msg
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <p className="text-[10px] text-[#52525B] text-center pt-4 border-t border-[#27272A]/60">
          Built only from what Sphere measured — item counts and wall-clock time. Message content is never included.
        </p>
      </main>
    </div>
  );
}
