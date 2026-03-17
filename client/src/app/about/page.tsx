import Navbar from "@/components/Navbar";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Header */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <span className="text-xs uppercase tracking-[0.2em] text-zinc-400 font-medium">
            About Wireloop
          </span>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tighter text-zinc-950 leading-[0.95] mt-4 mb-10">
            Ship code, not messages.
          </h1>

          <div className="space-y-8 text-base text-zinc-600 leading-relaxed">
            <p>
              Open source has a coordination problem. The people who build the
              software are spread across time zones, buried in notification
              noise, and locked out of the conversations that matter. Meanwhile,
              the loudest voices — not the most productive — dominate the room.
            </p>

            <p>
              Wireloop exists because the right to participate should be{" "}
              <em className="text-zinc-950">earned through contribution, not granted through invitation</em>.
              Every Loop is gated by real GitHub activity: merged PRs, commits,
              issues opened, code reviewed. If you ship, you&apos;re in.
            </p>

            <p>
              This is meritocratic access control. When every voice in the room
              has written code in the repository, conversations are higher
              quality, decisions happen faster, and context is shared instead
              of explained.
            </p>

            <h2 className="text-2xl font-semibold text-zinc-950 tracking-tight pt-6">
              How it works
            </h2>

            <div className="grid grid-cols-1 gap-6 py-2">
              {[
                { step: "01", title: "Connect GitHub", desc: "Sign in with OAuth. Wireloop reads your public contribution history." },
                { step: "02", title: "Browse or create a Loop", desc: "Each Loop is tied to a GitHub repository. Owners define entry criteria — merged PRs, commit count, issues opened." },
                { step: "03", title: "Gatekeeper verifies", desc: "The Gatekeeper service checks your contributions against the Loop's rules via the GitHub API, in real time." },
                { step: "04", title: "Collaborate", desc: "Chat over WebSockets, browse issues and PRs in the sidebar, and coordinate with contributors who've earned their seat." },
              ].map((item) => (
                <div key={item.step} className="flex gap-6 items-start py-4 border-t border-zinc-100">
                  <span className="text-sm font-medium text-zinc-300 tabular-nums w-8 flex-shrink-0">{item.step}</span>
                  <div>
                    <h3 className="font-semibold text-zinc-950 mb-1">{item.title}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="text-2xl font-semibold text-zinc-950 tracking-tight pt-6">
              Principles
            </h2>

            <ul className="space-y-4">
              <li>
                <strong className="text-zinc-950">Code is the credential.</strong>{" "}
                Your contribution history is your identity. Not your title, not your follower count.
              </li>
              <li>
                <strong className="text-zinc-950">Context over chat.</strong>{" "}
                Every Loop is anchored to a repository. Issues, PRs, and milestones surface inside the conversation.
              </li>
              <li>
                <strong className="text-zinc-950">Speed over ceremony.</strong>{" "}
                WebSocket-first architecture. Real-time by default.
              </li>
              <li>
                <strong className="text-zinc-950">Transparent by design.</strong>{" "}
                Wireloop is open source. The platform that gates access by contribution should itself be built in the open.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-100 mt-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-zinc-950 rounded flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
            <span className="font-bold text-sm tracking-tight">Wireloop</span>
          </div>
          <div className="flex gap-6 text-xs text-zinc-500">
            <a href="/" className="hover:text-zinc-950 transition-colors">Home</a>
            <a
              href="https://github.com/Wireloop-Org/Wireloop"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-950 transition-colors"
            >
              GitHub
            </a>
          </div>
          <span className="text-xs text-zinc-400">© {new Date().getFullYear()} Wireloop</span>
        </div>
      </footer>
    </div>
  );
}
