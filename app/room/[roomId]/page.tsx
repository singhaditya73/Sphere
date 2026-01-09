"use client";

import { useEffect, useState, use, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, ThumbsUp, ThumbsDown, Trash2, ArrowRight, Pause, SkipForward } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Appbar } from "@/components/Appbar";

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
  const playerRef = useRef<any>(null);

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
                'controls': 0,
                'modestbranding': 1,
                'enablejsapi': 1,
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

  useEffect(() => {
    if (!session) {
      const currentPath = window.location.pathname;
      router.push(`/login?callbackUrl=${encodeURIComponent(currentPath)}`);
      return;
    }
    fetchRoomData();
    fetchMyUpvotes();
    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      fetchRoomData();
      fetchMyUpvotes();
    }, 5000);
    return () => clearInterval(interval);
  }, [session, roomId]);

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
    } finally {
      setUpvotingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(streamId);
        return newSet;
      });
    }
  };

  const handlePlayNext = async () => {
    try {
      // Optimistic UI update
      setIsPlaying(false);
      const response = await fetch(`/api/rooms/${roomId}/next`, {
        method: "POST",
      });

      if (response.ok) {
        fetchRoomData();
      }
    } catch (error) {
      console.error("Error playing next:", error);
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
        <Button className="mt-4" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isHost = session?.user?.email === room.host.email;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-black">
      <header className="fixed top-0 z-50 w-full border-b-4 border-border bg-background/90 backdrop-blur-md">
        <div className="container flex h-20 items-center space-x-4">
          <Appbar />
        </div>
      </header>
 
      <main className="container flex-1 py-32 relative">
        <div className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6 border-b-2 border-border pb-8">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground mb-4 tracking-widest uppercase">
                 <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                 STEREO • DOLBY NR
            </div>
            <h1 className="text-4xl md:text-6xl font-heading font-black text-foreground uppercase tracking-tighter leading-none">{room.name}</h1>
            <div className="flex items-center gap-4 mt-2">
                <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
                // TAPE_HOST: {room.host.email.split('@')[0]}
                </p>
                <button 
                  onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                  }}
                  className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 px-3 py-1 rounded-sm font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2"
                >
                  {copied ? "LINK COPIED!" : "SHARE FREQUENCY"}
                </button>
            </div>
          </div>
          <Button onClick={() => router.push("/dashboard")} className="mechanical-btn bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 px-6 font-bold text-xs">
            <span className="mr-2">■</span> EJECT
          </Button>
        </div>
 
        {/* PLAYER DECK */}
        <div className="mb-12 relative z-10">
           {/* Deck Chassis */}
           <div className="bg-card rounded-lg p-1 shadow-2xl relative border border-border group overflow-hidden">
             {/* Chassis Texture */}
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 pointer-events-none mix-blend-multiply dark:mix-blend-normal dark:invert -z-0"></div>
             <div className="absolute top-2 left-2 flex gap-1"><div className="screw-head bg-border"></div></div>
             <div className="absolute top-2 right-2 flex gap-1"><div className="screw-head bg-border"></div></div>
             <div className="absolute bottom-2 left-2 flex gap-1"><div className="screw-head bg-border"></div></div>
             <div className="absolute bottom-2 right-2 flex gap-1"><div className="screw-head bg-border"></div></div>

             <div className="bg-background p-6 md:p-8 rounded border-4 border-muted relative overflow-hidden">
               {/* Glass Window Overlay */}
               <div className="absolute inset-x-12 inset-y-8 bg-white/5 border border-white/10 rounded pointer-events-none z-10"></div>
               
               <div className="flex items-center justify-between mb-8 px-4 opacity-50">
                  <span className="font-heading text-2xl text-muted-foreground font-black italic">BeatNet <span className="text-muted-foreground/50">AUTO-REVERSE</span></span>
                  <div className="flex gap-4 font-mono text-xs text-muted-foreground">
                     <span>METAL</span>
                     <span>CrO2</span>
                     <span className="text-primary font-bold">NORMAL</span>
                  </div>
               </div>
            
            {room.currentStream ? (
              <div className="flex flex-col gap-8 relative z-0">
                 {/* Tape Window / Visualizer */}
                  {/* Tape Window / Visualizer */}
                <motion.div 
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: "circOut" }}
                    className="relative mx-auto w-full max-w-3xl aspect-video bg-black rounded border-8 border-zinc-800 shadow-[inset_0_0_20px_rgba(0,0,0,1)] overflow-hidden group transition-transform duration-100 ease-in-out"
                >
                    {/* The Media (Hidden Player / Thumbnail) */}
                    <div className="absolute inset-0 z-0">
                      {room.currentStream.type === "Youtube" && (
                         <div id="youtube-player" className="w-full h-full opacity-0 pointer-events-none" />
                      )}
                      {room.currentStream.type === "Spotify" && (
                         <iframe
                           src={`https://open.spotify.com/embed/${
                             room.currentStream.url.includes("playlist")
                               ? "playlist"
                               : room.currentStream.url.includes("album")
                               ? "album"
                               : "track"
                           }/${room.currentStream.extractedId}`}
                           className="w-full h-full opacity-0 pointer-events-none"
                           allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                         />
                      )}
                    </div>
                    
                    {/* Static Thumbnail Overlay (Visible) */}
                    <div className="absolute inset-0 z-10 pointer-events-none">
                       <img
                          src={room.currentStream.bigImg || room.currentStream.smallImg || `https://img.youtube.com/vi/${room.currentStream.extractedId}/maxresdefault.jpg`}
                          alt="Album Art"
                          className="w-full h-full object-cover opacity-80 brightness-75"
                       />
                    </div>
                    
                    {/* Tape Reels Animation Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center gap-24 pointer-events-none z-20 opacity-80">
                       <div className={`w-24 h-24 border-8 border-zinc-800 bg-black rounded-full flex items-center justify-center shadow-2xl ${isPlaying ? "animate-[spin_4s_linear_infinite]" : ""}`} style={{ animationDuration: `${4 / playbackRate}s` }}>
                          <div className="w-20 h-20 border-2 border-zinc-700 border-dashed rounded-full bg-zinc-900">
                             <div className="w-full h-full flex items-center justify-center">
                               <div className="w-2 h-2 bg-white rounded-full"></div>
                               <div className="absolute w-full h-1 bg-zinc-800 rotate-45"></div>
                               <div className="absolute w-full h-1 bg-zinc-800 -rotate-45"></div>
                             </div>
                          </div>
                       </div>
                       <div className={`w-24 h-24 border-8 border-zinc-800 bg-black rounded-full flex items-center justify-center shadow-2xl ${isPlaying ? "animate-[spin_4s_linear_infinite]" : ""}`} style={{ animationDuration: `${4 / playbackRate}s` }}>
                          <div className="w-20 h-20 border-2 border-zinc-700 border-dashed rounded-full bg-zinc-900">
                             <div className="w-full h-full flex items-center justify-center">
                               <div className="w-2 h-2 bg-white rounded-full"></div>
                               <div className="absolute w-full h-1 bg-zinc-800 rotate-45"></div>
                               <div className="absolute w-full h-1 bg-zinc-800 -rotate-45"></div>
                             </div>
                          </div>
                       </div>
                    </div>
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
                  
                  {isHost && (
                    <div className="flex gap-4">
                        <Button 
                            onClick={() => {
                                if (playerRef.current) {
                                    if (isPlaying) playerRef.current.pauseVideo();
                                    else playerRef.current.playVideo();
                                    setIsPlaying(!isPlaying);
                                }
                            }}
                            className="mechanical-btn bg-background text-foreground hover:bg-muted h-16 w-16 rounded-full flex items-center justify-center border-b-4 border-border"
                        >
                            {isPlaying ? <Pause className="h-6 w-6 ml-1 fill-current" /> : <Play className="h-6 w-6 ml-1 fill-current" />}
                        </Button>
                        <Button onClick={handlePlayNext} className="mechanical-btn bg-foreground text-background hover:bg-foreground/90 h-16 w-16 rounded-full flex items-center justify-center border-b-4 border-black/50">
                            <SkipForward className="h-6 w-6 ml-1" />
                        </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-4 border-border border-dashed bg-card/20 rounded-xl">
                <Loader2 className="mb-4 h-16 w-16 opacity-20" />
                <p className="text-xl font-mono uppercase tracking-widest">DECK EMPTY</p>
                {isHost && room.queue.length > 0 && (
                  <Button onClick={handlePlayNext} className="mt-6 mechanical-btn primary px-8 py-4">
                    ▶ PLAY TAPE
                  </Button>
                )}
              </div>
            )}
            </div>
           </div>
        </div>
 
        <div className="grid lg:grid-cols-3 gap-12 relative z-10">
            {/* Add Stream (Side Panel) */}
            <div className="lg:col-span-1">
              <div className="bg-card border-2 border-border p-6 rounded relative">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-border rounded"></div>
                <div className="flex items-center gap-2 mb-6 border-b-2 border-border pb-4">
                   <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                   <h3 className="font-bold uppercase text-muted-foreground tracking-widest text-sm">Input Source</h3>
                </div>
                <form onSubmit={handleAddStream} className="flex flex-col gap-4">
                  <div className="bg-background dark:bg-black p-4 rounded border-2 border-border shadow-inner">
                    <Input
                        placeholder="// URL INPUT..."
                        value={newStreamUrl}
                        onChange={(e) => setNewStreamUrl(e.target.value)}
                        disabled={addingStream}
                        className="bg-transparent border-0 text-primary font-mono text-sm h-8 placeholder:text-muted-foreground focus-visible:ring-0 p-0"
                    />
                  </div>
                  <Button type="submit" disabled={addingStream || !newStreamUrl.trim()} className="mechanical-btn primary w-full h-12 font-bold text-lg">
                    {addingStream ? <Loader2 className="animate-spin" /> : "RECORD"}
                  </Button>
                </form>
                
                <div className="mt-8 pt-6 border-t-2 border-border">
                   <div className="grid grid-cols-2 gap-4">
                      {/* Local Volume Knob */}
                      <div className="text-center group">
                         <div className="relative w-16 h-16 mx-auto mb-2">
                             {/* Visual Knob */}
                             <div 
                                className="w-full h-full rounded-full bg-secondary border-2 border-border shadow-[0_4px_0_rgba(0,0,0,0.1)] flex items-center justify-center transition-transform duration-75"
                                style={{ transform: `rotate(${(volume / 100 * 270) - 135}deg)` }}
                             >
                                 <div className="w-1.5 h-4 bg-primary absolute top-1 rounded-full shadow-[0_0_5px_#ccff00]"></div>
                                 <div className="w-12 h-12 rounded-full border border-border/50"></div>
                             </div>
                             {/* Interaction */}
                             <input
                                type="range"
                                min="0"
                                max="100"
                                value={volume}
                                onChange={(e) => updateVolume(Number(e.target.value))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                title="Local Volume (Only affects your audio)"
                             />
                         </div>
                         <span className="font-mono text-[10px] uppercase text-muted-foreground group-hover:text-primary transition-colors">Vol (Local)</span>
                      </div>

                      {/* Static Bass Knob (Decorative) */}
                      <div className="text-center group opacity-50 cursor-not-allowed">
                         <div className="relative w-16 h-16 mx-auto mb-2">
                             {/* Visual Knob */}
                             <div 
                                className="w-full h-full rounded-full bg-secondary border-2 border-border shadow-[0_4px_0_rgba(0,0,0,0.1)] flex items-center justify-center transform rotate-0"
                             >
                                 <div className="w-1.5 h-4 bg-muted-foreground absolute top-1 rounded-full"></div>
                                 <div className="w-12 h-12 rounded-full border border-border/50"></div>
                             </div>
                         </div>
                         <span className="font-mono text-[10px] uppercase text-muted-foreground">Bass (Fixed)</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>
     
            {/* Queue (Playlist) */}
            <div className="lg:col-span-2">
               <div className="bg-muted border-2 border-border p-1 min-h-[500px] relative rounded">
                 
                 <div className="absolute -left-1 -top-1 w-4 h-4 rounded-full border-2 border-border bg-black z-20"></div>
                 <div className="absolute -right-1 -top-1 w-4 h-4 rounded-full border-2 border-border bg-black z-20"></div>
                 <div className="absolute -left-1 -bottom-1 w-4 h-4 rounded-full border-2 border-border bg-black z-20"></div>
                 <div className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full border-2 border-border bg-black z-20"></div>

                 <div className="bg-card p-8 h-full relative overflow-hidden backdrop-blur-sm shadow-inner">
                    {/* Back of Case Texture */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-10 pointer-events-none mix-blend-multiply dark:mix-blend-normal dark:invert z-0"></div>
                    
                    {/* Dark Texture */}
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8 border-b-2 border-border pb-4">
                        <h2 className="text-2xl font-mono font-bold text-foreground uppercase tracking-widest flex items-center gap-3">
                             <div className="w-2 h-2 bg-primary"></div>
                            Track_List
                        </h2>
                        <span className="font-mono text-xs text-muted-foreground uppercase"># {room.name}</span>
                        </div>
                        
                        <div className="space-y-2">
                        <AnimatePresence mode="popLayout">
                        {room.queue.length === 0 ? (
                        <div className="py-12 text-muted-foreground flex flex-col items-center border border-border border-dashed rounded bg-background/50">
                            <p className="font-mono text-xs uppercase tracking-widest">No tracks queued</p>
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
                                className="flex items-center gap-4 py-3 px-4 group bg-accent/20 border border-border hover:border-primary/50 hover:bg-accent transition-all"
                            >
                                <span className="font-mono text-primary/50 text-sm w-6">{(index + 1).toString().padStart(2, '0')}</span>
                                {stream.smallImg && (
                                   <div className="w-8 h-8 rounded-sm overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity">
                                      <img src={stream.smallImg} className="w-full h-full object-cover" />
                                   </div>
                                )}
                                
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-foreground font-mono text-sm truncate uppercase group-hover:text-primary transition-colors">{stream.title}</h4>
                                    <p className="text-[10px] font-mono text-muted-foreground uppercase">
                                        REQ: {stream.addedBy.split('@')[0]}
                                    </p>
                                </div>
                                <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpvote(stream.id, hasUpvoted)}
                                disabled={upvotingIds.has(stream.id)}
                                className={`gap-2 h-8 rounded-none border ${hasUpvoted ? "bg-primary text-black border-primary" : "border-border text-muted-foreground hover:text-primary hover:border-primary bg-transparent"}`}
                                >
                                <ThumbsUp className={`h-3 w-3 ${hasUpvoted ? "fill-current" : ""}`} />
                                <span className="font-mono text-xs font-bold">{stream.upvotes}</span>
                                </Button>

                            </motion.div>
                            )}) )}
                        </AnimatePresence>

                        </div>
                    </div>
                </div>
               </div>
            </div>
        </div>
      </main>
    </div>
  );
}
