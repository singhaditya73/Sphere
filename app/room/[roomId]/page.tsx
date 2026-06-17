"use client";

import { useEffect, useState, use, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Loader2, Play, ThumbsUp, Pause, SkipForward } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Appbar } from "@/components/Appbar";
import { AudioVisualizer } from "@/components/audio-visualizer";

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
                   onClick={() => {
                       navigator.clipboard.writeText(window.location.href);
                       setCopied(true);
                       setTimeout(() => setCopied(false), 2000);
                   }}
                   className="px-3 py-1 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground text-xs transition-colors"
                 >
                   Share Link
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

                    {/* Visualizer (Behind Thumbnail) */}
                    <div className="absolute inset-0 z-[5]">
                       <AudioVisualizer isPlaying={isPlaying} className="opacity-60" />
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
                       <div className={`w-24 h-24 border-8 border-border bg-card rounded-full flex items-center justify-center shadow-2xl ${isPlaying ? "animate-[spin_4s_linear_infinite]" : ""}`} style={{ animationDuration: `${4 / playbackRate}s` }}>
                          <div className="w-20 h-20 border-2 border-muted-foreground/30 border-dashed rounded-full bg-muted">
                             <div className="w-full h-full flex items-center justify-center">
                               <div className="w-2 h-2 bg-white rounded-full"></div>
                               <div className="absolute w-full h-1 bg-zinc-800 rotate-45"></div>
                               <div className="absolute w-full h-1 bg-zinc-800 -rotate-45"></div>
                             </div>
                          </div>
                       </div>
                       <div className={`w-24 h-24 border-8 border-border bg-card rounded-full flex items-center justify-center shadow-2xl ${isPlaying ? "animate-[spin_4s_linear_infinite]" : ""}`} style={{ animationDuration: `${4 / playbackRate}s` }}>
                          <div className="w-20 h-20 border-2 border-muted-foreground/30 border-dashed rounded-full bg-muted">
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
                        <Button onClick={handlePlayNext} className="btn-neon h-14 w-14 rounded-full flex items-center justify-center">
                            <SkipForward className="h-5 w-5" />
                        </Button>
                    </div>
                  )}
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
            {/* Add Stream */}
            <div className="lg:col-span-1">
              <div className="glass-card p-6 sticky top-24">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Play className="w-5 h-5 text-primary" />
                   </div>
                   <div>
                      <h3 className="font-heading font-bold text-lg">Add Track</h3>
                      <p className="text-xs text-muted-foreground">YouTube URL</p>
                   </div>
                </div>
                <form onSubmit={handleAddStream} className="flex flex-col gap-4">
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
                
                <div className="mt-8 pt-6 border-t border-border/50">
                   <h4 className="text-sm font-medium mb-4 text-muted-foreground">Volume Control</h4>
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
                            className={`gap-2 h-10 rounded-full ${hasUpvoted ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-primary hover:border-primary"}`}
                         >
                            <ThumbsUp className={`h-4 w-4 ${hasUpvoted ? "fill-current" : ""}`} />
                            <span className="font-bold">{stream.upvotes}</span>
                         </Button>
                     </motion.div>
                     )}))}
                 </AnimatePresence>
                 </div>
               </div>
            </div>
        </div>
      </main>
    </div>
  );
}

