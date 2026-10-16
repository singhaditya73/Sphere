"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Appbar } from "@/components/Appbar";
import { UsernameModal } from "@/components/UsernameModal";
import {
  Loader2, Plus, Disc, Radio, ChevronRight, Trash2, LogOut, Headphones, Globe,
  Star, Lock, EyeOff, Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Room {
  id: string;
  code: string;
  name: string;
  mode: "dj" | "listen_together";
  visibility: "public" | "unlisted" | "private";
  description?: string | null;
  streamCount: number;
  createdAt: string;
  isOwner: boolean;
  hostName: string;
}

type Visibility = "public" | "unlisted" | "private";

const VISIBILITY_OPTIONS: { id: Visibility; label: string; hint: string; icon: typeof Globe }[] = [
  { id: "public", label: "Public", hint: "Listed on the home page", icon: Globe },
  { id: "unlisted", label: "Unlisted", hint: "Only people with the link", icon: EyeOff },
  { id: "private", label: "Private", hint: "Invitation link required", icon: Lock },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [joinedRooms, setJoinedRooms] = useState<Room[]>([]);
  const [savedRooms, setSavedRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [roomMode, setRoomMode] = useState<"dj" | "listen_together">("dj");
  const [visibility, setVisibility] = useState<Visibility>("unlisted");
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchAll();
      const interval = setInterval(fetchAll, 10000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const fetchAll = async () => {
    try {
      const [mineRes, savedRes] = await Promise.all([
        fetch("/api/rooms?scope=mine", { cache: "no-store" }),
        fetch("/api/rooms?scope=saved", { cache: "no-store" }),
      ]);
      if (mineRes.ok) setMyRooms((await mineRes.json()).rooms || []);
      if (savedRes.ok) setSavedRooms((await savedRes.json()).rooms || []);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }

    // Joined rooms live in localStorage (ids only); resolve their live state.
    let joined: { id: string }[] = [];
    try {
      const parsed = JSON.parse(localStorage.getItem("sphere_joined_rooms") || "[]");
      if (Array.isArray(parsed)) joined = parsed;
    } catch {
      joined = [];
    }
    const ids = joined.map((j) => j.id).filter(Boolean).slice(0, 50);
    if (ids.length > 0) {
      try {
        const res = await fetch(`/api/rooms?scope=joined&ids=${ids.join(",")}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setJoinedRooms((data.rooms || []).filter((r: Room) => !r.isOwner));
        }
      } catch (error) {
        console.error("Error fetching joined rooms:", error);
      }
    } else {
      setJoinedRooms([]);
    }

    setLoading(false);
  };

  const handleDeleteRoom = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this room? This ends the session for everyone and cannot be undone.")) return;
    try {
      const response = await fetch(`/api/rooms/${roomId}`, { method: "DELETE" });
      if (response.ok) {
        fetchAll();
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
    if (!window.confirm("Leave this room? You can rejoin later with the link.")) return;
    try {
      const joinedList = JSON.parse(localStorage.getItem("sphere_joined_rooms") || "[]");
      const next = (Array.isArray(joinedList) ? joinedList : []).filter((r: { id: string }) => r.id !== roomId);
      localStorage.setItem("sphere_joined_rooms", JSON.stringify(next));
      setJoinedRooms((prev) => prev.filter((r) => r.id !== roomId));
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
        body: JSON.stringify({
          name: newRoomName,
          mode: roomMode,
          visibility,
          description: newRoomDescription.trim() || undefined,
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        alert("Server returned an invalid response.");
        return;
      }

      if (response.ok) {
        setNewRoomName("");
        setNewRoomDescription("");
        setRoomMode("dj");
        setVisibility("unlisted");
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

  const renderRoomCard = (
    room: Room,
    opts: { footer: React.ReactNode; subtitle: string; badge?: string }
  ) => (
    <div
      key={room.id}
      onClick={() => router.push(`/room/${room.code || room.id}`)}
      className="premium-card p-5 cursor-pointer flex flex-col justify-between h-44 group"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-heading font-black text-base text-[#FAFAFA] truncate group-hover:text-[#10B981] transition-colors">
            {room.name}
          </h3>
          <p className="text-xs text-[#A1A1AA] truncate mt-1">{opts.subtitle}</p>
          {room.description && (
            <p className="text-[10px] text-[#71717A] truncate mt-1">{room.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center shrink-0">
            <Disc className="w-4 h-4 text-[#10B981] spin-slow group-hover:scale-110 transition-transform" />
          </div>
          <span
            className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
              room.mode === "listen_together"
                ? "text-[#818CF8] bg-[#818CF8]/10 border-[#818CF8]/20"
                : "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20"
            }`}
          >
            {room.mode === "listen_together" ? "Sync" : "DJ"}
          </span>
          {opts.badge && (
            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-[#27272A] text-[#A1A1AA]">
              {opts.badge}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[#27272A] mt-auto">
        {opts.footer}
        <div className="text-[#A1A1AA] group-hover:text-[#10B981] transition-colors flex items-center gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
            Open
          </span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090909]">
        <Loader2 className="h-5 w-5 animate-spin text-[#10B981]" />
      </div>
    );
  }

  const emptyState = (icon: React.ReactNode, title: string, hint: string) => (
    <div className="border border-dashed border-[#27272A] rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-[#121212]/30">
      <div className="mb-4 text-[#A1A1AA]/40">{icon}</div>
      <p className="text-sm text-[#A1A1AA] font-bold">{title}</p>
      <p className="text-xs text-[#71717A] mt-1">{hint}</p>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#090909] text-[#FAFAFA] font-sans pb-24">
      <Appbar />
      <UsernameModal />

      <main className="container max-w-5xl mx-auto flex-1 py-28 px-6">
        <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-6 border-b border-[#27272A]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#10B981]">Overview</span>
            <h1 className="text-2xl md:text-3xl font-heading font-black tracking-tight mt-1">My Rooms</h1>
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
              <motion.div key="trigger" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="rounded-full bg-[#10B981] hover:bg-[#10B981]/90 text-white transition-all h-10 px-6 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer active:scale-97"
                >
                  <Plus className="h-4 w-4" /> Create Room
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
                      Description <span className="text-[#52525B] normal-case">(optional)</span>
                    </label>
                    <input
                      placeholder="What's this room about?"
                      value={newRoomDescription}
                      onChange={(e) => setNewRoomDescription(e.target.value)}
                      maxLength={280}
                      disabled={creatingRoom}
                      className="w-full bg-[#090909] border border-[#27272A] text-white text-xs h-10 px-3.5 rounded-xl placeholder:text-[#71717A] focus:outline-none focus:border-[#10B981]/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">
                      Room Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["dj", "listen_together"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setRoomMode(mode)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            roomMode === mode
                              ? "border-[#10B981]/50 bg-[#10B981]/5"
                              : "border-[#27272A] bg-[#090909] hover:bg-[#18181B]"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {mode === "dj" ? (
                              <Headphones className={`w-3.5 h-3.5 ${roomMode === mode ? "text-[#10B981]" : "text-[#A1A1AA]"}`} />
                            ) : (
                              <Globe className={`w-3.5 h-3.5 ${roomMode === mode ? "text-[#10B981]" : "text-[#A1A1AA]"}`} />
                            )}
                            <span className={`text-xs font-bold ${roomMode === mode ? "text-[#10B981]" : "text-[#FAFAFA]"}`}>
                              {mode === "dj" ? "DJ Mode" : "Listen Together"}
                            </span>
                          </div>
                          <p className="text-[9px] text-[#71717A] leading-relaxed">
                            {mode === "dj" ? "Play at your party. Guests vote." : "Listen in sync remotely."}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">
                      Privacy
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {VISIBILITY_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setVisibility(option.id)}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                              visibility === option.id
                                ? "border-[#10B981]/50 bg-[#10B981]/5"
                                : "border-[#27272A] bg-[#090909] hover:bg-[#18181B]"
                            }`}
                          >
                            <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${visibility === option.id ? "text-[#10B981]" : "text-[#A1A1AA]"}`} />
                            <span className={`block text-[10px] font-bold ${visibility === option.id ? "text-[#10B981]" : "text-[#FAFAFA]"}`}>
                              {option.label}
                            </span>
                            <span className="block text-[8px] text-[#71717A] leading-tight mt-0.5">{option.hint}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={creatingRoom || !newRoomName.trim()}
                      className="bg-[#10B981] hover:bg-[#10B981]/90 text-white h-9 text-xs font-bold px-4 rounded-xl flex-1 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {creatingRoom ? <Loader2 className="animate-spin h-3.5 w-3.5 mx-auto" /> : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewRoomName("");
                        setNewRoomDescription("");
                        setRoomMode("dj");
                        setVisibility("unlisted");
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

        <div className="space-y-12">
          {/* My Created Rooms */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#10B981] mb-6">
              My Created Rooms ({myRooms.length})
            </h2>
            {myRooms.length === 0 ? (
              emptyState(<Disc className="h-8 w-8" />, "No rooms created", "Create a room above to start hosting")
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myRooms.map((room) =>
                  renderRoomCard(room, {
                    subtitle: `Code: ${room.code}`,
                    badge: room.visibility,
                    footer: (
                      <button
                        onClick={(e) => handleDeleteRoom(room.id, e)}
                        className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-950/10 border border-red-500/10 hover:border-red-500/20 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    ),
                  })
                )}
              </div>
            )}
          </div>

          {/* Rooms Joined */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-6">
              Rooms Joined ({joinedRooms.length})
            </h2>
            {joinedRooms.length === 0 ? (
              emptyState(<Radio className="h-8 w-8" />, "No joined rooms", "Enter a code or open a room link to join")
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {joinedRooms.map((room) =>
                  renderRoomCard(room, {
                    subtitle: `Hosted by ${room.hostName}`,
                    footer: (
                      <button
                        onClick={(e) => handleLeaveRoom(room.id, e)}
                        className="text-xs font-bold text-[#A1A1AA] hover:text-white flex items-center gap-1 bg-[#18181B] border border-[#27272A] px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3 h-3" /> Leave
                      </button>
                    ),
                  })
                )}
              </div>
            )}
          </div>

          {/* Saved Rooms */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#F59E0B] mb-6 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5" /> Saved Rooms ({savedRooms.length})
            </h2>
            {savedRooms.length === 0 ? (
              emptyState(<Star className="h-8 w-8" />, "No saved rooms", "Save a room from its header to find it here")
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedRooms.map((room) =>
                  renderRoomCard(room, {
                    subtitle: room.isOwner ? `Code: ${room.code}` : `Hosted by ${room.hostName}`,
                    badge: room.isOwner ? undefined : room.visibility,
                    footer: (
                      <span className="text-[10px] text-[#71717A] flex items-center gap-1">
                        <Users className="w-3 h-3" /> {room.streamCount} in queue
                      </span>
                    ),
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
