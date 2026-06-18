"use client";

import { signOut, useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Circle, LogOut, LayoutGrid } from "lucide-react";

interface AppbarProps {
  className?: string;
}

export function Appbar({ className = "" }: AppbarProps) {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const user = session.data?.user;
  const initials = user?.name?.charAt(0).toUpperCase() ?? "U";

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 flex justify-center pt-5 px-4 pointer-events-none ${className}`}>
      <header className="pointer-events-auto w-full max-w-5xl rounded-full border border-[#27272A] bg-[#121212]/80 backdrop-blur-md flex items-center justify-between pl-5 pr-2 py-2 shadow-lg">

        {/* Logo */}
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2 group">
            <Circle
              className="h-4.5 w-4.5 text-[#10B981] fill-[#10B981]/15 group-hover:fill-[#10B981]/25 transition-all"
              strokeWidth={2.5}
            />
            <span className="font-heading font-black text-lg tracking-tight text-[#FAFAFA] group-hover:text-[#10B981] transition-colors">
              sphere
            </span>
          </Link>

          {user && (
            <nav className="hidden md:flex items-center">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors rounded-full hover:bg-[#18181B]"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Dashboard
              </Link>
            </nav>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen(v => !v)}
                className="h-9 w-9 rounded-full border border-[#27272A] hover:border-[#10B981]/50 overflow-hidden transition-colors focus:outline-none cursor-pointer"
              >
                {user.image ? (
                  <img src={user.image} alt={user.name ?? "User"} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#18181B] flex items-center justify-center text-xs font-bold text-[#10B981]">
                    {initials}
                  </div>
                )}
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-52 bg-[#121212] border border-[#27272A] rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-[#27272A]/60">
                    <p className="text-xs font-bold text-[#FAFAFA] truncate">{user.name}</p>
                    <p className="text-[10px] text-[#A1A1AA] truncate mt-0.5">{user.email}</p>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181B] transition-colors text-left md:hidden"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Dashboard
                  </Link>
                  <button
                    onClick={() => { setOpen(false); signOut(); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181B] transition-colors text-left cursor-pointer border-t border-[#27272A]/40 md:border-t-0"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[#10B981] hover:bg-[#10B981]/90 text-white transition-colors text-xs font-bold px-5 py-2"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>
    </div>
  );
}