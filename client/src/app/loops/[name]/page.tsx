"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  api,
  getToken,
  clearToken,
  InitData,
  LoopFullData,
} from "@/lib/api";
import { useLoopsStore } from "@/store/useLoopsStore";
import ChatWindow from "@/components/ChatWindow";
import LoopsList from "@/components/LoopsList";

// Extended project type for sidebar
interface SidebarProject {
  id: string;
  name: string;
  role: string;
}

// Loop data cache - persists across component re-renders
const loopDataCache = new Map<string, LoopFullData>();

export default function LoopPage() {
  const router = useRouter();
  const params = useParams();
  const loopName = decodeURIComponent(params.name as string);

  // Zustand store for loop state management
  const { 
    selectedLoop: storeLoop, 
    selectLoop, 
    prefetchLoop,
  } = useLoopsStore();

  // Core state
  const [initData, setInitData] = useState<InitData | null>(null);
  const [loopData, setLoopData] = useState<LoopFullData | null>(() => {
    // Initialize from cache if available
    return loopDataCache.get(loopName) || null;
  });
  const [loading, setLoading] = useState(!loopDataCache.has(loopName));
  const [error, setError] = useState<string | null>(null);

  // Track current loop name for stale closure prevention
  const loopNameRef = useRef(loopName);
  loopNameRef.current = loopName;

  // Sync store loop to local state
  useEffect(() => {
    if (storeLoop && storeLoop.name === loopName) {
      setLoopData(storeLoop);
      loopDataCache.set(loopName, storeLoop);
      setLoading(false);
    }
  }, [storeLoop, loopName]);

  // Combined sidebar projects (owned + joined)
  const sidebarProjects: SidebarProject[] = initData ? [
    // Owned projects
    ...initData.projects.map(p => ({
      id: p.id,
      name: p.name,
      role: "owner",
    })),
    // Joined projects (exclude owned)
    ...initData.memberships
      .filter(m => !initData.projects.some(p => p.name === m.loop_name))
      .map(m => ({
        id: m.loop_id,
        name: m.loop_name,
        role: m.role,
      })),
  ] : [];

  const loadData = useCallback(async (showLoading = true) => {
    const token = getToken();
    if (!token) {
      router.push("/");
      return;
    }

    // Check cache first - instant switch!
    const cached = loopDataCache.get(loopName);
    if (cached) {
      setLoopData(cached);
      setLoading(false);
      // Background refresh
      selectLoop(loopName).catch(() => {});
    } else if (showLoading) {
      setLoading(true);
    }

    try {
      // Fetch init only if not already cached
      const initPromise = initData ? Promise.resolve(initData) : api.getInit();
      
      // Use store's selectLoop for caching benefits (if not cached)
      const loopPromise = cached ? Promise.resolve() : selectLoop(loopName);
      
      const [init] = await Promise.all([initPromise, loopPromise]);

      if (!initData) {
        setInitData(init);
      }
      setError(null);
    } catch (err) {
      console.error("Error loading loop:", err);
      if (err instanceof Error && err.message.includes("not found")) {
        setError("Loop not found");
      } else if (err instanceof Error && err.message.includes("unauthorized")) {
        clearToken();
        router.push("/");
      } else {
        setError("Failed to load");
      }
    } finally {
      setLoading(false);
    }
  }, [router, loopName, initData, selectLoop]);

  // Initial load - only on first mount
  useEffect(() => {
    loadData(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loop name change - instant switch with cache
  useEffect(() => {
    if (loopData && loopData.name !== loopName) {
      // Check cache first
      const cached = loopDataCache.get(loopName);
      if (cached) {
        setLoopData(cached);
        setLoading(false);
        // Background refresh
        selectLoop(loopName).catch(() => {});
      } else {
        setLoading(true);
        selectLoop(loopName).catch(() => {});
      }
    }
  }, [loopName, loopData, selectLoop]);

  // Handle loop selection with prefetch
  const handleSelectLoop = (project: SidebarProject) => {
    // Start loading immediately using store
    selectLoop(project.name);
    router.push(`/loops/${encodeURIComponent(project.name)}`);
  };

  // Prefetch on hover for instant navigation
  const handleLoopHover = (project: SidebarProject) => {
    prefetchLoop(project.name);
  };

  const handleLogout = () => {
    clearToken();
    router.push("/");
  };

  // Loading state - only show full-screen loader on first load with no data
  if (loading && !loopData) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-10 h-10 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
          <span className="text-sm text-neutral-500">Loading loop...</span>
        </motion.div>
      </div>
    );
  }

  // Error state - only show if we have an explicit error AND no cached data
  if (error && !loopData) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-50">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center text-4xl mx-auto mb-6">
            {error === "Loop not found" ? "🔍" : "⚠️"}
          </div>
          <h2 className="text-2xl font-bold mb-3 text-neutral-900">{error}</h2>
          <p className="text-neutral-500 mb-6">
            {error === "Loop not found"
              ? "The loop you are looking for does not exist."
              : "Please try again or go back to dashboard."}
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/")}
            className="px-6 py-3 rounded-xl bg-neutral-900 text-white font-medium transition-colors hover:bg-neutral-800"
          >
            Go to Dashboard
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Get profile info - fallback to placeholders if not loaded yet
  const profile = initData?.profile;
  const displayName = profile?.display_name || profile?.username || "User";
  const avatarUrl = profile?.avatar_url;

  return (
    <div className="h-screen bg-neutral-50 flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r border-neutral-200 bg-white flex flex-col h-full z-20">
        {/* Logo */}
        <div className="shrink-0 p-4 border-b border-neutral-200">
          <motion.button
            onClick={() => router.push("/")}
            whileHover={{ opacity: 0.8 }}
            className="flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-semibold text-lg text-neutral-900 tracking-tight">Wireloop</span>
          </motion.button>
        </div>

        {/* Back to Dashboard */}
        <div className="shrink-0 p-3 border-b border-neutral-200">
          <motion.button
            onClick={() => router.push("/")}
            whileHover={{ x: -2 }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </motion.button>
        </div>

        {/* Loops List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4">
          <LoopsList
            projects={sidebarProjects}
            onSelectLoop={handleSelectLoop}
            onHoverLoop={handleLoopHover}
            selectedLoopName={loopData?.name}
          />
        </div>

        {/* User */}
        <div className="shrink-0 p-4 border-t border-neutral-200 bg-neutral-50/50">
          {profile ? (
            <>
              <motion.button
                onClick={() => router.push("/profile")}
                whileHover={{ backgroundColor: "rgb(245 245 245)" }}
                className="w-full flex items-center gap-3 p-2 rounded-xl transition-colors group"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-200 relative ring-2 ring-neutral-100 group-hover:ring-neutral-200 transition-all">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt={displayName} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-neutral-500">
                      {displayName[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium text-neutral-900 truncate">{displayName}</div>
                  <div className="text-xs text-neutral-500 truncate">@{profile.username}</div>
                </div>
              </motion.button>
              <button
                onClick={handleLogout}
                className="w-full mt-2 px-4 py-2 text-sm text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors font-medium"
              >
                Sign out
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 p-2 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-neutral-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-neutral-200 rounded" />
                <div className="h-3 w-16 bg-neutral-200 rounded" />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <AnimatePresence mode="wait">
          {loopData ? (
            <motion.div
              key={loopData.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col h-full"
            >
              <ChatWindow
                loopDetails={{
                  id: loopData.id,
                  name: loopData.name,
                  owner_id: loopData.owner_id,
                  created_at: loopData.created_at,
                  is_member: loopData.is_member,
                  members: loopData.members,
                }}
                initialMessages={loopData.messages || []}
                channels={loopData.channels || []}
                activeChannel={loopData.active_channel}
                onMembershipChanged={loadData}
                currentUserId={initData?.profile?.id}
              />
            </motion.div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
            </div>
          )}
        </AnimatePresence>

        {/* Members Panel (collapsible) */}
        {loopData && loopData.members.length > 0 && (
          <div className="shrink-0 relative z-30">
            <MembersPanel members={loopData.members} />
          </div>
        )}
      </main>
    </div>
  );
}

function MembersPanel({ members }: { members: LoopFullData["members"] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-neutral-200 bg-white">
      <motion.button
        onClick={() => setExpanded(!expanded)}
        whileHover={{ backgroundColor: "rgb(250 250 250)" }}
        className="w-full px-6 py-3 flex items-center justify-between text-sm transition-colors"
      >
        <span className="text-neutral-500 font-medium">
          {members.length} Member{members.length !== 1 ? "s" : ""}
        </span>
        <motion.svg
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-4 h-4 text-neutral-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-4 flex flex-wrap gap-2">
              {members.map((member) => (
                <motion.div 
                  key={member.id} 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200"
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-neutral-200 relative">
                    {member.avatar_url ? (
                      <Image src={member.avatar_url} alt={member.username} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                        {member.username[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-neutral-700">{member.display_name || member.username}</span>
                  {member.role === "owner" && <span className="text-xs" title="Owner">👑</span>}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
