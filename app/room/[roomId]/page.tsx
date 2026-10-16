"use client";

import { useEffect, useState, use, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Loader2, Play, ThumbsUp, Pause, SkipForward, Music, Send,
  QrCode, Copy, Check, Users, MessageSquare, Volume2, ArrowLeft, Disc, Sparkles, Plus, Star, Trash2, Globe, Headphones, AlertCircle,
  Shield, Wand2, Radio, Lock, BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Appbar } from "@/components/Appbar";
import { UsernameModal } from "@/components/UsernameModal";
import { SongSearchDialog, type AddedTrackInfo } from "@/components/song-search-dialog";
import { RoomInvite } from "@/components/room-invite";
import { VideoCall } from "@/components/video-call";
import { RoomActivities, type PollView, type BattleView } from "@/components/room-activities";
import { RoomReactions, type RoomReaction } from "@/components/room-reactions";
import { AiCompanion } from "@/components/ai-companion";
import { RoomModeration } from "@/components/room-moderation";
import { formatDuration } from "@/lib/music/youtube-parse";
import type { ReactionEmoji } from "@/lib/reactions";

interface ChatMessage {
  id: string;
  text: string;
  displayName: string;
  username: string | null;
  createdAt: string;
}

interface Stream {
  id: string;
  type: string;
  extractedId: string;
  url: string;
  title: string;
  artist?: string | null;
  duration?: number | null;
  smallImg: string;
  bigImg: string;
  /** Provider-hosted audio preview (used for keyless providers like iTunes). */
  previewUrl?: string | null;
  /** Universal-media kind (music/video/...). */
  mediaType?: string;
  category?: string | null;
  upvotes: number;
  addedBy: string;
  addedByUsername: string | null;
  createdAt: string;
}

interface Participant {
  userId: string;
  username: string;
  role: "host" | "guest";
  isMuted: boolean;
}

interface Viewer {
  isHost: boolean;
  isBanned: boolean;
  isAuthenticated: boolean;
  isFavorited: boolean;
  canAddMedia: boolean;
  canChat: boolean;
  canControlPlayback: boolean;
  canModerate: boolean;
  canUseCall: boolean;
}

/** True when a stream should play through the preview `<audio>` element. */
function isPreviewStream(stream: Stream | null | undefined): stream is Stream & { previewUrl: string } {
  return stream?.type === "Itunes" && Boolean(stream.previewUrl);
}

interface Room {
  id: string;
  code: string;
  name: string;
  mode: "dj" | "listen_together";
  visibility: "public" | "unlisted" | "private";
  description?: string | null;
  category?: string | null;
  isLocked: boolean;
  chatMode: "all" | "hosts" | "muted";
  addMode: "all" | "hosts";
  callsEnabled: boolean;
  isActive: boolean;
  host: {
    id: string;
    email: string | null;
    username: string | null;
  };
  currentStream: Stream | null;
  queue: Stream[];
  isPlaying: boolean;
  playbackPosition: number;
  playbackStartedAt: string | null;
  participants: Participant[];
  reactions: RoomReaction[];
  poll: PollView | null;
  battle: BattleView | null;
}

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [upvotingIds, setUpvotingIds] = useState<Set<string>>(new Set());
  const [myUpvotedStreamIds, setMyUpvotedStreamIds] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(100);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadingNext, setLoadingNext] = useState(false);
  const playerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewStreamIdRef = useRef<string | null>(null);

  // Server-authoritative viewer permissions (host-ness, bans, policy flags).
  const [viewer, setViewer] = useState<Viewer | null>(null);

  const isHost = viewer?.isHost ?? session?.user?.email === room?.host?.email;
  const currentIsPreview = isPreviewStream(room?.currentStream);

  // Chat & social activity log feed
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  // Native song search dialog
  const [showAddSong, setShowAddSong] = useState(false);

  // Transient toast notifications
  const [toast, setToast] = useState<{ id: number; kind: "success" | "info" | "error"; message: string } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Guards against a slower poll response overwriting newer queue state.
  const roomRequestSeq = useRef(0);

  // Share state
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);

  // Sphere 2.0 — social features
  const [showAi, setShowAi] = useState(false);
  const [showModeration, setShowModeration] = useState(false);
  const [roomError, setRoomError] = useState<{ code?: string; message: string } | null>(null);

  const updateVolume = (newVolume: number) => {
    setVolume(newVolume);
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(newVolume);
    }
    if (audioRef.current) {
      audioRef.current.volume = Math.min(1, Math.max(0, newVolume / 100));
    }
  };

  // Unified transport controls that work for both the YouTube player and the
  // preview <audio> element, so the rest of the UI does not care which is active.
  const playCurrentMedia = useCallback(() => {
    if (isPreviewStream(room?.currentStream)) {
      void audioRef.current?.play().catch(() => {});
    } else {
      playerRef.current?.playVideo?.();
    }
  }, [room?.currentStream]);

  const pauseCurrentMedia = useCallback(() => {
    if (isPreviewStream(room?.currentStream)) {
      audioRef.current?.pause();
    } else {
      playerRef.current?.pauseVideo?.();
    }
  }, [room?.currentStream]);

  const seekCurrentMedia = useCallback(
    (seconds: number) => {
      if (isPreviewStream(room?.currentStream)) {
        if (audioRef.current) audioRef.current.currentTime = seconds;
      } else {
        playerRef.current?.seekTo?.(seconds, true);
      }
    },
    [room?.currentStream]
  );

  useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      (window as any).onYouTubeIframeAPIReady = () => {
        setIsApiReady(true);
      };
    } else {
      setIsApiReady(true);
    }
  }, []);

  useEffect(() => {
    if (isApiReady && room?.currentStream?.type === 'Youtube' && room.currentStream.extractedId) {
      if (playerRef.current) {
        try {
          if (playerRef.current.getVideoData && playerRef.current.getVideoData().video_id === room.currentStream.extractedId) {
            return;
          }
          playerRef.current.loadVideoById(room.currentStream.extractedId);
          playerRef.current.setVolume(volume);
          setIsPlaying(true);
          setProgress(0);
          setDuration(0);
          return;
        } catch (e) {
          playerRef.current = null;
        }
      }

      const targetEl = document.getElementById('youtube-player');
      if (!targetEl) return;

      playerRef.current = new (window as any).YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: room.currentStream.extractedId,
        playerVars: {
          'autoplay': 1,
          'controls': 0,
          'modestbranding': 1,
          'enablejsapi': 1,
          'rel': 0,
          'origin': typeof window !== 'undefined' ? window.location.origin : ''
        },
        events: {
          'onReady': (event: any) => {
            event.target.playVideo();
            event.target.setVolume(volume);
            event.target.setPlaybackRate(playbackRate);
            setIsPlaying(true);
            setDuration(event.target.getDuration());
          },
          'onStateChange': (event: any) => {
            if (event.data === (window as any).YT.PlayerState.PLAYING) setIsPlaying(true);
            if (event.data === (window as any).YT.PlayerState.PAUSED) setIsPlaying(false);
            if (event.data === (window as any).YT.PlayerState.ENDED) handlePlayNext();
          }
        }
      });
    }
  }, [isApiReady, room?.currentStream?.extractedId]);

  // Drive the preview <audio> element for keyless (iTunes) tracks. YouTube
  // playback is stopped first so only one source is ever audible.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const stream = room?.currentStream;
    if (!isPreviewStream(stream)) {
      audio.pause();
      if (previewStreamIdRef.current) {
        audio.removeAttribute("src");
        audio.load();
        previewStreamIdRef.current = null;
      }
      return;
    }

    try {
      playerRef.current?.stopVideo?.();
    } catch {
      // The YouTube player may not be initialised yet.
    }

    const isNewStream = previewStreamIdRef.current !== stream.id;
    if (isNewStream) {
      previewStreamIdRef.current = stream.id;
      audio.src = stream.previewUrl;
      audio.currentTime = 0;
      setProgress(0);
      setDuration(0);
    }
    audio.volume = Math.min(1, Math.max(0, volume / 100));

    // Listen Together follows the server clock; otherwise a freshly loaded
    // track auto-plays and the local transport state wins afterwards.
    const shouldPlay =
      room?.mode === "listen_together" ? Boolean(room?.isPlaying) : isNewStream || isPlaying;
    if (shouldPlay) void audio.play().catch(() => {});
    else audio.pause();
    setIsPlaying(shouldPlay);
  }, [
    room?.currentStream?.id,
    room?.currentStream?.previewUrl,
    room?.currentStream?.type,
    room?.isPlaying,
    room?.mode,
    isPlaying,
    volume,
  ]);

  useEffect(() => {
    if (typeof window !== "undefined" && "mediaSession" in navigator && room?.currentStream) {
      const artworkUrl = room.currentStream.bigImg || room.currentStream.smallImg || (room.currentStream.type === "Youtube" ? `https://img.youtube.com/vi/${room.currentStream.extractedId}/maxresdefault.jpg` : "");
      navigator.mediaSession.metadata = new MediaMetadata({
        title: room.currentStream.title || "Unknown Track",
        artist: "BeatNet",
        album: room.name || "Sphere Channel",
        artwork: [
          {
            src: artworkUrl,
            sizes: "512x512",
            type: "image/jpeg",
          },
        ],
      });

      navigator.mediaSession.setActionHandler("play", () => {
        playCurrentMedia();
        setIsPlaying(true);
      });

      navigator.mediaSession.setActionHandler("pause", () => {
        pauseCurrentMedia();
        setIsPlaying(false);
      });

      if (isHost) {
        navigator.mediaSession.setActionHandler("nexttrack", () => {
          handlePlayNext();
        });
      } else {
        navigator.mediaSession.setActionHandler("nexttrack", null);
      }
    }
  }, [room?.currentStream?.extractedId, room?.name, isHost, playCurrentMedia, pauseCurrentMedia]);

  useEffect(() => {
    const isListenTogether = room?.mode === "listen_together";
    const timer = setInterval(() => {
      const audio = audioRef.current;
      const usingPreview = isPreviewStream(room?.currentStream);

      if (isListenTogether && room) {
        // In Listen Together mode, compute position from the server clock.
        let serverPos = room.playbackPosition;
        if (room.isPlaying && room.playbackStartedAt) {
          const elapsed = (Date.now() - new Date(room.playbackStartedAt).getTime()) / 1000;
          serverPos = room.playbackPosition + elapsed;
        }
        setProgress(serverPos);
        if (usingPreview && audio && Number.isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      } else if (usingPreview && audio) {
        setProgress(audio.currentTime || 0);
        if (Number.isFinite(audio.duration)) setDuration(audio.duration);
      } else if (playerRef.current && playerRef.current.getCurrentTime) {
        setProgress(playerRef.current.getCurrentTime());
        if (!duration) setDuration(playerRef.current.getDuration());
      }
    }, 500);
    return () => clearInterval(timer);
  }, [
    duration,
    room?.mode,
    room?.isPlaying,
    room?.playbackPosition,
    room?.playbackStartedAt,
    room?.currentStream?.id,
  ]);

  // Sync player to server state for Listen Together mode
  useEffect(() => {
    if (room?.mode !== "listen_together") return;

    const audio = audioRef.current;
    if (isPreviewStream(room.currentStream) && audio) {
      if (room.isPlaying) {
        if (audio.paused) void audio.play().catch(() => {});
        if (room.playbackStartedAt) {
          const elapsed = (Date.now() - new Date(room.playbackStartedAt).getTime()) / 1000;
          const expectedPos = room.playbackPosition + elapsed;
          if (Math.abs(expectedPos - audio.currentTime) > 2) audio.currentTime = expectedPos;
        }
      } else {
        if (!audio.paused) audio.pause();
        if (Math.abs(room.playbackPosition - audio.currentTime) > 1) {
          audio.currentTime = room.playbackPosition;
        }
      }
      setIsPlaying(room.isPlaying);
      return;
    }

    if (!playerRef.current) return;

    try {
      // Sync play/pause state
      const playerState = playerRef.current.getPlayerState?.();
      const YT = (window as any).YT;
      if (!YT) return;

      if (room.isPlaying) {
        // Server says playing
        if (playerState === YT.PlayerState.PAUSED || playerState === YT.PlayerState.CUED) {
          playerRef.current.playVideo();
        }
        // Check position drift
        if (room.playbackStartedAt) {
          const elapsed = (Date.now() - new Date(room.playbackStartedAt).getTime()) / 1000;
          const expectedPos = room.playbackPosition + elapsed;
          const currentPos = playerRef.current.getCurrentTime?.() ?? 0;
          if (Math.abs(expectedPos - currentPos) > 2) {
            playerRef.current.seekTo(expectedPos, true);
          }
        }
      } else {
        // Server says paused
        if (playerState === YT.PlayerState.PLAYING) {
          playerRef.current.pauseVideo();
        }
        // Seek to the paused position
        const currentPos = playerRef.current.getCurrentTime?.() ?? 0;
        if (Math.abs(room.playbackPosition - currentPos) > 1) {
          playerRef.current.seekTo(room.playbackPosition, true);
        }
      }
      setIsPlaying(room.isPlaying);
    } catch (e) {
      // Player might not be ready yet
    }
  }, [
    room?.isPlaying,
    room?.playbackPosition,
    room?.playbackStartedAt,
    room?.mode,
    room?.currentStream?.id,
  ]);

  const fetchRoomData = async () => {
    const seq = ++roomRequestSeq.current;
    try {
      const response = await fetch(`/api/rooms/${roomId}`, { cache: "no-store" });
      if (!response.ok) {
        if (seq !== roomRequestSeq.current) return;
        const body = await response.json().catch(() => ({}));
        setRoomError({
          code: body?.code,
          message:
            body?.message ||
            (response.status === 404
              ? "This room no longer exists."
              : "You do not have access to this room."),
        });
        return;
      }
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        // Ignore responses that arrive after a newer request started.
        if (seq !== roomRequestSeq.current) return;

        setRoomError(null);
        setRoom(data.room);
        setViewer(data.viewer ?? null);
        localStorage.setItem("sphere_active_room_id", roomId);

        // Track joined rooms for the user (hosts keep their own rooms separately).
        const currentEmail = session?.user?.email;
        if (currentEmail && data.viewer && !data.viewer.isHost) {
          const joinedStr = localStorage.getItem("sphere_joined_rooms") || "[]";
          try {
            let joinedList = JSON.parse(joinedStr);
            if (!Array.isArray(joinedList)) joinedList = [];
            joinedList = joinedList.filter((r: any) => r.id !== data.room.id);
            joinedList.unshift({
              id: data.room.id,
              name: data.room.name,
              hostName: data.room.host?.username || "Host",
              code: data.room.code,
            });
            if (joinedList.length > 20) joinedList.pop();
            localStorage.setItem("sphere_joined_rooms", JSON.stringify(joinedList));
          } catch (e) {
            console.error("Error updating sphere_joined_rooms:", e);
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (seq === roomRequestSeq.current) setLoading(false);
    }
  };

  const fetchMyUpvotes = async () => {
    try {
      const response = await fetch(`/api/streams/my-upvotes?roomId=${roomId}`);
      if (!response.ok) return;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        setMyUpvotedStreamIds(new Set(data.upvotedStreamIds));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/messages`);
      if (!response.ok) return;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;
    setSendingMessage(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newMessage }),
      });
      if (response.ok) {
        setNewMessage("");
        fetchMessages();
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm("Are you absolutely sure you want to delete this room? This action will end the session for everyone and delete all queue data. It cannot be undone.")) {
      return;
    }
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        localStorage.removeItem("sphere_active_room_id");
        router.push("/dashboard");
      } else {
        const data = await response.json();
        alert(data.message || "Failed to delete room");
      }
    } catch (err) {
      console.error("Error deleting room:", err);
      alert("An error occurred while deleting the room");
    }
  };

  const showToast = useCallback((kind: "success" | "info" | "error", message: string) => {
    setToast({ id: Date.now(), kind, message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Send an emoji reaction (kept separate from queue upvotes).
  const handleReact = useCallback(
    async (emoji: ReactionEmoji) => {
      try {
        const res = await fetch(`/api/rooms/${roomId}/reactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji, streamId: room?.currentStream?.id }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          showToast("error", data?.message || "Could not send that reaction.");
          return;
        }
        void fetchRoomData();
      } catch {
        showToast("error", "Network error while reacting.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId, room?.currentStream?.id, showToast]
  );

  const toggleFavorite = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/favorite`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast("error", data?.message || "Could not update saved rooms.");
        return;
      }
      const data = await res.json();
      setViewer((prev) => (prev ? { ...prev, isFavorited: data.isFavorited } : prev));
      showToast("info", data.isFavorited ? "Saved to your rooms." : "Removed from saved rooms.");
    } catch {
      showToast("error", "Network error.");
    }
  }, [roomId, showToast]);

  const handleTrackAdded = useCallback(
    (info: AddedTrackInfo) => {
      if (info.duplicate) {
        showToast("info", "That track is already in the queue.");
      } else {
        showToast("success", "Added to the queue — everyone will see it.");
      }

      // Optimistically slot a searched track into the queue for instant feedback.
      // Pasted links are reconciled by the refetch below.
      const isSearchedTrack =
        info.track.source === "youtube-data-api" || info.track.source === "itunes-search-api";
      if (!info.duplicate && isSearchedTrack && info.trackId) {
        setRoom((prev) => {
          if (!prev) return prev;
          if (prev.queue.some((s) => s.extractedId === info.trackId || s.id === info.trackId)) return prev;
          const optimistic: Stream = {
            id: `optimistic-${info.trackId}`,
            type: info.track.provider === "itunes" ? "Itunes" : "Youtube",
            extractedId: info.trackId,
            url: info.track.url,
            title: info.track.title,
            artist: info.track.artist || null,
            duration: info.track.durationSeconds,
            smallImg: info.track.thumbnail,
            bigImg: info.track.artwork,
            previewUrl: info.track.previewUrl ?? null,
            upvotes: 0,
            addedBy: session?.user?.email ?? "",
            addedByUsername: null,
            createdAt: new Date().toISOString(),
          };
          return { ...prev, queue: [...prev.queue, optimistic] };
        });
      }

      // Reconcile with the server (real id, metadata, and ordering).
      void fetchRoomData();
    },
    [fetchRoomData, session?.user?.email, showToast]
  );

  useEffect(() => {
    if (!session) {
      const currentPath = window.location.pathname;
      router.push(`/login?callbackUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    const refresh = () => {
      fetchRoomData();
      fetchMyUpvotes();
      fetchMessages();
    };

    refresh();

    const interval = setInterval(() => {
      // Skip polling while the tab is in the background to avoid wasted requests.
      if (typeof document !== "undefined" && document.hidden) return;
      refresh();
    }, 2000);

    // Catch up immediately when the user returns to the tab.
    const onVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [session, roomId]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    // Check if the user is already near the bottom (within 150px)
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

    if (isFirstLoad.current || isAtBottom) {
      container.scrollTop = container.scrollHeight;
      isFirstLoad.current = false;
    }
  }, [messages]);

  const handleUpvote = async (streamId: string, hasUpvoted: boolean) => {
    setUpvotingIds((prev) => new Set(prev).add(streamId));

    setMyUpvotedStreamIds((prev) => {
      const newSet = new Set(prev);
      if (hasUpvoted) newSet.delete(streamId);
      else newSet.add(streamId);
      return newSet;
    });
    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        queue: prev.queue.map((s) =>
          s.id === streamId
            ? { ...s, upvotes: s.upvotes + (hasUpvoted ? -1 : 1) }
            : s
        ).sort((a, b) => b.upvotes - a.upvotes),
      };
    });

    try {
      const endpoint = hasUpvoted ? "/api/streams/downvote" : "/api/streams/upvote";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId }),
      });

      if (response.ok) {
        fetchRoomData();
        fetchMyUpvotes();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setUpvotingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(streamId);
        return newSet;
      });
    }
  };

  const handlePlayNext = async () => {
    if (loadingNext) return;
    try {
      setLoadingNext(true);
      setIsPlaying(false);

      const response = await fetch(`/api/rooms/${roomId}/next`, {
        method: "POST",
      });

      if (response.ok) {
        setProgress(0);
        setDuration(0);
        await fetchRoomData();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingNext(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090909]">
        <Loader2 className="h-5 w-5 animate-spin text-[#10B981]" />
      </div>
    );
  }

  if (!room) {
    const privateRoom = roomError?.code === "INVITE_REQUIRED";
    const banned = roomError?.code === "BANNED";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#090909] p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-[#10B981]/10 flex items-center justify-center mb-4">
          {banned ? (
            <Shield className="h-5 w-5 text-[#F87171]" />
          ) : privateRoom ? (
            <Lock className="h-5 w-5 text-[#F59E0B]" />
          ) : (
            <AlertCircle className="h-5 w-5 text-[#A1A1AA]" />
          )}
        </div>
        <h1 className="text-lg font-heading font-black text-white">
          {banned
            ? "You were removed from this room"
            : privateRoom
            ? "This room is private"
            : "Room not found"}
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-2 max-w-sm">
          {roomError?.message || "The room may have ended or the link may be incorrect."}
        </p>
        <button
          className="mt-5 px-5 py-2 rounded-full bg-[#10B981] text-white text-xs font-semibold cursor-pointer"
          onClick={() => router.push("/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }


  // Real presence from the server (heartbeat-backed). Falls back to the host so
  // the count is never misleading on a brand-new room.
  const participants = room.participants ?? [];
  const listenerNames = participants.length
    ? participants.map((p) => p.username)
    : [room.host.username || room.host.email?.split("@")[0] || "Host"];
  const canChat = viewer ? viewer.canChat : true;
  const canAddMedia = viewer ? viewer.canAddMedia : true;

  // Integrate system events directly in the chat feed
  const combinedLog: Array<
    | { type: "msg"; id: string; user: string; text: string; time: string }
    | { type: "event"; id: string; user: string; text: string; time: string; isHighlight?: boolean }
  > = [
    ...messages.map(m => ({
      type: "msg" as const,
      id: m.id,
      user: m.username || m.displayName || "User",
      text: m.text,
      time: m.createdAt
    })),
    ...room.queue.map(q => {
      // Find out if it has higher votes to trigger amber highlight
      const isHighlight = q.upvotes >= 5;
      return {
        type: "event" as const,
        id: `add-${q.id}`,
        user: q.addedByUsername || q.addedBy?.split('@')[0] || "Someone",
        text: `added track "${q.title.substring(0, 30)}..."`,
        time: q.createdAt,
        isHighlight
      };
    })
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  // Dynamic colors placeholder logic - background artwork blur
  const currentArtworkUrl =
    room.currentStream?.bigImg ||
    room.currentStream?.smallImg ||
    (room.currentStream?.type === "Youtube"
      ? `https://img.youtube.com/vi/${room.currentStream.extractedId}/maxresdefault.jpg`
      : "");

  return (
    <div className="flex min-h-screen flex-col bg-[#090909] text-[#FAFAFA] font-sans pb-36">
      <Appbar />
      <UsernameModal />

      {/* Hidden audio element used for keyless preview playback (e.g. iTunes). */}
      <audio
        ref={audioRef}
        preload="none"
        className="hidden"
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;
          if (Number.isFinite(value) && value > 0) setDuration(value);
        }}
        onEnded={() => {
          // Only the host advances when a preview ends. Previews finish at almost
          // the same instant for everyone, so letting every client call "next"
          // would race and skip tracks.
          if (isHost && room.currentStream?.type === "Itunes") void handlePlayNext();
        }}
      />

      <main className="container flex-1 py-20 md:py-24 px-4 md:px-6 max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-6 relative">

        {/* LEFT & CENTER AREAS (Col-span 8) */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Top Info section & Active Listeners */}
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#10B981] px-2.5 py-0.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/20">
                    {room.mode === "listen_together" ? "Listen Together" : "Live Broadcast"}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#A1A1AA] px-2.5 py-0.5 rounded-full bg-[#18181B] border border-[#27272A]">
                    {room.visibility}
                  </span>
                  {room.mode === "listen_together" ? (
                    <Globe className="w-3.5 h-3.5 text-[#818CF8]" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                  )}
                </div>
                <h1 className="text-2xl font-heading font-black tracking-tight text-white">{room.name}</h1>
                <p className="text-xs text-[#A1A1AA] mt-1">
                  Hosted by <span className="text-[#FAFAFA] font-medium">{room.host.username || room.host.email?.split('@')[0] || "Host"}</span>
                </p>
                {room.description && (
                  <p className="text-xs text-[#71717A] mt-1.5 max-w-lg leading-relaxed">{room.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* In-room video call (LiveKit; hidden when calling is disabled) */}
                <VideoCall
                  roomId={roomId}
                  enabled={Boolean(room.callsEnabled && room.isActive)}
                  isHost={Boolean(viewer?.isHost)}
                />
                <button
                  onClick={() => setShowShareModal(true)}
                  className="rounded-full px-4 py-1.5 bg-[#090909] border border-[#27272A] hover:bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" /> Invite
                </button>
                <button
                  onClick={() => router.push(`/room/${room.code}/display`)}
                  className="rounded-full px-4 py-1.5 bg-[#090909] border border-[#27272A] hover:bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Open the TV-friendly Party Mode display"
                >
                  <Radio className="w-3.5 h-3.5" /> Party Mode
                </button>
                <button
                  onClick={() => router.push(`/room/${room.code}/recap`)}
                  className="rounded-full px-4 py-1.5 bg-[#090909] border border-[#27272A] hover:bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Session recap — top tracks, artists and contributors"
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Recap
                </button>
                {viewer?.isAuthenticated && (
                  <button
                    onClick={toggleFavorite}
                    aria-pressed={viewer.isFavorited}
                    aria-label={viewer.isFavorited ? "Remove from saved rooms" : "Save this room"}
                    className={`rounded-full px-3 py-1.5 border text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      viewer.isFavorited
                        ? "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]"
                        : "bg-[#090909] border-[#27272A] text-[#A1A1AA] hover:text-white"
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${viewer.isFavorited ? "fill-[#F59E0B]" : ""}`} />
                  </button>
                )}
                {viewer?.isHost && (
                  <button
                    onClick={() => setShowModeration(true)}
                    className="rounded-full px-4 py-1.5 bg-[#090909] border border-[#27272A] hover:bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" /> Host
                  </button>
                )}
                <button
                  onClick={() => {
                    localStorage.removeItem("sphere_active_room_id");
                    router.push("/dashboard");
                  }}
                  className="rounded-full px-4 py-1.5 bg-[#090909] border border-[#27272A] hover:bg-red-950/20 text-xs font-bold text-red-400 transition-colors cursor-pointer"
                >
                  Leave
                </button>
                {isHost && (
                  <button
                    onClick={handleDeleteRoom}
                    className="rounded-full px-4 py-1.5 bg-[#7F1D1D]/15 border border-[#EF4444]/20 hover:bg-[#7F1D1D]/30 text-xs font-bold text-[#F87171] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Room
                  </button>
                )}
              </div>
            </div>

            {/* Listener presence row */}
            <div className="flex items-center gap-2 border-t border-[#27272A]/60 pt-4 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1AA] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#10B981]" /> Listening Now ({listenerNames.length})
              </span>
              {listenerNames.slice(0, 8).map((name, i) => (
                <span
                  key={`${name}-${i}`}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[#18181B] text-[#A1A1AA]"
                >
                  {name}
                </span>
              ))}
              {room.isLocked && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </div>
          </div>

          {/* Now Playing Card (Dynamic Artwork Backdrop Blur) */}
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-6 relative overflow-hidden flex flex-col gap-6">

            {/* Dynamic Backdrop Glow derived from current artwork */}
            {room.currentStream && (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-[0.08] blur-[80px] scale-125 pointer-events-none transition-all duration-1000"
                style={{ backgroundImage: `url(${currentArtworkUrl})` }}
              />
            )}

            {room.currentStream ? (
              <div className="flex flex-col md:flex-row gap-6 items-center relative z-10">

                {/* Artwork */}
                <div className="w-56 h-56 rounded-2xl overflow-hidden bg-black border border-[#27272A] shrink-0 shadow-2xl relative group">
                  <img
                    src={currentArtworkUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-0 left-0 w-0 h-0 opacity-0 overflow-hidden pointer-events-none">
                    <div id="youtube-player" className="w-full h-full" />
                  </div>
                </div>

                {/* Track Details & controls */}
                <div className="flex-1 min-w-0 flex flex-col justify-between md:h-56 h-auto gap-5 py-1.5 self-stretch w-full">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#10B981] flex items-center gap-1.5">
                        Now Playing
                        {currentIsPreview && (
                          <span className="normal-case tracking-normal text-[9px] font-bold text-[#818CF8] bg-[#818CF8]/10 border border-[#818CF8]/20 rounded-full px-1.5 py-0.5">
                            30s preview
                          </span>
                        )}
                      </span>
                      {isPlaying && (
                        <div className="waveform">
                          <span /><span /><span /><span /><span />
                        </div>
                      )}
                    </div>
                    <h2 className="text-xl md:text-2xl font-heading font-black text-white mt-3 truncate">
                      {room.currentStream.title}
                    </h2>
                    <p className="text-xs text-[#A1A1AA] mt-1">
                      Added by <span className="text-[#FAFAFA] font-medium">{room.currentStream.addedByUsername || room.currentStream.addedBy?.split('@')[0] || "System"}</span>
                    </p>
                  </div>

                  {/* Playback Progress */}
                  <div className="space-y-1.5">
                    <div
                      className="w-full h-1 bg-[#27272A] rounded-full relative cursor-pointer group"
                      onClick={async (e) => {
                        if (!duration) return;
                        if (room.mode === "listen_together" && !isHost) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percent = x / rect.width;
                        const newTime = percent * duration;
                        if (room.mode === "listen_together" && isHost) {
                          await fetch(`/api/rooms/${roomId}/playback`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "seek", position: newTime }),
                          });
                          setProgress(newTime);
                          fetchRoomData();
                        } else {
                          seekCurrentMedia(newTime);
                          setProgress(newTime);
                        }
                      }}
                    >
                      <div
                        className="absolute top-0 left-0 h-full bg-[#10B981] rounded-full"
                        style={{ width: `${(progress / duration) * 100}%` }}
                      />
                    </div>
                    <div className="w-full flex justify-between text-[9px] font-mono text-[#A1A1AA] uppercase tracking-widest">
                      <span>{Math.floor(progress / 60).toString().padStart(2, '0')}:{Math.floor(progress % 60).toString().padStart(2, '0')}</span>
                      <span>{(duration / 60).toFixed(0).padStart(2, '0')}:{(duration % 60).toFixed(0).padStart(2, '0')}</span>
                    </div>
                  </div>

                  {/* Playback Controls & Skip */}
                  <div className="flex items-center gap-3">
                    {(room.mode !== "listen_together" || isHost) && (
                    <button
                      onClick={async () => {
                        if (room.mode === "listen_together" && isHost) {
                          await fetch(`/api/rooms/${roomId}/playback`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: isPlaying ? "pause" : "play" }),
                          });
                          setIsPlaying(!isPlaying);
                          fetchRoomData();
                        } else {
                          if (isPlaying) pauseCurrentMedia();
                          else playCurrentMedia();
                          setIsPlaying(!isPlaying);
                        }
                      }}
                      className="bg-[#090909] border border-[#27272A] hover:border-[#10B981]/50 text-white h-11 w-11 rounded-full flex items-center justify-center transition-colors cursor-pointer active:scale-95 duration-100"
                    >
                      {isPlaying ? <Pause className="h-4 w-4 text-[#10B981]" /> : <Play className="h-4 w-4 ml-0.5 text-[#10B981]" />}
                    </button>)}
                    {isHost && (
                      <button
                        onClick={handlePlayNext}
                        disabled={loadingNext}
                        className="bg-[#121212] hover:bg-[#18181B] border border-[#27272A] hover:border-[#10B981]/50 text-white h-11 w-11 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                      >
                        {loadingNext ? <Loader2 className="h-4 w-4 animate-spin" /> : <SkipForward className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-[#A1A1AA] relative z-10">
                <Music className="w-10 h-10 opacity-35 mb-3" />
                <p className="text-sm font-semibold text-white">No active track playing</p>
                <p className="text-xs text-[#71717A] mt-1 max-w-xs">Add a track below or search for songs to start the session.</p>
                {isHost && room.queue.length > 0 && (
                  <button
                    onClick={handlePlayNext}
                    className="mt-6 px-6 py-2.5 rounded-full bg-[#10B981] hover:bg-[#10B981]/90 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Start Broadcasting
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Add media action */}
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-heading font-black text-white">Grow the queue</p>
                <p className="text-[10px] text-[#A1A1AA] mt-0.5">
                  {canAddMedia
                    ? "Search music, videos, or paste a link — everyone votes on what plays next."
                    : "Only the host can add media right now."}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => setShowAi(true)}
                  disabled={!canAddMedia}
                  className="h-10 rounded-full border border-[#27272A] hover:border-[#10B981]/40 text-[#A1A1AA] hover:text-white text-xs font-bold px-4 inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Wand2 className="w-4 h-4" /> Ask AI
                </button>
                <button
                  onClick={() => setShowAddSong(true)}
                  disabled={!canAddMedia}
                  className="h-10 rounded-full bg-[#10B981] hover:bg-[#10B981]/90 text-white text-xs font-bold px-5 inline-flex items-center gap-1.5 transition-colors cursor-pointer active:scale-97 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> Add Media
                </button>
              </div>
            </div>
          </div>

          {/* Queue Section (Styled as premium cards, no spreadsheet) */}
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]/60">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">Upcoming Queue ({room.queue.length})</span>
              <button
                onClick={() => setShowAddSong(true)}
                disabled={!canAddMedia}
                className="text-xs text-[#10B981] font-bold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> Add Media
              </button>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {room.queue.length === 0 ? (
                  <div className="py-12 text-center text-[#A1A1AA] text-xs">
                    Queue is empty. Everyone contributes. Add a track above to get started.
                  </div>
                ) : (
                  room.queue.map((stream, index) => {
                    const hasUpvoted = myUpvotedStreamIds.has(stream.id);
                    const isCurrent = room.currentStream?.id === stream.id;
                    const isOptimistic = stream.id.startsWith("optimistic-");
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ type: "spring", stiffness: 450, damping: 28 }}
                        key={stream.id}
                        className={`flex items-center gap-4 p-3.5 rounded-2xl border bg-[#090909]/40 hover:bg-[#090909]/80 transition-all group ${
                          isCurrent ? "border-[#10B981]/40" : "border-[#27272A]/60 hover:border-[#27272A]"
                        }`}
                      >
                        <span className="text-[10px] font-mono text-[#A1A1AA]/50 w-5 text-center font-bold">
                          {(index + 1).toString().padStart(2, '0')}
                        </span>

                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[#27272A]/60 bg-black">
                          <img
                            src={
                              stream.smallImg ||
                              (stream.type === "Youtube"
                                ? `https://img.youtube.com/vi/${stream.extractedId}/default.jpg`
                                : "")
                            }
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <h4 className="font-bold text-[#FAFAFA] text-sm truncate group-hover:text-[#10B981] transition-colors">
                              {stream.title}
                            </h4>
                            {isCurrent && (
                              <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 rounded-full px-1.5 py-0.5">
                                Now Playing
                              </span>
                            )}
                          </div>
                          {stream.artist && (
                            <p className="text-[10px] text-[#A1A1AA] truncate mt-0.5">
                              {stream.artist}
                              {stream.duration ? <span className="text-[#71717A]"> · {formatDuration(stream.duration)}</span> : null}
                            </p>
                          )}
                          <p className={`text-[10px] text-[#A1A1AA] ${stream.artist ? "mt-0.5" : "mt-0.5"}`}>
                            {isOptimistic ? (
                              <span className="text-[#10B981]">Adding to queue…</span>
                            ) : (
                              <>Added by <span className="text-[#FAFAFA]">{stream.addedByUsername || stream.addedBy?.split('@')[0] || "System"}</span></>
                            )}
                          </p>
                        </div>

                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => handleUpvote(stream.id, hasUpvoted)}
                          disabled={upvotingIds.has(stream.id) || isOptimistic}
                          className={`flex items-center gap-1.5 h-8.5 rounded-full px-4 text-xs font-bold transition-all cursor-pointer disabled:opacity-60 ${hasUpvoted
                              ? "bg-[#10B981] text-white"
                              : "border border-[#27272A] text-[#A1A1AA] hover:text-[#10B981] hover:border-[#10B981]/50 bg-[#090909]/60"
                            }`}
                        >
                          <ThumbsUp className={`h-3.5 w-3.5 ${hasUpvoted ? "fill-current" : ""}`} />
                          <span>{stream.upvotes}</span>
                        </motion.button>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: Live Activity / Social Chat (Col-span 4) */}
        <div className="lg:col-span-4 shrink-0 flex flex-col gap-6">
          {/* Quick reactions (kept separate from queue upvotes) */}
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-3">Quick reactions</p>
            <RoomReactions
              reactions={room.reactions ?? []}
              onSend={handleReact}
              disabled={!viewer?.isAuthenticated || viewer?.isBanned}
            />
          </div>

          {/* Polls & song/video battles */}
          <RoomActivities
            roomId={roomId}
            poll={room.poll}
            battle={room.battle}
            queue={room.queue}
            isHost={Boolean(viewer?.isHost)}
            canInteract={Boolean(viewer?.isAuthenticated && !viewer?.isBanned)}
            onRefresh={fetchRoomData}
            onError={(message) => showToast("error", message)}
          />

          <div className="bg-[#121212] border border-[#27272A] rounded-2xl flex flex-col overflow-hidden h-[540px]">
            <div className="px-4 py-3.5 border-b border-[#27272A]/60 flex items-center justify-between bg-[#121212]">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#10B981]" /> Room Chat & Logs
              </span>
            </div>

            {/* Combined Chat Log containing message and music event tags */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {combinedLog.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#A1A1AA]/50 text-xs text-center p-4">
                  <MessageSquare className="w-6 h-6 opacity-35 mb-2" />
                  <p>Feed is quiet.</p>
                  <p className="text-[10px] mt-0.5">Start sending messages or queue tracks.</p>
                </div>
              ) : (
                combinedLog.map((log) => {
                  if (log.type === "event") {
                    return (
                      <div
                        key={log.id}
                        className={`text-[10px] border rounded-lg py-1.5 px-3 italic flex items-center gap-1.5 ${log.isHighlight
                            ? "bg-[#F59E0B]/5 border-[#F59E0B]/15 text-[#A1A1AA]"
                            : "bg-[#10B981]/5 border-[#10B981]/15 text-[#A1A1AA]"
                          }`}
                      >
                        <Sparkles className={`w-3 h-3 ${log.isHighlight ? "text-[#F59E0B]" : "text-[#10B981]"}`} />
                        <span>
                          <strong className="text-white not-italic">{log.user}</strong> {log.text}
                          {log.isHighlight && (
                            <span className="ml-1.5 not-italic text-[8px] font-bold text-[#F59E0B] uppercase bg-[#F59E0B]/10 px-1 py-0.2 rounded border border-[#F59E0B]/15">
                              Hot Track
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={log.id} className="text-xs space-y-1">
                      <div className="flex justify-between text-[9px] text-[#A1A1AA]">
                        <span className="font-semibold">{log.user}</span>
                      </div>
                      <div className="bg-[#090909]/60 border border-[#27272A]/50 rounded-lg p-2.5 text-[#FAFAFA] leading-relaxed break-words font-medium">
                        {log.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-[#27272A]/60 bg-[#090909]/20 flex gap-2">
              <input
                placeholder={canChat ? "Say something to the room..." : room.isLocked ? "Chat paused (room locked)" : "Only the host can chat right now"}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sendingMessage || !canChat}
                className="flex-1 h-9 px-3.5 bg-[#090909] border border-[#27272A] rounded-xl text-xs text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#10B981]/50 transition-colors disabled:opacity-60"
                maxLength={500}
              />
              <button
                type="submit"
                disabled={sendingMessage || !newMessage.trim() || !canChat}
                className="bg-[#10B981] hover:bg-[#10B981]/90 text-white h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-60"
              >
                {sendingMessage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* GLOBAL FLOATING PLAYER DOCK */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-4xl bg-[#121212]/95 backdrop-blur-md border border-[#27272A] shadow-2xl rounded-2xl px-6 py-3 flex items-center justify-between gap-6 transition-all">
        {room.currentStream ? (
          <>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-[#27272A]/60 bg-black">
                <img src={currentArtworkUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-white text-xs truncate">{room.currentStream.title}</h4>
                <p className="text-[10px] text-[#A1A1AA] mt-0.5 truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" /> Synchronized
                </p>
              </div>
            </div>

            {/* Waveform / Slider */}
            <div className="hidden md:flex flex-col items-center gap-1.5 flex-[2] max-w-md">
              <div
                className="w-full h-1 bg-[#27272A] rounded-full relative cursor-pointer group"
                onClick={async (e) => {
                  if (!duration) return;
                  if (room.mode === "listen_together" && !isHost) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percent = x / rect.width;
                  const newTime = percent * duration;
                  if (room.mode === "listen_together" && isHost) {
                    await fetch(`/api/rooms/${roomId}/playback`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "seek", position: newTime }),
                    });
                    setProgress(newTime);
                    fetchRoomData();
                  } else {
                    seekCurrentMedia(newTime);
                    setProgress(newTime);
                  }
                }}
              >
                <div
                  className="absolute top-0 left-0 h-full bg-[#10B981] rounded-full"
                  style={{ width: `${(progress / duration) * 100}%` }}
                />
              </div>
              <div className="w-full flex justify-between text-[9px] font-mono text-[#A1A1AA] tracking-widest">
                <span>{Math.floor(progress / 60).toString().padStart(2, '0')}:{Math.floor(progress % 60).toString().padStart(2, '0')}</span>
                <span>{(duration / 60).toFixed(0).padStart(2, '0')}:{(duration % 60).toFixed(0).padStart(2, '0')}</span>
              </div>
            </div>

            {/* Play/Pause controls */}
            <div className="flex items-center gap-3">
              {(room.mode !== "listen_together" || isHost) && (
              <button
                onClick={async () => {
                  if (room.mode === "listen_together" && isHost) {
                    await fetch(`/api/rooms/${roomId}/playback`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: isPlaying ? "pause" : "play" }),
                    });
                    setIsPlaying(!isPlaying);
                    fetchRoomData();
                  } else {
                    if (isPlaying) pauseCurrentMedia();
                    else playCurrentMedia();
                    setIsPlaying(!isPlaying);
                  }
                }}
                className="bg-[#090909] hover:bg-[#18181B] border border-[#27272A] h-8 w-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5 text-[#10B981]" /> : <Play className="h-3.5 w-3.5 ml-0.5 text-[#10B981]" />}
              </button>)}
              {isHost && (
                <button
                  onClick={handlePlayNext}
                  disabled={loadingNext}
                  className="bg-[#10B981] hover:bg-[#10B981]/90 text-white h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                >
                  {loadingNext ? <Loader2 className="h-3.5 h-3.5 animate-spin" /> : <SkipForward className="h-3.5 h-3.5" />}
                </button>
              )}

              <div className="hidden sm:flex items-center gap-2 border-l border-[#27272A]/80 pl-4 ml-2">
                <Volume2 className="h-3.5 w-3.5 text-[#A1A1AA]" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => updateVolume(Number(e.target.value))}
                  className="w-16 h-1 accent-[#10B981] cursor-pointer"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full text-center text-xs text-[#A1A1AA] font-semibold">
            Ready to broadcast
          </div>
        )}
      </div>

      {/* Invite / QR modal (server-generated QR; host can rotate/revoke) */}
      <RoomInvite
        open={showShareModal}
        onOpenChange={setShowShareModal}
        roomId={roomId}
        roomCode={room.code}
        isHost={Boolean(viewer?.isHost)}
      />

      {/* Native media search */}
      <SongSearchDialog
        open={showAddSong}
        onOpenChange={setShowAddSong}
        roomId={roomId}
        queuedTrackIds={room.queue.map((s) => s.extractedId).filter(Boolean)}
        onAdded={handleTrackAdded}
      />

      {/* AI room companion (suggestions require explicit approval) */}
      <AiCompanion
        open={showAi}
        onOpenChange={setShowAi}
        roomId={roomId}
        queuedTrackIds={room.queue.map((s) => s.extractedId).filter(Boolean)}
        onAdded={(track) => handleTrackAdded({ trackId: track.id, track, duplicate: false })}
      />

      {/* Host moderation */}
      <RoomModeration
        open={showModeration}
        onOpenChange={setShowModeration}
        roomId={roomId}
        isHost={Boolean(viewer?.isHost)}
        participants={room.participants ?? []}
        hostUserId={room.host.id}
        isLocked={room.isLocked}
        chatMode={room.chatMode}
        addMode={room.addMode}
        visibility={room.visibility}
        onRefresh={fetchRoomData}
        onError={(message) => showToast("error", message)}
      />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[95] max-w-[92%] sm:max-w-md"
            role="status"
            aria-live="polite"
          >
            <div
              className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 shadow-xl backdrop-blur-md text-xs font-semibold ${
                toast.kind === "success"
                  ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#FAFAFA]"
                  : toast.kind === "error"
                  ? "bg-[#7F1D1D]/20 border-[#EF4444]/30 text-[#FAFAFA]"
                  : "bg-[#121212]/95 border-[#27272A] text-[#FAFAFA]"
              }`}
            >
              {toast.kind === "success" ? (
                <Check className="w-4 h-4 text-[#10B981] shrink-0" />
              ) : toast.kind === "error" ? (
                <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-[#10B981] shrink-0" />
              )}
              <span className="truncate">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
