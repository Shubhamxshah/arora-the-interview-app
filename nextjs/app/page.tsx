"use client"

import { useEffect, useRef } from "react"
import { motion, useScroll, useTransform, useAnimation } from "framer-motion"
import Image from "next/image"
import { ArrowRight, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import FeatureCard from "@/components/feature-card"
import TestimonialCard from "@/components/testimonial-card"
import PricingCard from "@/components/pricing-card"

export default function Home() {
  const controls = useAnimation()
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1])

  useEffect(() => {
    controls.start({
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    })
  }, [controls])

  const features = [
    {
      title: "AI-Powered Avatars",
      description:
        "Create personalized avatars that conduct interviews on your behalf, maintaining your company's voice and standards.",
      icon: "avatar",
      color: "from-purple-500 to-blue-500",
    },
    {
      title: "Automated Interviews",
      description: "Schedule and conduct interviews 24/7, allowing candidates to complete them at their convenience.",
      icon: "calendar",
      color: "from-blue-500 to-cyan-400",
    },
    {
      title: "Smart Transcription",
      description: "Get accurate transcripts of every interview with highlighted key points and insights.",
      icon: "transcript",
      color: "from-cyan-400 to-emerald-500",
    },
    {
      title: "AI Summary Reports",
      description: "Receive comprehensive candidate summaries with skill assessments and personality insights.",
      icon: "report",
      color: "from-emerald-500 to-yellow-500",
    },
  ]

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "HR Director, TechCorp",
      content:
        "This platform has revolutionized our hiring process. We've reduced interview time by 70% while getting more insightful candidate data.",
      avatar: "/placeholder.svg?height=80&width=80",
    },
    {
      name: "Michael Chen",
      role: "Talent Acquisition, StartupX",
      content:
        "The AI summaries are incredibly accurate. It's like having an expert interviewer and analyst on the team without the overhead.",
      avatar: "/placeholder.svg?height=80&width=80",
    },
    {
      name: "Jessica Williams",
      role: "Recruiting Manager, Enterprise Solutions",
      content:
        "Our candidates love the flexibility of completing interviews on their own time, and we love the consistent evaluation standards.",
      avatar: "/placeholder.svg?height=80&width=80",
    },
  ]

  const pricingPlans = [
    {
      name: "Starter",
      price: "$99",
      description: "Perfect for small businesses and startups",
      features: [
        "10 AI interviews per month",
        "Basic avatar customization",
        "Interview transcripts",
        "Basic candidate summaries",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Professional",
      price: "$249",
      description: "Ideal for growing companies",
      features: [
        "50 AI interviews per month",
        "Advanced avatar customization",
        "Interview transcripts with highlights",
        "Detailed candidate summaries",
        "Team collaboration tools",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations with custom needs",
      features: [
        "Unlimited AI interviews",
        "Full avatar customization",
        "Advanced analytics dashboard",
        "API access",
        "Dedicated support",
        "Custom integration",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ]

  return (
    <main ref={ref} className="min-h-screen dark:bg-foreground text-background">
      <div className="bg-gradient-to-br from-blue-900 via-blue-500 to-purple-400">
        <Navbar />
        <section className="container mx-auto px-4 py-20 md:py-32">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <motion.div className="md:w-1/2" initial={{ opacity: 0, y: 20 }} animate={controls}>
              <motion.span
                className="inline-block px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-medium mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Revolutionizing The Interview Process
              </motion.span>
              <motion.h1
                className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                AI-Powered Interviews,{" "}
                <span className="font-sans text-transparent bg-clip-text bg-gradient-to-b from-purple-200 to-green-400">
                  Human-Quality
                </span>{" "}
                Insights
              </motion.h1>
              <motion.p
                className="text-lg text-gray-200 mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Save time and resources with AI avatars that conduct interviews, generate transcripts, and provide
                comprehensive candidate summaries.
              </motion.p>
              <motion.div
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white border-0"
                >
                  Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/10 backdrop-blur-sm text-white border-white/20 hover:bg-white/20"
                >
                  <Play className="mr-2 h-4 w-4" /> Watch Demo
                </Button>
              </motion.div>
            </motion.div>
            <motion.div
              className="md:w-1/2 relative"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/10">
                <Image
                  src="/interview.png"
                  alt="AI Interview Platform Dashboard"
                  width={800}
                  height={600}
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 w-full">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                      <span className="text-white text-sm font-medium">Interview in progress</span>
                    </div>
                    <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full w-3/4 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full blur-2xl opacity-40"></div>
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full blur-2xl opacity-40"></div>
            </motion.div>
          </div>
        </section>
      </div>

      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-medium text-emerald-600 uppercase tracking-wider">Why Choose Us</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-4">Transform Your Hiring Process</h2>
            <p className="text-gray-600 text-lg">
              Our AI-powered platform streamlines interviews, saving you time while providing deeper insights into each
              candidate.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
                color={feature.color}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 opacity-[0.03]"></div>
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <motion.div
              className="lg:w-1/2"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="text-sm font-medium text-emerald-600 uppercase tracking-wider">How It Works</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6">Simplify Your Interview Process</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Create Your Avatar</h3>
                    <p className="text-gray-600">
                      Customize an AI avatar that represents your company's culture and values. Choose appearance,
                      voice, and interview style.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Set Up Interview Questions</h3>
                    <p className="text-gray-600">
                      Choose from our library of industry-specific questions or create your own. Our AI adapts to
                      candidate responses for natural conversations.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Invite Candidates</h3>
                    <p className="text-gray-600">
                      Send automated invitations to candidates who can complete interviews on their schedule from any
                      device.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Review AI-Generated Insights</h3>
                    <p className="text-gray-600">
                      Get comprehensive summaries, skill assessments, and personality insights to make informed hiring
                      decisions.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
            <motion.div
              className="lg:w-1/2 relative"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative rounded-xl overflow-hidden shadow-2xl border border-gray-200">
                <Image
                  src="/interview.png"
                  alt="AI Interview Process"
                  width={800}
                  height={600}
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-white/30 transition-all">
                    <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center">
                      <Play className="h-8 w-8 text-emerald-600 ml-1" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full blur-2xl opacity-20"></div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-2xl opacity-20"></div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-blue-900 via-blue-500 to-purple-400 text-white">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-medium text-cyan-300 uppercase tracking-wider">Results That Speak</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-4">Trusted by Innovative Companies</h2>
            <p className="text-gray-200 text-lg">
              See how our AI interview platform is transforming hiring processes across industries.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={index}
                name={testimonial.name}
                role={testimonial.role}
                content={testimonial.content}
                avatar={testimonial.avatar}
                index={index}
              />
            ))}
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-8 md:gap-16">
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                className="h-12 w-32 bg-white/10 backdrop-blur-sm rounded-md flex items-center justify-center"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <span className="text-white font-medium">Company {i}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-medium text-emerald-600 uppercase tracking-wider">Pricing Plans</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-4">Choose the Perfect Plan for Your Team</h2>
            <p className="text-gray-600 text-lg">
              Flexible options to meet your hiring needs, from startups to enterprise organizations.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <PricingCard
                key={index}
                name={plan.name}
                price={plan.price}
                description={plan.description}
                features={plan.features}
                cta={plan.cta}
                popular={plan.popular}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl overflow-hidden shadow-xl">
            <div className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="md:w-2/3">
                  <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Transform Your Hiring Process?</h2>
                  <p className="text-gray-600 mb-6">
                    Join thousands of companies using our AI interview platform to save time and make better hiring
                    decisions.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0"
                    >
                      Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button size="lg" variant="outline" className="border-gray-300">
                      Schedule Demo
                    </Button>
                  </div>
                </div>
                <div className="md:w-1/3">
                  <div className="relative w-full aspect-square">
                    <Image
                      src="/interview.png"
                      alt="AI Avatar"
                      width={300}
                      height={300}
                      className="rounded-full object-cover"
                    />
                    <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-emerald-500 border-4 border-white"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

