"use client";

import Link from "next/link";
import { Circle, Twitter, Github, Linkedin, ArrowUpRight } from "lucide-react";

export function MegaFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t border-white/10 bg-black pt-12 pb-8 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="container mx-auto max-w-7xl px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8">
          
          {/* Brand Column */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-3 w-fit group">
               <div className="relative">
                 <Circle className="w-8 h-8 text-primary fill-primary/20 group-hover:scale-110 transition-transform" />
               </div>
               <span className="font-heading font-black text-2xl tracking-tighter">sphere</span>
            </Link>
            <p className="text-muted-foreground max-w-sm leading-relaxed text-sm">
              Shared listening, democratic queues. Everyone votes, everyone hears. 
            </p>
            <div className="flex gap-4 mt-1">
               {[Twitter, Github, Linkedin].map((Icon, i) => (
                 <a key={i} href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-black transition-all hover:-translate-y-1">
                    <Icon className="w-3 h-3" />
                 </a>
               ))}
            </div>
          </div>

          {/* Links Grid */}
          <div className="md:col-span-8 flex justify-end gap-16 items-center">
             <div>
                <h4 className="font-bold text-sm mb-4 text-white">Explore</h4>
                <ul className="space-y-2">
                   {['Features', 'Live Sessions'].map(item => (
                      <li key={item}>
                         <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group">
                           {item}
                           <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 -translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all" />
                         </Link>
                      </li>
                   ))}
                </ul>
             </div>
             <div>
                <h4 className="font-bold text-sm mb-4 text-white">Legal</h4>
                <ul className="space-y-2">
                   {['Privacy Policy', 'Terms of Service'].map(item => (
                      <li key={item}>
                         <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                           {item}
                         </Link>
                      </li>
                   ))}
                </ul>
             </div>
          </div>
        </div>

        {/* MASSIVE TEXT */}
        <div className="border-t border-white/5 pt-8">
           <h1 className="text-[12vw] leading-[0.8] font-black font-heading text-center text-transparent bg-clip-text bg-gradient-to-b from-white/10 to-transparent select-none pointer-events-none">
              SPHERE
           </h1>
           <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-8 text-sm text-muted-foreground">
              <p>© {currentYear} Sphere. All rights reserved.</p>
              <div className="flex items-center gap-8">
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
