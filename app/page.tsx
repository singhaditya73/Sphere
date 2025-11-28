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
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          <Appbar />
        </div>
      </header>
      <main className="flex-1">
        <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-24">
          <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center mx-auto">
            <div className="flex items-center justify-center mb-5">
              <MusicVisualizer />
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl neon-text">
              Music Powered by{" "}
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
                Democracy
              </span>
            </h1>
            <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              BeatNet lets everyone have a say in what plays next. Vote for your favorite tracks and let the crowd
              decide the playlist.
            </p>
            <div className="space-x-4">
              <Button size="lg" asChild className="group hover-lift glow">
                <Link href="/dashboard">
                  Enter Rooms <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="hover-lift">
                <Link href="#how-it-works">How It Works</Link>
              </Button>
            </div>
          </div>
          <div className="container relative h-[400px] sm:h-[500px] md:h-[600px]">
            <HeroAnimation />
          </div>
        </section>

        {/* Featured Playlist Section */}
        <section className="container py-8 md:py-12">
          <div className="mx-auto max-w-4xl">
            <PlaylistPreview />
          </div>
        </section>

        <section
          id="features"
          className="container space-y-6 bg-slate-50 py-8 dark:bg-slate-900/30 md:py-12 lg:py-24 rounded-xl"
        >
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">Features</h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              BeatNet brings people together through the power of music and democratic choice.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            <FeatureCard
              icon={<Vote className="h-10 w-10 text-primary" />}
              title="Democratic Voting"
              description="Every user gets a vote. The most popular songs rise to the top of the queue."
            />
            <FeatureCard
              icon={<Users className="h-10 w-10 text-primary" />}
              title="Community Playlists"
              description="Create rooms for different vibes and moods. Join existing communities or start your own."
            />
            <FeatureCard
              icon={<Headphones className="h-10 w-10 text-primary" />}
              title="Synchronized Listening"
              description="Everyone hears the same track at the same time, creating a shared experience."
            />
            <FeatureCard
              icon={<Radio className="h-10 w-10 text-primary" />}
              title="Live DJ Sessions"
              description="Take turns being the DJ and showcase your music taste to the community."
            />
            <FeatureCard
              icon={<Mic2 className="h-10 w-10 text-primary" />}
              title="Artist Discovery"
              description="Discover new artists and genres through community recommendations."
            />
            <FeatureCard
              icon={<Music className="h-10 w-10 text-primary" />}
              title="Music Analytics"
              description="Track your listening habits and see what's trending in your community."
            />
          </div>
        </section>
        <section id="how-it-works" className="container space-y-6 py-8 md:py-12 lg:py-24">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">How It Works</h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Getting started with BeatNet is easy. Follow these simple steps to join the musical democracy.
            </p>
          </div>
          <HowItWorks />
        </section>
        <section
          id="testimonials"
          className="container space-y-6 bg-slate-50 py-8 dark:bg-slate-900/30 md:py-12 lg:py-24 rounded-xl"
        >
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">What Our Community Says</h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Join thousands of music lovers who are already part of the BeatNet community.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            <Testimonial
              quote="BeatNet has completely changed how my friends and I listen to music together. No more fighting over the aux cord!"
              author="Alex Johnson"
              role="DJ & Producer"
            />
            <Testimonial
              quote="I've discovered so many new artists through BeatNet communities. It's like having thousands of friends with great music taste."
              author="Samantha Lee"
              role="Music Blogger"
            />
            <Testimonial
              quote="We use BeatNet at our office to keep everyone happy with the background music. Democracy works!"
              author="Michael Chen"
              role="Startup Founder"
            />
          </div>
        </section>
        <section className="container py-6 md:py-12 lg:py-24 px-4 sm:px-6">
          <div className="mx-auto max-w-[58rem] space-y-6 bg-slate-900 px-6 py-10 text-white dark:bg-slate-50 dark:text-slate-900 sm:px-12 sm:py-16 md:px-16 md:py-20 lg:px-24 lg:py-24 xl:px-32 xl:py-28 rounded-2xl sm:rounded-3xl hover-lift glow">
            <h2 className="font-heading text-2xl leading-[1.1] sm:text-3xl md:text-4xl text-center">
              Ready to join the musical democracy?
            </h2>
            <p className="leading-normal text-muted-foreground text-sm sm:text-base md:text-lg sm:leading-7 text-center dark:text-slate-700 text-slate-300">
              Sign up today and start voting on your favorite tracks. No credit card required.
            </p>
            <div className="flex justify-center">
              <Button size="lg" className="mt-4 group w-full sm:w-auto" asChild>
                <Link href="/signup">
                  Get Started <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
            <Music className="h-6 w-6" />
            <p className="text-center text-sm leading-loose md:text-left">
              &copy; {new Date().getFullYear()} BeatNet. All rights reserved.
            </p>
          </div>
          <div className="flex gap-4">
            <Link href="/terms" className="text-sm underline underline-offset-4 hover:text-primary transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-sm underline underline-offset-4 hover:text-primary transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
