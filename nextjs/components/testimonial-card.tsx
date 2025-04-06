"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { Quote } from "lucide-react"

interface TestimonialCardProps {
  name: string
  role: string
  content: string
  avatar: string
  index: number
}

export default function TestimonialCard({ name, role, content, avatar, index }: TestimonialCardProps) {
  return (
    <motion.div
      className="bg-white/10 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/10"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <Quote className="h-8 w-8 text-cyan-300 mb-4" />
      <p className="text-gray-200 mb-6">{content}</p>
      <div className="flex items-center">
        <div className="h-12 w-12 rounded-full overflow-hidden mr-4">
          <Image src={avatar || "/placeholder.svg"} alt={name} width={48} height={48} className="object-cover" />
        </div>
        <div>
          <h4 className="font-medium text-white">{name}</h4>
          <p className="text-gray-300 text-sm">{role}</p>
        </div>
      </div>
    </motion.div>
  )
}


