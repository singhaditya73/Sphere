"use client";

import { useEffect, useState, use, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Loader2, Play, ThumbsUp, Pause, SkipForward, Music, Send,
  QrCode, Copy, Check, Users, MessageSquare, Volume2, ArrowLeft, Disc, Sparkles, Plus, Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Appbar } from "@/components/Appbar";

interface ChatMessage {
  id: string;
  text: string;
  userEmail: string;
  createdAt: string;
}

interface SearchResult {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  length: string;
  url: string;
}

interface Stream {
  id: string;
  type: string;
  extractedId: string;
  url: string;
  title: string;
  smallImg: string;
  bigImg: string;
  upvotes: number;
  addedBy: string;
  createdAt: string;
}

interface Room {
  id: string;
  code: string;
  name: string;
  host: {
    id: string;
    email: string;
  };
  currentStream: Stream | null;
  queue: Stream[];
}

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingStream, setAddingStream] = useState(false);
  const [newStreamUrl, setNewStreamUrl] = useState("");
  const [upvotingIds, setUpvotingIds] = useState<Set<string>>(new Set());
  const [myUpvotedStreamIds, setMyUpvotedStreamIds] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(100);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadingNext, setLoadingNext] = useState(false);
  const playerRef = useRef<any>(null);

  // Chat & social activity log feed
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Share state
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);

  const updateVolume = (newVolume: number) => {
    setVolume(newVolume);
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(newVolume);
    }
  };

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

  useEffect(() => {
    const timer = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const time = playerRef.current.getCurrentTime();
        setProgress(time);
        if (!duration) setDuration(playerRef.current.getDuration());
      }
    }, 500);
    return () => clearInterval(timer);
  }, [duration]);

  const fetchRoomData = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`);
      const data = await response.json();
      if (response.ok) {
        setRoom(data.room);
        localStorage.setItem("sphere_active_room_id", roomId);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyUpvotes = async () => {
    try {
      const response = await fetch(`/api/streams/my-upvotes?roomId=${roomId}`);
      const data = await response.json();
      if (response.ok) {
        setMyUpvotedStreamIds(new Set(data.upvotedStreamIds));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/messages`);
      const data = await response.json();
      if (response.ok) {
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
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (response.ok) {
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => handleSearch(value), 400);
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    setNewStreamUrl(result.url);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
  };

  useEffect(() => {
    if (!session) {
      const currentPath = window.location.pathname;
      router.push(`/login?callbackUrl=${encodeURIComponent(currentPath)}`);
      return;
    }
    fetchRoomData();
    fetchMyUpvotes();
    fetchMessages();

    const interval = setInterval(() => {
      fetchRoomData();
      fetchMyUpvotes();
      fetchMessages();
    }, 2000);
    return () => clearInterval(interval);
  }, [session, roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAddStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreamUrl.trim() || !session?.user?.email) return;

    setAddingStream(true);
    try {
      const userResponse = await fetch(`/api/user`);
      const userData = await userResponse.json();

      if (!userResponse.ok || !userData.user) {
        alert("Failed to get user info");
        return;
      }

      const response = await fetch("/api/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId: userData.user.id,
          url: newStreamUrl,
          roomId: roomId,
        }),
      });

      if (response.ok) {
        setNewStreamUrl("");
        fetchRoomData();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to add track");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setAddingStream(false);
    }
  };

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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#090909] p-6 text-center">
        <h1 className="text-lg font-heading font-black">Room not found</h1>
        <button
          className="mt-4 px-5 py-2 rounded-full bg-[#10B981] text-white text-xs font-semibold cursor-pointer"
          onClick={() => router.push("/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const isHost = session?.user?.email === room.host.email;

  // Synthesize active listening presence array
  const listenerEmails = Array.from(new Set([
    room.host.email,
    ...room.queue.map(s => s.addedBy),
    ...messages.map(m => m.userEmail)
  ])).filter(Boolean);

  // Integrate system events directly in the chat feed
  const combinedLog: Array<
    | { type: "msg"; id: string; user: string; text: string; time: string }
    | { type: "event"; id: string; user: string; text: string; time: string; isHighlight?: boolean }
  > = [
    ...messages.map(m => ({
      type: "msg" as const,
      id: m.id,
      user: m.userEmail?.split('@')[0] || "User",
      text: m.text,
      time: m.createdAt
    })),
    ...room.queue.map(q => {
      // Find out if it has higher votes to trigger amber highlight
      const isHighlight = q.upvotes >= 5;
      return {
        type: "event" as const,
        id: `add-${q.id}`,
        user: q.addedBy?.split('@')[0] || "Someone",
        text: `added track "${q.title.substring(0, 30)}..."`,
        time: q.createdAt,
        isHighlight
      };
    })
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  // Dynamic colors placeholder logic - background artwork blur
  const currentArtworkUrl = room.currentStream?.bigImg || room.currentStream?.smallImg || `https://img.youtube.com/vi/${room.currentStream?.extractedId}/maxresdefault.jpg`;

  return (
    <div className="flex min-h-screen flex-col bg-[#090909] text-[#FAFAFA] font-sans pb-36">
      <Appbar />

      <main className="container flex-1 py-24 px-6 max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-6 relative">

        {/* LEFT & CENTER AREAS (Col-span 8) */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Top Info section & Active Listeners */}
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#10B981] px-2.5 py-0.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/20">
                    Live Broadcast
                  </span>
                  <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                </div>
                <h1 className="text-2xl font-heading font-black tracking-tight text-white">{room.name}</h1>
                <p className="text-xs text-[#A1A1AA] mt-1">
                  Hosted by <span className="text-[#FAFAFA] font-medium">{room.host.email?.split('@')[0] || "Host"}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowShareModal(true)}
                  className="rounded-full px-4 py-1.5 bg-[#090909] border border-[#27272A] hover:bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" /> Invite
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem("sphere_active_room_id");
                    router.push("/dashboard");
                  }}
                  className="rounded-full px-4 py-1.5 bg-[#090909] border border-[#27272A] hover:bg-red-950/20 text-xs font-bold text-red-400 transition-colors cursor-pointer"
                >
                  Leave
                </button>
              </div>
            </div>

            {/* Listener avatars presence row */}
            <div className="flex items-center gap-3 border-t border-[#27272A]/60 pt-4 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1AA] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#10B981]" /> Listening Now ({listenerEmails.length})
              </span>
              <div className="flex -space-x-1.5 overflow-hidden">
                {listenerEmails.map((email) => (
                  <div
                    key={email}
                    className="inline-block h-6.5 w-6.5 rounded-full ring-2 ring-[#121212] bg-[#10B981]/20 flex items-center justify-center text-[10px] font-bold text-[#10B981] uppercase"
                    title={email}
                  >
                    {email.charAt(0)}
                  </div>
                ))}
                {listenerEmails.length > 5 && (
                  <div className="inline-block h-6.5 w-6.5 rounded-full ring-2 ring-[#121212] bg-[#18181B] flex items-center justify-center text-[9px] font-bold text-[#71717A]">
                    +{listenerEmails.length - 5}
                  </div>
                )}
              </div>
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
                <div className="flex-1 min-w-0 flex flex-col justify-between h-56 py-1.5 self-stretch w-full">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#10B981]">
                        Now Playing
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
                      Added by <span className="text-[#FAFAFA] font-medium">{room.currentStream.addedBy?.split('@')[0] || "System"}</span>
                    </p>
                  </div>

                  {/* Playback Progress */}
                  <div className="space-y-1.5">
                    <div
                      className="w-full h-1 bg-[#27272A] rounded-full relative cursor-pointer group"
                      onClick={(e) => {
                        if (!playerRef.current || !duration) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percent = x / rect.width;
                        const newTime = percent * duration;
                        playerRef.current.seekTo(newTime, true);
                        setProgress(newTime);
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
                    <button
                      onClick={() => {
                        if (playerRef.current) {
                          if (isPlaying) playerRef.current.pauseVideo();
                          else playerRef.current.playVideo();
                          setIsPlaying(!isPlaying);
                        }
                      }}
                      className="bg-[#090909] border border-[#27272A] hover:border-[#10B981]/50 text-white h-11 w-11 rounded-full flex items-center justify-center transition-colors cursor-pointer active:scale-95 duration-100"
                    >
                      {isPlaying ? <Pause className="h-4 w-4 text-[#10B981]" /> : <Play className="h-4 w-4 ml-0.5 text-[#10B981]" />}
                    </button>
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
                <p className="text-xs text-[#71717A] mt-1 max-w-xs">Drop a YouTube link below or search for tracks to start the session.</p>
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

          {/* Add Song / Search panel */}
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1AA]">Queue a track</span>
              <button
                onClick={() => { setShowSearch(!showSearch); setSearchResults([]); setSearchQuery(""); }}
                className="text-xs text-[#10B981] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> {showSearch ? "Paste URL" : "Search YouTube"}
              </button>
            </div>

            {showSearch ? (
              <div className="relative">
                <input
                  placeholder="Search tracks on YouTube..."
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  className="w-full bg-[#090909] border border-[#27272A] rounded-xl h-10 px-3.5 text-xs text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#10B981]/50 transition-colors pr-10"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-[#A1A1AA]" />
                )}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 space-y-1 max-h-60 overflow-y-auto rounded-xl border border-[#27272A] bg-[#121212]/95 backdrop-blur-md p-1.5 z-30 shadow-lg">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleSelectSearchResult(result)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#18181B] transition-colors text-left group"
                      >
                        <img src={result.thumbnail} alt="" className="w-12 h-8 rounded object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#FAFAFA] truncate group-hover:text-[#10B981] transition-colors">{result.title}</p>
                          <p className="text-[9px] text-[#A1A1AA] truncate">{result.channelTitle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleAddStream} className="flex gap-2">
                <input
                  placeholder="Paste YouTube track URL..."
                  value={newStreamUrl}
                  onChange={(e) => setNewStreamUrl(e.target.value)}
                  disabled={addingStream}
                  className="flex-1 bg-[#090909] border border-[#27272A] rounded-xl h-10 px-3.5 text-xs text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#10B981]/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={addingStream || !newStreamUrl.trim()}
                  className="bg-[#10B981] hover:bg-[#10B981]/90 text-white h-10 text-xs font-bold rounded-xl px-5 transition-colors cursor-pointer"
                >
                  {addingStream ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : "Add Track"}
                </button>
              </form>
            )}
          </div>

          {/* Queue Section (Styled as premium cards, no spreadsheet) */}
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]/60">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">Upcoming Queue ({room.queue.length})</span>
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
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ type: "spring", stiffness: 450, damping: 28 }}
                        key={stream.id}
                        className="flex items-center gap-4 p-3.5 rounded-2xl border border-[#27272A]/60 bg-[#090909]/40 hover:bg-[#090909]/80 hover:border-[#27272A] transition-all group"
                      >
                        <span className="text-[10px] font-mono text-[#A1A1AA]/50 w-5 text-center font-bold">
                          {(index + 1).toString().padStart(2, '0')}
                        </span>

                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[#27272A]/60 bg-black">
                          <img src={stream.smallImg || `https://img.youtube.com/vi/${stream.extractedId}/default.jpg`} alt="" className="w-full h-full object-cover" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-[#FAFAFA] text-sm truncate group-hover:text-[#10B981] transition-colors">
                            {stream.title}
                          </h4>
                          <p className="text-[10px] text-[#A1A1AA] mt-0.5">
                            Added by <span className="text-[#FAFAFA]">{stream.addedBy?.split('@')[0] || "System"}</span>
                          </p>
                        </div>

                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => handleUpvote(stream.id, hasUpvoted)}
                          disabled={upvotingIds.has(stream.id)}
                          className={`flex items-center gap-1.5 h-8.5 rounded-full px-4 text-xs font-bold transition-all cursor-pointer ${hasUpvoted
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
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl flex flex-col overflow-hidden h-[540px]">
            <div className="px-4 py-3.5 border-b border-[#27272A]/60 flex items-center justify-between bg-[#121212]">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#10B981]" /> Room Chat & Logs
              </span>
            </div>

            {/* Combined Chat Log containing message and music event tags */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
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
                placeholder="Say something to the room..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sendingMessage}
                className="flex-1 h-9 px-3.5 bg-[#090909] border border-[#27272A] rounded-xl text-xs text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#10B981]/50 transition-colors"
                maxLength={500}
              />
              <button
                type="submit"
                disabled={sendingMessage || !newMessage.trim()}
                className="bg-[#10B981] hover:bg-[#10B981]/90 text-white h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors cursor-pointer"
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
                onClick={(e) => {
                  if (!playerRef.current || !duration) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percent = x / rect.width;
                  const newTime = percent * duration;
                  playerRef.current.seekTo(newTime, true);
                  setProgress(newTime);
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
              <button
                onClick={() => {
                  if (playerRef.current) {
                    if (isPlaying) playerRef.current.pauseVideo();
                    else playerRef.current.playVideo();
                    setIsPlaying(!isPlaying);
                  }
                }}
                className="bg-[#090909] hover:bg-[#18181B] border border-[#27272A] h-8 w-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5 text-[#10B981]" /> : <Play className="h-3.5 w-3.5 ml-0.5 text-[#10B981]" />}
              </button>
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

      {/* QR Invite Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] border border-[#27272A] p-6 rounded-2xl max-w-sm w-full text-center space-y-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h3 className="font-heading font-black text-lg text-white">Invite Listeners</h3>
                <p className="text-[#A1A1AA] text-xs mt-0.5">Let them join the session</p>
              </div>

              <div className="bg-[#090909] rounded-xl p-3 border border-[#27272A]">
                <p className="text-[9px] text-[#A1A1AA] font-mono mb-0.5 uppercase tracking-wider">Room Code</p>
                <p className="text-xl font-mono font-black text-[#10B981] tracking-widest">{room.code}</p>
              </div>

              <div className="bg-white rounded-xl p-3 inline-block mx-auto border border-[#27272A]">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&color=0-0-0&bgcolor=255-255-255&format=svg`}
                  alt="QR Code"
                  className="w-36 h-36"
                />
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#090909] hover:bg-[#18181B] text-white transition-colors border border-[#27272A] cursor-pointer"
              >
                {linkCopied ? (
                  <><Check className="w-3.5 h-3.5 text-[#10B981]" /> <span className="text-xs font-semibold">Copied!</span></>
                ) : (
                  <><Copy className="w-3.5 h-3.5 text-[#A1A1AA]" /> <span className="text-xs font-semibold">Copy Room URL</span></>
                )}
              </button>

              <button
                onClick={() => setShowShareModal(false)}
                className="text-xs text-[#A1A1AA] hover:text-white transition-colors block mx-auto cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
