"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Music, Users, Vote, Headphones, Radio, Mic2,  } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Appbar } from "@components/Appbar"
import { HeroAnimation } from "@/components/hero-animation"
import { FeatureCard } from "@/components/feature-card"
import { HowItWorks } from "@/components/how-it-works"
import { Testimonial } from "@/components/testimonial"
import { PlaylistPreview } from "@/components/playlist-preview"
import { MusicVisualizer } from "@/components/music-visualizer"

interface TopRoom {
  id: string;
  code: string;
  name: string;
  hostEmail: string;
  streamCount: number;
}

export default function Home() {
  const router = useRouter();
  const [topRooms, setTopRooms] = useState<TopRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomIdInput, setRoomIdInput] = useState('');

  useEffect(() => {
    fetch('/api/rooms/top')
      .then(res => res.json())
      .then(data => {
        setTopRooms(data.rooms || []);
        setLoadingRooms(false);
      })
      .catch(() => setLoadingRooms(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans selection:bg-primary selection:text-black overflow-x-hidden">
      <Appbar />
      
      <main className="flex-1 flex flex-col">
        {/* HERO SECTION: THE CASSETTE PACKAGING */}
        <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-12 overflow-hidden">
           {/* Packaging Background Texture */}
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
           
           {/* The "Wrapper" Design */}
           <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "circOut" }}
              className="container relative z-10 max-w-6xl"
           >
              <div className="border-[12px] border-border bg-card shadow-2xl relative overflow-hidden group">
                  {/* Plastic Wrap Reflection */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none z-20"></div>

                  {/* Top Strip (Brand) */}
                  <div className="h-32 bg-background relative flex items-center justify-between px-8 border-b-4 border-border">
                      <div className="flex flex-col">
                          <span className="font-heading text-6xl font-black italic tracking-tighter text-foreground">BeatNet</span>
                          <span className="font-mono text-xs tracking-[0.5em] text-zinc-500 uppercase ml-1">High Bias / Chrome</span>
                      </div>
                      <div className="flex gap-4">
                          <div className="border-2 border-primary rounded px-2 py-1 text-primary font-bold font-mono text-sm">90 MIN</div>
                          <div className="border-2 border-muted-foreground/30 rounded px-2 py-1 text-muted-foreground font-bold font-mono text-sm">IEC II</div>
                      </div>
                  </div>

                  {/* Main Body (Color Blocks) */}
                  <div className="bg-secondary relative min-h-[500px] flex flex-col md:flex-row">
                      {/* Left Stripe (Green) */}
                      <div className="w-full md:w-1/3 bg-primary p-8 flex flex-col justify-between relative overflow-hidden">
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-20 mix-blend-multiply"></div>
                          
                          <div>
                              <Vote className="w-16 h-16 text-black mb-4" />
                              <h2 className="font-heading text-5xl font-black text-black leading-none mb-2">VOTE<br/>NEXT.</h2>
                              <p className="font-mono text-black/80 text-sm font-bold">THE DEMOCRATIC<br/>AUDIO SYSTEM.</p>
                          </div>
                          
                          <div className="mt-12">
                              <span className="block font-black text-9xl text-black/20 -ml-4 leading-none select-none">A</span>
                          </div>
                      </div>

                      {/* Right Panel (Hero Content) */}
                      <div className="w-full md:w-2/3 p-12 flex flex-col justify-center bg-card border-l-4 border-border relative">
                           {/* Decorative Diagonal Lines */}
                           <div className="absolute top-0 right-0 w-32 h-32 bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-border via-card to-card opacity-50"></div>

                           <h1 className="text-5xl md:text-7xl font-heading font-black text-foreground mb-6 tracking-tight uppercase">
                               Sonic<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Democracy</span>
                           </h1>

                           <p className="font-mono text-muted-foreground max-w-md mb-10 leading-relaxed">
                               Experience high-fidelity collaborative listening. 
                               Zero latency. Majority rules. 
                               <span className="text-primary"> No ads. Just vibes.</span>
                           </p>

                           <div className="flex flex-col sm:flex-row gap-6">
                               <Button size="lg" asChild className="h-16 px-8 bg-primary text-white hover:text-black hover:bg-white hover:scale-105 transition-all font-bold text-xl rounded-none border-2 border-primary shadow-[4px_4px_0_rgba(255,255,255,0.2)]">
                                   <Link href="/dashboard">INSERT TAPE</Link>
                               </Button>
                               <Button size="lg" variant="outline" asChild className="h-16 px-8 border-2 border-border text-muted-foreground hover:text-foreground hover:border-foreground font-mono rounded-none group">
                                   <Link href="#manual">
                                       READ MANUAL <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                   </Link>
                               </Button>
                           </div>
                      </div>
                  </div>

                  {/* Bottom Strip (Badges) */}
                  <div className="bg-background py-4 px-8 flex justify-between items-center border-t-4 border-border">
                      <div className="flex gap-6 text-zinc-600 font-mono text-xs font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-2"><Music className="w-4 h-4" /> Noise Reduction ON</span>
                          <span className="flex items-center gap-2"><Radio className="w-4 h-4" /> Stereo</span>
                      </div>
                      <div className="text-zinc-700 font-black text-2xl tracking-tighter">JAPAN</div>
                  </div>
              </div>
           </motion.div>
        </section>

        {/* TOP FREQUENCIES - ACTIVE ROOMS */}
        <section className="bg-secondary/50 py-16 border-y-4 border-border">
          <div className="container max-w-6xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-heading text-4xl font-black uppercase text-foreground tracking-tight">Top Frequencies</h2>
                <p className="font-mono text-sm text-muted-foreground mt-1">// LIVE_BROADCAST • TUNE IN NOW</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="font-mono text-xs text-muted-foreground uppercase">On Air</span>
              </div>
            </div>

            {loadingRooms ? (
              <div className="text-center py-12 font-mono text-muted-foreground">SCANNING FREQUENCIES...</div>
            ) : topRooms.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                <p className="font-mono text-muted-foreground">NO STATIONS BROADCASTING</p>
                <Link href="/dashboard" className="mt-4 inline-block text-primary font-mono text-sm hover:underline">START YOUR OWN →</Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {topRooms.slice(0, 3).map((room, index) => (
                  <Link 
                    key={room.id} 
                    href={`/room/${room.code}`}
                    className="group bg-card border-2 border-border hover:border-primary p-6 transition-all hover:shadow-lg hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-primary/20 border border-primary/50 rounded-full flex items-center justify-center font-heading text-2xl font-black text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-bold text-lg text-foreground uppercase truncate group-hover:text-primary transition-colors">{room.name}</h3>
                        <p className="font-mono text-xs text-primary">{room.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <span className="font-mono text-xs text-muted-foreground">{room.streamCount} TRACKS</span>
                      <span className="font-mono text-xs text-primary group-hover:translate-x-1 transition-transform">TUNE IN →</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Manual Room Entry */}
            <div className="mt-12 pt-8 border-t-2 border-dashed border-border">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <div className="flex-1 max-w-md w-full">
                  <label className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2 block text-center sm:text-left">DIAL FREQUENCY (ROOM ID)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={roomIdInput}
                      onChange={(e) => setRoomIdInput(e.target.value)}
                      placeholder="Enter room ID or paste link..."
                      className="flex-1 h-12 px-4 bg-background border-2 border-border text-foreground font-mono text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                    />
                    <button
                      onClick={() => {
                        if (!roomIdInput.trim()) return;
                        // Extract room ID from URL if pasted
                        const id = roomIdInput.includes('/room/') 
                          ? roomIdInput.split('/room/')[1].split('?')[0] 
                          : roomIdInput.trim();
                        router.push(`/room/${id}`);
                      }}
                      className="h-12 px-6 bg-primary text-primary-foreground font-mono font-bold uppercase hover:bg-primary/80 transition-colors"
                    >
                      TUNE IN
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE SECTION: THE MANUAL */}
        <section id="manual" className="bg-background py-24 text-foreground relative">
             {/* Texture specifically for manual paper feel */}
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30 pointer-events-none mix-blend-multiply dark:mix-blend-normal dark:invert"></div>
            <div className="container max-w-6xl">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-12 border-4 border-border p-8 bg-card shadow-xl relative"
                >
                    {/* Fold Crease */}
                    <div className="absolute inset-y-0 left-1/2 w-px bg-border hidden md:block"></div>
                    
                    {/* Header */}
                    <div className="md:col-span-12 border-b-4 border-border pb-8 mb-8 text-center">
                        <h2 className="font-heading text-6xl font-black uppercase text-foreground">Operating Instructions</h2>
                        <p className="font-mono text-lg mt-2 text-muted-foreground">Model: BN-2025 // System Specs</p>
                    </div>

                    {/* Fig 1: Voting */}
                    <div className="md:col-span-4 p-4 border-2 border-border hover:border-primary transition-colors group">
                        <div className="aspect-square bg-background border border-border mb-4 flex items-center justify-center relative overflow-hidden group-hover:border-primary/50 transition-colors">
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,#333_25%,transparent_25%,transparent_75%,#333_75%,#333),linear-gradient(45deg,#333_25%,transparent_25%,transparent_75%,#333_75%,#333)] bg-[length:10px_10px] bg-[position:0_0,5px_5px] opacity-10"></div>
                            <Vote className="w-24 h-24 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1} />
                        </div>
                        <h3 className="font-bold font-mono text-xl mb-2 text-foreground group-hover:text-primary transition-colors">Fig 1. Consensus</h3>
                        <p className="font-mono text-muted-foreground leading-relaxed text-xs">
                            The system utilizes a democratic algorithm. Tracks with the highest vote velocity move to the top of the queue instantly.
                        </p>
                    </div>

                    {/* Fig 2: Sync */}
                    <div className="md:col-span-4 p-4 border-2 border-border hover:border-primary transition-colors group">
                        <div className="aspect-square bg-background border border-border mb-4 flex items-center justify-center relative overflow-hidden group-hover:border-primary/50 transition-colors">
                             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-border via-transparent to-transparent opacity-50"></div>
                            <Headphones className="w-24 h-24 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1} />
                        </div>
                        <h3 className="font-bold font-mono text-xl mb-2 text-foreground group-hover:text-primary transition-colors">Fig 2. Synchronization</h3>
                        <p className="font-mono text-muted-foreground leading-relaxed text-xs">
                            Global state management ensures all clients hear the same frequency at the exact same millisecond.
                        </p>
                    </div>

                    {/* Fig 3: No Ads */}
                    <div className="md:col-span-4 p-4 border-2 border-border hover:border-primary transition-colors group">
                        <div className="aspect-square bg-background border border-border mb-4 flex items-center justify-center relative overflow-hidden group-hover:border-primary/50 transition-colors">
                            <div className="w-full h-px bg-border rotate-45 absolute"></div>
                            <div className="w-full h-px bg-border -rotate-45 absolute"></div>
                            <Appbar className="scale-50 opacity-20 grayscale invert dark:invert-0" /> 
                        </div>
                        <h3 className="font-bold font-mono text-xl mb-3 flex items-center gap-2 text-foreground group-hover:text-primary transition-colors">Fig 3. Signal Purity</h3>
                        <p className="font-mono text-muted-foreground leading-relaxed text-xs">
                            Advanced filtering algorithms block all commercial interruptions. 100% music throughput efficiency.
                        </p>
                    </div>
                    
                    <div className="md:col-span-12 mt-8 pt-8 border-t-2 border-dashed border-zinc-300 text-center font-mono text-xs text-zinc-400">
                        BEATNET CORP. © 2025 // PRINTED IN CYBERSPACE
                    </div>
                </motion.div>
            </div>
        </section>

        <section id="how-it-works" className="container space-y-6 py-8 md:py-12 lg:py-24 border-t border-white/10">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
             <h2 className="font-heading text-4xl leading-[1.1] sm:text-5xl md:text-7xl uppercase tracking-tighter">Operating <span className="text-primary">Manual</span></h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7 font-mono">
              Initialize sequence in 3 steps.
            </p>
          </div>
          <HowItWorks />
        </section>
        <section
          id="testimonials"
          className="container space-y-6 bg-primary/5 py-8 md:py-12 lg:py-24 border-y border-white/10"
        >
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="font-heading text-4xl leading-[1.1] sm:text-5xl md:text-7xl uppercase tracking-tighter">User <span className="text-primary">Logs</span></h2>
          </div>
          <div className="mx-auto grid justify-center gap-6 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3 perspective-1000">
            <div className="transform rotate-y-12 hover:rotate-0 transition-all duration-300">
            <Testimonial
              quote="System optimal. Audio latency negligible. Use case confirmed."
              author="Alex Johnson"
              role="Operator [DJ]"
            />
            </div>
             <div className="transform hover:scale-105 transition-all duration-300">
            <Testimonial
              quote="Neural link established. Best music discovery algorithm yet."
              author="Samantha Lee"
              role="Node [Blogger]"
            />
             </div>
             <div className="transform -rotate-y-12 hover:rotate-0 transition-all duration-300">
            <Testimonial
              quote="Office productivity increased by 400%. Democracy is efficient."
              author="Michael Chen"
              role="Admin [Founder]"
            />
             </div>
          </div>
        </section>

      </main>
      <footer className="border-t border-border py-6 md:py-0 bg-card">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
            <Music className="h-6 w-6 text-primary" />
            <p className="text-center text-sm leading-loose md:text-left font-mono text-muted-foreground">
              &copy; {new Date().getFullYear()} BEATNET_SYSTEMS. ALL RIGHTS RESERVED.
            </p>
          </div>
          <div className="flex gap-4">
            <Link href="/terms" className="text-sm font-mono text-muted-foreground hover:text-primary transition-colors">
              TERMS
            </Link>
            <Link href="/privacy" className="text-sm font-mono text-muted-foreground hover:text-primary transition-colors">
              PRIVACY
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
