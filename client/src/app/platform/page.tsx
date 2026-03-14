"use client";

import Navbar from "@/components/Navbar";
import { ArrowRight } from "lucide-react";

export default function PlatformPage() {
  const handleLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    window.location.href = `${apiUrl}/api/auth/github`;
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <span className="text-xs uppercase tracking-widest text-zinc-500 font-medium">
            Platform
          </span>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-zinc-900 leading-[1.05] mt-4 mb-6">
            The collaboration layer <br />for open-source.
          </h1>
          <p className="text-lg text-zinc-500 max-w-2xl leading-relaxed mb-8">
            Wireloop gives every GitHub repository a real-time coordination hub
            gated by verified contributions. No Slack invites, no Discord
            servers — just a direct, merit-based channel from your repo to
            the people who build it.
          </p>
          <button
            onClick={handleLogin}
            className="bg-zinc-950 text-white px-8 py-4 rounded-sm text-sm font-medium flex items-center gap-2 hover:bg-zinc-800 transition-colors"
          >
            Connect GitHub <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* What you get */}
      <section className="py-20 px-6 bg-zinc-50 border-t border-zinc-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-12">What you get</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h3 className="font-semibold text-zinc-900 mb-2">Loops</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Each Loop is tied to a GitHub repository. It&apos;s a real-time chat
                channel where only verified contributors can participate.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 mb-2">Gatekeeper</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Our verification engine checks merged PRs, commits, issues, and
                stars against rules set by the Loop owner — in real time.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 mb-2">WebSocket Chat</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Messages are delivered over persistent WebSocket connections.
                Sub-200ms latency, zero polling.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 mb-2">GitHub Context</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Browse issues and PRs directly in the chat sidebar. No more
                switching between tabs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-100">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-xs text-zinc-400">© {new Date().getFullYear()} Wireloop</span>
          <div className="flex gap-6 text-xs text-zinc-500">
            <a href="/features" className="hover:text-zinc-900 transition-colors">Features</a>
            <a href="/how-it-works" className="hover:text-zinc-900 transition-colors">How It Works</a>
            <a href="/manifesto" className="hover:text-zinc-900 transition-colors">Manifesto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
