"use client";

import { motion } from "framer-motion";
import { Vote, Headphones, Zap, Globe, ArrowUp } from "lucide-react";

const bentoItems = [
  {
    title: "Democratic Playlists",
    description: "Every vote counts. The most upvoted tracks rise to the top instantly.",
    icon: Vote,
    className: "md:col-span-2 md:row-span-2",
    bgClass: "bg-primary/5 hover:bg-primary/10",
    textClass: "text-primary",
    graphic: (
       <div className="absolute right-4 bottom-4 flex flex-col gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2 text-xs font-mono text-primary bg-primary/20 px-2 py-1 rounded border border-primary/30">
             <ArrowUp className="w-3 h-3" /> +12 Votes
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/20 px-2 py-1 rounded border border-white/5">
             <ArrowUp className="w-3 h-3" /> +3 Votes
          </div>
       </div>
    )
  },
  {
    title: "Perfect Sync",
    description: "Sub-millisecond latency. We're all listening to the exact same beat.",
    icon: Headphones,
    className: "md:col-span-1 md:row-span-1",
    bgClass: "bg-secondary/5 hover:bg-secondary/10",
    textClass: "text-secondary",
    graphic: (
        <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-60 transition-opacity">
           <div className="flex gap-1 items-end h-16">
              {[1,2,3,4,5].map(i => (
                 <motion.div 
                    key={i} 
                    className="w-1 bg-secondary rounded-full"
                    animate={{ height: ["20%", "80%", "40%"] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                 />
              ))}
           </div>
        </div>
    )
  },
  {
    title: "Zero Ads",
    description: "100% music throughput. No interruptions. Ever.",
    icon: Zap,
    className: "md:col-span-1 md:row-span-1",
    bgClass: "bg-emerald-500/5 hover:bg-emerald-500/10",
    textClass: "text-emerald-400",
    graphic: (
        <div className="absolute top-4 right-4 text-xs font-bold border border-emerald-500/30 text-emerald-500 px-2 py-0.5 rounded uppercase tracking-widest opacity-50 group-hover:opacity-100">
           Ad-Free
        </div>
    )
  },
  {
    title: "Global Community",
    description: "Join rooms from around the world. Connect through frequency.",
    icon: Globe,
    className: "md:col-span-3 md:row-span-1",
    bgClass: "bg-orange-500/5 hover:bg-orange-500/10",
    textClass: "text-orange-400",
    graphic: (
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-orange-500/10 to-transparent"></div>
    )
  }
];

export function BentoFeatures() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mx-auto max-w-6xl">
      {bentoItems.map((item, i) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
          className={`group relative overflow-hidden rounded-3xl border border-white/5 p-6 md:p-8 flex flex-col justify-between transition-all hover:border-white/10 ${item.className} ${item.bgClass}`}
        >
          {/* Content */}
          <div className="relative z-10 flex flex-col items-start gap-4">
            <div className={`p-3 rounded-2xl bg-black/20 backdrop-blur-sm border border-white/5 ${item.textClass} transition-transform group-hover:scale-110 duration-300`}>
              <item.icon className="w-6 h-6" />
            </div>
            <div>
               <h3 className="font-heading font-bold text-xl md:text-2xl mb-2">{item.title}</h3>
               <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
                 {item.description}
               </p>
            </div>
          </div>

          {/* Graphic/Decor */}
          {item.graphic}
        </motion.div>
      ))}
    </div>
  );
}
