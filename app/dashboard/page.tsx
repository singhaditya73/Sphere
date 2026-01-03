"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Appbar } from "@/components/Appbar";
import { Music, Loader2, Plus, ArrowRight, Disc } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Room {
  id: string;
  name: string;
  hostEmail: string;
  streamCount: number;
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchRooms();
      // Poll for room updates every 10 seconds
      const interval = setInterval(fetchRooms, 10000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const fetchRooms = async () => {
    try {
      const response = await fetch("/api/rooms");
      const data = await response.json();
      if (response.ok) {
        setRooms(data.rooms);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    setCreatingRoom(true);
    try {
      console.log("=== CREATING ROOM ===");
      console.log("Room name:", newRoomName);
      
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoomName }),
      });

      console.log("Response status:", response.status);
      console.log("Response OK:", response.ok);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));
      
      // Get raw text first
      const text = await response.text();
      console.log("Raw response text:", text);
      
      // Try to parse JSON
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        alert("Server returned invalid JSON: " + text);
        return;
      }
      
      console.log("Parsed response data:", data);

      if (response.ok) {
        console.log("Room created successfully, redirecting...");
        setNewRoomName("");
        setShowCreateForm(false);
        router.push(`/room/${data.room.id}`);
      } else {
        console.error("Create room failed:", data);
        alert(data.message || data.error || "Failed to create room. Status: " + response.status);
      }
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Failed to create room: " + String(error));
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    router.push(`/room/${roomId}`);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary selection:text-black">
      <header className="fixed top-0 z-50 w-full border-b-4 border-border bg-background/90 backdrop-blur-md">
        <div className="container flex h-20 items-center space-x-4">
          <Appbar />
        </div>
      </header>

      <main className="container flex-1 py-32 relative">
        <div className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6 border-b-2 border-border pb-8 relative overflow-hidden p-8 bg-card border-l-4">
          {/* Header Texture */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 pointer-events-none mix-blend-multiply dark:mix-blend-normal dark:invert"></div>
          
          <div className="relative z-10">
             <div className="inline-block bg-primary text-primary-foreground font-bold font-mono px-2 py-1 mb-2 transform -rotate-1 shadow-sm">
                G-7200 SYSTEM
             </div>
             <h1 className="text-5xl md:text-7xl font-heading font-black text-foreground uppercase tracking-tighter leading-none">
                Tape <span className="text-primary">Deck</span>
             </h1>
          </div>
          <div className="relative z-10 flex items-center gap-2 font-mono text-xs text-muted-foreground bg-background/50 px-3 py-1 rounded-full border border-border/50">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             SYSTEM ONLINE
          </div>
        </div>

        {/* Create New Room Button/Card */}
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2 mb-24">
            <Card className="p-8 border-4 border-primary bg-secondary/30 relative overflow-hidden group hover:border-primary/80 transition-theme shadow-[8px_8px_0_0_#93a079] hover:shadow-[4px_4px_0_0_#93a079] hover:translate-x-1 hover:translate-y-1">
                {/* Master Tape Texture */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-10 pointer-events-none mix-blend-multiply dark:mix-blend-normal dark:invert"></div>
                
                <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-3xl font-heading font-black text-foreground uppercase tracking-tight">Master Tape</h2>
                            <Disc className="w-8 h-8 text-primary animate-spin-slow" />
                         </div>
                        <p className="font-mono text-muted-foreground">Initialize a new broadcast frequency.</p>
                    </div>
                
                {!showCreateForm ? (
                  <Button onClick={() => setShowCreateForm(true)} className="mechanical-btn primary h-14 px-8 text-lg">
                    <Plus className="mr-2 h-5 w-5" />
                    Insert Tape
                  </Button>
                ) : (
                  <form onSubmit={handleCreateRoom} className="flex flex-col sm:flex-row gap-4 w-full max-w-lg z-10">
                    <div className="flex-1 bg-white p-1 rounded-sm transform rotate-1 shadow-md border border-zinc-200 dark:border-0">
                        <Input
                          placeholder="WRITE LABEL HERE..."
                          value={newRoomName}
                          onChange={(e) => setNewRoomName(e.target.value)}
                          disabled={creatingRoom}
                          autoFocus
                          className="bg-transparent border-0 text-black font-handwriting text-2xl h-12 placeholder:text-zinc-400 focus-visible:ring-0"
                          style={{ fontFamily: '"Permanent Marker", cursive, sans-serif' }}
                        />
                    </div>
                    <Button type="submit" disabled={creatingRoom || !newRoomName.trim()} className="mechanical-btn primary h-auto px-6">
                      {creatingRoom ? <Loader2 className="animate-spin" /> : "PRODUCE"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewRoomName("");
                      }}
                       className="mechanical-btn h-auto px-4 bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                    >
                      X
                    </Button>
                  </form>
                )}
                </div>
            </Card>
        </div>

        {/* Active Rooms */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
             <h2 className="font-mono text-sm text-muted-foreground font-bold uppercase tracking-widest border-b border-primary/20 pb-1">Tape Collection // {rooms.length}</h2>
          </div>
          
          {rooms.length === 0 ? (
            <div className="border-4 border-border border-dashed p-12 flex flex-col items-center justify-center text-center bg-card/50 rounded-xl">
              <Music className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground font-mono uppercase">Shelf Empty</p>
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="cassette-shell p-3 cursor-pointer hover:-translate-y-2 transition-transform duration-300 group"
                  onClick={() => handleJoinRoom(room.id)}
                >
                   {/* Cassette Label Area */}
                   <div className="cassette-label h-32 w-full mb-3 relative p-4 flex flex-col justify-between overflow-hidden">
                       <div className="absolute top-2 left-2 w-full h-[1px] bg-black/10"></div>
                       <div className="absolute top-4 left-2 w-full h-[1px] bg-black/10"></div>
                       
                       <div className="relative z-10">
                          <h3 className="font-bold text-xl text-black font-handwriting transform -rotate-1 truncate" style={{ fontFamily: 'sans-serif' }}>{room.name}</h3>
                          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter truncate">Mixtape by {room.hostEmail.split('@')[0]}</p>
                       </div>

                       {/* Tape Window */}
                       <div className="bg-zinc-800 w-3/4 mx-auto h-8 rounded-full flex items-center justify-center gap-4 relative shadow-inner">
                          <div className="w-6 h-6 rounded-full bg-white border-2 border-zinc-400 flex items-center justify-center">
                             <div className="w-1 h-1 bg-black rounded-full"></div>
                          </div>
                          <div className="w-12 h-2 bg-black/50 rounded-full"></div>
                          <div className="w-6 h-6 rounded-full bg-white border-2 border-zinc-400 flex items-center justify-center">
                             <div className="w-1 h-1 bg-black rounded-full"></div>
                          </div>
                       </div>
                   </div>

                   {/* Cassette Bottom (Screws & Info) */}
                   <div className="flex items-center justify-between px-2">
                      <div className="screw-head"></div>
                      <div className="flex flex-col items-center">
                         <span className="text-[8px] text-zinc-400 font-mono uppercase">Type I / Normal</span>
                         <span className="text-xs font-bold text-zinc-300">{room.streamCount} tracks</span>
                      </div>
                      <div className="screw-head"></div>
                   </div>
                   
                   {/* Play Button Overlay */}
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-lg backdrop-blur-sm">
                       <div className="bg-primary text-black px-6 py-2 font-bold font-mono uppercase rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                          ▶ Play
                       </div>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
