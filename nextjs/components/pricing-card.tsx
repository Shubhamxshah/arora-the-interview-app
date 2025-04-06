"use client"

import { motion } from "framer-motion"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PricingCardProps {
  name: string
  price: string
  description: string
  features: string[]
  cta: string
  popular: boolean
  index: number
}

export default function PricingCard({ name, price, description, features, cta, popular, index }: PricingCardProps) {
  return (
    <motion.div
      className={cn(
        "rounded-xl p-6 shadow-lg transition-all",
        popular
          ? "bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 text-white border-0 scale-105 shadow-xl"
          : "bg-white border border-gray-200",
      )}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      {popular && (
        <div className="bg-white/20 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full w-fit mb-4">
          Most Popular
        </div>
      )}
      <h3 className={cn("text-2xl font-bold", !popular && "text-gray-900")}>{name}</h3>
      <div className="mt-4 mb-6">
        <span className={cn("text-3xl font-bold", !popular && "text-gray-900")}>{price}</span>
        <span className={cn("text-sm ml-1", popular ? "text-gray-200" : "text-gray-500")}>
          {price !== "Custom" && "/month"}
        </span>
      </div>
      <p className={cn("mb-6", popular ? "text-gray-200" : "text-gray-600")}>{description}</p>
      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start">
            <CheckCircle className={cn("h-5 w-5 mr-2 flex-shrink-0", popular ? "text-cyan-300" : "text-emerald-500")} />
            <span className={cn(popular ? "text-gray-200" : "text-gray-600")}>{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        className={cn(
          "w-full",
          popular
            ? "bg-white text-indigo-900 hover:bg-white/90"
            : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white",
        )}
      >
        {cta}
      </Button>
    </motion.div>
  )
}


