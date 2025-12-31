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
} from "@/lib/api";
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

  // Core state
  const [initData, setInitData] = useState<InitData | null>(null);
  const [loopData, setLoopData] = useState<LoopFullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track if initial messages were passed to chat
  const initialMessagesRef = useRef<Message[] | null>(null);

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

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push("/");
      return;
    }

    try {
      const [init, loop] = await Promise.all([
        api.getInit(),
        api.getLoopFull(loopName),
      ]);

      setInitData(init);
      setLoopData(loop);
      initialMessagesRef.current = loop.messages;
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
  }, [router, loopName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle loop selection with prefetch
  const handleSelectLoop = (project: SidebarProject) => {
    router.push(`/loops/${encodeURIComponent(project.name)}`);
  };

  // Prefetch on hover for instant navigation
  const handleLoopHover = (project: SidebarProject) => {
    api.prefetchLoop(project.name);
  };

  const handleLogout = () => {
    clearToken();
    router.push("/");
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0c0c0f]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-500">Loading loop...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !initData) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0c0c0f]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-zinc-800/50 flex items-center justify-center text-4xl mx-auto mb-6">
            {error === "Loop not found" ? "🔍" : "⚠️"}
          </div>
          <h2 className="text-2xl font-bold mb-3">{error || "Something went wrong"}</h2>
          <p className="text-zinc-500 mb-6">
            {error === "Loop not found" 
              ? "The loop you are looking for does not exist."
              : "Please try again or go back to dashboard."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium transition-colors"
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
    <div className="h-screen bg-[#0c0c0f] flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r border-zinc-800 bg-zinc-900/30 flex flex-col h-full">
        {/* Logo */}
        <div className="flex-shrink-0 p-4 border-b border-zinc-800">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-semibold text-lg">Wireloop</span>
          </button>
        </div>

        {/* Back to Dashboard */}
        <div className="flex-shrink-0 p-4 border-b border-zinc-800">
          <button
            onClick={() => router.push("/")}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors"
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
        <div className="flex-shrink-0 p-4 border-t border-zinc-800">
          <button
            onClick={() => router.push("/profile")}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-800/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 relative">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={displayName} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-zinc-500">
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium">{displayName}</div>
              <div className="text-xs text-zinc-500">@{profile.username}</div>
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="w-full mt-2 px-4 py-2 text-sm text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
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
            onMembershipChanged={loadData}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Members Panel (collapsible) */}
        {loopData && loopData.members.length > 0 && (
          <div className="flex-shrink-0">
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
    <div className="border-t border-zinc-800 bg-zinc-900/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-3 flex items-center justify-between text-sm hover:bg-zinc-800/30 transition-colors"
      >
        <span className="text-zinc-400">
          {members.length} Member{members.length !== 1 ? "s" : ""}
        </span>
        <svg
          className={`w-4 h-4 text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-6 pb-4 flex flex-wrap gap-3">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-700 relative">
                {member.avatar_url ? (
                  <Image src={member.avatar_url} alt={member.username} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs">
                    {member.username[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-sm text-zinc-300">{member.display_name || member.username}</span>
              {member.role === "owner" && <span className="text-xs text-amber-500">👑</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
