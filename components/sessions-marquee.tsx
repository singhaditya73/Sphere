"use client";

import Link from "next/link";
import { ArrowRight, Play, Users } from "lucide-react";

interface TopRoom {
  id: string;
  code: string;
  name: string;
  hostEmail: string;
  streamCount: number;
}

export function SessionsMarquee({ rooms }: { rooms: TopRoom[] }) {
  // Duplicate items to ensure seamless loop
  const displayItems = rooms.length > 5 ? [...rooms, ...rooms] : [...rooms, ...rooms, ...rooms, ...rooms];

  if (rooms.length === 0) return null;

  return (
    <div className="w-full relative overflow-hidden py-6 group">
      {/* Gradient Fade Edges */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none"></div>

      <div className="flex overflow-hidden select-none">
        {/* First Loop */}
        <div className="flex gap-6 animate-marquee min-w-full shrink-0 items-stretch px-3">
          {displayItems.map((room, i) => (
             <SessionCard key={`${room.id}-${i}`} room={room} />
          ))}
        </div>
        {/* Second Loop */}
        <div className="flex gap-6 animate-marquee min-w-full shrink-0 items-stretch px-3" aria-hidden="true">
          {displayItems.map((room, i) => (
             <SessionCard key={`${room.id}-dup-${i}`} room={room} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SessionCard({ room }: { room: TopRoom }) {
  return (
    <Link 
      href={`/room/${room.id}`}
      className="block relative w-80 shrink-0 group/card"
    >
      <div className="h-full premium-card p-6 overflow-hidden relative flex flex-col justify-between">
         <div>
            <div className="flex justify-between items-start mb-3">
              <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary tracking-wider uppercase">
                Listening Now
              </div>
            </div>

            <h3 className="font-heading font-bold text-lg mb-1 truncate text-foreground group-hover/card:text-primary transition-colors">
              {room.name}
            </h3>
            
            <p className="text-xs text-muted-foreground truncate">
              Hosted by {room.hostEmail?.split('@')[0] || "Host"}
            </p>
         </div>

         <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
               <Users className="w-3.5 h-3.5" />
               {room.streamCount} {room.streamCount === 1 ? 'track' : 'tracks'} queued
            </span>
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground opacity-0 scale-90 group-hover/card:opacity-100 group-hover/card:scale-100 transition-all duration-200">
               <Play className="w-3 h-3 fill-current ml-0.5" />
            </div>
         </div>
      </div>
    </Link>
  );
}
