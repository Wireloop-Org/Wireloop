import Navbar from "./Navbar";

export default function LandingPage() {
  const handleLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    window.location.href = `${apiUrl}/api/auth/github`;
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tighter text-zinc-950 leading-[0.95] text-balance max-w-4xl">
            Where code talks,{" "}
            <span className="italic text-zinc-400">builders listen.</span>
          </h1>
          <div className="mt-10 max-w-xl">
            <p className="text-lg text-zinc-500 leading-relaxed">
              Contribution-gated chat loops for open-source repositories.
              Real-time coordination for the people who actually ship.
            </p>
          </div>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleLogin}
              className="bg-zinc-950 text-white px-8 py-4 text-sm font-medium hover:bg-zinc-800 transition-colors inline-flex items-center gap-2"
            >
              Connect GitHub
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
            <a
              href="/about"
              className="px-8 py-4 text-sm font-medium text-zinc-600 border border-zinc-200 hover:border-zinc-400 transition-colors text-center"
            >
              Learn more
            </a>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-zinc-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-200 border border-zinc-200">
            {[
              {
                num: "01",
                title: "CONNECT GITHUB",
                desc: "Sign in with OAuth. Wireloop reads your public contribution history — repos, PRs, commits, and issues.",
              },
              {
                num: "02",
                title: "VERIFY CONTRIBUTIONS",
                desc: "The Gatekeeper engine checks your GitHub activity against Loop entry rules in real time. Merged PRs, commit count, issue participation.",
              },
              {
                num: "03",
                title: "JOIN & COLLABORATE",
                desc: "Once verified, drop into real-time WebSocket channels with fellow contributors. Browse issues and PRs right inside the chat.",
              },
            ].map((step) => (
              <div key={step.num} className="bg-white p-8 md:p-10 flex flex-col justify-between min-h-[320px]">
                <div className="flex justify-between items-start mb-8">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-zinc-300 text-xs font-medium text-zinc-500">
                    {step.num}
                  </span>
                  <svg className="w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7v10" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wide text-zinc-950 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Belief section (Manicule-inspired) ───────────────────── */}
      <section className="py-24 px-6 bg-zinc-950 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-medium">
                [ What we believe ]
              </span>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tighter leading-[0.95] mt-6">
                YOU CAN&apos;T HAVE<br />
                GOOD OPEN SOURCE<br />
                WITHOUT{" "}
                <span className="italic font-normal text-zinc-400">MERIT</span>
              </h2>
            </div>
            <div className="flex flex-col justify-end gap-6">
              <span className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-medium text-right">
                Our philosophy
              </span>
              <p className="text-base text-zinc-400 leading-relaxed">
                Code is the credential. Not your title, not your follower count.
                When every voice in the room has written code in the repository,
                conversations are higher quality and decisions happen faster.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────── */}
      <section className="py-16 px-6 border-t border-zinc-100">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
          {[
            { value: "<200ms", label: "WebSocket latency" },
            { value: "GitHub", label: "Native context layer" },
            { value: "Realtime", label: "Channels & threads" },
            { value: "Open", label: "Source on GitHub" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl md:text-3xl font-semibold text-zinc-950 mb-1 tracking-tight">
                {stat.value}
              </div>
              <div className="text-xs text-zinc-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="py-12 border-t border-zinc-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-zinc-950 rounded flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
            <span className="font-bold text-sm tracking-tight">Wireloop</span>
          </div>
          <div className="flex items-center gap-8 text-xs text-zinc-500">
            <a href="/about" className="hover:text-zinc-950 transition-colors">About</a>
            <a
              href="https://github.com/Wireloop-Org/Wireloop"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-950 transition-colors"
            >
              GitHub
            </a>
          </div>
          <p className="text-xs text-zinc-400">
            © {new Date().getFullYear()} Wireloop
          </p>
        </div>
      </footer>
    </div>
  );
}
