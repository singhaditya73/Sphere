"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Music, Loader2 } from "lucide-react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
    }, 1500)
  }

  const handleGoogleLogin = () => {
    setIsLoading(true)
    signIn("google", { callbackUrl: "/dashboard" })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background selection:bg-primary selection:text-black overflow-hidden relative">
      {/* Background Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none mix-blend-overlay dark:mix-blend-overlay mix-blend-multiply"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black opacity-80 dark:opacity-80 opacity-0"></div>
      
      {/* Back Link */}
      <header className="absolute top-0 left-0 w-full p-8 z-20">
        <Link href="/" className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors group font-mono text-sm uppercase tracking-widest">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Eject / Return</span>
        </Link>
      </header>

      <main className="w-full max-w-md relative z-10 p-4">
        {/* The Card / Access Module */}
        <div className="bg-card border-2 border-border shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden group">
           {/* Top Stripe */}
           <div className="h-2 bg-primary w-full"></div>
           
           <div className="p-8 relative">
              {/* Decorative Scan Lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.2)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none opacity-20"></div>

              <div className="flex justify-center mb-8 relative">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center border-4 border-border shadow-inner relative">
                    <Music className="h-8 w-8 text-primary animate-pulse" />
                    {/* Rotating Ring */}
                    <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin [animation-duration:3s]"></div>
                </div>
              </div>

              <div className="text-center mb-8">
                <h1 className="text-3xl font-heading font-black uppercase text-foreground tracking-tighter mb-2">Sphere<span className="text-primary"> // New User</span></h1>
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-[0.2em]">Register KeyCard</p>
              </div>

              <div className="space-y-6">
                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            placeholder="OPERATOR NAME"
                            required
                            className="bg-background border-2 border-border text-foreground font-mono placeholder:text-muted-foreground/50 h-12"
                        />
                    </div>
                    <div className="space-y-2">
                        <Input
                            type="email"
                            placeholder="COMM_LINK (EMAIL)"
                            required
                            className="bg-background border-2 border-border text-foreground font-mono placeholder:text-muted-foreground/50 h-12"
                        />
                    </div>
                     <div className="space-y-2">
                        <Input
                            type="password"
                            placeholder="ACCESS_CODE (PASSWORD)"
                            required
                            className="bg-background border-2 border-border text-foreground font-mono placeholder:text-muted-foreground/50 h-12"
                        />
                    </div>
                
                    <Button
                    type="submit"
                    className="w-full h-14 bg-background border-2 border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-border transition-all font-mono uppercase tracking-wider relative overflow-hidden group/btn"
                    disabled={isLoading}
                    >
                    {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <span className="relative z-10 flex items-center justify-center gap-3 font-bold">
                             INITIALIZE KEY
                        </span>
                    )}
                    </Button>
                </form>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-dashed border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground font-mono">Or Use Universal Link</span>
                    </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full h-12 bg-muted border-2 border-border text-muted-foreground hover:bg-background hover:text-foreground transition-all font-mono uppercase tracking-wider"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                   Login with Google
                </Button>
                
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase pt-4 border-t border-dashed border-border">
                    <span>Target System: G-7200</span>
                    <Link href="/login" className="hover:text-primary underline decoration-dotted underline-offset-4">
                        Has Key? [Insert]
                    </Link>
                </div>
              </div>
           </div>

           {/* Caution Strip */}
           <div className="bg-yellow-500/10 p-2 border-t-2 border-yellow-500/20 text-center">
              <p className="text-[10px] text-yellow-500 font-mono">Unauthorized access is strictly prohibited.</p>
           </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8 flex justify-center gap-4">
             <Link href="/terms" className="text-muted-foreground hover:text-foreground text-[10px] font-mono underline underline-offset-4 transition-colors">
                TOS_PROTOCOL
             </Link>
             <Link href="/privacy" className="text-muted-foreground hover:text-foreground text-[10px] font-mono underline underline-offset-4 transition-colors">
                PRIVACY_CORE
             </Link>
        </div>
      </main>
    </div>
  )
}