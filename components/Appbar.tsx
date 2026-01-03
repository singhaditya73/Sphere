"use client";

import { signOut, useSession } from "next-auth/react";
import React from "react";
import { ModeToggle } from "./mode-toggle";
import Link from "next/link";
import { Button } from "./ui/button";
import { ArrowRight, Music } from "lucide-react";


import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AppbarProps {
  className?: string;
}

export function Appbar({ className = "" }: AppbarProps) {
  const session = useSession();

  return (
    <div className={`container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center space-x-2 group">
          <Music className="h-6 w-6 transition-transform group-hover:scale-110 group-hover:text-primary" />
          <span className="inline-block font-bold transition-colors group-hover:text-primary">
            BeatNet
          </span>
        </Link>
        <nav className="hidden gap-6 md:flex">
          <Link
            href="#features"
            className="flex items-center text-lg font-medium transition-colors hover:text-primary relative group"
          >
            Features
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
          </Link>
          <Link
            href="#how-it-works"
            className="flex items-center text-lg font-medium transition-colors hover:text-primary relative group"
          >
            How It Works
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
          </Link>
          <Link
            href="#testimonials"
            className="flex items-center text-lg font-medium transition-colors hover:text-primary relative group"
          >
            Community
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
          </Link>
        </nav>
      </div>

      <div className="flex justify-end ml-auto">
        <div className="flex items-center space-x-4">
          <ModeToggle />

          {session.data?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full border-2 border-primary/20 hover:border-primary transition-colors focus:ring-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={session.data.user.image || ""} alt={session.data.user.name || "User"} />
                    <AvatarFallback className="bg-zinc-800 text-primary font-mono font-bold">
                      {session.data.user.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-zinc-900 border-2 border-zinc-800 text-zinc-300 shadow-xl" align="end" forceMount>
                <DropdownMenuLabel className="font-normal border-b border-zinc-800 pb-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-white font-heading tracking-wide uppercase">{session.data.user.name}</p>
                    <p className="text-xs leading-none text-zinc-500 font-mono truncate">
                      {session.data.user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem 
                  className="cursor-pointer text-zinc-400 hover:text-white hover:bg-zinc-800 focus:bg-zinc-800 focus:text-white font-mono uppercase text-xs tracking-wider"
                  onClick={() => signOut()}
                >
                  <ArrowRight className="mr-2 h-3 w-3" />
                  Eject Cassette (Log Out)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button variant="outline" className="group border-2 border-zinc-700 bg-transparent text-zinc-300 hover:text-white hover:border-white hover:bg-zinc-800">
                Sign In
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 " />
              </Button>
            </Link>
          )}

        </div>
      </div>
    </div>
  );
}