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
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-primary selection:text-black overflow-x-hidden">
      <Appbar />
      
      <main className="flex-1 flex flex-col">
        {/* HERO SECTION: THE CASSETTE PACKAGING */}
        <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-12 overflow-hidden">
           {/* Packaging Background Texture */}
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
           
           {/* The "Wrapper" Design */}
           <div className="container relative z-10 max-w-6xl">
              <div className="border-[12px] border-zinc-800 bg-zinc-900 shadow-2xl relative overflow-hidden group">
                  {/* Plastic Wrap Reflection */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none z-20"></div>

                  {/* Top Strip (Brand) */}
                  <div className="h-32 bg-zinc-950 relative flex items-center justify-between px-8 border-b-4 border-zinc-800">
                      <div className="flex flex-col">
                          <span className="font-heading text-6xl font-black italic tracking-tighter text-zinc-100">BeatNet</span>
                          <span className="font-mono text-xs tracking-[0.5em] text-zinc-500 uppercase ml-1">High Bias / Chrome</span>
                      </div>
                      <div className="flex gap-4">
                          <div className="border-2 border-primary rounded px-2 py-1 text-primary font-bold font-mono text-sm">90 MIN</div>
                          <div className="border-2 border-zinc-700 rounded px-2 py-1 text-zinc-500 font-bold font-mono text-sm">IEC II</div>
                      </div>
                  </div>

                  {/* Main Body (Color Blocks) */}
                  <div className="bg-zinc-100 relative min-h-[500px] flex flex-col md:flex-row">
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
                      <div className="w-full md:w-2/3 p-12 flex flex-col justify-center bg-zinc-900 border-l-4 border-zinc-800 relative">
                           {/* Decorative Diagonal Lines */}
                           <div className="absolute top-0 right-0 w-32 h-32 bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-900 to-zinc-900 opacity-50"></div>

                           <h1 className="text-5xl md:text-7xl font-heading font-black text-white mb-6 tracking-tight uppercase">
                               Sonic<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Democracy</span>
                           </h1>

                           <p className="font-mono text-zinc-400 max-w-md mb-10 leading-relaxed">
                               Experience high-fidelity collaborative listening. 
                               Zero latency. Majority rules. 
                               <span className="text-primary"> No ads. Just vibes.</span>
                           </p>

                           <div className="flex flex-col sm:flex-row gap-6">
                               <Button size="lg" asChild className="h-16 px-8 bg-primary text-black hover:bg-white hover:scale-105 transition-all font-bold text-xl rounded-none border-2 border-primary shadow-[4px_4px_0_rgba(255,255,255,0.2)]">
                                   <Link href="/dashboard">INSERT TAPE</Link>
                               </Button>
                               <Button size="lg" variant="outline" asChild className="h-16 px-8 border-2 border-zinc-700 text-zinc-300 hover:text-white hover:border-white font-mono rounded-none group">
                                   <Link href="#manual">
                                       READ MANUAL <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                   </Link>
                               </Button>
                           </div>
                      </div>
                  </div>

                  {/* Bottom Strip (Badges) */}
                  <div className="bg-zinc-950 py-4 px-8 flex justify-between items-center border-t-4 border-zinc-800">
                      <div className="flex gap-6 text-zinc-600 font-mono text-xs font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-2"><Music className="w-4 h-4" /> Noise Reduction ON</span>
                          <span className="flex items-center gap-2"><Radio className="w-4 h-4" /> Stereo</span>
                      </div>
                      <div className="text-zinc-700 font-black text-2xl tracking-tighter">JAPAN</div>
                  </div>
              </div>
           </div>
        </section>

        {/* FEATURE SECTION: THE MANUAL */}
        <section id="manual" className="bg-zinc-100 py-24 text-zinc-900 relative">
            <div className="container max-w-6xl">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 border-4 border-black p-8 bg-white shadow-xl relative">
                    {/* Fold Crease */}
                    <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-200 hidden md:block"></div>
                    
                    {/* Header */}
                    <div className="md:col-span-12 border-b-4 border-black pb-8 mb-8 text-center">
                        <h2 className="font-heading text-6xl font-black uppercase">Operating Instructions</h2>
                        <p className="font-mono text-lg mt-2">Model: BN-2025 // System Specs</p>
                    </div>

                    {/* Fig 1: Voting */}
                    <div className="md:col-span-4 p-4 border-2 border-zinc-200 hover:border-black transition-colors">
                        <div className="aspect-square bg-zinc-50 border border-zinc-200 mb-4 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,#000_25%,transparent_25%,transparent_75%,#000_75%,#000),linear-gradient(45deg,#000_25%,transparent_25%,transparent_75%,#000_75%,#000)] bg-[length:10px_10px] bg-[position:0_0,5px_5px] opacity-5"></div>
                            <Vote className="w-24 h-24 text-black" strokeWidth={1} />
                        </div>
                        <h3 className="font-bold font-mono text-xl mb-2">Fig 1. Consensus</h3>
                        <p className="font-serif text-zinc-600 leading-relaxed">
                            The system utilizes a democratic algorithm. Tracks with the highest vote velocity move to the top of the queue instantly.
                        </p>
                    </div>

                    {/* Fig 2: Sync */}
                    <div className="md:col-span-4 p-4 border-2 border-zinc-200 hover:border-black transition-colors">
                        <div className="aspect-square bg-zinc-50 border border-zinc-200 mb-4 flex items-center justify-center relative overflow-hidden">
                             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-200 via-transparent to-transparent opacity-50"></div>
                            <Headphones className="w-24 h-24 text-black" strokeWidth={1} />
                        </div>
                        <h3 className="font-bold font-mono text-xl mb-2">Fig 2. Synchronization</h3>
                        <p className="font-serif text-zinc-600 leading-relaxed">
                            Global state management ensures all clients hear the same frequency at the exact same millisecond.
                        </p>
                    </div>

                    {/* Fig 3: No Ads */}
                    <div className="md:col-span-4 p-4 border-2 border-zinc-200 hover:border-black transition-colors">
                        <div className="aspect-square bg-zinc-50 border border-zinc-200 mb-4 flex items-center justify-center relative overflow-hidden">
                            <div className="w-full h-px bg-black rotate-45 absolute"></div>
                            <div className="w-full h-px bg-black -rotate-45 absolute"></div>
                            <Appbar className="scale-50 opacity-20" /> 
                        </div>
                        <h3 className="font-bold font-mono text-xl mb-2">Fig 3. Signal Purity</h3>
                        <p className="font-serif text-zinc-600 leading-relaxed">
                            Advanced filtering algorithms block all commercial interruptions. 100% music throughput efficiency.
                        </p>
                    </div>
                    
                    <div className="md:col-span-12 mt-8 pt-8 border-t-2 border-dashed border-zinc-300 text-center font-mono text-xs text-zinc-400">
                        BEATNET CORP. © 2025 // PRINTED IN CYBERSPACE
                    </div>
                </div>
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
