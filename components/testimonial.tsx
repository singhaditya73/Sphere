"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface TestimonialProps {
  quote: string
  author: string
  role: string
}

export function Testimonial({ quote, author, role }: TestimonialProps) {
  const initials = author
    .split(" ")
    .map((name) => name[0])
    .join("")

  return (
    <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
      <Card className="h-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 border-2 border-transparent hover:border-primary/20 bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="relative">
            <div className="absolute -left-2 -top-4 text-6xl text-primary/20 font-serif leading-none">&ldquo;</div>
            <motion.blockquote className="relative z-10 pt-4 font-mono text-sm leading-relaxed text-muted-foreground" initial={{ opacity: 0.8 }} whileHover={{ opacity: 1 }}>
              {quote}
            </motion.blockquote>
          </div>
        </CardContent>
        <CardFooter className="pb-6 pt-0">
          <div className="flex items-center gap-4 border-t border-border/50 pt-4 w-full">
            <motion.div whileHover={{ scale: 1.1 }} transition={{ type: "spring", stiffness: 400 }}>
              <Avatar className="h-10 w-10 border border-primary/50">
                <AvatarFallback className="bg-primary/10 text-primary font-mono font-bold">{initials}</AvatarFallback>
              </Avatar>
            </motion.div>
            <div>
              <div className="font-heading font-bold uppercase text-foreground">{author}</div>
              <div className="text-[10px] font-mono text-primary uppercase tracking-widest">{role}</div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
