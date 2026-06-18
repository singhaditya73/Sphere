"use client";

import Link from "next/link";
import { Circle, ArrowUpRight } from "lucide-react";

export function MegaFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t border-white/10 bg-black pt-8 pb-4 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="container mx-auto max-w-7xl px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-4">
          
          {/* Brand Column */}
          <div className="md:col-span-4 flex flex-col gap-2">
            <Link href="/" className="flex items-center gap-2.5 w-fit group">
               <div className="relative">
                 <Circle className="w-7 h-7 text-primary fill-primary/20 group-hover:scale-110 transition-transform" />
               </div>
               <span className="font-heading font-black text-xl tracking-tighter">sphere</span>
            </Link>
            <p className="text-muted-foreground max-w-sm leading-relaxed text-xs">
              Shared listening, democratic queues. Everyone votes, everyone hears. 
            </p>
          </div>

          {/* Links Grid */}
          <div className="md:col-span-8 flex flex-wrap md:justify-end gap-8 md:gap-12 items-start md:items-center">
             <div className="min-w-[100px]">
                <h4 className="font-bold text-xs mb-3 text-white uppercase tracking-wider">Explore</h4>
                <ul className="space-y-1.5">
                   {['Features', 'Live Sessions'].map(item => (
                      <li key={item}>
                         <Link href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group">
                           {item}
                           <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 -translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all" />
                         </Link>
                      </li>
                   ))}
                </ul>
             </div>
          </div>
        </div>

        {/* MASSIVE TEXT & Credits */}
        <div className="border-t border-white/5 pt-4 mt-4">
           <h1 className="text-[9vw] leading-[0.7] font-black font-heading text-center text-transparent bg-clip-text bg-gradient-to-b from-white/10 to-transparent select-none pointer-events-none mb-4">
              SPHERE
           </h1>
           <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
              <p>© {currentYear} Sphere. All rights reserved.</p>
              <div className="flex items-center gap-6">
                 <span>Designed by Sphere</span>
                 <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                 <span>Built in Next.js</span>
              </div>
           </div>
        </div>
      </div>
    </footer>
  );
}
