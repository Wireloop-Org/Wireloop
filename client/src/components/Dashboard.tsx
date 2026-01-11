"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api, clearToken, Profile } from "@/lib/api";
import CreateLoopModal from "@/components/CreateLoopModal";

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

export default function Dashboard({ profile }: { profile: Profile }) {
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
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
                            <svg
                                className="w-4 h-4 text-accent-foreground"
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
                    </div>

                    {/* User Menu */}
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
                            <span className="text-sm font-medium">{displayName}</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-7xl mx-auto px-6 py-12 animate-fade-in-up">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">
                        Welcome back, {displayName}!
                    </h1>
                    <p className="text-muted">
                        Here is what is happening with your projects
                    </p>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="p-6 rounded-2xl glass hover-lift">
                        <div className="text-2xl mb-2">💬</div>
                        <div className="text-3xl font-bold mb-1">
                            {loading ? "..." : projects.length}
                        </div>
                        <div className="text-sm text-muted">Owned Loops</div>
                    </div>
                    <div className="p-6 rounded-2xl glass hover-lift">
                        <div className="text-2xl mb-2">🔗</div>
                        <div className="text-3xl font-bold mb-1">
                            {loading ? "..." : joinedLoops.length}
                        </div>
                        <div className="text-sm text-muted">Joined Loops</div>
                    </div>
                    <div className="p-6 rounded-2xl glass hover-lift">
                        <div className="text-2xl mb-2">⚡</div>
                        <div className="text-3xl font-bold mb-1">
                            {loading ? "..." : projects.length + joinedLoops.length}
                        </div>
                        <div className="text-sm text-muted">Total Active</div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="p-6 rounded-2xl bg-secondary/50 border border-border">
                        <h3 className="font-semibold text-lg mb-2">Create a Loop</h3>
                        <p className="text-muted text-sm mb-4">
                            Set up a merit-based chat for your repository
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover text-sm font-medium transition-colors shadow-lg shadow-accent/20"
                        >
                            Create Loop
                        </button>
                    </div>
                    <div className="p-6 rounded-2xl bg-secondary/50 border border-border">
                        <h3 className="font-semibold text-lg mb-2">Browse Loops</h3>
                        <p className="text-muted text-sm mb-4">
                            Search for repositories and join their exclusive chat loops
                        </p>
                        <button
                            onClick={() => router.push("/loops")}
                            className="px-4 py-2 rounded-lg bg-card border border-border hover:bg-secondary text-sm font-medium transition-colors"
                        >
                            Browse Loops
                        </button>
                    </div>
                </div>

                {/* Joined Loops */}
                {(loading || joinedLoops.length > 0) && (
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <span>🔗</span> Joined Loops
                        </h2>
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {joinedLoops.map((membership) => (
                                    <button
                                        key={membership.loop_id}
                                        onClick={() => router.push(`/loops/${encodeURIComponent(membership.loop_name)}`)}
                                        className="p-5 rounded-2xl glass hover:border-accent/40 transition-all text-left group hover-lift"
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg">
                                                🔗
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium truncate">
                                                    {membership.loop_name}
                                                </h3>
                                                <p className="text-xs text-muted truncate">
                                                    {membership.role}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted">
                                            <span>
                                                Joined{" "}
                                                {new Date(membership.joined_at).toLocaleDateString()}
                                            </span>
                                            <span className="text-accent group-hover:translate-x-1 transition-transform">
                                                Open →
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Your Loops */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <span>💬</span> Your Loops
                    </h2>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : projects.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projects.map((project) => (
                                <button
                                    key={project.id}
                                    onClick={() => router.push(`/loops/${encodeURIComponent(project.name)}`)}
                                    className="p-5 rounded-2xl glass hover:border-accent/40 transition-all text-left group hover-lift"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg">
                                            💬
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium truncate">{project.name}</h3>
                                            <p className="text-xs text-muted truncate">
                                                Created by you
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted">
                                        <span>Owner</span>
                                        <span className="text-accent group-hover:translate-x-1 transition-transform">
                                            Open →
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card/30">
                            <div className="text-4xl mb-4">🚀</div>
                            <h3 className="text-xl font-semibold mb-2">No loops yet</h3>
                            <p className="text-muted mb-6">
                                Create your first loop to start collaborating
                            </p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-6 py-3 rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover font-medium transition-colors hover-lift"
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
