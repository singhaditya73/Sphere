"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Circle, ArrowRight, Users, ThumbsUp, Activity, Sparkles, Disc, Radio, Loader2, Music } from "lucide-react"
import { Appbar } from "@components/Appbar"
import { MegaFooter } from "@/components/mega-footer"

interface TopRoom {
  id: string;
  code: string;
  name: string;
  hostEmail: string;
  streamCount: number;
  currentStream?: {
    title: string;
    smallImg: string;
    bigImg: string;
    extractedId: string;
  } | null;
  totalVotes: number;
  topVotedTrack?: string | null;
  listeningCount: number;
  listenerInitials: string[];
  queue: Array<{
    title: string;
    upvotes: number;
    addedBy: string;
  }>;
}

interface ActivityEvent {
  id: string;
  type: "song_added" | "room_created" | "chat_message";
  user: string;
  detail: string;
  roomName: string;
  time: string;
}

export default function Home() {
  const router = useRouter();
  
  // Real active rooms state
  const [topRooms, setTopRooms] = useState<TopRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  
  // Hero section preview state
  const [heroRoom, setHeroRoom] = useState<any | null>(null);
  const [loadingHero, setLoadingHero] = useState(true);
  
  // Live Activity Feed state
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  
  const [roomInput, setRoomInput] = useState("");

  // Load active rooms and determine the hero room
  useEffect(() => {
    async function loadData() {
      try {
        // 1. Fetch top active rooms list
        const roomsResponse = await fetch("/api/rooms/top");
        const roomsData = await roomsResponse.json();
        const rooms: TopRoom[] = roomsData.rooms || [];
        setTopRooms(rooms);
        setLoadingRooms(false);

        // 2. Determine hero preview room
        const activeRoomId = localStorage.getItem("sphere_active_room_id");
        let selectedHero: any = null;

        if (activeRoomId) {
          // User is currently in a room, load its real data
          try {
            const roomRes = await fetch(`/api/rooms/${activeRoomId}`);
            if (roomRes.ok) {
              const roomDetail = await roomRes.json();
              const r = roomDetail.room;
              
              if (r) {
                const listenerEmails = Array.from(new Set([
                  r.host.email,
                  ...r.queue.map((s: any) => s.addedBy)
                ])).filter(Boolean);

                selectedHero = {
                  id: r.id,
                  code: r.code,
                  name: r.name,
                  host: r.host.email?.split('@')[0] || "Host",
                  listeningCount: listenerEmails.length,
                  listenerInitials: listenerEmails.map(email => email.charAt(0).toUpperCase()),
                  currentStream: r.currentStream,
                  queueCount: r.queue.length,
                  queue: r.queue.slice(0, 3).map((q: any) => ({
                    title: q.title,
                    upvotes: q.upvotes,
                    addedBy: q.addedBy?.split('@')[0] || "Someone"
                  })),
                  isUserInRoom: true
                };
              }
            }
          } catch (err) {
            console.error("Error loading user active room details:", err);
          }
        }

        // If no user active room was found, load the room with highest listener count
        if (!selectedHero && rooms.length > 0) {
          const sorted = [...rooms].sort((a, b) => b.listeningCount - a.listeningCount);
          const topRoom = sorted[0];
          selectedHero = {
            id: topRoom.id,
            code: topRoom.code,
            name: topRoom.name,
            host: topRoom.hostEmail?.split('@')[0] || "Host",
            listeningCount: topRoom.listeningCount,
            listenerInitials: topRoom.listenerInitials || [],
            currentStream: topRoom.currentStream,
            queueCount: topRoom.streamCount,
            queue: topRoom.queue || [],
            isUserInRoom: false
          };
        }

        setHeroRoom(selectedHero);
      } catch (error) {
        console.error("Error loading landing page data:", error);
      } finally {
        setLoadingHero(false);
      }
    }

    loadData();
  }, []);

  // Load real activity feed events
  useEffect(() => {
    fetch("/api/activity")
      .then(r => r.json())
      .then(d => {
        setActivities(d.events || []);
        setLoadingActivity(false);
      })
      .catch(() => {
        setLoadingActivity(false);
      });
  }, []);

  function joinRoom() {
    if (!roomInput.trim()) return;
    const id = roomInput.includes("/room/")
      ? roomInput.split("/room/")[1].split("?")[0]
      : roomInput.trim();
    router.push(`/room/${id}`);
  }

  return (
    <div className="min-h-screen bg-[#090909] text-[#FAFAFA] font-sans overflow-x-hidden">
      <Appbar />

      {/* ── HERO SECTION ──────────────────────────────── */}
      <section className="relative pt-36 pb-20 px-6 overflow-hidden">
        {/* Subtle emerald lighting overlay */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#10B981]/3 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Hero Content */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/20">
              <Sparkles className="h-3 w-3 text-[#10B981]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#10B981]">
                Live Collaborative Audio
              </span>
            </div>

            <h1 className="font-heading font-black leading-[1.05] tracking-tight text-4xl sm:text-5xl lg:text-6xl text-white">
              Listen together.<br />
              Vote together.<br />
              <span className="text-[#10B981]">Discover together.</span>
            </h1>

            <p className="text-[#A1A1AA] text-sm sm:text-base max-w-lg leading-relaxed font-normal">
              Create live listening rooms where everyone contributes songs and the crowd decides what plays next. Spotify + Discord for joint music curation.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-[#10B981] hover:bg-[#10B981]/90 text-white font-bold text-xs px-6 py-3 transition-colors shadow-md active:scale-97 duration-100"
              >
                Create Room <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <a
                href="#rooms"
                className="inline-flex items-center gap-2 rounded-full border border-[#27272A] bg-[#121212]/40 hover:bg-[#121212] text-[#A1A1AA] hover:text-[#FAFAFA] font-bold text-xs px-6 py-3 transition-colors"
              >
                Browse Live Rooms
              </a>
            </div>

            {/* Quick room joiner */}
            <div className="pt-4 max-w-sm">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomInput}
                  onChange={e => setRoomInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && joinRoom()}
                  placeholder="Enter Room Code (e.g. LOFI-404)..."
                  className="flex-1 h-9 px-3.5 rounded-full bg-[#121212] border border-[#27272A] text-xs text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#10B981]/50 transition-colors"
                />
                <button
                  onClick={joinRoom}
                  className="h-9 px-4 rounded-full bg-[#121212] border border-[#27272A] hover:border-[#10B981]/50 text-white flex items-center justify-center transition-colors shrink-0 text-xs font-bold cursor-pointer"
                >
                  Join
                </button>
              </div>
            </div>
          </div>

          {/* Premium Live Room Preview (100% Real application data) */}
          <div className="lg:col-span-6 relative">
            <div className="absolute inset-0 bg-[#10B981]/2 rounded-3xl blur-3xl pointer-events-none" />
            
            {loadingHero ? (
              <div className="bg-[#121212] border border-[#27272A] rounded-3xl p-12 flex flex-col items-center justify-center min-h-[340px]">
                <Loader2 className="w-6 h-6 animate-spin text-[#10B981]" />
                <p className="text-[10px] text-[#A1A1AA] mt-3 uppercase tracking-wider font-bold">Synchronizing preview...</p>
              </div>
            ) : heroRoom ? (
              <div className="bg-[#121212] border border-[#27272A] rounded-3xl p-6 shadow-2xl relative flex flex-col justify-between min-h-[380px]">
                
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-[#27272A]/60 mb-5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${heroRoom.currentStream ? 'bg-[#22C55E] animate-pulse' : 'bg-[#71717A]'}`} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                        {heroRoom.isUserInRoom ? "Your Active Sphere" : "Most Active Sphere"}
                      </span>
                    </div>
                    {heroRoom.listenerInitials && heroRoom.listenerInitials.length > 0 && (
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {heroRoom.listenerInitials.slice(0, 5).map((c: string, idx: number) => (
                          <div key={idx} className="w-5.5 h-5.5 rounded-full border border-[#121212] bg-[#10B981]/20 text-[9px] font-bold text-[#10B981] flex items-center justify-center uppercase">
                            {c}
                          </div>
                        ))}
                        {heroRoom.listenerInitials.length > 5 && (
                          <div className="w-5.5 h-5.5 rounded-full border border-[#121212] bg-[#18181B] text-[9px] font-bold text-[#71717A] flex items-center justify-center">
                            +{heroRoom.listenerInitials.length - 5}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Room name & host info */}
                  <div className="mb-4">
                    <h3 className="font-heading font-black text-base text-white truncate">{heroRoom.name}</h3>
                    <p className="text-[10px] text-[#A1A1AA] mt-0.5">Hosted by {heroRoom.host}</p>
                  </div>

                  {/* Now playing widget */}
                  {heroRoom.currentStream ? (
                    <div className="bg-[#090909]/60 border border-[#27272A]/60 rounded-2xl p-4 flex gap-4 items-center mb-5 relative group">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-black border border-[#27272A] shrink-0 relative flex items-center justify-center">
                        <img 
                          src={heroRoom.currentStream.smallImg || `https://img.youtube.com/vi/${heroRoom.currentStream.extractedId}/default.jpg`} 
                          alt="" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[8px] font-bold tracking-widest text-[#10B981] uppercase">Now Playing</span>
                        <h4 className="font-heading font-black text-xs text-white truncate mt-0.5">{heroRoom.currentStream.title}</h4>
                      </div>
                      <div className="waveform scale-75 origin-right">
                        <span /><span /><span /><span /><span />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#090909]/30 border border-[#27272A]/30 rounded-2xl p-5 flex flex-col items-center justify-center text-center text-[#71717A] mb-5">
                      <Music className="w-6 h-6 opacity-35 mb-2" />
                      <p className="text-xs font-semibold text-white">Quiet Broadcast</p>
                      <p className="text-[10px] mt-0.5">No song currently active</p>
                    </div>
                  )}

                  {/* Queue preview */}
                  {heroRoom.queue && heroRoom.queue.length > 0 && (
                    <div className="space-y-2.5 mb-5">
                      <span className="text-[9px] font-bold tracking-wider text-[#A1A1AA] uppercase block mb-1">Upcoming Queue</span>
                      
                      {heroRoom.queue.slice(0, 2).map((q: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#090909]/30 border border-[#27272A]/30 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-[9px] font-mono text-[#71717A]">0{idx+1}</span>
                            <p className="font-bold text-white truncate max-w-[200px]">{q.title}</p>
                            <span className="text-[9px] text-[#71717A]">by {q.addedBy}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <ThumbsUp className="w-2.5 h-2.5 fill-current" />
                            <span>{q.upvotes}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* CTA Action button */}
                <div className="pt-4 border-t border-[#27272A]/60 flex items-center justify-between">
                  <div className="text-[10px] text-[#A1A1AA] font-semibold flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>{heroRoom.listeningCount} Listening</span>
                  </div>

                  <Link
                    href={`/room/${heroRoom.id}`}
                    className="inline-flex items-center gap-2 rounded-full bg-[#10B981] hover:bg-[#10B981]/90 text-white font-bold text-xs px-5 py-2.5 transition-colors shadow-md active:scale-97 duration-100"
                  >
                    {heroRoom.isUserInRoom ? "Return to Room" : "Join Room"} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

              </div>
            ) : (
              // Clean empty state when no active spheres exist
              <div className="bg-[#121212] border border-[#27272A] rounded-3xl p-8 shadow-2xl relative text-center min-h-[380px] flex flex-col items-center justify-center space-y-5">
                <div className="w-12 h-12 rounded-full bg-[#27272A] flex items-center justify-center text-[#71717A] mx-auto">
                  <Radio className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-heading font-black text-base text-white">No active spheres right now.</h3>
                  <p className="text-xs text-[#A1A1AA] max-w-xs mx-auto">
                    Create a room and start listening together. Bring your friends and let the crowd control the queue.
                  </p>
                </div>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full bg-[#10B981] hover:bg-[#10B981]/90 text-white font-bold text-xs px-6 py-3 transition-colors shadow-md active:scale-97"
                >
                  Create Sphere <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── LIVE ROOMS SECTION ───────────────────────── */}
      <section id="rooms" className="py-20 px-6 border-t border-[#27272A]/40 relative">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-end gap-4 flex-wrap mb-10">
            <div>
              <div className="flex items-center gap-2 text-[#10B981] mb-1">
                <Radio className="w-4 h-4 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Live Broadcasts</span>
              </div>
              <h2 className="font-heading font-black text-2xl tracking-tight text-white">Browse Rooms</h2>
            </div>
            <Link href="/dashboard" className="text-xs font-bold text-[#10B981] hover:underline">
              Create Room →
            </Link>
          </div>

          {loadingRooms ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-[#10B981]" />
              <span className="text-xs text-[#A1A1AA]">Scanning channels...</span>
            </div>
          ) : topRooms.length === 0 ? (
            <div className="border border-dashed border-[#27272A] rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-[#121212]/30 max-w-xl mx-auto">
              <Radio className="mb-4 h-8 w-8 text-[#A1A1AA]/40" />
              <p className="text-sm text-[#A1A1AA] font-bold">No active sessions</p>
              <p className="text-xs text-[#71717A] mt-1">Be the first to build a channel and queue tunes!</p>
              <Link 
                href="/dashboard"
                className="mt-6 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#10B981] hover:bg-[#10B981]/90 text-xs font-bold text-white transition-colors"
              >
                Create Room
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {topRooms.map((room) => {
                const isTrending = room.totalVotes > 20;
                return (
                  <Link
                    key={room.id}
                    href={`/room/${room.id}`}
                    className="block group"
                  >
                    <div className="bg-[#121212] border border-[#27272A] hover:border-[#3F3F46] rounded-2xl p-5 flex flex-col justify-between h-56 transition-all duration-300 relative overflow-hidden hover:translate-y-[-2px]">
                      
                      {/* Top Row */}
                      <div>
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <h3 className="font-heading font-black text-base text-white truncate group-hover:text-[#10B981] transition-colors">
                              {room.name}
                            </h3>
                            <p className="text-[10px] text-[#A1A1AA] mt-0.5">
                              Hosted by {room.hostEmail?.split('@')[0]}
                            </p>
                          </div>
                          
                          {/* Live/Trending indicator badge */}
                          <div className="flex items-center gap-1.5">
                            {isTrending ? (
                              <span className="px-2 py-0.5 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/25 text-[8px] font-bold uppercase tracking-wider text-[#F59E0B]">
                                Trending
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/25 text-[8px] font-bold uppercase tracking-wider text-[#10B981]">
                                Live
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Playing details */}
                        <div className="mt-4 flex gap-3 items-center">
                          <div className="w-12 h-12 rounded-lg bg-[#090909] border border-[#27272A] overflow-hidden shrink-0 flex items-center justify-center text-[#71717A]">
                            {room.currentStream ? (
                              <img src={room.currentStream.smallImg} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Music className="w-4 h-4 opacity-40" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[8px] font-bold text-[#10B981] uppercase block">Now Playing</span>
                            <p className="text-xs font-bold text-white truncate max-w-[180px]">
                              {room.currentStream?.title || "No track active"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Row metadata */}
                      <div className="border-t border-[#27272A]/60 pt-4 mt-4 flex justify-between items-center text-[10px] font-semibold text-[#A1A1AA]">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-[#10B981]" />
                          {room.listeningCount} Listening
                        </span>
                        <span>
                          {room.totalVotes} Votes Cast
                        </span>
                      </div>

                      {room.topVotedTrack && (
                        <div className="absolute bottom-0 left-0 right-0 bg-[#10B981]/5 border-t border-[#10B981]/10 px-5 py-1.5 text-[9px] text-[#A1A1AA] truncate">
                          Up Next: <span className="font-semibold text-white">{room.topVotedTrack}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── LIVE ACTIVITY FEED (100% Real events) ────── */}
      <section className="py-20 px-6 border-t border-[#27272A]/40 bg-[#121212]/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-2 mb-12">
            <div className="inline-flex items-center gap-1 text-[#10B981]">
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Social Pulse</span>
            </div>
            <h2 className="font-heading font-black text-2xl text-white">Live Activity</h2>
            <p className="text-xs text-[#A1A1AA]">What's happening across the frequency right now</p>
          </div>

          {loadingActivity ? (
            <div className="flex items-center justify-center py-12 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-[#10B981]" />
              <span className="text-xs text-[#A1A1AA]">Retrieving activities...</span>
            </div>
          ) : activities.length === 0 ? (
            // Elegant empty state when no activity exists in DB
            <div className="py-16 text-center text-[#A1A1AA] text-xs border border-dashed border-[#27272A] rounded-2xl bg-[#121212]/30 max-w-md mx-auto">
              <Activity className="h-6 w-6 text-[#71717A] mx-auto opacity-35 mb-2 animate-pulse" />
              <p className="font-bold text-white">No activity yet</p>
              <p className="text-[10px] text-[#71717A] mt-0.5">Be the first to create a sphere or queue a song!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((act) => (
                <div 
                  key={act.id} 
                  className="flex items-center justify-between p-4 rounded-xl border border-[#27272A]/60 bg-[#121212]/50 hover:bg-[#121212]/80 transition-colors text-xs text-[#A1A1AA]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white bg-[#10B981]/15 text-[#10B981] uppercase">
                      {act.user[0] || "?"}
                    </div>
                    <div>
                      <span className="font-bold text-white">{act.user}</span>{" "}
                      {act.type === "song_added" ? (
                        <>added track <span className="font-semibold text-[#10B981]">"{act.detail}"</span></>
                      ) : act.type === "room_created" ? (
                        <>created sphere <span className="font-semibold text-[#10B981]">"{act.detail}"</span></>
                      ) : (
                        <>sent chat message <span className="font-semibold text-[#A1A1AA]">"{act.detail}"</span></>
                      )}{" "}
                      in <span className="text-white font-medium">{act.roomName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#71717A] font-mono">
                      {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── PRODUCT SHOWCASE ─────────────────────────── */}
      <section className="py-20 px-6 border-t border-[#27272A]/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-2 mb-16">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#10B981]">Core Platform</span>
            <h2 className="font-heading font-black text-2xl text-white">Designed for Sound</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Immersive Now Playing",
                desc: "Song artwork occupies center stage, generating dynamic ambient backdrops with real-time audio progress sliders.",
                feature: "Room Page"
              },
              {
                title: "Democratic Priority Voting",
                desc: "Every vote up-ranks track indexes, making room queues real-time representation of crowd requests.",
                feature: "Voting Experience"
              },
              {
                title: "Premium Queue Cards",
                desc: "No confusing dashboards. Track listings display beautiful thumbnails, added-by info, and green vote action states.",
                feature: "Queue System"
              },
              {
                title: "Activity Interleaved Chat",
                desc: "Follow the conversation and track listings in a single integrated live feed.",
                feature: "Live Chat"
              }
            ].map((showcase, index) => (
              <div 
                key={index}
                className="bg-[#121212] border border-[#27272A] p-8 rounded-2xl flex flex-col justify-between hover:border-[#3F3F46] transition-colors"
              >
                <div>
                  <span className="text-[9px] font-bold text-[#10B981] uppercase tracking-widest">{showcase.feature}</span>
                  <h3 className="font-heading font-black text-lg text-white mt-2 mb-3">{showcase.title}</h3>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">{showcase.desc}</p>
                </div>
                <div className="mt-8 pt-6 border-t border-[#27272A]/60 flex items-center justify-between text-xs font-bold text-white">
                  <span>Explore in Room</span>
                  <ArrowRight className="w-4 h-4 text-[#10B981]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ──────────────────────────────── */}
      <section className="py-28 px-6 border-t border-[#27272A]/40 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[#10B981]/2 rounded-full blur-[140px] pointer-events-none" />
        <div className="max-w-xl mx-auto space-y-6 relative z-10">
          <Circle className="w-10 h-10 text-[#10B981] fill-[#10B981]/15 mx-auto" strokeWidth={2.5} />
          <h2 className="font-heading font-black text-3xl tracking-tight text-white">
            Start listening together
          </h2>
          <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto">
            Bring your crew. Queue your favorite tracks. Let the sound flow.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-[#10B981] hover:bg-[#10B981]/90 text-white font-bold text-xs px-8 py-3.5 transition-colors shadow-md"
          >
            Create Room <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <MegaFooter />
    </div>
  );
}
