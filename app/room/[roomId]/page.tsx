"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, ThumbsUp, Play, SkipForward, Loader2, Plus, ExternalLink } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [addingStream, setAddingStream] = useState(false);
  const [newStreamUrl, setNewStreamUrl] = useState("");
  const [upvotingIds, setUpvotingIds] = useState<Set<string>>(new Set());
  const [myUpvotedStreamIds, setMyUpvotedStreamIds] = useState<Set<string>>(new Set());

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
      router.push("/login");
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
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary selection:text-black">
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="container flex h-16 items-center space-x-4">
          <Appbar />
        </div>
      </header>
 
      <main className="container flex-1 py-24 relative perspective-1000">
         <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 pointer-events-none"></div>
        <div className="mb-8 flex items-end justify-between relative z-10 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
                 <div className="w-2 h-2 bg-primary animate-pulse"></div>
                 <span className="font-mono text-xs text-primary uppercase tracking-widest">Live Frequency</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-heading font-black text-white uppercase tracking-tighter leading-none glow-text">{room.name}</h1>
            <p className="text-muted-foreground font-mono mt-2">
              <span className="text-white">HOST:</span> {room.host.email} {isHost && <Badge variant="outline" className="ml-2 border-primary text-primary rounded-none uppercase text-[10px]">YOU</Badge>}
            </p>
          </div>
          <Button onClick={() => router.push("/dashboard")} variant="outline" className="glass hover:bg-red-500/20 hover:border-red-500 hover:text-red-500 rounded-none border-white/10 font-mono text-xs h-10 px-6 uppercase tracking-widest">
            Term_Session
          </Button>
        </div>
 
        {/* Currently Playing */}
        <div className="mb-12 relative z-10">
           <div className="border border-white/10 bg-black/50 p-1">
             <div className="bg-zinc-900/80 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden group">
               {/* Decorative */}
               <div className="absolute top-0 left-0 w-2 h-2 bg-white"></div>
               <div className="absolute top-0 right-0 w-2 h-2 bg-white"></div>
               <div className="absolute bottom-0 left-0 w-2 h-2 bg-white"></div>
               <div className="absolute bottom-0 right-0 w-2 h-2 bg-white"></div>
               
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
              <div className="p-2 bg-primary text-black font-bold">
               <Play className="h-4 w-4 fill-current" />
              </div>
              <h2 className="text-xl font-bold uppercase tracking-widest">Now_Playing_Sequence</h2>
            </div>
            
            {room.currentStream ? (
              <div className="flex flex-col gap-6">
                 {/* Player Wrapper with Scanline */}
                <div className="relative border border-primary/20 shadow-[0_0_30px_rgba(204,255,0,0.1)] group-hover:border-primary/50 transition-colors">
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[size:100%_4px] pointer-events-none z-20 opacity-20"></div>
                    {room.currentStream.type === "Youtube" ? (
                    <div className="aspect-video w-full bg-black">
                      <iframe
                        src={`https://www.youtube.com/embed/${room.currentStream.extractedId}?autoplay=1`}
                        title="YouTube video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                    ) : room.currentStream.type === "Spotify" ? (
                      <iframe
                        style={{ borderRadius: "0px" }}
                        src={`https://open.spotify.com/embed/${
                          room.currentStream.url.includes("playlist")
                            ? "playlist"
                            : room.currentStream.url.includes("album")
                            ? "album"
                            : "track"
                        }/${room.currentStream.extractedId}`}
                        width="100%"
                        height="152"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="bg-black"
                      />
                    ) : (
                      room.currentStream.smallImg && (
                        <img
                          src={room.currentStream.bigImg || room.currentStream.smallImg}
                          alt={room.currentStream.title}
                          className="aspect-video w-full object-cover"
                        />
                      )
                    )}
                </div>
                
                <div className="flex flex-col md:flex-row items-end justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-3xl md:text-5xl font-heading font-black text-white uppercase leading-none mb-2 truncate">{room.currentStream.title}</h3>
                    <p className="text-primary font-mono text-sm flex items-center gap-4">
                       <span>TYPE: {room.currentStream.type.toUpperCase()}</span>
                       <span>//</span>
                       <span>VOTES: {room.currentStream.upvotes}</span>
                    </p>
                  </div>
                  
                  {isHost && (
                    <Button onClick={handlePlayNext} size="lg" className="h-14 px-8 bg-white text-black hover:bg-primary hover:scale-105 transition-all rounded-none uppercase font-bold tracking-widest border border-transparent hover:border-black">
                      <SkipForward className="mr-2 h-5 w-5" />
                      SKIP_TRACK
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-white/10 border-dashed bg-black/40">
                <Music className="mb-6 h-16 w-16 opacity-20 animate-bounce" />
                <p className="text-xl font-mono uppercase tracking-widest">SIGNAL_LOST</p>
                <p className="text-xs font-mono opacity-50">Upload new audio stream to resume</p>
                {isHost && room.queue.length > 0 && (
                  <Button onClick={handlePlayNext} className="mt-8 bg-primary text-black rounded-none uppercase font-bold">
                    INITIATE_PLAYBACK
                  </Button>
                )}
              </div>
            )}
            </div>
           </div>
        </div>
 
        <div className="grid md:grid-cols-2 gap-8 relative z-10">
            {/* Add Stream */}
            <div className="border border-white/10 bg-black/40 p-1 h-fit">
              <div className="bg-zinc-900/50 p-6">
                <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                   <Plus className="h-4 w-4 text-primary" />
                   <h3 className="font-bold uppercase tracking-widest">Inject_Stream</h3>
                </div>
                <form onSubmit={handleAddStream} className="flex flex-col gap-4">
                  <Input
                    placeholder="PASTE_URL_HERE..."
                    value={newStreamUrl}
                    onChange={(e) => setNewStreamUrl(e.target.value)}
                    disabled={addingStream}
                     className="bg-black border-white/20 h-14 rounded-none font-mono text-white focus:border-primary focus:ring-0"
                  />
                  <Button type="submit" disabled={addingStream || !newStreamUrl.trim()} className="h-14 w-full bg-primary text-black hover:bg-white rounded-none uppercase font-bold tracking-widest hover:translate-x-1 hover:translate-y-1 transition-transform shadow-[4px_4px_0_0_rgba(255,255,255,0.1)] hover:shadow-none">
                    {addingStream ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        PROCESSING...
                      </>
                    ) : (
                      "UPLOAD_DATA"
                    )}
                  </Button>
                </form>
              </div>
            </div>
     
            {/* Queue */}
            <div className="border border-white/10 bg-black/40 p-1">
               <div className="bg-zinc-900/50 p-6 min-h-[400px]">
                <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                   <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                       <h2 className="font-bold uppercase tracking-widest">Queue_Buffer ({room.queue.length})</h2>
                   </div>
                   <p className="text-[10px] font-mono text-muted-foreground uppercase">PRIORITY_SORTED</p>
                </div>
                
                <div className="space-y-2">
                {room.queue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-white/5 border-dashed bg-black/20">
                    <p className="font-mono text-xs uppercase">BUFFER_EMPTY</p>
                  </div>
                ) : (
                    room.queue.map((stream, index) => {
                      const hasUpvoted = myUpvotedStreamIds.has(stream.id);
                      return (
                      <div
                        key={stream.id}
                        className="flex items-center gap-4 border border-white/5 p-3 hover:bg-white/5 hover:border-primary/50 transition-all group bg-black/40"
                      >
                        <div className="flex h-6 w-6 items-center justify-center bg-primary/20 text-primary font-mono font-bold text-xs border border-primary/20">
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        {stream.smallImg && (
                          <img
                            src={stream.smallImg}
                            alt={stream.title}
                            className="h-10 w-10 object-cover grayscale group-hover:grayscale-0 transition-all"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm truncate text-white uppercase">{stream.title}</h4>
                          <p className="text-[10px] font-mono text-muted-foreground flex items-center gap-2 uppercase">
                            <span className="truncate max-w-[100px]">By {stream.addedBy}</span>
                             <span className="text-primary">//</span>
                            <span>{stream.type}</span>
                          </p>
                        </div>
                        <Button
                          variant={hasUpvoted ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleUpvote(stream.id, hasUpvoted)}
                          disabled={upvotingIds.has(stream.id)}
                          className={`gap-2 min-w-[60px] h-8 rounded-none border ${hasUpvoted ? "bg-primary text-black border-primary hover:bg-white" : "bg-transparent border-white/10 hover:border-primary hover:text-primary"}`}
                        >
                          {upvotingIds.has(stream.id) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ThumbsUp className={`h-3 w-3 ${hasUpvoted ? "fill-current" : ""}`} />
                          )}
                          <span className="font-mono text-xs">{stream.upvotes}</span>
                        </Button>
                      </div>
                    )})
                  )}
                </div>
               </div>
            </div>
        </div>
      </main>
    </div>
  );
}
