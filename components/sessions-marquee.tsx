"use client";

import Link from "next/link";
import { ArrowRight, Music, User } from "lucide-react";

interface TopRoom {
  id: string;
  code: string;
  name: string;
  hostEmail: string;
  streamCount: number;
}

export function SessionsMarquee({ rooms }: { rooms: TopRoom[] }) {
  // If we have real data, duplicate it to ensure seamless loop
  const displayItems = rooms.length > 5 ? [...rooms, ...rooms] : [...rooms, ...rooms, ...rooms, ...rooms];

  if (rooms.length === 0) return null;

  return (
    <div className="w-full relative overflow-hidden py-10 group">
      {/* Gradient Fade Edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none"></div>

      <div className="flex overflow-hidden select-none">
        {/* First Loop */}
        <div className="flex gap-6 animate-marquee min-w-full shrink-0 items-stretch px-3">
          {displayItems.map((room, i) => (
             <SessionCard key={`${room.id}-${i}`} room={room} />
          ))}
        </div>
        {/* Second Loop (Immediate Follow) */}
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
      href={`/room/${room.code}`}
      className="block relative w-80 shrink-0 group/card"
    >
      <div className="h-full glass-card p-6 hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 overflow-hidden relative rounded-2xl bg-card/30">
         {/* Background Glow */}
         <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover/card:bg-primary/20 transition-colors"></div>
         
         <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/20 group-hover/card:scale-110 transition-transform">
                 <Music className="w-5 h-5 text-secondary" />
              </div>
              <span className="px-2 py-1 rounded bg-primary/10 border border-primary/20 text-[10px] font-mono text-primary animate-pulse">
                LIVE
              </span>
            </div>

            <h3 className="font-heading font-black text-xl mb-1 truncate text-foreground group-hover/card:text-primary transition-colors">
              {room.name}
            </h3>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
               <User className="w-3 h-3" />
               <span className="truncate max-w-[150px]">{room.hostEmail.split('@')[0]}</span>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
               <span className="text-xs font-mono text-muted-foreground">
                  {room.streamCount} {room.streamCount === 1 ? 'Track' : 'Tracks'}
               </span>
               <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground opacity-0 -translate-x-2 group-hover/card:opacity-100 group-hover/card:translate-x-0 transition-all">
                  <ArrowRight className="w-4 h-4" />
               </div>
            </div>
         </div>
      </div>
    </Link>
  );
}
