"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Appbar } from "@/components/Appbar";
import { Music, Loader2, Plus, ArrowRight } from "lucide-react";
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
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="container flex h-16 items-center space-x-4">
          <Appbar />
        </div>
      </header>

      <main className="container flex-1 py-24 relative perspective-1000">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-10"></div>
        
        <div className="mb-12 relative z-10 flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/10 pb-6">
          <div>
             <h1 className="text-6xl md:text-8xl font-heading font-black text-white uppercase tracking-tighter leading-none mb-2">
                Room <br/> <span className="text-primary">Console</span>
             </h1>
             <p className="text-muted-foreground font-mono text-sm tracking-widest uppercase">
                // Select a frequency to tune in
             </p>
          </div>
          <div className="bg-primary/10 border border-primary/20 px-4 py-2 font-mono text-xs text-primary animate-pulse">
             SYSTEM STATUS: ONLINE
          </div>
        </div>

        {/* Create Room Section */}
        <div className="mb-16 relative z-10">
          <div className="group border border-white/10 bg-black/40 p-1 hover:border-primary/50 transition-colors duration-300">
             <div className="bg-zinc-900/50 p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
                   <Plus className="w-24 h-24 text-primary rotate-12" />
                </div>
                
                <h3 className="text-2xl font-bold uppercase mb-2 relative z-10">Initialize New Frequency</h3>
                <p className="text-muted-foreground font-mono text-sm mb-6 max-w-md relative z-10">Launch a new music room with full creative control.</p>
                
                {!showCreateForm ? (
                  <Button onClick={() => setShowCreateForm(true)} size="lg" className="relative z-10 h-14 px-8 font-bold bg-white text-black hover:bg-primary hover:scale-105 transition-all duration-300 rounded-none uppercase tracking-wide">
                    Create Room
                  </Button>
                ) : (
                  <form onSubmit={handleCreateRoom} className="flex gap-4 relative z-10 max-w-lg">
                    <Input
                      placeholder="ENTER ROOM ID..."
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      disabled={creatingRoom}
                      autoFocus
                      className="bg-black border-white/20 h-14 rounded-none font-mono text-lg focus:border-primary focus:ring-0"
                    />
                    <Button type="submit" disabled={creatingRoom || !newRoomName.trim()} className="h-14 px-8 bg-primary text-black hover:bg-white rounded-none font-bold uppercase">
                      {creatingRoom ? <Loader2 className="animate-spin" /> : "LAUNCH"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewRoomName("");
                      }}
                      className="h-14 px-6 border-white/20 rounded-none hover:bg-red-500/20 hover:text-red-500 hover:border-red-500"
                    >
                      X
                    </Button>
                  </form>
                )}
             </div>
          </div>
        </div>

        {/* Active Rooms */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-3 h-3 bg-primary animate-ping"></div>
             <h2 className="font-mono text-sm text-muted-foreground tracking-widest uppercase">Active Frequencies ({rooms.length})</h2>
          </div>
          
          {rooms.length === 0 ? (
            <div className="border border-white/10 border-dashed p-12 flex flex-col items-center justify-center text-center bg-black/20">
              <Music className="mb-4 h-12 w-12 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground font-mono">NO SIGNAL DETECTED</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="group relative h-48 perspective-1000 cursor-pointer"
                  onClick={() => handleJoinRoom(room.id)}
                >
                   <div className="absolute inset-0 bg-primary/20 transform translate-x-2 translate-y-2 transition-transform group-hover:translate-x-3 group-hover:translate-y-3"></div>
                   <div className="absolute inset-0 bg-zinc-900 border border-white/10 p-6 flex flex-col justify-between transition-transform duration-300 group-hover:-translate-y-1 group-hover:-translate-x-1 group-hover:bg-zinc-800 group-hover:border-primary">
                      <div>
                         <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-xl uppercase truncate pr-4 text-white group-hover:text-primary transition-colors">{room.name}</h3>
                            {room.hostEmail === session?.user?.email && (
                              <Badge variant="outline" className="border-primary text-primary rounded-none text-[10px] tracking-widest uppercase bg-primary/10">HOST</Badge>
                            )}
                         </div>
                         <p className="font-mono text-xs text-muted-foreground truncate uppercase">// {room.hostEmail}</p>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                         <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span>{room.streamCount} TRACKS</span>
                         </div>
                         <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-2 transition-all" />
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
