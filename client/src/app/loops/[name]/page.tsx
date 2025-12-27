"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { api, getToken, clearToken, Profile, Project } from "@/lib/api";
import ChatWindow from "@/components/ChatWindow";
import LoopsList from "@/components/LoopsList";

export default function LoopPage() {
  const router = useRouter();
  const params = useParams();
  const loopName = params.name as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push("/");
      return;
    }

    try {
      const [profileData, projectsData] = await Promise.all([
        api.getProfile(),
        api.getProjects(),
      ]);

      setProfile(profileData);
      setProjects(projectsData.projects || []);

      // Find the selected project by name
      const project = (projectsData.projects || []).find(
        (p: Project) => p.Name === decodeURIComponent(loopName)
      );
      if (project) {
        setSelectedProject(project);
      }
    } catch {
      clearToken();
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [router, loopName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectLoop = (project: Project) => {
    setSelectedProject(project);
    router.push(`/loops/${encodeURIComponent(project.Name)}`);
  };

  const handleLogout = () => {
    clearToken();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c0c0f]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const displayName = profile.display_name || profile.username;
  const avatarUrl = profile.avatar_url;

  return (
    <div className="min-h-screen bg-[#0c0c0f] flex">
      {/* Sidebar */}
      <aside className="w-72 border-r border-zinc-800 bg-zinc-900/30 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-zinc-800">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
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
            <span className="font-semibold text-lg">Wireloop</span>
          </button>
        </div>

        {/* Back to Dashboard */}
        <div className="p-4 border-b border-zinc-800">
          <button
            onClick={() => router.push("/")}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </button>
        </div>

        {/* Loops List */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <LoopsList
            projects={projects}
            onSelectLoop={handleSelectLoop}
            selectedLoop={selectedProject}
          />
        </div>

        {/* User */}
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={() => router.push("/profile")}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-800/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 relative">
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
      <main className="flex-1 flex flex-col">
        {selectedProject ? (
          <ChatWindow project={selectedProject} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-2xl bg-zinc-800/50 flex items-center justify-center text-4xl mx-auto mb-6">
                🔍
              </div>
              <h2 className="text-2xl font-bold mb-3">Loop not found</h2>
              <p className="text-zinc-500 mb-6">
                The loop you are looking for does not exist or you do not have
                access to it.
              </p>
              <button
                onClick={() => router.push("/")}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


