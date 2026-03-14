import Navbar from "@/components/Navbar";

const features = [
  {
    title: "Contribution Gating",
    description:
      "Loop owners set entry rules — minimum merged PRs, code reviews, commit count, or issue participation. The Gatekeeper service verifies each rule against the GitHub API in real time before granting access.",
  },
  {
    title: "Real-time WebSocket Chat",
    description:
      "Every Loop runs on persistent WebSocket connections powered by Go. Messages are broadcast instantly to all connected members — no polling, no delays.",
  },
  {
    title: "GitHub Context Panel",
    description:
      "Browse open issues and pull requests directly inside the chat sidebar. Filter by state, see labels, branches, and comments without leaving the conversation.",
  },
  {
    title: "AI Summaries",
    description:
      "Summarize any issue or PR with one click and share the digest straight into chat. Cut through long threads and make faster decisions.",
  },
  {
    title: "Loop Management",
    description:
      "Create Loops linked to any GitHub repository you own. Define custom access rules, manage members, and monitor who joins.",
  },
  {
    title: "Presence & Activity",
    description:
      "See who is online in each Loop. Know when contributors are active so you can coordinate in real time.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <span className="text-xs uppercase tracking-widest text-zinc-500 font-medium">
            Features
          </span>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-zinc-900 leading-[1.05] mt-4 mb-6">
            Built for builders.
          </h1>
          <p className="text-lg text-zinc-500 max-w-2xl leading-relaxed">
            Everything your open-source team needs to coordinate — contribution
            gating, real-time chat, GitHub context, and AI — in one place.
          </p>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:shadow-sm transition-all"
              >
                <h3 className="font-semibold text-zinc-900 mb-3">{feature.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-zinc-100">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-xs text-zinc-400">© {new Date().getFullYear()} Wireloop</span>
          <div className="flex gap-6 text-xs text-zinc-500">
            <a href="/platform" className="hover:text-zinc-900 transition-colors">Platform</a>
            <a href="/how-it-works" className="hover:text-zinc-900 transition-colors">How It Works</a>
            <a href="/manifesto" className="hover:text-zinc-900 transition-colors">Manifesto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
