"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

// Fluid iridescent ribbon SVG component
function FluidRibbon() {
  return (
    <svg
      viewBox="0 0 800 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* Main iridescent gradient */}
        <linearGradient id="ribbon1" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="25%" stopColor="#8B5CF6" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="75%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="ribbon2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id="ribbon3" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#14B8A6" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        {/* Glow filter */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main flowing ribbon paths */}
      <motion.path
        d="M-50 550 C150 500, 250 200, 450 180 C650 160, 750 100, 900 50"
        stroke="url(#ribbon1)"
        strokeWidth="80"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
        filter="url(#glow)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.6 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />
      <motion.path
        d="M-100 580 C100 520, 300 250, 500 200 C700 150, 800 80, 950 20"
        stroke="url(#ribbon2)"
        strokeWidth="40"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.5 }}
        transition={{ duration: 2.2, ease: "easeOut", delay: 0.2 }}
      />
      <motion.path
        d="M0 600 C200 550, 350 300, 550 250 C750 200, 850 120, 1000 80"
        stroke="url(#ribbon3)"
        strokeWidth="25"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.7 }}
        transition={{ duration: 2.4, ease: "easeOut", delay: 0.4 }}
      />

      {/* Thin accent lines */}
      <motion.path
        d="M50 620 C250 570, 400 320, 600 270 C800 220, 900 140, 1050 100"
        stroke="url(#ribbon1)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.6, ease: "easeOut", delay: 0.6 }}
      />
    </svg>
  );
}

export default function Hero() {
  return (
    <section
      id="platform"
      className="relative w-full min-h-screen flex flex-col pt-28 pb-20 overflow-hidden bg-white"
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundSize: "40px 40px",
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)",
        }}
      />

      {/* Gradient fade overlay */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-white via-white/80 to-transparent pointer-events-none" />

      {/* Content grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center flex-1">
        {/* Left: Text content */}
        <motion.div
          className="flex flex-col gap-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-zinc-900 leading-[1.05]">
            Turn GitHub repos <br />
            into high-signal Loops
          </h1>

          <p className="text-base md:text-lg text-zinc-500 max-w-md leading-relaxed">
            Wireloop creates repo-native collaboration spaces with real-time
            channels, threads, and proof-of-contribution access. Keep every
            discussion tied to the codebase and contributor intent.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
            <Link
              href="#loops"
              className="bg-zinc-950 text-white px-8 py-4 rounded-sm text-sm font-medium flex items-center gap-2 hover:bg-zinc-800 transition-colors"
            >
              View Loops <ArrowRight size={16} />
            </Link>
            <Link
              href="#access"
              className="px-6 py-4 rounded-sm text-sm font-medium text-zinc-900 border border-zinc-200 hover:border-zinc-400 transition-colors"
            >
              How It Works
            </Link>
          </div>
        </motion.div>

        {/* Right: Fluid ribbon visual */}
        <motion.div
          className="relative h-[500px] lg:h-[600px] w-full hidden md:block"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        >
          {/* Ambient glow behind ribbon */}
          <div className="absolute top-1/4 right-0 w-[80%] h-[60%] bg-gradient-to-bl from-blue-400/20 via-purple-400/15 to-teal-300/10 blur-[80px] rounded-full" />
          <div className="absolute top-[30%] right-[10%] w-[50%] h-[40%] bg-gradient-to-tr from-pink-400/10 via-indigo-400/10 to-cyan-400/10 blur-[60px] rounded-full" />

          {/* The ribbon */}
          <FluidRibbon />
        </motion.div>
      </div>
    </section>
  );
}
