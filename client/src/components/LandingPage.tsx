"use client";

import { motion } from "framer-motion";
import Navbar from "./Navbar";
import Hero from "./Hero";
import FeatureGrid from "./FeatureGrid";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <Hero />

      {/* Access Control Section */}
      <section id="access" className="relative py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs uppercase tracking-widest text-zinc-500 font-medium">
              How It Works
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900 leading-tight">
              Proof-of-Contribution access
            </h2>
            <p className="text-base text-zinc-500 leading-relaxed max-w-xl">
              Wireloop checks GitHub signals like merged PRs, reviews, and
              labels in real time. Set rules per repo so only qualified
              contributors can join, collaborate, and ship.
            </p>
            <div className="flex items-center gap-6 pt-2">
              <a
                href="#loops"
                className="text-sm font-medium text-zinc-900 border-b border-zinc-900 pb-0.5 hover:opacity-70 transition-opacity"
              >
                Browse Loops
              </a>
              <a
                href="#manifesto"
                className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Why Wireloop
              </a>
            </div>
          </motion.div>

          {/* Right: Stats Card */}
          <motion.div
            className="rounded-3xl border border-zinc-200 p-8 bg-zinc-50"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-3xl font-semibold text-zinc-900 mb-1">
                  99.9%
                </div>
                <div className="text-xs text-zinc-500">Verification uptime</div>
              </div>
              <div>
                <div className="text-3xl font-semibold text-zinc-900 mb-1">
                  &lt;250ms
                </div>
                <div className="text-xs text-zinc-500">Decision latency</div>
              </div>
              <div>
                <div className="text-3xl font-semibold text-zinc-900 mb-1">
                  SQLC
                </div>
                <div className="text-xs text-zinc-500">Type-safe DB layer</div>
              </div>
              <div>
                <div className="text-3xl font-semibold text-zinc-900 mb-1">
                  WS
                </div>
                <div className="text-xs text-zinc-500">Realtime streams</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <FeatureGrid />

      {/* Manifesto Section */}
      <section id="manifesto" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left Column */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="text-xs uppercase tracking-widest text-zinc-500 font-medium">
                Manifesto
              </span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900 leading-tight">
                Built for builders, by builders
              </h2>
              <p className="text-base text-zinc-500 leading-relaxed">
                Wireloop keeps collaboration focused by linking every discussion
                to the repository. The goal is clarity, velocity, and high-signal
                decision-making for maintainers and contributors.
              </p>
            </motion.div>

            {/* Right Column */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <p className="text-base text-zinc-500 leading-relaxed">
                Loops organize channels and threads around code changes,
                releases, and issues. Your team stays aligned without the noise.
              </p>
              <p className="text-base text-zinc-500 leading-relaxed">
                Merit-based access ensures every participant has proven
                contribution to the repo. No noise. Pure signal.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-black rounded flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              <span className="font-bold text-sm tracking-tight">Wireloop</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-8 text-xs text-zinc-500">
              <a href="#platform" className="hover:text-zinc-900 transition-colors">
                Platform
              </a>
              <a href="#loops" className="hover:text-zinc-900 transition-colors">
                Loops
              </a>
              <a href="#access" className="hover:text-zinc-900 transition-colors">
                How It Works
              </a>
              <a href="#manifesto" className="hover:text-zinc-900 transition-colors">
                Manifesto
              </a>
            </div>

            {/* Copyright */}
            <p className="text-xs text-zinc-400">
              © {new Date().getFullYear()} Wireloop. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
