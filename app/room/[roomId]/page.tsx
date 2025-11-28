"use client";

import { useEffect, useState } from "react";
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

export default function RoomPage({ params }: { params: { roomId: string } }) {
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
      const response = await fetch(`/api/rooms/${params.roomId}`);
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
      const response = await fetch(`/api/streams/my-upvotes?roomId=${params.roomId}`);
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
  }, [session, params.roomId]);

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
          roomId: params.roomId,
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
      const response = await fetch(`/api/rooms/${params.roomId}/next`, {
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
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center space-x-4">
          <Appbar />
        </div>
      </header>

      <main className="container flex-1 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{room.name}</h1>
            <p className="text-muted-foreground">
              Host: {room.host.email} {isHost && <Badge className="ml-2">You</Badge>}
            </p>
          </div>
          <Button onClick={() => router.push("/dashboard")} variant="outline">
            Leave Room
          </Button>
        </div>

        {/* Currently Playing */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Now Playing
            </CardTitle>
          </CardHeader>
          <CardContent>
            {room.currentStream ? (
              <div className="flex items-center gap-4">
                {room.currentStream.smallImg && (
                  <img
                    src={room.currentStream.smallImg}
                    alt={room.currentStream.title}
                    className="h-24 w-24 rounded object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{room.currentStream.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {room.currentStream.type} • {room.currentStream.upvotes} upvotes
                  </p>
                  <a
                    href={room.currentStream.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-blue-500 hover:underline"
                  >
                    Open in {room.currentStream.type}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {isHost && (
                  <Button onClick={handlePlayNext} size="lg">
                    <SkipForward className="mr-2 h-4 w-4" />
                    Next Track
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Music className="mb-2 h-12 w-12" />
                <p>No track currently playing</p>
                {isHost && room.queue.length > 0 && (
                  <Button onClick={handlePlayNext} className="mt-4">
                    Start Playing
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Stream */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add to Queue
            </CardTitle>
            <CardDescription>
              Paste a YouTube or Spotify link to add a song to the queue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddStream} className="flex gap-2">
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={newStreamUrl}
                onChange={(e) => setNewStreamUrl(e.target.value)}
                disabled={addingStream}
              />
              <Button type="submit" disabled={addingStream || !newStreamUrl.trim()}>
                {addingStream ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Song"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Queue */}
        <Card>
          <CardHeader>
            <CardTitle>Queue ({room.queue.length})</CardTitle>
            <CardDescription>
              Upvote songs to move them up in the queue
            </CardDescription>
          </CardHeader>
          <CardContent>
            {room.queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Music className="mb-2 h-12 w-12" />
                <p>Queue is empty. Add some songs!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {room.queue.map((stream, index) => {
                  const hasUpvoted = myUpvotedStreamIds.has(stream.id);
                  return (
                  <div
                    key={stream.id}
                    className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      {index + 1}
                    </div>
                    {stream.smallImg && (
                      <img
                        src={stream.smallImg}
                        alt={stream.title}
                        className="h-16 w-16 rounded object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold">{stream.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Added by {stream.addedBy} • {stream.type}
                      </p>
                    </div>
                    <Button
                      variant={hasUpvoted ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleUpvote(stream.id, hasUpvoted)}
                      disabled={upvotingIds.has(stream.id)}
                      className="gap-2"
                    >
                      {upvotingIds.has(stream.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ThumbsUp className="h-4 w-4" />
                      )}
                      {stream.upvotes}
                    </Button>
                  </div>
                )})}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
