"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Appbar } from "@/components/Appbar";
import { UsernameModal } from "@/components/UsernameModal";
import { Loader2, Plus, Disc, Radio, Users, ChevronRight, Trash2, LogOut, Headphones, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Room {
  id: string;
  name: string;
  mode: "dj" | "listen_together";
  hostEmail: string;
  streamCount: number;
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [joinedRooms, setJoinedRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [roomMode, setRoomMode] = useState<"dj" | "listen_together">("dj");
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchRooms();
      const joinedStr = localStorage.getItem("sphere_joined_rooms") || "[]";
      try {
        setJoinedRooms(JSON.parse(joinedStr));
      } catch (err) {
        console.error(err);
      }
      const interval = setInterval(fetchRooms, 10000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const fetchRooms = async () => {
    try {
      const response = await fetch("/api/rooms");
      const data = await response.json();
      if (response.ok) {
        setRooms(data.rooms || []);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this room? This action cannot be undone.")) return;
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchRooms();
      } else {
        const data = await response.json();
        alert(data.message || "Failed to delete room");
      }
    } catch (err) {
      console.error("Error deleting room:", err);
    }
  };

  const handleLeaveRoom = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to leave this room?")) return;
    const joinedStr = localStorage.getItem("sphere_joined_rooms") || "[]";
    try {
      let joinedList = JSON.parse(joinedStr);
      if (!Array.isArray(joinedList)) joinedList = [];
      joinedList = joinedList.filter((r: any) => r.id !== roomId);
      localStorage.setItem("sphere_joined_rooms", JSON.stringify(joinedList));
      setJoinedRooms(joinedList);
    } catch (err) {
      console.error(err);
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
        body: JSON.stringify({ name: newRoomName, mode: roomMode }),
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        alert("Server returned invalid response.");
        return;
      }

      if (response.ok) {
        setNewRoomName("");
        setRoomMode("dj");
        setShowCreateForm(false);
        router.push(`/room/${data.room.id}`);
      } else {
        alert(data.message || data.error || "Failed to create room.");
      }
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Failed to create room.");
    } finally {
      setCreatingRoom(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090909]">
        <Loader2 className="h-5 w-5 animate-spin text-[#10B981]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#090909] text-[#FAFAFA] font-sans pb-24">
      <Appbar />
      <UsernameModal />

      <main className="container max-w-5xl mx-auto flex-1 py-28 px-6">
        {/* Header Section */}
        <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-6 border-b border-[#27272A]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#10B981]">Overview</span>
            <h1 className="text-2xl md:text-3xl font-heading font-black tracking-tight mt-1">
              My Channels
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#A1A1AA] bg-[#121212] px-3.5 py-1.5 rounded-full border border-[#27272A]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync Active
          </div>
        </div>

        {/* Create Room form */}
        <div className="mb-10">
          <AnimatePresence mode="wait">
            {!showCreateForm ? (
              <motion.div
                key="trigger"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="rounded-full bg-[#10B981] hover:bg-[#10B981]/90 text-white transition-all h-10 px-6 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer active:scale-97"
                >
                  <Plus className="h-4 w-4" />
                  Create Listening Room
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-md bg-[#121212] border border-[#27272A] rounded-2xl p-5"
              >
                <form onSubmit={handleCreateRoom} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">
                      Room Title
                    </label>
                    <input
                      placeholder="e.g. Afternoon Lo-Fi Beats..."
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      disabled={creatingRoom}
                      autoFocus
                      className="w-full bg-[#090909] border border-[#27272A] text-white text-xs h-10 px-3.5 rounded-xl placeholder:text-[#71717A] focus:outline-none focus:border-[#10B981]/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">
                      Room Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRoomMode("dj")}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          roomMode === "dj"
                            ? "border-[#10B981]/50 bg-[#10B981]/5"
                            : "border-[#27272A] bg-[#090909] hover:bg-[#18181B]"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Headphones className={`w-3.5 h-3.5 ${roomMode === "dj" ? "text-[#10B981]" : "text-[#A1A1AA]"}`} />
                          <span className={`text-xs font-bold ${roomMode === "dj" ? "text-[#10B981]" : "text-[#FAFAFA]"}`}>DJ Mode</span>
                        </div>
                        <p className="text-[9px] text-[#71717A] leading-relaxed">Play at your party. Guests vote on the queue.</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomMode("listen_together")}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          roomMode === "listen_together"
                            ? "border-[#10B981]/50 bg-[#10B981]/5"
                            : "border-[#27272A] bg-[#090909] hover:bg-[#18181B]"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Globe className={`w-3.5 h-3.5 ${roomMode === "listen_together" ? "text-[#10B981]" : "text-[#A1A1AA]"}`} />
                          <span className={`text-xs font-bold ${roomMode === "listen_together" ? "text-[#10B981]" : "text-[#FAFAFA]"}`}>Listen Together</span>
                        </div>
                        <p className="text-[9px] text-[#71717A] leading-relaxed">Listen in sync with friends remotely.</p>
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={creatingRoom || !newRoomName.trim()}
                      className="bg-[#10B981] hover:bg-[#10B981]/90 text-white h-9 text-xs font-bold px-4 rounded-xl flex-1 transition-colors cursor-pointer"
                    >
                      {creatingRoom ? <Loader2 className="animate-spin h-3.5 w-3.5 mx-auto" /> : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewRoomName("");
                        setRoomMode("dj");
                      }}
                      className="border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181B] h-9 text-xs font-bold px-4 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Channels List Section */}
        <div>
          {(() => {
            const createdRooms = rooms.filter((r) => r.hostEmail === session?.user?.email);
            const activeJoinedRooms = joinedRooms.filter((jr) =>
              rooms.some((ar) => ar.id === jr.id && ar.hostEmail !== session?.user?.email)
            );
            const activeJoinedRoomsMapped = activeJoinedRooms.map((jr) => {
              const matchingActiveRoom = rooms.find((ar) => ar.id === jr.id);
              return {
                ...jr,
                streamCount: matchingActiveRoom ? matchingActiveRoom.streamCount : 0,
              };
            });

            return (
              <div className="space-y-12">
                
                {/* Section 1: Created Rooms */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#10B981]">
                      My Created Rooms ({createdRooms.length})
                    </h2>
                  </div>

                  {createdRooms.length === 0 ? (
                    <div className="border border-dashed border-[#27272A] rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-[#121212]/30">
                      <Disc className="mb-4 h-8 w-8 text-[#A1A1AA]/40" />
                      <p className="text-sm text-[#A1A1AA] font-bold">No rooms created</p>
                      <p className="text-xs text-[#71717A] mt-1">Create a room above to start hosting</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {createdRooms.map((room) => (
                        <div
                          key={room.id}
                          onClick={() => router.push(`/room/${room.id}`)}
                          className="premium-card p-5 cursor-pointer flex flex-col justify-between h-40 group"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-heading font-black text-base text-[#FAFAFA] truncate group-hover:text-[#10B981] transition-colors">
                                {room.name}
                              </h3>
                              <p className="text-xs text-[#A1A1AA] truncate mt-1">
                                Room Code: <span className="font-mono text-white font-bold">{room.id.substring(0, 8).toUpperCase()}</span>
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center shrink-0">
                                <Disc className="w-4 h-4 text-[#10B981] spin-slow group-hover:scale-110 transition-transform" />
                              </div>
                              <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                                room.mode === "listen_together"
                                  ? "text-[#818CF8] bg-[#818CF8]/10 border-[#818CF8]/20"
                                  : "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20"
                              }`}>
                                {room.mode === "listen_together" ? "Sync" : "DJ"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-[#27272A] mt-auto">
                            <button
                              onClick={(e) => handleDeleteRoom(room.id, e)}
                              className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-950/10 border border-red-500/10 hover:border-red-500/20 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                            <div className="text-[#A1A1AA] group-hover:text-[#10B981] transition-colors flex items-center gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Manage</span>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 2: Joined Rooms */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                      Rooms Joined ({activeJoinedRoomsMapped.length})
                    </h2>
                  </div>

                  {activeJoinedRoomsMapped.length === 0 ? (
                    <div className="border border-dashed border-[#27272A] rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-[#121212]/30">
                      <Radio className="mb-4 h-8 w-8 text-[#A1A1AA]/40" />
                      <p className="text-sm text-[#A1A1AA] font-bold">No joined rooms</p>
                      <p className="text-xs text-[#71717A] mt-1">Enter a room code or browse rooms on the homepage to join</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeJoinedRoomsMapped.map((room) => (
                        <div
                          key={room.id}
                          onClick={() => router.push(`/room/${room.id}`)}
                          className="premium-card p-5 cursor-pointer flex flex-col justify-between h-40 group"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-heading font-black text-base text-[#FAFAFA] truncate group-hover:text-[#10B981] transition-colors">
                                {room.name}
                              </h3>
                              <p className="text-xs text-[#A1A1AA] truncate mt-1">
                                Hosted by {room.hostEmail?.split('@')[0] || "Host"}
                              </p>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center shrink-0">
                              <Disc className="w-4 h-4 text-[#10B981] spin-slow group-hover:scale-110 transition-transform" />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-[#27272A] mt-auto">
                            <button
                              onClick={(e) => handleLeaveRoom(room.id, e)}
                              className="text-xs font-bold text-[#A1A1AA] hover:text-white flex items-center gap-1 bg-[#18181B] border border-[#27272A] px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                            >
                              <LogOut className="w-3 h-3" /> Leave
                            </button>
                            <div className="text-[#A1A1AA] group-hover:text-[#10B981] transition-colors flex items-center gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Listen</span>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            );
          })()}
        </div>
      </main>
    </div>
  );
}
