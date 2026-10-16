"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Music,
  Play,
  Settings,
  ThumbsUp,
  Users,
} from "lucide-react";
import { formatDuration } from "@/lib/music/youtube-parse";

interface DisplayStream {
  id: string;
  type: string;
  extractedId: string;
  url: string;
  title: string;
  artist?: string | null;
  duration?: number | null;
  smallImg: string;
  bigImg: string;
  previewUrl?: string | null;
  mediaType?: string;
  upvotes: number;
  addedByUsername?: string | null;
}

interface DisplayRoom {
  id: string;
  code: string;
  name: string;
  mode: string;
  visibility: string;
  isLocked: boolean;
  host: { email: string | null; username: string | null };
  currentStream: DisplayStream | null;
  isPlaying: boolean;
  playbackPosition: number;
  playbackStartedAt: string | null;
  queue: DisplayStream[];
  participants: { userId: string; username: string; role: string }[];
  reactions: { id: string; emoji: string; username: string }[];
  poll: {
    id: string;
    question: string;
    totalVotes: number;
    options: { id: string; label: string; votes: number }[];
  } | null;
  battle: {
    id: string;
    totalVotes: number;
    entries: { id: string; title: string; artist: string | null; votes: number }[];
  } | null;
}

function useYouTubePlayer(
  containerId: string,
  videoId: string | null,
  playing: boolean,
  onReady?: () => void
) {
  const playerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const hasVideo = Boolean(videoId);

  useEffect(() => {
    if (!videoId) return;
    const w = window as any;
    const create = () => {
      if (playerRef.current || !w.YT?.Player) return;
      playerRef.current = new w.YT.Player(containerId, {
        videoId,
        playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0, playsinline: 1 },
        events: {
          onReady: () => {
            setReady(true);
            onReady?.();
          },
        },
      });
    };
    if (w.YT?.Player) {
      create();
    } else {
      if (!document.getElementById("yt-iframe-api")) {
        const tag = document.createElement("script");
        tag.id = "yt-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prev?.();
        create();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId, hasVideo]);

  // Re-runs when the player becomes ready, so the first play/pause lands.
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !videoId) return;
    try {
      const current = player.getVideoData?.().video_id;
      if (current !== videoId) player.loadVideoById(videoId);
      if (playing) player.playVideo?.();
      else player.pauseVideo?.();
    } catch {
      /* player not ready yet */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, playing, ready]);

  return playerRef;
}

export default function PartyDisplayPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const [room, setRoom] = useState<DisplayRoom | null>(null);
  const [qr, setQr] = useState<string>("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);
  const [showReactions, setShowReactions] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seqRef = useRef(0);

  const current = room?.currentStream ?? null;
  const isPreview = Boolean(current?.previewUrl) && current?.type !== "Youtube";
  const isYoutube = current?.type === "Youtube";

  const ytRef = useYouTubePlayer("party-player", isYoutube ? current!.extractedId : null, Boolean(room?.isPlaying));

  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    try {
      const res = await fetch(`/api/rooms/${roomId}`, { cache: "no-store" });
      if (!res.ok) {
        if (seq === seqRef.current) setError("This room could not be loaded.");
        return;
      }
      const data = await res.json();
      if (seq !== seqRef.current) return; // ignore stale responses
      setRoom(data.room);
      setError("");
    } catch {
      if (seq === seqRef.current) setError("Reconnecting…");
    }
  }, [roomId]);

  // Load settings + QR once.
  useEffect(() => {
    try {
      setShowParticipants(localStorage.getItem("sphere.display.participants") !== "0");
      setShowReactions(localStorage.getItem("sphere.display.reactions") !== "0");
    } catch {
      /* ignore */
    }
    fetch(`/api/rooms/${roomId}/invite`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.qrDataUrl && setQr(d.qrDataUrl))
      .catch(() => {});
  }, [roomId]);

  // Poll room state.
  useEffect(() => {
    void load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [load]);

  // Drive preview audio.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPreview && current?.previewUrl) {
      if (audio.src !== current.previewUrl) {
        audio.src = current.previewUrl;
        audio.currentTime = 0;
      }
      if (room?.isPlaying) void audio.play().catch(() => {});
      else audio.pause();
    } else {
      audio.pause();
    }
  }, [isPreview, current?.previewUrl, room?.isPlaying]);

  // Progress ticker.
  useEffect(() => {
    const timer = setInterval(() => {
      if (isYoutube && ytRef.current?.getCurrentTime) {
        setProgress(ytRef.current.getCurrentTime() || 0);
        setDuration(ytRef.current.getDuration() || 0);
      } else if (audioRef.current) {
        setProgress(audioRef.current.currentTime || 0);
        setDuration(audioRef.current.duration || current?.duration || 0);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isYoutube, current?.duration, ytRef]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch {
      /* fullscreen may be blocked */
    }
  };

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const saveToggle = (key: "participants" | "reactions", value: boolean) => {
    if (key === "participants") setShowParticipants(value);
    else setShowReactions(value);
    try {
      localStorage.setItem(`sphere.display.${key}`, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const hostName = room?.host?.username || room?.host?.email?.split("@")[0] || "Host";

  return (
    <div className="min-h-screen bg-[#090909] text-white flex flex-col">
      <audio ref={audioRef} />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#1F1F22]">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/room/${room?.code || roomId}`}
            aria-label="Back to room"
            className="w-8 h-8 rounded-full border border-[#27272A] text-[#A1A1AA] hover:text-white flex items-center justify-center shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <p className="font-heading font-black text-lg truncate">{room?.name || "Sphere"}</p>
            <p className="text-[11px] text-[#A1A1AA]">
              Party Mode · host {hostName}
              {room?.isLocked && <span className="text-[#F59E0B]"> · locked</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            aria-label="Display settings"
            aria-pressed={settingsOpen}
            className="w-9 h-9 rounded-full border border-[#27272A] text-[#A1A1AA] hover:text-white flex items-center justify-center cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
            className="w-9 h-9 rounded-full border border-[#27272A] text-[#A1A1AA] hover:text-white flex items-center justify-center cursor-pointer"
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {settingsOpen && (
        <div className="px-6 py-3 border-b border-[#1F1F22] flex items-center gap-4 text-xs bg-[#0D0D0F]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showParticipants}
              onChange={(e) => saveToggle("participants", e.target.checked)}
              className="accent-[#10B981]"
            />
            Show participant names
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showReactions}
              onChange={(e) => saveToggle("reactions", e.target.checked)}
              className="accent-[#10B981]"
            />
            Show reactions
          </label>
        </div>
      )}

      <main className="flex-1 grid lg:grid-cols-[1.6fr_1fr] gap-6 p-6 min-h-0">
        {/* Player */}
        <section className="flex flex-col min-h-0">
          <div className="relative flex-1 rounded-2xl overflow-hidden border border-[#1F1F22] bg-black min-h-[240px]">
            {/* Kept mounted so the YouTube player container is stable across media changes. */}
            <div id="party-player" className="absolute inset-0 w-full h-full" />
            {!isYoutube &&
              (current?.bigImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.bigImg}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                />
              ) : (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center text-[#3F3F46] bg-black">
                  <Music className="w-16 h-16" />
                </div>
              ))}
            {!room?.isPlaying && current && (
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 text-[11px] font-bold text-[#A1A1AA]">
                Paused
              </div>
            )}
          </div>

          <div className="mt-4">
            <h2 className="font-heading font-black text-2xl truncate">
              {current?.title || "Nothing playing yet"}
            </h2>
            <p className="text-sm text-[#A1A1AA] truncate">
              {current?.artist || (current ? "" : "Add something from the room to get started")}
            </p>
            {current && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-[11px] text-[#A1A1AA] font-mono w-10 text-right">
                  {formatDuration(Math.floor(progress))}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-[#1F1F22] overflow-hidden">
                  <div
                    className="h-full bg-[#10B981]"
                    style={{ width: `${duration > 0 ? Math.min(100, (progress / duration) * 100) : 0}%` }}
                  />
                </div>
                <span className="text-[11px] text-[#A1A1AA] font-mono w-10">
                  {duration > 0 ? formatDuration(Math.floor(duration)) : "--:--"}
                </span>
              </div>
            )}
          </div>

          {/* Poll / battle strip */}
          {room?.poll && (
            <div className="mt-4 bg-[#0D0D0F] border border-[#1F1F22] rounded-xl p-3">
              <p className="text-sm font-bold mb-2">{room.poll.question}</p>
              <div className="flex gap-3 flex-wrap text-xs">
                {room.poll.options.map((o) => (
                  <span key={o.id} className="text-[#A1A1AA]">
                    <span className="text-white font-semibold">{o.label}</span> · {o.votes}
                  </span>
                ))}
              </div>
            </div>
          )}
          {room?.battle && (
            <div className="mt-3 bg-[#0D0D0F] border border-[#1F1F22] rounded-xl p-3">
              <p className="text-sm font-bold mb-2">Song Battle · {room.battle.totalVotes} votes</p>
              <div className="flex gap-4 flex-wrap text-xs">
                {room.battle.entries.map((e) => (
                  <span key={e.id} className="text-[#A1A1AA]">
                    <span className="text-white font-semibold">{e.title}</span> · {e.votes}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Side: queue + join */}
        <section className="flex flex-col gap-4 min-h-0">
          <div className="bg-[#0D0D0F] border border-[#1F1F22] rounded-2xl p-4 flex-1 min-h-0 flex flex-col">
            <p className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-3">Up Next</p>
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {room && room.queue.length > 0 ? (
                room.queue.slice(0, 10).map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className="text-sm font-mono text-[#52525B] w-5 text-right">{index + 1}</span>
                    {item.smallImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.smallImg} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#18181B]" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{item.title}</p>
                      <p className="text-[11px] text-[#A1A1AA] truncate">{item.artist || "Unknown"}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-[#10B981] shrink-0">
                      <ThumbsUp className="w-3 h-3" /> {item.upvotes}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#52525B]">The queue is empty.</p>
              )}
            </div>
          </div>

          <div className="bg-[#0D0D0F] border border-[#1F1F22] rounded-2xl p-4 flex items-center gap-4">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Join QR code" className="w-24 h-24 rounded-lg bg-white p-1" />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-[#18181B] flex items-center justify-center text-[10px] text-[#52525B]">
                QR
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#A1A1AA]">Join the room</p>
              <p className="font-mono font-black text-2xl text-[#10B981] tracking-widest">
                {room?.code || "----"}
              </p>
              <p className="text-[11px] text-[#A1A1AA]">Scan or enter the code</p>
            </div>
          </div>

          {showParticipants && room && (
            <div className="bg-[#0D0D0F] border border-[#1F1F22] rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> In the room ({room.participants.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {room.participants.map((p) => (
                  <span
                    key={p.userId}
                    className="text-[11px] px-2 py-1 rounded-full bg-[#18181B] text-[#FAFAFA]"
                  >
                    {p.username}
                    {p.role === "host" && <span className="text-[#10B981]"> · host</span>}
                  </span>
                ))}
                {room.participants.length === 0 && (
                  <span className="text-[11px] text-[#52525B]">No one else is here yet.</span>
                )}
              </div>
            </div>
          )}

          {showReactions && room && room.reactions.length > 0 && (
            <div className="bg-[#0D0D0F] border border-[#1F1F22] rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-2">Reactions</p>
              <div className="flex flex-wrap gap-2 text-lg">
                {room.reactions.slice(0, 12).map((r) => (
                  <span key={r.id} title={r.username}>
                    {r.emoji}
                  </span>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-[#F59E0B]">{error}</p>}
        </section>
      </main>

      <footer className="px-6 py-3 border-t border-[#1F1F22] text-center text-[11px] text-[#52525B] flex items-center justify-center gap-2">
        <Play className="w-3 h-3" /> Sphere Party Mode · {room?.isPlaying ? "Playing" : "Idle"}
      </footer>
    </div>
  );
}
