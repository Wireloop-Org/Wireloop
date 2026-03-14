"use client";

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
          <div className="space-y-6">
            <span className="text-xs uppercase tracking-widest text-zinc-500 font-medium">
              How It Works
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900 leading-tight">
              Merit-gated access, <br />zero gatekeepers
            </h2>
            <p className="text-base text-zinc-500 leading-relaxed max-w-xl">
              Wireloop verifies your GitHub contributions in real time — merged PRs,
              code reviews, commit history — so only people who actually ship can join a
              Loop. No invites. No waiting rooms. No politics.
            </p>
            <div className="flex items-center gap-6 pt-2">
              <a
                href="/features"
                className="text-sm font-medium text-zinc-900 border-b border-zinc-900 pb-0.5 hover:opacity-70 transition-opacity"
              >
                Browse Features
              </a>
              <a
                href="/manifesto"
                className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Why Wireloop
              </a>
            </div>
          </div>

          {/* Right: Stats Card */}
          <div className="rounded-3xl border border-zinc-200 p-8 bg-zinc-50">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-3xl font-semibold text-zinc-900 mb-1">
                  &lt;200ms
                </div>
                <div className="text-xs text-zinc-500">WebSocket latency</div>
              </div>
              <div>
                <div className="text-3xl font-semibold text-zinc-900 mb-1">
                  AI
                </div>
                <div className="text-xs text-zinc-500">Issue &amp; PR summaries</div>
              </div>
              <div>
                <div className="text-3xl font-semibold text-zinc-900 mb-1">
                  GitHub
                </div>
                <div className="text-xs text-zinc-500">Native context layer</div>
              </div>
              <div>
                <div className="text-3xl font-semibold text-zinc-900 mb-1">
                  Realtime
                </div>
                <div className="text-xs text-zinc-500">Channels &amp; threads</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FeatureGrid />

      {/* Manifesto Section */}
      <section id="manifesto" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-zinc-500 font-medium">
                Manifesto
              </span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900 leading-tight">
                Ship code, not messages.
              </h2>
              <p className="text-base text-zinc-500 leading-relaxed">
                Every Loop is anchored to a repository. Channels map to
                workflows, threads map to decisions, and context from issues
                and PRs surfaces right inside the conversation — automatically.
              </p>
            </div>

            <div className="space-y-6">
              <p className="text-base text-zinc-500 leading-relaxed">
                Channels and threads stay tied to code changes, releases, and
                milestones. Your team moves fast without losing context.
              </p>
              <p className="text-base text-zinc-500 leading-relaxed">
                Contribution-based access means every voice in the room has
                earned their seat. No noise — just the people who
                build.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-black rounded flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              <span className="font-bold text-sm tracking-tight">Wireloop</span>
            </div>

            <div className="flex items-center gap-8 text-xs text-zinc-500">
              <a href="/platform" className="hover:text-zinc-900 transition-colors">Platform</a>
              <a href="/features" className="hover:text-zinc-900 transition-colors">Features</a>
              <a href="/how-it-works" className="hover:text-zinc-900 transition-colors">How It Works</a>
              <a
                href="https://github.com/Wireloop-Org/Wireloop"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-zinc-900 transition-colors"
              >
                GitHub
              </a>
            </div>

            <p className="text-xs text-zinc-400">
              © {new Date().getFullYear()} Wireloop. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
