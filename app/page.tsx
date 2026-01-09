"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Headphones, Zap, Play, Radio, Vote, Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Appbar } from "@components/Appbar"
import { Testimonial } from "@/components/testimonial"
import { HowItWorks } from "@/components/how-it-works"
import dynamic from "next/dynamic"

// Dynamic import for Three.js component (client-side only)
const Hero3D = dynamic(() => import("@/components/Hero3D").then(mod => mod.Hero3D), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center"><div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
})

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
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans overflow-x-hidden">
      <Appbar />
      
      <main className="flex-1 flex flex-col">
        {/* HERO SECTION: SPHERE STYLE */}
        <section className="relative min-h-screen flex items-center pt-24 pb-12">
           {/* Gradient Orbs - Background */}
           <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary/30 rounded-full blur-3xl animate-glow-pulse pointer-events-none"></div>
           <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-glow-pulse pointer-events-none" style={{ animationDelay: '1.5s' }}></div>
           
           {/* 3D Sphere - Positioned absolutely to cover right side without clipping */}
           <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-full lg:w-3/5 h-full">
                 <Hero3D />
              </div>
           </div>
           
           {/* Text Content - On top of 3D */}
           <div className="container relative z-20 max-w-7xl px-6">
              <div className="max-w-2xl">
                 <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="space-y-8"
                 >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-muted-foreground">
                       <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                       Artistic Empowerment
                    </div>
                    
                    <h1 className="text-6xl md:text-8xl font-heading font-black leading-[0.9] tracking-tight">
                       Your<br/>
                       <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-primary text-glow-green">Music.</span><br/>
                       Your People.
                    </h1>
                    
                    <p className="text-xl text-muted-foreground max-w-md leading-relaxed">
                       Experience the future of collaborative listening. 
                       Democratic playlists. Zero ads. 
                       <span className="text-primary"> Pure vibes.</span>
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                       <Button size="lg" asChild className="btn-neon h-14 px-10 text-lg font-bold">
                          <Link href="/dashboard">
                             Join Waitlist
                             <ArrowRight className="ml-2 w-5 h-5" />
                          </Link>
                       </Button>
                       <Button size="lg" variant="ghost" asChild className="h-14 px-8 text-muted-foreground hover:text-foreground border border-border/50 hover:border-primary/30 rounded-full">
                          <Link href="#experience">
                             <Play className="mr-2 w-4 h-4 fill-current" />
                             See How It Works
                          </Link>
                       </Button>
                    </div>
                 </motion.div>
              </div>
           </div>
        </section>

        {/* LIVE SESSIONS - ACTIVE ROOMS */}
        <section id="experience" className="py-24 relative">
           {/* Gradient accent */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
           
           <div className="container mx-auto max-w-6xl px-6">
             <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-16"
             >
                <span className="inline-block px-4 py-1 rounded-full glass text-sm font-medium text-primary mb-4">Live Now</span>
                <h2 className="font-heading text-5xl md:text-6xl font-black tracking-tight mb-4">
                   Active <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Sessions</span>
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">Join a live listening session or start your own frequency</p>
             </motion.div>

             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
               
               {/* LEFT COLUMN: SESSION LIST */}
               <div className="lg:col-span-8">
                 {loadingRooms ? (
                   <div className="text-center py-16 glass-card">
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Scanning frequencies...</p>
                   </div>
                 ) : topRooms.length === 0 ? (
                   <div className="text-center py-16 glass-card">
                     <p className="text-muted-foreground mb-4">No active sessions found</p>
                     <Link href="/dashboard" className="btn-neon inline-flex items-center gap-2 text-sm">
                        Start a Session <ArrowRight className="w-4 h-4" />
                     </Link>
                   </div>
                 ) : (
                   <div className="space-y-4">
                     {topRooms.slice(0, 5).map((room, index) => (
                       <motion.div
                          key={room.id}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.4, delay: index * 0.1 }}
                       >
                         <Link 
                           href={`/room/${room.code}`}
                           className="group glass-card p-5 flex items-center justify-between hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10"
                         >
                            <div className="flex items-center gap-5">
                               {/* Rank */}
                               <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-heading text-xl font-black text-primary group-hover:bg-primary/20 transition-colors">
                                 {index + 1}
                               </div>
                               
                               {/* Info */}
                               <div>
                                  <h3 className="font-heading font-bold text-lg text-foreground group-hover:text-primary transition-colors">{room.name}</h3>
                                  <div className="flex items-center gap-3 mt-1">
                                     <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{room.code}</span>
                                     <span className="text-xs text-muted-foreground">{room.streamCount} tracks</span>
                                  </div>
                               </div>
                            </div>

                            {/* Join Button */}
                            <span className="px-4 py-2 rounded-full text-sm font-medium text-primary border border-primary/30 group-hover:bg-primary group-hover:text-primary-foreground transition-all flex items-center gap-2">
                               Join <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </span>
                         </Link>
                       </motion.div>
                     ))}
                   </div>
                 )}
               </div>

               {/* RIGHT COLUMN: JOIN FORM */}
               <div className="lg:col-span-4">
                 <div className="glass-card p-6 sticky top-24">
                    <div className="flex items-center gap-3 mb-6">
                       <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Radio className="w-5 h-5 text-primary" />
                       </div>
                       <div>
                          <h3 className="font-heading font-bold text-lg">Direct Connect</h3>
                          <p className="text-xs text-muted-foreground">Enter a room code</p>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <input
                         type="text"
                         value={roomIdInput}
                         onChange={(e) => setRoomIdInput(e.target.value)}
                         placeholder="Enter room code..."
                         className="w-full h-12 px-4 bg-muted/50 rounded-xl border border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none transition-colors"
                       />
                       <button
                         onClick={() => {
                           if (!roomIdInput.trim()) return;
                           const id = roomIdInput.includes('/room/') 
                             ? roomIdInput.split('/room/')[1].split('?')[0] 
                             : roomIdInput.trim();
                           router.push(`/room/${id}`);
                         }}
                         className="w-full btn-neon h-12 flex items-center justify-center gap-2"
                       >
                         <span>Connect</span>
                         <ArrowRight className="w-4 h-4" />
                       </button>
                    </div>
                 </div>
               </div>
             </div>
           </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="py-24 relative">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-secondary/50 to-transparent"></div>
           
           <div className="container mx-auto max-w-6xl px-6">
              <motion.div
                 initial={{ opacity: 0, y: 30 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ duration: 0.6 }}
                 className="text-center mb-16"
              >
                 <span className="inline-block px-4 py-1 rounded-full glass text-sm font-medium text-secondary mb-4">Why Sphere</span>
                 <h2 className="font-heading text-5xl md:text-6xl font-black tracking-tight mb-4">
                    Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-primary">Artists</span>
                 </h2>
                 <p className="text-muted-foreground max-w-md mx-auto">Experience music the way it was meant to be shared</p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                    { icon: Vote, title: "Democratic Playlists", desc: "Everyone votes. Best tracks rise. Pure democracy in action." },
                    { icon: Headphones, title: "Perfect Sync", desc: "All listeners hear the exact same beat at the exact same moment." },
                    { icon: Zap, title: "Zero Ads", desc: "100% music throughput. No interruptions. Ever." }
                 ].map((feature, i) => (
                    <motion.div
                       key={feature.title}
                       initial={{ opacity: 0, y: 30 }}
                       whileInView={{ opacity: 1, y: 0 }}
                       viewport={{ once: true }}
                       transition={{ duration: 0.5, delay: i * 0.1 }}
                       className="glass-card p-8 text-center group hover:border-primary/30 transition-all"
                    >
                       <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                          <feature.icon className="w-8 h-8 text-primary" />
                       </div>
                       <h3 className="font-heading font-bold text-xl mb-3">{feature.title}</h3>
                       <p className="text-muted-foreground text-sm">{feature.desc}</p>
                    </motion.div>
                 ))}
              </div>
           </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="community" className="py-24 relative">
           <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none"></div>
           
           <div className="container mx-auto max-w-6xl px-6">
              <motion.div
                 initial={{ opacity: 0, y: 30 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ duration: 0.6 }}
                 className="text-center mb-16"
              >
                 <span className="inline-block px-4 py-1 rounded-full glass text-sm font-medium text-primary mb-4">Simple</span>
                 <h2 className="font-heading text-5xl md:text-6xl font-black tracking-tight mb-4">
                    How It <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Works</span>
                 </h2>
              </motion.div>

              <HowItWorks />
           </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-24 relative">
           <div className="container mx-auto max-w-6xl px-6">
              <motion.div
                 initial={{ opacity: 0, y: 30 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ duration: 0.6 }}
                 className="text-center mb-16"
              >
                 <span className="inline-block px-4 py-1 rounded-full glass text-sm font-medium text-secondary mb-4">Community</span>
                 <h2 className="font-heading text-5xl md:text-6xl font-black tracking-tight">
                    What Users <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-primary">Say</span>
                 </h2>
              </motion.div>

              <div className="grid gap-6 md:grid-cols-3">
                 <Testimonial
                    quote="The sync is incredible. It's like we're all in the same room even though we're miles apart."
                    author="Alex Johnson"
                    role="DJ & Producer"
                 />
                 <Testimonial
                    quote="Finally, a music platform that understands community. The voting system is genius."
                    author="Samantha Lee"
                    role="Music Blogger"
                 />
                 <Testimonial
                    quote="Our team productivity went up since we started using Sphere for our office sessions."
                    author="Michael Chen"
                    role="Startup Founder"
                 />
              </div>
           </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-24 relative">
           <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent pointer-events-none"></div>
           
           <div className="container mx-auto max-w-4xl px-6 text-center">
              <motion.div
                 initial={{ opacity: 0, scale: 0.9 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true }}
                 transition={{ duration: 0.6 }}
                 className="glass-card p-12 md:p-16"
              >
                 <h2 className="font-heading text-4xl md:text-5xl font-black tracking-tight mb-6">
                    Ready to Start <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Listening?</span>
                 </h2>
                 <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
                    Join thousands of music lovers already on Sphere. Your next favorite track is waiting.
                 </p>
                 <Button size="lg" asChild className="btn-neon h-14 px-12 text-lg font-bold">
                    <Link href="/dashboard">
                       Create Your Account
                       <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                 </Button>
              </motion.div>
           </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-border/50 py-12 relative">
         <div className="container mx-auto max-w-6xl px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                     <Music className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-heading font-black text-xl">sphere</span>
               </div>
               
               <p className="text-sm text-muted-foreground">
                  © {new Date().getFullYear()} Sphere. All rights reserved.
               </p>
               
               <div className="flex gap-6">
                  <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                     Terms
                  </Link>
                  <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                     Privacy
                  </Link>
               </div>
            </div>
         </div>
      </footer>
    </div>
  )
}
