"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Appbar } from "@/components/Appbar";
import { Loader2, Plus, Disc, Radio, Users, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

        {/* Channels List */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
              Active Queues ({rooms.length})
            </h2>
          </div>
          
          {rooms.length === 0 ? (
            <div className="border border-dashed border-[#27272A] rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-[#121212]/30">
              <Radio className="mb-4 h-8 w-8 text-[#A1A1AA]/40" />
              <p className="text-sm text-[#A1A1AA] font-bold">No active sessions</p>
              <p className="text-xs text-[#71717A] mt-1">Create a room above to start broadcasting</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => router.push(`/room/${room.id}`)}
                  className="premium-card p-5 cursor-pointer flex flex-col justify-between h-40 group"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
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
                    <span className="text-xs font-semibold text-[#A1A1AA] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#10B981]" />
                      {room.streamCount} {room.streamCount === 1 ? 'track' : 'tracks'} queued
                    </span>
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
      </main>
    </div>
  );
}
