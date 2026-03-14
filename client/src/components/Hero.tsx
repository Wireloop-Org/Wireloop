"use client";

import { ArrowRight } from "lucide-react";

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

      <div className="absolute inset-0 z-0 bg-gradient-to-br from-white via-white/80 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center flex-1">
        {/* Left: Text content */}
        <div className="flex flex-col gap-6">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-zinc-900 leading-[1.05]">
            Where code talks, <br />
            builders listen.
          </h1>

          <p className="text-base md:text-lg text-zinc-500 max-w-md leading-relaxed">
            Wireloop is the collaboration layer for open-source repositories.
            Contribution-gated Loops, real-time channels, and zero noise —
            built for maintainers and the people who ship with them.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
            <a
              href="/features"
              className="bg-zinc-950 text-white px-8 py-4 rounded-sm text-sm font-medium flex items-center gap-2 hover:bg-zinc-800 transition-colors"
            >
              Explore Features <ArrowRight size={16} />
            </a>
            <a
              href="/how-it-works"
              className="px-6 py-4 rounded-sm text-sm font-medium text-zinc-900 border border-zinc-200 hover:border-zinc-400 transition-colors"
            >
              See How It Works
            </a>
          </div>
        </div>

        {/* Right: Simple visual accent (no heavy SVG ribbon) */}
        <div className="relative h-[400px] lg:h-[500px] w-full hidden md:block">
          <div className="absolute top-1/4 right-0 w-[70%] h-[50%] bg-gradient-to-bl from-blue-100/60 via-purple-100/40 to-teal-50/30 blur-[60px] rounded-full" />
          <div className="absolute top-[35%] right-[15%] w-[40%] h-[30%] bg-gradient-to-tr from-pink-100/30 via-indigo-100/25 to-cyan-100/20 blur-[40px] rounded-full" />
        </div>
      </div>
    </section>
  );
}
