"use client";

import { useEffect, useState, use, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Loader2, Play, ThumbsUp, Pause, SkipForward, Music, Send, Search, X, QrCode, Copy, Check, MessageCircle } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
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

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // QR / Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const updateVolume = (newVolume: number) => {
    setVolume(newVolume);
    if (playerRef.current && playerRef.current.setVolume) {
        playerRef.current.setVolume(newVolume);
    }
  };

  const updatePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (playerRef.current && playerRef.current.setPlaybackRate) {
        playerRef.current.setPlaybackRate(rate);
    }
  };

  const [isApiReady, setIsApiReady] = useState(false);

  useEffect(() => {
    // Load YouTube IFrame API
    if (!(window as any).YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        
        (window as any).onYouTubeIframeAPIReady = () => {
             console.log("YouTube API Ready");
             setIsApiReady(true);
        };
    } else {
        setIsApiReady(true);
    }
  }, []);

  useEffect(() => {
    if (isApiReady && room?.currentStream?.type === 'Youtube' && room.currentStream.extractedId) {
        // Double check if player instance already exists for this video
        if (playerRef.current) {
            // if we are already playing this video, do nothing, otherwise load new video
            // But for now, safe to destroy and recreate or use loadVideoById
             if(playerRef.current.getVideoData && playerRef.current.getVideoData().video_id === room.currentStream.extractedId) {
                 return;
             }
             playerRef.current.destroy();
        }

        playerRef.current = new (window as any).YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            videoId: room.currentStream.extractedId,
            playerVars: {
                'autoplay': 1,
                'controls': 1,
                'modestbranding': 1,
                'enablejsapi': 1,
                'rel': 0,
                'origin': window.location.origin
            },
            events: {
                'onReady': (event: any) => {
                    console.log("Player Ready");
                    event.target.playVideo();
                    event.target.setVolume(volume);
                    event.target.setPlaybackRate(playbackRate);
                    setIsPlaying(true);
                    setDuration(event.target.getDuration());
                },
                'onStateChange': (event: any) => {
                        if(event.data === (window as any).YT.PlayerState.PLAYING) setIsPlaying(true);
                        if(event.data === (window as any).YT.PlayerState.PAUSED) setIsPlaying(false);
                        if(event.data === (window as any).YT.PlayerState.ENDED) handlePlayNext();
                }
            }
        });
    }
  }, [isApiReady, room?.currentStream?.extractedId]);

  // Progress Poller
  useEffect(() => {
     const timer = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
            const time = playerRef.current.getCurrentTime();
            // Allow manual seek override locally by checking difference? 
            // For now simple sync
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
      }
    } catch (error) {
      console.error("Error fetching room:", error);
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
      console.error("Error fetching upvotes:", error);
    }
  };

  // Chat functions
  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/messages`);
      const data = await response.json();
      if (response.ok) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
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
      console.error("Error sending message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Search functions
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
      console.error("Search error:", error);
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
    // Poll for updates every 2 seconds for near real-time feel
    const interval = setInterval(() => {
      fetchRoomData();
      fetchMyUpvotes();
      fetchMessages();
    }, 2000);
    return () => clearInterval(interval);
  }, [session, roomId]);

  // Auto-scroll chat when new messages arrive
  useEffect(() => {
    if (showChat) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showChat]);

  const handleAddStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreamUrl.trim() || !session?.user?.email) return;

    setAddingStream(true);
    try {
      // Get user ID
      const userResponse = await fetch(`/api/user`);
      const userData = await userResponse.json();
      
      if (!userResponse.ok || !userData.user) {
        alert("Failed to get user information");
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
        alert(error.message || "Failed to add stream");
      }
    } catch (error) {
      console.error("Error adding stream:", error);
      alert("Failed to add stream");
    } finally {
      setAddingStream(false);
    }
  };

  const handleUpvote = async (streamId: string, hasUpvoted: boolean) => {
    setUpvotingIds((prev) => new Set(prev).add(streamId));
    
    // Optimistic UI update — instantly reflect the vote change
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
      console.error("Error voting:", error);
      // Revert optimistic update on error
      fetchRoomData();
      fetchMyUpvotes();
    } finally {
      setUpvotingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(streamId);
        return newSet;
      });
    }
  };

  const handlePlayNext = async () => {
    if (loadingNext) return; // Prevent double-clicks
    try {
      setLoadingNext(true);
      setIsPlaying(false);
      
      // Destroy current player before loading next
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      
      const response = await fetch(`/api/rooms/${roomId}/next`, {
        method: "POST",
      });

      if (response.ok) {
        setProgress(0);
        setDuration(0);
        await fetchRoomData();
      }
    } catch (error) {
      console.error("Error playing next:", error);
    } finally {
      setLoadingNext(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Room not found</h1>
        <Button className="mt-4 btn-neon" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isHost = session?.user?.email === room.host.email;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Appbar />
 
      <main className="container flex-1 py-32 px-6 relative max-w-7xl mx-auto">
        {/* Room Header */}
        <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-8 border-b border-border/50">
          <div className="space-y-4">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-sm font-medium text-primary">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                Live Session
             </div>
             <h1 className="text-4xl md:text-6xl font-heading font-black tracking-tight">{room.name}</h1>
             <div className="flex items-center gap-4 flex-wrap">
                 <p className="text-sm text-muted-foreground">
                   Hosted by <span className="text-foreground font-medium">{room.host.email.split('@')[0]}</span>
                 </p>
                 {room.code && (
                   <>
                     <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-mono">{room.code}</span>
                     <button 
                       onClick={() => {
                           navigator.clipboard.writeText(room.code);
                           setCopied(true);
                           setTimeout(() => setCopied(false), 2000);
                       }}
                       className="px-3 py-1 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground text-xs transition-colors"
                     >
                       {copied ? "Copied!" : "Copy Code"}
                     </button>
                   </>
                 )}
                 <button 
                   onClick={() => setShowShareModal(true)}
                   className="px-3 py-1 rounded-full bg-secondary/20 hover:bg-secondary/30 text-secondary text-xs transition-colors flex items-center gap-1"
                 >
                   <QrCode className="w-3 h-3" /> Share
                 </button>
             </div>
          </div>
          <Button onClick={() => router.push("/dashboard")} variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-full px-6">
            Leave Session
          </Button>
        </div>
 
        {/* PLAYER */}
        <div className="mb-12 relative z-10">
           {/* Modern Glass Player Container */}
           <div className="glass-card p-1 shadow-2xl overflow-hidden">
             <div className="bg-card/50 p-6 md:p-8 rounded-2xl relative overflow-hidden">
               {/* Glass overlay */}
               <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none"></div>
               
               <div className="flex items-center justify-between mb-6 px-2">
                  <span className="font-heading text-xl text-muted-foreground font-bold">sphere <span className="text-primary">player</span></span>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                     <span className="px-2 py-1 rounded bg-muted/50">HQ Audio</span>
                     <span className="px-2 py-1 rounded bg-primary/20 text-primary">Live</span>
                  </div>
               </div>
            
            {room.currentStream ? (
              <div className="flex flex-col gap-8 relative z-0">
                 {/* Video Player Window */}
                <motion.div 
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: "circOut" }}
                    className="relative mx-auto w-full max-w-3xl aspect-video bg-black rounded-xl border border-border/50 shadow-2xl shadow-primary/10 overflow-hidden group"
                >
                    {/* YouTube Player — Visible */}
                    {room.currentStream.type === "Youtube" && (
                      <div id="youtube-player" className="absolute inset-0 w-full h-full z-10" />
                    )}
                    
                    {/* Spotify Embed — Visible */}
                    {room.currentStream.type === "Spotify" && (
                      <iframe
                        src={`https://open.spotify.com/embed/${
                          room.currentStream.url.includes("playlist")
                            ? "playlist"
                            : room.currentStream.url.includes("album")
                            ? "album"
                            : "track"
                        }/${room.currentStream.extractedId}?theme=0`}
                        className="absolute inset-0 w-full h-full z-10"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      />
                    )}

                    {/* Fallback thumbnail while player loads */}
                    <div className="absolute inset-0 z-0 flex items-center justify-center bg-card">
                       <img
                          src={room.currentStream.bigImg || room.currentStream.smallImg || `https://img.youtube.com/vi/${room.currentStream.extractedId}/maxresdefault.jpg`}
                          alt="Album Art"
                          className="w-full h-full object-cover opacity-40 blur-sm"
                       />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <Music className="w-16 h-16 text-muted-foreground/30" />
                       </div>
                    </div>
                    
                    {/* Loading next track overlay */}
                    {loadingNext && (
                      <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-10 h-10 text-primary animate-spin" />
                          <span className="text-sm font-mono text-primary">Loading next track...</span>
                        </div>
                      </div>
                    )}
                </motion.div>
                
                {/* Tape Counter / Progress Bar */}
                 <div className="w-full max-w-3xl mx-auto px-1">
                    <div 
                        className="h-8 bg-black/10 dark:bg-zinc-900 border-2 border-border rounded relative group cursor-pointer overflow-hidden"
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
                        {/* Digital Numbers Background */}
                        <div className="absolute inset-0 flex items-center justify-between px-2 font-mono text-[10px] text-muted-foreground pointer-events-none select-none">
                            <span>00:00</span>
                            <span>{(duration / 60).toFixed(0).padStart(2, '0')}:{(duration % 60).toFixed(0).padStart(2, '0')}</span>
                        </div>
                        
                        {/* Progress Fill */}
                        <div 
                            className="absolute top-0 left-0 h-full bg-primary/20 border-r-2 border-primary transition-all duration-100 ease-linear"
                            style={{ width: `${(progress / duration) * 100}%` }}
                        ></div>
                        
                        {/* Counter Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="font-mono font-bold text-primary tracking-[0.2em] text-sm">
                                {Math.floor(progress / 60).toString().padStart(2, '0')}:{Math.floor(progress % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1 uppercase">
                        <span>Tape Counter</span>
                        <span>Memory Stop</span>
                    </div>
                </div>
                
                <div className="flex flex-col md:flex-row items-end justify-between gap-6 px-4">
                  <div className="flex-1 min-w-0">
                    <div className="bg-primary/10 border border-primary/20 text-primary px-3 py-1 inline-block text-xs font-mono mb-2 animate-pulse">
                       PLAYING: {room.currentStream.type.toUpperCase()}
                    </div>
                    <h3 className="text-2xl md:text-4xl font-heading font-black text-foreground uppercase leading-none truncate">{room.currentStream.title}</h3>
                    <div className="flex items-center gap-4 mt-2 font-mono text-muted-foreground text-xs">
                       <span>▲ {room.currentStream.upvotes} VOTES</span>
                       <span>// {room.currentStream.extractedId}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                      <Button 
                          onClick={() => {
                              if (playerRef.current) {
                                  if (isPlaying) playerRef.current.pauseVideo();
                                  else playerRef.current.playVideo();
                                  setIsPlaying(!isPlaying);
                              }
                          }}
                          className="bg-muted hover:bg-muted/80 text-foreground h-14 w-14 rounded-full flex items-center justify-center border border-border"
                      >
                          {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
                      </Button>
                      {isHost && (
                        <Button onClick={handlePlayNext} disabled={loadingNext} className="btn-neon h-14 w-14 rounded-full flex items-center justify-center">
                            {loadingNext ? <Loader2 className="h-5 w-5 animate-spin" /> : <SkipForward className="h-5 w-5" />}
                        </Button>
                      )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground glass-card">
                <Loader2 className="mb-4 h-16 w-16 opacity-20" />
                <p className="text-xl font-medium">No Track Playing</p>
                {isHost && room.queue.length > 0 && (
                  <Button onClick={handlePlayNext} className="mt-6 btn-neon px-8">
                    Play Next Track
                  </Button>
                )}
              </div>
            )}
            </div>
           </div>
        </div>
 
        <div className="grid lg:grid-cols-3 gap-8 relative z-10">
            {/* Add Stream + Search */}
            <div className="lg:col-span-1 space-y-6">
              <div className="glass-card p-6 sticky top-24">
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                         <Play className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                         <h3 className="font-heading font-bold text-lg">Add Track</h3>
                         <p className="text-xs text-muted-foreground">Search or paste URL</p>
                      </div>
                   </div>
                   <button
                     onClick={() => { setShowSearch(!showSearch); setSearchResults([]); setSearchQuery(""); }}
                     className={`p-2 rounded-full transition-colors ${showSearch ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'}`}
                   >
                     <Search className="w-4 h-4" />
                   </button>
                </div>

                {/* YouTube Search */}
                {showSearch && (
                  <div className="mb-4">
                    <div className="relative">
                      <Input
                        placeholder="Search YouTube..."
                        value={searchQuery}
                        onChange={(e) => handleSearchInput(e.target.value)}
                        className="bg-muted/50 border-border rounded-xl h-12 pr-10"
                      />
                      {searching && (
                        <Loader2 className="absolute right-3 top-3.5 w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {searchResults.length > 0 && (
                      <div className="mt-2 space-y-1 max-h-80 overflow-y-auto rounded-xl border border-border bg-card/90 backdrop-blur-md p-1">
                        {searchResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => handleSelectSearchResult(result)}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/80 transition-colors text-left group"
                          >
                            <img src={result.thumbnail} alt="" className="w-16 h-10 rounded object-cover flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{result.title}</p>
                              <p className="text-[10px] text-muted-foreground">{result.channelTitle} {result.length && `• ${result.length}`}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* URL Input */}
                <form onSubmit={handleAddStream} className="flex flex-col gap-3">
                  <Input
                      placeholder="Paste YouTube URL..."
                      value={newStreamUrl}
                      onChange={(e) => setNewStreamUrl(e.target.value)}
                      disabled={addingStream}
                      className="bg-muted/50 border-border rounded-xl h-12"
                  />
                  <Button type="submit" disabled={addingStream || !newStreamUrl.trim()} className="btn-neon w-full h-12 font-bold">
                    {addingStream ? <Loader2 className="animate-spin" /> : "Add to Queue"}
                  </Button>
                </form>
                
                <div className="mt-6 pt-4 border-t border-border/50">
                   <h4 className="text-sm font-medium mb-3 text-muted-foreground">Volume</h4>
                   <div className="flex items-center gap-4">
                      <input
                         type="range"
                         min="0"
                         max="100"
                         value={volume}
                         onChange={(e) => updateVolume(Number(e.target.value))}
                         className="flex-1 accent-primary"
                         title="Local Volume"
                      />
                      <span className="text-sm font-mono text-primary w-10">{volume}%</span>
                   </div>
                </div>
              </div>
            </div>
     
            {/* Queue */}
            <div className="lg:col-span-2">
               <div className="glass-card p-6 min-h-[500px]">
                 <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                          <span className="text-secondary font-bold">{room.queue.length}</span>
                       </div>
                       <div>
                          <h2 className="font-heading font-bold text-xl">Queue</h2>
                          <p className="text-xs text-muted-foreground">Up next in {room.name}</p>
                       </div>
                    </div>
                 </div>
                 
                 <div className="space-y-3">
                 <AnimatePresence mode="popLayout">
                 {room.queue.length === 0 ? (
                    <div className="py-16 text-muted-foreground flex flex-col items-center glass rounded-xl">
                        <p className="text-sm">No tracks in queue</p>
                        <p className="text-xs mt-1">Add a YouTube URL to get started</p>
                    </div>
                 ) : (
                     room.queue.map((stream, index) => {
                     const hasUpvoted = myUpvotedStreamIds.has(stream.id);
                     return (
                     <motion.div
                         layout
                         initial={{ opacity: 0, x: -20 }}
                         animate={{ opacity: 1, x: 0 }}
                         exit={{ opacity: 0, x: 20 }}
                         transition={{ type: "spring", stiffness: 500, damping: 30 }}
                         key={stream.id}
                         className="flex items-center gap-4 p-4 group glass rounded-xl hover:border-primary/30 transition-all"
                     >
                         <span className="font-mono text-primary/60 text-sm w-6 font-bold">{(index + 1).toString().padStart(2, '0')}</span>
                         {stream.smallImg && (
                            <div className="w-12 h-12 rounded-lg overflow-hidden">
                               <img src={stream.smallImg} alt={stream.title} className="w-full h-full object-cover" />
                            </div>
                         )}
                         
                         <div className="flex-1 min-w-0">
                             <h4 className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">{stream.title}</h4>
                             <p className="text-xs text-muted-foreground">
                                 Added by {stream.addedBy.split('@')[0]}
                             </p>
                         </div>
                         <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpvote(stream.id, hasUpvoted)}
                            disabled={upvotingIds.has(stream.id)}
                            className={`gap-2 h-10 rounded-full transition-all duration-200 ${
                              hasUpvoted 
                                ? "bg-blue-500 text-white hover:bg-blue-600 scale-105" 
                                : "border border-border text-muted-foreground hover:text-blue-500 hover:border-blue-500"
                            }`}
                         >
                            <ThumbsUp className={`h-4 w-4 transition-transform ${hasUpvoted ? "fill-current scale-110" : ""}`} />
                            <span className="font-bold">{stream.upvotes}</span>
                         </Button>
                     </motion.div>
                     )}))}
                 </AnimatePresence>
                 </div>
               </div>
            </div>
        </div>

        {/* Chat Toggle Button */}
        <button
          onClick={() => setShowChat(!showChat)}
          className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 ${
            showChat ? 'bg-destructive text-destructive-foreground' : 'btn-neon'
          }`}
        >
          {showChat ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </button>

        {/* Chat Panel */}
        <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-24 right-6 z-50 w-80 md:w-96 glass-card shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: '60vh' }}
          >
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-card/80">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span className="font-heading font-bold text-sm">Room Chat</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">{messages.length} msgs</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] max-h-[40vh]">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <MessageCircle className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-xs">No messages yet. Say hi! 👋</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.userEmail === session?.user?.email;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] text-muted-foreground mb-0.5 px-1">
                        {isMe ? 'You' : msg.userEmail.split('@')[0]}
                      </span>
                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm break-words ${
                        isMe
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-2 border-t border-border/50 flex gap-2 bg-card/80">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sendingMessage}
                className="flex-1 h-10 bg-muted/50 border-border rounded-full text-sm"
                maxLength={500}
              />
              <Button
                type="submit"
                disabled={sendingMessage || !newMessage.trim()}
                className="btn-neon h-10 w-10 rounded-full p-0 flex items-center justify-center"
              >
                {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </motion.div>
        )}
        </AnimatePresence>

        {/* QR Code Share Modal */}
        <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="glass-card p-8 max-w-sm w-full text-center space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h3 className="font-heading font-black text-2xl mb-1">Share Room</h3>
                <p className="text-muted-foreground text-sm">Invite friends to join this session</p>
              </div>

              {/* Room Code */}
              <div className="bg-muted/50 rounded-xl p-4 border border-border">
                <p className="text-[10px] text-muted-foreground font-mono mb-1 uppercase">Room Code</p>
                <p className="text-3xl font-mono font-black text-primary tracking-widest">{room.code}</p>
              </div>

              {/* QR Code */}
              <div className="bg-white rounded-xl p-4 inline-block mx-auto">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&color=0-0-0&bgcolor=255-255-255&format=svg`}
                  alt="Room QR Code"
                  className="w-48 h-48"
                />
              </div>

              {/* Copy Link Button */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-muted/50 hover:bg-muted text-foreground transition-colors border border-border"
              >
                {linkCopied ? (
                  <><Check className="w-4 h-4 text-primary" /> <span className="text-sm font-medium">Link Copied!</span></>
                ) : (
                  <><Copy className="w-4 h-4" /> <span className="text-sm font-medium">Copy Room Link</span></>
                )}
              </button>

              <button
                onClick={() => setShowShareModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>
      </main>
    </div>
  );
}
