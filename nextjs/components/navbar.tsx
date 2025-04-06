"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signIn } from "next-auth/react"

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { name: "Features", href: "#features" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Pricing", href: "#pricing" },
    { name: "Testimonials", href: "#testimonials" },
    { name: "Contact", href: "#contact" },
  ]

  return (
    <header className="relative z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center">
              <span className="text-white font-bold text-xl">AI</span>
            </div>
            <span className="text-white font-bold text-xl">InterviewPro</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link key={item.name} href={item.href} className="text-white/80 hover:text-white transition-colors">
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-4">
                  <Button variant="ghost" onClick={() => signIn("google", { redirectTo: "/dashboard"})} className="text-white hover:bg-white/10 cursor-pointer w-full">
                Sign In
                  </Button>
            <Button className="bg-white text-indigo-900 hover:bg-white/90">Get Started</Button>
          </div>

          <button className="md:hidden text-white" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="md:hidden absolute top-full left-0 right-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 backdrop-blur-lg"
        >
          <div className="container mx-auto px-4 py-4">
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-white/80 hover:text-white transition-colors py-2"
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 border-t border-white/10 flex flex-col space-y-4">
                  <Button variant="ghost" onClick={() => signIn("google", {redirectTo: "/dashboard"})} className="text-white hover:bg-white/10 cursor-pointer w-full">
                Sign In
                  </Button>
                <Button className="bg-white text-indigo-900 hover:bg-white/90 w-full">Get Started</Button>
              </div>
            </nav>
          </div>
        </motion.div>
      )}
    </header>
  )
}


