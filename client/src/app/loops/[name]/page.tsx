"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import {
  api,
  getToken,
  clearToken,
  InitData,
  LoopFullData,
  Message,
  Channel,
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

export default function LoopPage() {
  const router = useRouter();
  const params = useParams();
  const loopName = decodeURIComponent(params.name as string);

  // Zustand store for loop state management
  const { 
    selectedLoop: storeLoop, 
    selectLoop, 
    prefetchLoop,
    isLoopLoading: storeLoading 
  } = useLoopsStore();

  // Core state
  const [initData, setInitData] = useState<InitData | null>(null);
  const [loopData, setLoopData] = useState<LoopFullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track if initial messages were passed to chat
  const initialMessagesRef = useRef<Message[] | null>(null);

  // Sync store loop to local state
  useEffect(() => {
    if (storeLoop && storeLoop.name === loopName) {
      setLoopData(storeLoop);
      initialMessagesRef.current = storeLoop.messages;
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

    // Only show loading if explicitly requested (first load) and no cached data
    if (showLoading && !storeLoop) {
      setLoading(true);
    }

    try {
      // Fetch init only if not already cached
      const initPromise = initData ? Promise.resolve(initData) : api.getInit();
      
      // Use store's selectLoop for caching benefits
      const loopPromise = selectLoop(loopName);
      
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
  }, [router, loopName, initData, selectLoop, storeLoop]);

  // Initial load - only on first mount
  useEffect(() => {
    loadData(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loop name change - use store for instant switching
  useEffect(() => {
    if (loopData && loopData.name !== loopName) {
      selectLoop(loopName);
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

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted">Loading loop...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !initData) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center text-4xl mx-auto mb-6">
            {error === "Loop not found" ? "🔍" : "⚠️"}
          </div>
          <h2 className="text-2xl font-bold mb-3 text-foreground">{error || "Something went wrong"}</h2>
          <p className="text-muted mb-6">
            {error === "Loop not found"
              ? "The loop you are looking for does not exist."
              : "Please try again or go back to dashboard."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover font-medium transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const profile = initData.profile;
  const displayName = profile.display_name || profile.username;
  const avatarUrl = profile.avatar_url;

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r border-border bg-card/50 flex flex-col h-full z-20">
        {/* Logo */}
        <div className="flex-shrink-0 p-4 border-b border-border">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center shadow-lg shadow-accent/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-semibold text-lg text-foreground tracking-tight">Wireloop</span>
          </button>
        </div>

        {/* Back to Dashboard */}
        <div className="flex-shrink-0 p-4 border-b border-border">
          <button
            onClick={() => router.push("/")}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
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
        <div className="flex-shrink-0 p-4 border-t border-border bg-card">
          <button
            onClick={() => router.push("/profile")}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-secondary transition-colors group"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden bg-secondary relative border border-border group-hover:border-accent/50 transition-colors">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={displayName} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted">
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{displayName}</div>
              <div className="text-xs text-muted truncate">@{profile.username}</div>
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="w-full mt-2 px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-secondary rounded-lg transition-colors font-medium"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {loopData ? (
          <ChatWindow
            loopDetails={{
              id: loopData.id,
              name: loopData.name,
              owner_id: loopData.owner_id,
              created_at: loopData.created_at,
              is_member: loopData.is_member,
              members: loopData.members,
            }}
            initialMessages={initialMessagesRef.current || []}
            channels={loopData.channels || []}
            activeChannel={loopData.active_channel}
            onMembershipChanged={loadData}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Members Panel (collapsible) */}
        {loopData && loopData.members.length > 0 && (
          <div className="flex-shrink-0 relative z-30">
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
    <div className="border-t border-border bg-card/80 backdrop-blur-md">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-3 flex items-center justify-between text-sm hover:bg-secondary/50 transition-colors"
      >
        <span className="text-muted font-medium">
          {members.length} Member{members.length !== 1 ? "s" : ""}
        </span>
        <svg
          className={`w-4 h-4 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-6 pb-4 flex flex-wrap gap-3 animate-fade-in-up">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-background relative border border-border/50">
                {member.avatar_url ? (
                  <Image src={member.avatar_url} alt={member.username} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted">
                    {member.username[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-sm text-foreground">{member.display_name || member.username}</span>
              {member.role === "owner" && <span className="text-xs text-amber-500" title="Owner">👑</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
