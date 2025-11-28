"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Appbar } from "@/components/Appbar";
import { Music, Users, Loader2, Plus, ArrowRight } from "lucide-react";
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
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoomName }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/room/${data.room.id}`);
      } else {
        const error = await response.json();
        alert(error.message || "Failed to create room");
      }
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Failed to create room");
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
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center space-x-4">
          <Appbar />
        </div>
      </header>

      <main className="container flex-1 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">Music Rooms</h1>
          <p className="text-muted-foreground">
            Join a room to listen and vote on music with others
          </p>
        </div>

        {/* Create Room Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create a New Room
            </CardTitle>
            <CardDescription>
              Host your own music session and invite others to join
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showCreateForm ? (
              <Button onClick={() => setShowCreateForm(true)} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Create Room
              </Button>
            ) : (
              <form onSubmit={handleCreateRoom} className="flex gap-2">
                <Input
                  placeholder="Enter room name..."
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  disabled={creatingRoom}
                  autoFocus
                />
                <Button type="submit" disabled={creatingRoom || !newRoomName.trim()}>
                  {creatingRoom ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewRoomName("");
                  }}
                  disabled={creatingRoom}
                >
                  Cancel
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Active Rooms */}
        <div>
          <h2 className="mb-4 text-2xl font-semibold">Active Rooms</h2>
          {rooms.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Music className="mb-4 h-16 w-16 text-muted-foreground" />
                <p className="mb-2 text-lg font-medium">No active rooms</p>
                <p className="text-sm text-muted-foreground">
                  Create a room to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <Card
                  key={room.id}
                  className="transition-all hover:shadow-lg hover:scale-105 cursor-pointer"
                  onClick={() => handleJoinRoom(room.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="truncate">{room.name}</span>
                      {room.hostEmail === session?.user?.email && (
                        <Badge variant="secondary">Host</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="truncate">
                      by {room.hostEmail}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Music className="h-4 w-4" />
                        <span>{room.streamCount} songs in queue</span>
                      </div>
                      <Button size="sm" variant="ghost">
                        Join
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
