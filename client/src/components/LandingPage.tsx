import Navbar from "./Navbar";
import GrainBackdrop from "./ui/GrainBackdrop";

export default function LandingPage() {
  const handleLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    window.location.href = `${apiUrl}/api/auth/github`;
  };

  return (
    <GrainBackdrop variant="warm">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="wl-fade-up">
            <span className="inline-flex items-center gap-2 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-neutral-500 bg-white/60 backdrop-blur rounded-full border border-neutral-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Now in early access
            </span>
          </div>
          <h1 className="mt-8 text-5xl md:text-7xl lg:text-[5.5rem] font-semibold tracking-[-0.03em] text-neutral-900 leading-[0.95] text-balance max-w-4xl wl-fade-up wl-fade-up-delay-1">
            Where code talks,{" "}
            <span className="italic font-light text-neutral-500">
              builders listen.
            </span>
          </h1>
          <p className="mt-8 max-w-xl text-lg text-neutral-600 leading-relaxed wl-fade-up wl-fade-up-delay-2">
            Contribution-gated chat loops for open-source repositories.
            Real-time coordination for the people who actually ship.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 wl-fade-up wl-fade-up-delay-3">
            <button
              onClick={handleLogin}
              className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-neutral-900 text-white text-sm font-medium shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_12px_32px_-12px_rgba(0,0,0,0.35)] hover:bg-neutral-800 hover:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_16px_40px_-12px_rgba(0,0,0,0.4)] transition-all"
            >
              Start looping
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
            <a
              href="/about"
              className="inline-flex items-center justify-center px-7 py-4 rounded-full text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:bg-white/60 transition-colors"
            >
              How it works
            </a>
          </div>

          {/* Thin credibility rail */}
          <div className="mt-20 flex items-center gap-6 text-[11px] uppercase tracking-[0.16em] text-neutral-400 wl-fade-up wl-fade-up-delay-3">
            <span>Open source</span>
            <span className="w-px h-3 bg-neutral-300" />
            <span>GitHub OAuth</span>
            <span className="w-px h-3 bg-neutral-300" />
            <span>Realtime</span>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14 max-w-2xl">
            <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 font-medium">
              How it works
            </span>
            <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-neutral-900 leading-tight">
              Three steps. No noise.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                num: "01",
                title: "Connect GitHub",
                desc: "Sign in with OAuth. Wireloop reads your public contribution history — repos, PRs, commits, and issues.",
              },
              {
                num: "02",
                title: "Verify contributions",
                desc: "The Gatekeeper checks your activity against a loop's entry rules in real time. Merged PRs, commit count, issues.",
              },
              {
                num: "03",
                title: "Join & collaborate",
                desc: "Once verified, drop into real-time channels with fellow contributors. Issues and PRs live right inside the chat.",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="group relative bg-white/70 backdrop-blur rounded-2xl p-8 md:p-10 flex flex-col justify-between min-h-[300px] border border-neutral-200/70 hover:border-neutral-300 transition-colors shadow-[0_1px_0_0_rgba(0,0,0,0.02),0_30px_60px_-40px_rgba(0,0,0,0.15)]"
              >
                <div className="flex justify-between items-start mb-8">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-neutral-900 text-[11px] font-medium text-white tracking-wider">
                    {step.num}
                  </span>
                  <svg
                    className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 17L17 7M17 7H7M17 7v10"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-neutral-900 mb-2 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Belief section (dark inversion) ──────────────────────── */}
      <section className="relative py-28 px-6 mx-4 md:mx-8 my-8 rounded-3xl bg-neutral-950 text-white overflow-hidden">
        {/* Inner grain + subtle glow for the dark panel */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.8 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -left-20 w-[40vh] h-[40vh] bg-[radial-gradient(closest-side,rgba(255,184,125,0.25),transparent_70%)] blur-3xl"
        />
        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-7">
              <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 font-medium">
                [ What we believe ]
              </span>
              <h2 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold tracking-[-0.02em] leading-[1.02] mt-6">
                You can&apos;t have
                <br />
                good open source
                <br />
                without{" "}
                <span className="italic font-light text-neutral-400">
                  merit
                </span>
                .
              </h2>
            </div>
            <div className="lg:col-span-5 flex flex-col justify-end gap-6 lg:pt-24">
              <p className="text-base text-neutral-400 leading-relaxed">
                Code is the credential. Not your title, not your follower
                count. When every voice in the room has written code in the
                repository, conversations are higher quality and decisions
                happen faster.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
          {[
            { value: "<200ms", label: "WebSocket latency" },
            { value: "GitHub", label: "Native context layer" },
            { value: "Realtime", label: "Channels & threads" },
            { value: "Open", label: "Source on GitHub" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl md:text-4xl font-semibold text-neutral-900 mb-2 tracking-[-0.02em]">
                {stat.value}
              </div>
              <div className="text-xs text-neutral-500 tracking-wide">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="py-12 border-t border-neutral-200/70">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-neutral-900 rounded flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-neutral-900">
              Wireloop
            </span>
          </div>
          <div className="flex items-center gap-8 text-xs text-neutral-500">
            <a
              href="/about"
              className="hover:text-neutral-900 transition-colors"
            >
              About
            </a>
            <a
              href="https://github.com/Wireloop-Org/Wireloop"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-900 transition-colors"
            >
              GitHub
            </a>
          </div>
          <p className="text-xs text-neutral-400">
            © {new Date().getFullYear()} Wireloop
          </p>
        </div>
      </footer>
    </GrainBackdrop>
  );
}
