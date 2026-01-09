"use client";

import { signOut, useSession } from "next-auth/react";
import React from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { ArrowRight, Circle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AppbarProps {
  className?: string;
}

export function Appbar({ className = "" }: AppbarProps) {
  const session = useSession();

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-4 pointer-events-none ${className}`}>
      <header className="pointer-events-auto w-full max-w-5xl rounded-full border border-border/40 bg-background/80 backdrop-blur-xl shadow-2xl shadow-primary/10 flex items-center justify-between pl-6 pr-2 py-2 transition-all duration-300 hover:border-primary/30 hover:shadow-primary/20 glow-green/0 hover:glow-green">
        
        {/* LOGO */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
               <Circle className="h-8 w-8 text-primary fill-primary/20 transition-all group-hover:fill-primary/40 group-hover:scale-110" strokeWidth={2} />
               <div className="absolute inset-0 rounded-full bg-primary/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <span className="inline-block font-heading font-black text-2xl tracking-tight transition-colors group-hover:text-primary text-glow-green/0 group-hover:text-glow-green">
              sphere
            </span>
          </Link>
          
          {/* DESKTOP NAV */}
          <nav className="hidden gap-1 md:flex items-center ml-6">
            {["Features", "Experience", "Community"].map((item) => (
               <Link
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-all hover:bg-primary/10 rounded-full"
              >
                {item}
              </Link>
            ))}
          </nav>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center space-x-3">
          {session.data?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full border-2 border-primary/20 hover:border-primary transition-colors focus:ring-0 p-0 overflow-hidden group">
                  <Avatar className="h-full w-full">
                    <AvatarImage src={session.data.user.image || ""} alt={session.data.user.name || "User"} className="group-hover:scale-110 transition-transform duration-500" />
                    <AvatarFallback className="bg-muted text-primary font-mono font-bold">
                      {session.data.user.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-card/95 backdrop-blur-md border-border text-foreground shadow-2xl rounded-xl mt-2" align="end" forceMount>
                <DropdownMenuLabel className="font-normal border-b border-border pb-3">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-black leading-none text-foreground font-heading tracking-wide uppercase">{session.data.user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground font-mono truncate opacity-70">
                      {session.data.user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <div className="p-1">
                  <DropdownMenuItem 
                    className="cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted focus:bg-muted focus:text-foreground font-mono uppercase text-xs tracking-wider rounded-lg py-2"
                    onClick={() => signOut()}
                  >
                    <ArrowRight className="mr-2 h-3 w-3" />
                    Disconnect
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button size="sm" className="rounded-full px-6 font-bold tracking-wide shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-105">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </header>
    </div>
  );
}