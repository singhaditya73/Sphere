"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  className?: string
}

export function FeatureCard({ icon, title, description, className }: FeatureCardProps) {
  return (
    <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
      <Card className="group transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 border-2 border-transparent hover:border-primary/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader>
          <motion.div
            className="mb-2 text-primary"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            {icon}
          </motion.div>
          <CardTitle className="group-hover:text-primary transition-colors duration-300">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="group-hover:text-foreground/80 transition-colors duration-300">
            {description}
          </CardDescription>
        </CardContent>
      </Card>
    </motion.div>
  )
}
