"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  api,
  getToken,
  clearToken,
  Profile,
  BrowseLoop,
  VerifyAccessResponse,
  LoopMembership,
} from "@/lib/api";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } }
};

const cardHover = {
  scale: 1.01,
  transition: { duration: 0.2, ease: "easeOut" as const }
};

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
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const displayName = profile.display_name || profile.username;
  const avatarUrl = profile.avatar_url;

  return (
    <div className="min-h-screen bg-neutral-50 relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.03) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-200/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <motion.button
              onClick={() => router.push("/")}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-7 h-7 rounded bg-black flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full" />
              </div>
              <span className="font-bold text-lg text-neutral-900 tracking-tight">Wireloop</span>
            </motion.button>

            <nav className="flex items-center gap-1">
              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                Dashboard
              </button>
              <button className="px-4 py-2 text-sm text-neutral-900 bg-neutral-100 rounded-lg font-medium">
                Browse Loops
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/profile")}
              className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-neutral-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 relative ring-2 ring-neutral-100">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-neutral-500">
                    {displayName[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors font-medium"
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between mb-8"
            >
              <div>
                <h1 className="text-3xl font-bold text-neutral-900 tracking-tight mb-2">Discover Loops</h1>
                <p className="text-neutral-500">
                  Find merit-based communities and join the conversation
                </p>
              </div>
            </motion.div>

            {/* Search */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <div className="relative group">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-neutral-900 transition-colors"
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
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 transition-all"
                />
              </div>
            </motion.div>

            {/* Loops Grid */}
            {filteredLoops.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20 rounded-2xl border-2 border-dashed border-neutral-300 bg-white"
              >
                <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2 text-neutral-900">No loops found</h3>
                <p className="text-neutral-500">
                  {searchQuery
                    ? "Try a different search term"
                    : "Be the first to create a loop!"}
                </p>
              </motion.div>
            ) : (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {filteredLoops.map((loop) => (
                  <motion.button
                    key={loop.id}
                    variants={itemVariants}
                    whileHover={cardHover}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleSelectLoop(loop)}
                    className={`p-5 rounded-2xl border text-left transition-all ${selectedLoop?.id === loop.id
                      ? "bg-neutral-900 border-neutral-900 text-white shadow-xl shadow-neutral-900/20"
                      : "bg-white hover:bg-neutral-50 border-neutral-200 hover:border-neutral-300 hover:shadow-lg"
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        selectedLoop?.id === loop.id 
                          ? "bg-white/10" 
                          : "bg-gradient-to-br from-neutral-100 to-neutral-50 border border-neutral-200"
                      }`}>
                        <svg className={`w-6 h-6 ${selectedLoop?.id === loop.id ? "text-white" : "text-neutral-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold truncate ${selectedLoop?.id === loop.id ? "text-white" : "text-neutral-900"}`}>
                          {loop.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`w-5 h-5 rounded-full overflow-hidden relative ${
                            selectedLoop?.id === loop.id ? "bg-white/20" : "bg-neutral-200"
                          }`}>
                            {loop.owner_avatar ? (
                              <Image
                                src={loop.owner_avatar}
                                alt={loop.owner_username}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs">
                                {loop.owner_username[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className={`text-sm ${selectedLoop?.id === loop.id ? "text-white/70" : "text-neutral-500"}`}>
                            {loop.owner_username}
                          </span>
                        </div>
                        <div className={`flex items-center gap-4 mt-3 text-xs ${
                          selectedLoop?.id === loop.id ? "text-white/60" : "text-neutral-500"
                        }`}>
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
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Sidebar - Verification Panel */}
          <div className="w-96 flex-shrink-0">
            <div className="sticky top-24">
              <AnimatePresence mode="wait">
                {selectedLoop ? (
                  <motion.div 
                    key="verification"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-xl"
                  >
                    <h2 className="text-xl font-bold mb-4 text-neutral-900">{selectedLoop.name}</h2>

                    {verifying ? (
                      <div className="flex flex-col items-center py-8">
                        <div className="w-10 h-10 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin mb-4" />
                        <p className="text-neutral-500">
                          Verifying your contributions...
                        </p>
                      </div>
                    ) : verification ? (
                      <>
                        {/* Status Badge */}
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-6 ${verification.is_member
                            ? "bg-emerald-100 text-emerald-700"
                            : verification.can_join
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
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
                            <h3 className="text-sm font-medium text-neutral-500">
                              Requirements
                            </h3>
                            {verification.results.map((result, i) => (
                              <div
                                key={i}
                                className={`p-3 rounded-xl border ${result.passed
                                  ? "bg-emerald-50 border-emerald-200"
                                  : "bg-neutral-50 border-neutral-200"
                                  }`}
                              >
                                <div className="flex items-center gap-2">
                                  {result.passed ? (
                                    <span className="text-emerald-600">✓</span>
                                  ) : (
                                    <span className="text-neutral-400">○</span>
                                  )}
                                  <span className="text-sm text-neutral-700">{result.message}</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="flex-1 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${result.passed
                                        ? "bg-emerald-500"
                                        : "bg-neutral-400"
                                        }`}
                                      style={{
                                        width: `${Math.min(
                                          (result.actual / result.required) * 100,
                                          100
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs text-neutral-500 font-medium">
                                    {result.actual}/{result.required}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action Button */}
                        {verification.is_member ? (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() =>
                              router.push(`/loops/${selectedLoop.name}`)
                            }
                            className="w-full py-3 rounded-xl bg-neutral-900 text-white font-medium transition-colors hover:bg-neutral-800 shadow-lg shadow-neutral-900/10"
                          >
                            Open Loop
                          </motion.button>
                        ) : verification.can_join ? (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleJoin}
                            disabled={joining}
                            className="w-full py-3 rounded-xl bg-emerald-500 text-white font-medium transition-colors hover:bg-emerald-600 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                          >
                            {joining ? "Joining..." : "Join Loop"}
                          </motion.button>
                        ) : (
                          <button
                            disabled
                            className="w-full py-3 rounded-xl bg-neutral-100 text-neutral-400 font-medium cursor-not-allowed"
                          >
                            Cannot Join Yet
                          </button>
                        )}
                      </>
                    ) : null}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="placeholder"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-8 rounded-2xl bg-white border-2 border-dashed border-neutral-300 text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-3xl mx-auto mb-4">
                      👈
                    </div>
                    <h3 className="font-medium mb-2 text-neutral-900">Select a Loop</h3>
                    <p className="text-sm text-neutral-500">
                      Click on a loop to verify your eligibility and join
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
