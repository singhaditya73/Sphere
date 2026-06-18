"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Circle } from "lucide-react"
import { signIn } from "next-auth/react"

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const handleGoogleLogin = () => {
    setIsLoading(true)
    signIn("google", { callbackUrl })
  }

  return (
    <div className="bg-[#121212] border border-[#27272A] shadow-lg rounded-2xl p-8 space-y-6">
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 bg-[#10B981]/10 rounded-full flex items-center justify-center">
          <Circle className="h-6 w-6 text-[#10B981] fill-[#10B981]/20" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-2xl font-heading font-black tracking-tight text-white">
          Welcome to sphere
        </h1>
        <p className="text-xs text-[#A1A1AA]">
          Sign in to join the shared listening queue
        </p>
      </div>

      <div className="space-y-4">
        <button
          className="w-full h-11 bg-[#090909] border border-[#27272A] text-white hover:bg-[#18181B] transition-all font-bold text-xs flex items-center justify-center gap-2.5 rounded-xl cursor-pointer"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#A1A1AA]" />
          ) : (
            <>
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </>
          )}
        </button>
      </div>

      <div className="text-center pt-4 border-t border-[#27272A]/60 text-[10px] text-[#A1A1AA] uppercase tracking-widest font-mono">
        Secured via NextAuth
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#090909] p-6 relative">
      {/* Back Link */}
      <header className="absolute top-0 left-0 w-full p-8">
        <Link href="/" className="inline-flex items-center space-x-2 text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors font-bold text-xs uppercase tracking-wider">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
      </header>

      <main className="w-full max-w-sm relative">
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#10B981]" />
          </div>
        }>
          <LoginContent />
        </Suspense>
      </main>
    </div>
  )
}
