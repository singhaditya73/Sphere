"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Music, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/mode-toggle"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = () => {
    setIsLoading(true)
    signIn("google", { callbackUrl: "/dashboard" })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 selection:bg-primary selection:text-black overflow-hidden relative">
      {/* Background Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black opacity-80"></div>
      
      {/* Back Link */}
      <header className="absolute top-0 left-0 w-full p-8 z-20">
        <Link href="/" className="flex items-center space-x-2 text-zinc-500 hover:text-primary transition-colors group font-mono text-sm uppercase tracking-widest">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Eject / Return</span>
        </Link>
      </header>

      <main className="w-full max-w-md relative z-10 p-4">
        {/* The Card / Access Module */}
        <div className="bg-zinc-900 border-2 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden group">
           {/* Top Stripe */}
           <div className="h-2 bg-primary w-full"></div>
           
           <div className="p-8 relative">
              {/* Decorative Scan Lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.2)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none opacity-20"></div>

              <div className="flex justify-center mb-8 relative">
                <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center border-4 border-zinc-700 shadow-inner relative">
                    <Music className="h-8 w-8 text-primary animate-pulse" />
                    {/* Rotating Ring */}
                    <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin [animation-duration:3s]"></div>
                </div>
              </div>

              <div className="text-center mb-8">
                <h1 className="text-3xl font-heading font-black uppercase text-zinc-100 tracking-tighter mb-2">BeatNet<span className="text-primary"> // Access</span></h1>
                <p className="font-mono text-xs text-zinc-500 uppercase tracking-[0.2em]">Identify to Proceed</p>
              </div>

              <div className="space-y-6">
                <Button
                  variant="outline"
                  className="w-full h-14 bg-zinc-800 border-2 border-zinc-700 text-zinc-300 hover:bg-zinc-100 hover:text-black hover:border-white transition-all font-mono uppercase tracking-wider relative overflow-hidden group/btn"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                    <span className="relative z-10 flex items-center justify-center gap-3 font-bold">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                             <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                             <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                             <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                             <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Insert KeyCard [Google]
                    </span>
                    </>
                  )}
                </Button>
                
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-600 uppercase pt-4 border-t border-dashed border-zinc-800">
                    <span>Secured Connection</span>
                    <span>Class 2 Auth</span>
                </div>
              </div>
           </div>

           {/* Caution Strip */}
           <div className="bg-yellow-500/10 p-2 border-t-2 border-yellow-500/20 text-center">
              <p className="text-[10px] text-yellow-500 font-mono">Use only authorized credentials.</p>
           </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8">
             <Link href="/signup" className="text-zinc-600 hover:text-zinc-400 text-xs font-mono underline underline-offset-4 transition-colors">
                Apply for KeyCard [Sign Up]
             </Link>
        </div>
      </main>
    </div>
  )
}
