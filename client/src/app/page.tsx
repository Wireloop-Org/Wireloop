"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api, getToken, clearToken, Profile } from "@/lib/api";
import CreateLoopModal from "@/components/CreateLoopModal";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadProfile = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.getProfile();
      setProfile(data);
      setIsLoggedIn(true);

      if (!data.profile_completed) {
        router.push("/setup");
      }
    } catch {
      clearToken();
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c0c0f]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isLoggedIn && profile) {
    return <Dashboard profile={profile} />;
  }

  return <LoginPage />;
}

function LoginPage() {
  const handleGitHubLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    window.location.href = `${apiUrl}/api/auth/github`;
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient mesh */}
      <div className="absolute inset-0 bg-gradient-mesh" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 p-8">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-4 opacity-0 animate-fade-in-down">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 animate-pulse-glow">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-gradient">Wireloop</h1>
          <p className="text-zinc-400 text-center max-w-md text-lg">
            Merit-based communication for open source builders
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-sm p-8 rounded-3xl glass border border-zinc-800/50 opacity-0 animate-scale-in stagger-2 hover-lift">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold mb-2">Get Started</h2>
            <p className="text-sm text-zinc-500">
              Connect with GitHub to join exclusive contributor loops
            </p>
          </div>

          <button
            onClick={handleGitHubLogin}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white text-zinc-900 font-semibold hover:bg-zinc-100 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-white/10"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"
              />
            </svg>
            Continue with GitHub
          </button>

          <div className="mt-6 pt-6 border-t border-zinc-800/50">
            <p className="text-xs text-zinc-600 text-center">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-6 text-sm opacity-0 animate-fade-in-up stagger-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-zinc-400">Proof of Contribution</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-zinc-400">Real-time Chat</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-zinc-400">GitHub Integration</span>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-8 max-w-2xl opacity-0 animate-fade-in-up stagger-5">
          <h3 className="text-center text-zinc-500 text-sm font-medium mb-6">HOW IT WORKS</h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">🔗</span>
              </div>
              <h4 className="font-medium text-sm mb-1">Connect</h4>
              <p className="text-xs text-zinc-500">Link your GitHub account</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">✓</span>
              </div>
              <h4 className="font-medium text-sm mb-1">Verify</h4>
              <p className="text-xs text-zinc-500">Prove your contributions</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">💬</span>
              </div>
              <h4 className="font-medium text-sm mb-1">Chat</h4>
              <p className="text-xs text-zinc-500">Join exclusive loops</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DashboardProject {
  id: string;
  name: string;
  github_repo_id: number;
  created_at: string;
}

interface DashboardMembership {
  loop_id: string;
  loop_name: string;
  role: string;
  joined_at: string;
}

function Dashboard({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [memberships, setMemberships] = useState<DashboardMembership[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await api.getInit();
      setProjects(data.projects || []);
      setMemberships(data.memberships || []);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Joined loops = memberships that are NOT in our projects
  const joinedLoops = memberships.filter(
    (m) => !projects.some((p) => p.name === m.loop_name)
  );

  const handleLogout = () => {
    clearToken();
    window.location.reload();
  };

  const handleLoopCreated = () => {
    loadData();
  };

  const displayName = profile.display_name || profile.username;
  const avatarUrl = profile.avatar_url;

  return (
    <div className="min-h-screen bg-[#0c0c0f]">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span className="font-semibold">Wireloop</span>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/profile")}
              className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 relative">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-zinc-500">
                    {displayName[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-sm text-zinc-300">{displayName}</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {displayName}!
          </h1>
          <p className="text-zinc-500">
            Here is what is happening with your projects
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-2xl mb-2">💬</div>
            <div className="text-3xl font-bold mb-1">
              {loading ? "..." : projects.length}
            </div>
            <div className="text-sm text-zinc-500">Owned Loops</div>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-2xl mb-2">🔗</div>
            <div className="text-3xl font-bold mb-1">
              {loading ? "..." : joinedLoops.length}
            </div>
            <div className="text-sm text-zinc-500">Joined Loops</div>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-2xl mb-2">⚡</div>
            <div className="text-3xl font-bold mb-1">
              {loading ? "..." : projects.length + joinedLoops.length}
            </div>
            <div className="text-sm text-zinc-500">Total Active</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
            <h3 className="font-semibold text-lg mb-2">Create a Loop</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Set up a merit-based chat for your repository
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition-colors"
            >
              Create Loop
            </button>
          </div>
          <div className="p-6 rounded-2xl bg-linear-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
            <h3 className="font-semibold text-lg mb-2">Browse Loops</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Search for repositories and join their exclusive chat loops
            </p>
            <button
              onClick={() => router.push("/loops")}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium transition-colors"
            >
              Browse Loops
            </button>
          </div>
        </div>

        {/* Joined Loops - THIS IS THE MAIN FEATURE! */}
        {(loading || joinedLoops.length > 0) && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>🔗</span> Joined Loops
            </h2>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {joinedLoops.map((membership) => (
                  <button
                    key={membership.loop_id}
                    onClick={() => router.push(`/loops/${encodeURIComponent(membership.loop_name)}`)}
                    className="p-5 rounded-2xl bg-zinc-900/50 border border-emerald-500/20 hover:border-emerald-500/40 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center text-lg">
                        🔗
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">
                          {membership.loop_name}
                        </h3>
                        <p className="text-xs text-emerald-400 truncate">
                          {membership.role}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>
                        Joined{" "}
                        {new Date(membership.joined_at).toLocaleDateString()}
                      </span>
                      <span className="text-emerald-400 group-hover:text-emerald-300">
                        Open →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Your Loops (Created by you) */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>💬</span> Your Loops
          </h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => router.push(`/loops/${encodeURIComponent(project.name)}`)}
                  className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all text-left group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center text-lg">
                      💬
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{project.name}</h3>
                      <p className="text-xs text-zinc-500 truncate">
                        Created by you
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Owner</span>
                    <span className="text-indigo-400 group-hover:text-indigo-300">
                      Open →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 rounded-2xl border border-dashed border-zinc-800">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold mb-2">No loops yet</h3>
              <p className="text-zinc-500 mb-6">
                Create your first loop to start collaborating
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium transition-colors"
              >
                Create Your First Loop
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Create Loop Modal */}
      <CreateLoopModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleLoopCreated}
      />
    </div>
  );
}
