"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  api,
  getToken,
  clearToken,
  Profile,
  BrowseLoop,
  VerifyAccessResponse,
  LoopMembership,
} from "@/lib/api";

export default function BrowseLoopsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loops, setLoops] = useState<BrowseLoop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoop, setSelectedLoop] = useState<BrowseLoop | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<VerifyAccessResponse | null>(
    null
  );
  const [joining, setJoining] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [memberships, setMemberships] = useState<LoopMembership[]>([]);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push("/");
      return;
    }

    try {
      const [profileData, loopsData, membershipsData] = await Promise.all([
        api.getProfile(),
        api.browseLoops(),
        api.getMyMemberships(),
      ]);
      setProfile(profileData);
      setLoops(loopsData.loops || []);
      setMemberships(membershipsData.memberships || []);
    } catch {
      clearToken();
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectLoop = async (loop: BrowseLoop) => {
    setSelectedLoop(loop);
    setVerification(null);

    // Check if user is already a member from cached memberships
    const existingMembership = memberships.find(m => m.loop_name === loop.name);
    if (existingMembership) {
      // User is already a member, set verification to reflect that
      setVerification({
        is_member: true,
        can_join: true,
        message: "You are already a member of this loop",
        results: [],
      });
      return;
    }

    // Not a member, verify eligibility
    setVerifying(true);
    try {
      const result = await api.verifyAccess(loop.name);
      setVerification(result);
    } catch (err) {
      console.error("Verification failed:", err);
    } finally {
      setVerifying(false);
    }
  };

  const handleJoin = async () => {
    if (!selectedLoop) return;

    setJoining(true);
    try {
      await api.joinLoop(selectedLoop.name);
      router.push(`/loops/${selectedLoop.name}`);
    } catch (err) {
      console.error("Failed to join:", err);
    } finally {
      setJoining(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    router.push("/");
  };

  const filteredLoops = loops.filter(
    (loop) =>
      loop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loop.owner_username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const displayName = profile.display_name || profile.username;
  const avatarUrl = profile.avatar_url;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh pointer-events-none opacity-40" />

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center shadow-lg shadow-accent/20">
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
              <span className="font-semibold text-foreground tracking-tight">Wireloop</span>
            </button>

            <nav className="flex items-center gap-1">
              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                Dashboard
              </button>
              <button className="px-4 py-2 text-sm text-foreground bg-secondary rounded-lg font-medium">
                Browse Loops
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/profile")}
              className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary relative border border-border">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-muted">
                    {displayName[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <div className="flex gap-8">
          {/* Loops Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-foreground">Discover Loops</h1>
                <p className="text-muted">
                  Find merit-based communities and join the conversation
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative group">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-accent transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search loops..."
                  className="w-full pl-12 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:border-accent focus:bg-card transition-all"
                />
              </div>
            </div>

            {/* Loops Grid */}
            {filteredLoops.length === 0 ? (
              <div className="text-center py-20 rounded-2xl border border-dashed border-border/50 bg-card/20">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-3xl mx-auto mb-4">
                  🔍
                </div>
                <h3 className="text-lg font-medium mb-2 text-foreground">No loops found</h3>
                <p className="text-muted">
                  {searchQuery
                    ? "Try a different search term"
                    : "Be the first to create a loop!"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLoops.map((loop) => (
                  <button
                    key={loop.id}
                    onClick={() => handleSelectLoop(loop)}
                    className={`p-5 rounded-2xl border text-left transition-all hover-lift ${selectedLoop?.id === loop.id
                      ? "bg-accent/5 border-accent/20 shadow-lg shadow-accent/5"
                      : "bg-card hover:bg-secondary/40 border-border hover:border-border/80"
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-purple-500/20 flex items-center justify-center text-2xl">
                        💬
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate text-foreground">{loop.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-5 h-5 rounded-full overflow-hidden bg-secondary relative border border-border/50">
                            {loop.owner_avatar ? (
                              <Image
                                src={loop.owner_avatar}
                                alt={loop.owner_username}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-muted">
                                {loop.owner_username[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="text-sm text-muted">
                            {loop.owner_username}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted">
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            {loop.member_count} members
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar - Verification Panel */}
          <div className="w-96 flex-shrink-0">
            <div className="sticky top-24">
              {selectedLoop ? (
                <div className="p-6 rounded-2xl bg-card border border-border shadow-xl animate-scale-in">
                  <h2 className="text-xl font-bold mb-4 text-foreground">{selectedLoop.name}</h2>

                  {verifying ? (
                    <div className="flex flex-col items-center py-8">
                      <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-muted">
                        Verifying your contributions...
                      </p>
                    </div>
                  ) : verification ? (
                    <>
                      {/* Status Badge */}
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm mb-6 ${verification.is_member
                          ? "bg-emerald-500/10 text-emerald-500"
                          : verification.can_join
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-amber-500/10 text-amber-500"
                          }`}
                      >
                        {verification.is_member ? (
                          <>
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Already a Member
                          </>
                        ) : verification.can_join ? (
                          <>
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Eligible to Join
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Requirements Not Met
                          </>
                        )}
                      </div>

                      {/* Requirements */}
                      {verification.results.length > 0 && (
                        <div className="space-y-3 mb-6">
                          <h3 className="text-sm font-medium text-muted">
                            Requirements
                          </h3>
                          {verification.results.map((result, i) => (
                            <div
                              key={i}
                              className={`p-3 rounded-lg border ${result.passed
                                ? "bg-emerald-500/5 border-emerald-500/20"
                                : "bg-card border-border"
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                {result.passed ? (
                                  <span className="text-emerald-500">✓</span>
                                ) : (
                                  <span className="text-muted">○</span>
                                )}
                                <span className="text-sm text-foreground">{result.message}</span>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${result.passed
                                      ? "bg-emerald-500"
                                      : "bg-accent"
                                      }`}
                                    style={{
                                      width: `${Math.min(
                                        (result.actual / result.required) * 100,
                                        100
                                      )}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-muted">
                                  {result.actual}/{result.required}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action Button */}
                      {verification.is_member ? (
                        <button
                          onClick={() =>
                            router.push(`/loops/${selectedLoop.name}`)
                          }
                          className="w-full py-3 rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover font-medium transition-colors hover-lift"
                        >
                          Open Loop
                        </button>
                      ) : verification.can_join ? (
                        <button
                          onClick={handleJoin}
                          disabled={joining}
                          className="w-full py-3 rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover font-medium transition-colors disabled:opacity-50 hover-lift"
                        >
                          {joining ? "Joining..." : "Join Loop"}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full py-3 rounded-xl bg-secondary text-muted font-medium cursor-not-allowed"
                        >
                          Cannot Join Yet
                        </button>
                      )}
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-card border border-dashed border-border text-center">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-3xl mx-auto mb-4">
                    👈
                  </div>
                  <h3 className="font-medium mb-2 text-foreground">Select a Loop</h3>
                  <p className="text-sm text-muted">
                    Click on a loop to verify your eligibility and join
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
