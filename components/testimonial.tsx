"use client"

import { motion } from "framer-motion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface TestimonialProps {
  quote: string
  author: string
  role: string
}

export function Testimonial({ quote, author, role }: TestimonialProps) {
  const initials = author.split(" ").map(n => n[0]).join("")

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="premium-card p-6 flex flex-col justify-between gap-6 h-full"
    >
      <div className="relative">
        {/* Large opening quote */}
        <span className="absolute -top-3 -left-1 text-5xl text-primary/20 font-serif leading-none select-none">&ldquo;</span>
        <p className="relative z-10 pt-5 text-sm leading-relaxed text-muted-foreground">
          {quote}
        </p>
      </div>

      <div className="flex items-center gap-3 border-t border-border/60 pt-5">
        <Avatar className="h-9 w-9 border border-primary/20">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold text-foreground font-heading">{author}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{role}</p>
        </div>
      </div>
    </motion.div>
  )
}
