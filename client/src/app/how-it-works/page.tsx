import Navbar from "@/components/Navbar";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    step: "01",
    title: "Connect your GitHub",
    description:
      "Sign in with GitHub OAuth. Wireloop reads your public contribution history — repos, PRs, commits, and issues.",
  },
  {
    step: "02",
    title: "Browse or create a Loop",
    description:
      "Discover Loops linked to open-source repositories, or create one for a repo you own. Each Loop is a real-time chat channel tied to a single repository.",
  },
  {
    step: "03",
    title: "Set access rules",
    description:
      "Loop owners define entry criteria — e.g. ≥3 merged PRs, ≥10 commits, or ≥1 issue opened. Rules are fully customizable per Loop.",
  },
  {
    step: "04",
    title: "Gatekeeper verifies",
    description:
      "When a user tries to join, the Gatekeeper service checks their GitHub contributions against the Loop's rules in real time via the GitHub API.",
  },
  {
    step: "05",
    title: "Join and collaborate",
    description:
      "Once verified, you're in. Chat with fellow contributors over WebSockets, browse issues and PRs in the sidebar, and coordinate in real time.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <span className="text-xs uppercase tracking-widest text-zinc-500 font-medium">
            How It Works
          </span>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-zinc-900 leading-[1.05] mt-4 mb-6">
            From repo to Loop <br />in five steps.
          </h1>
          <p className="text-lg text-zinc-500 max-w-2xl leading-relaxed">
            Wireloop connects your GitHub contributions to real-time
            collaboration. Here&apos;s how the flow works.
          </p>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          {steps.map((item) => (
            <div key={item.step} className="flex gap-8 items-start">
              <div className="text-3xl font-semibold text-zinc-200 tabular-nums flex-shrink-0 w-12">
                {item.step}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed max-w-lg">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-zinc-50 border-t border-zinc-100">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Ready to try it?</h2>
          <p className="text-sm text-zinc-500 mb-8">Connect your GitHub and join your first Loop.</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-zinc-950 text-white px-8 py-4 rounded-sm text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            Get Started <ArrowRight size={16} />
          </a>
        </div>
      </section>

      <footer className="py-12 border-t border-zinc-100">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-xs text-zinc-400">© {new Date().getFullYear()} Wireloop</span>
          <div className="flex gap-6 text-xs text-zinc-500">
            <a href="/platform" className="hover:text-zinc-900 transition-colors">Platform</a>
            <a href="/features" className="hover:text-zinc-900 transition-colors">Features</a>
            <a href="/manifesto" className="hover:text-zinc-900 transition-colors">Manifesto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
