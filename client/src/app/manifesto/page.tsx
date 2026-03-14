import Navbar from "@/components/Navbar";
import { ArrowRight } from "lucide-react";

export default function ManifestoPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <span className="text-xs uppercase tracking-widest text-zinc-500 font-medium">
            Manifesto
          </span>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-zinc-900 leading-[1.05] mt-4 mb-10">
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
              Wireloop exists because we believe the right to participate should
              be <em>earned through contribution, not granted through invitation</em>.
              Every Loop is gated by real GitHub activity: merged PRs, commits,
              issues opened, code reviewed. If you ship, you&apos;re in. If you
              don&apos;t, you&apos;re not.
            </p>

            <p>
              This is meritocratic access control. It&apos;s not about exclusion
              — it&apos;s about signal. When every voice in the room has written
              code in the repository, conversations are higher quality,
              decisions happen faster, and context is shared instead of
              explained.
            </p>

            <h2 className="text-2xl font-semibold text-zinc-900 pt-4">
              Our principles
            </h2>

            <ul className="space-y-4">
              <li>
                <strong className="text-zinc-900">Code is the credential.</strong>{" "}
                Your contribution history is your identity. Not your title, not
                your follower count, not who you know.
              </li>
              <li>
                <strong className="text-zinc-900">Context over chat.</strong>{" "}
                Every Loop is anchored to a repository. Issues, PRs, and
                milestones are surfaced inside the conversation — not in a
                separate tab.
              </li>
              <li>
                <strong className="text-zinc-900">Speed over ceremony.</strong>{" "}
                WebSocket-first architecture. No loading spinners, no stale
                data, no page refreshes. Real-time by default.
              </li>
              <li>
                <strong className="text-zinc-900">Transparent by design.</strong>{" "}
                Wireloop is open source. The platform that gates access by
                contribution should itself be built in the open.
              </li>
            </ul>

            <p>
              We&apos;re building Wireloop for the maintainers, the late-night
              debuggers, the first-time contributors who open a PR and wonder
              if anyone is listening. This is for you.
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-zinc-100">
            <a
              href="/"
              className="inline-flex items-center gap-2 bg-zinc-950 text-white px-8 py-4 rounded-sm text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              Join Wireloop <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-zinc-100">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-xs text-zinc-400">© {new Date().getFullYear()} Wireloop</span>
          <div className="flex gap-6 text-xs text-zinc-500">
            <a href="/platform" className="hover:text-zinc-900 transition-colors">Platform</a>
            <a href="/features" className="hover:text-zinc-900 transition-colors">Features</a>
            <a href="/how-it-works" className="hover:text-zinc-900 transition-colors">How It Works</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
