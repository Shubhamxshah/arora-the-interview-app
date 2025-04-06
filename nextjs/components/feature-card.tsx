"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Calendar, FileText, User, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface FeatureCardProps {
  title: string
  description: string
  icon: string
  color: string
  index: number
}

export default function FeatureCard({ title, description, icon, color, index }: FeatureCardProps) {
  const icons: Record<string, React.ReactNode> = {
    avatar: <User className="h-6 w-6" />,
    calendar: <Calendar className="h-6 w-6" />,
    transcript: <FileText className="h-6 w-6" />,
    report: <BarChart3 className="h-6 w-6" />,
  }

  return (
    <motion.div
      className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <div
        className={cn("h-14 w-14 rounded-lg flex items-center justify-center text-white mb-6 bg-gradient-to-r", color)}
      >
        {icons[icon]}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </motion.div>
  )
}


