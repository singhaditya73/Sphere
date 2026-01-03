import Link from "next/link"
import { ArrowRight, Music, Users, Vote, Headphones, Radio, Mic2,  } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Appbar } from "@components/Appbar"
import { HeroAnimation } from "@/components/hero-animation"
import { FeatureCard } from "@/components/feature-card"
import { HowItWorks } from "@/components/how-it-works"
import { Testimonial } from "@/components/testimonial"
import { PlaylistPreview } from "@/components/playlist-preview"
import { MusicVisualizer } from "@/components/music-visualizer"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden selection:bg-primary selection:text-black">
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Appbar />
        </div>
      </header>
      
      <main className="flex-1 pt-24">
        {/* HERO SECTION */}
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
          {/* Background Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-20"></div>
          
          <div className="container relative z-10 flex flex-col items-center text-center">
            <div className="inline-block mb-4 px-4 py-1 border border-primary/30 rounded-full bg-primary/5 backdrop-blur-sm animate-pulse-slow">
              <span className="text-primary font-mono text-sm tracking-widest uppercase">The Future of Audio</span>
            </div>
            
            <h1 className="font-heading text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] leading-none tracking-tighter uppercase mb-6 mix-blend-difference text-white">
              Sonic <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-primary animate-gradient">Democracy</span>
            </h1>
            
            <p className="max-w-2xl text-xl sm:text-2xl text-muted-foreground mb-10 font-mono">
              The crowd controls the aux. <span className="text-primary">Vote.</span> Play. <span className="text-white">Dominate.</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 perspective-1000">
              <Button size="lg" asChild className="h-16 px-10 text-xl font-bold bg-primary text-black hover:bg-white hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(204,255,0,0.4)] rounded-none rotate-y-12 hover:rotate-0">
                <Link href="/dashboard">
                  ENTER THE ROOM
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-16 px-10 text-xl font-bold border-white/20 hover:border-primary hover:text-primary hover:bg-primary/10 rounded-none rotate-x-12 hover:rotate-0 transition-all duration-300">
                <Link href="#how-it-works">SYSTEM SPECS</Link>
              </Button>
            </div>
          </div>

          {/* 3D Floating Elements (Decorative) */}
          <div className="absolute top-1/2 left-10 w-64 h-80 bg-zinc-900 border border-white/10 -z-10 transform -rotate-12 opacity-50 hidden lg:block hover:opacity-100 transition-opacity duration-500">
             <div className="w-full h-full flex items-center justify-center font-mono text-xs text-white/20">NO SIGNAL</div>
          </div>
          <div className="absolute top-1/3 right-10 w-72 h-72 bg-primary/5 border border-primary/20 -z-10 transform rotate-6 rounded-full blur-3xl opacity-50"></div>
        </section>

        {/* Featured Playlist Marquee */}
        <section className="w-full py-12 border-y border-white/10 bg-black overflow-hidden relative">
           <div className="whitespace-nowrap animate-marquee flex gap-8 items-center text-4xl font-bold text-white/10 font-mono uppercase tracking-widest select-none">
              <span>Vote Next</span> <span>•</span> <span>Queue It</span> <span>•</span> <span>Live Stream</span> <span>•</span> <span>No Ads</span> <span>•</span> <span>Realtime</span> <span>•</span> <span>Vote Next</span> <span>•</span> <span>Queue It</span>
           </div>
          <div className="container relative z-10 mt-12 mx-auto max-w-5xl perspective-1000">
             <div className="transform rotate-x-12 hover:rotate-x-0 transition-transform duration-700">
                <PlaylistPreview />
             </div>
          </div>
        </section>

        <section
          id="features"
          className="container space-y-12 py-24 relative"
        >
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <div className="w-full border-t border-primary/20 mb-8"></div>
            <h2 className="font-heading text-4xl leading-[1.1] sm:text-5xl md:text-7xl uppercase tracking-tighter">System <span className="text-primary">Kernel</span></h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7 font-mono">
              Core modules activated for democratic audio control.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-6 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            <FeatureCard
              icon={<Vote className="h-10 w-10 text-primary" />}
              title="Democratic Voting"
              description="Real-time consensus algorithm. The majority rules the playlist."
              className="glitch-border bg-black/50"
            />
            <FeatureCard
              icon={<Users className="h-10 w-10 text-primary" />}
              title="Hive Minds"
              description="Join existing neural networks (rooms) or spawn your own instance."
              className="glitch-border bg-black/50"
            />
            <FeatureCard
              icon={<Headphones className="h-10 w-10 text-primary" />}
              title="Sync Protocol"
              description="Zero-latency audio synchronization across all connected clients."
              className="glitch-border bg-black/50"
            />
            <FeatureCard
              icon={<Radio className="h-10 w-10 text-primary" />}
              title="Broadcast Mode"
              description="Seize control of the frequency as the designated Operator."
              className="glitch-border bg-black/50"
            />
            <FeatureCard
              icon={<Mic2 className="h-10 w-10 text-primary" />}
              title="Signal Discovery"
              description="Scan for new audio signals and frequencies."
              className="glitch-border bg-black/50"
            />
            <FeatureCard
              icon={<Music className="h-10 w-10 text-primary" />}
              title="Data Streams"
              description="Analyze listening vectors and community trends."
              className="glitch-border bg-black/50"
            />
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
        <section className="container py-6 md:py-12 lg:py-24 px-4 sm:px-6">
          <div className="mx-auto max-w-[58rem] space-y-6 bg-primary px-6 py-10 text-black border border-white/20 rounded-none sm:px-12 sm:py-16 md:px-16 md:py-20 lg:px-24 lg:py-24 xl:px-32 xl:py-28 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
            <h2 className="font-heading text-3xl leading-[1.1] sm:text-4xl md:text-5xl text-center uppercase tracking-tighter relative z-10">
              Initialize Protocol?
            </h2>
            <p className="leading-normal text-black/80 text-sm sm:text-base md:text-lg sm:leading-7 text-center font-mono relative z-10">
              Join the network. No credentials required for basic access.
            </p>
            <div className="flex justify-center relative z-10">
              <Button size="lg" className="mt-4 group w-full sm:w-auto bg-black text-white hover:bg-white hover:text-black border-0 rounded-none h-14 px-8 text-lg font-bold uppercase transition-all shadow-[8px_8px_0_0_rgba(0,0,0,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1" asChild>
                <Link href="/signup">
                  EXECUTE <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-white/10 py-6 md:py-0 bg-black">
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
