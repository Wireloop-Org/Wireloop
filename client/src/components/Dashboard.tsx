"use client";

import { useEffect, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { clearToken } from "@/lib/api";
import { useAuthStore, useLoopsStore } from "@/store";
import CreateLoopModal from "@/components/CreateLoopModal";
import { useState } from "react";
import { motion } from "framer-motion";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } }
};

// Icon component for StatCard
const StatIcon = ({ type, className }: { type: string; className?: string }) => {
    switch (type) {
        case "owned":
            return (
                <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            );
        case "joined":
            return (
                <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
            );
        case "total":
            return (
                <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            );
        default:
            return (
                <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
            );
    }
};

// Memoized loop card component with framer-motion
const LoopCard = memo(function LoopCard({
    name,
    subtitle,
    date,
    onClick,
}: {
    name: string;
    subtitle: string;
    date?: string;
    onClick: () => void;
}) {
    return (
        <motion.button
            onClick={onClick}
            className="p-5 rounded-2xl bg-white border border-neutral-200 hover:border-neutral-300 hover:shadow-lg transition-all text-left group w-full"
        >
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-50 border border-neutral-200 flex items-center justify-center">
                    <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-neutral-900 truncate">{name}</h3>
                    <p className="text-xs text-neutral-500 truncate">{subtitle}</p>
                </div>
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>{date || "Owner"}</span>
                <span className="text-neutral-900 font-medium group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Open
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </span>
            </div>
        </motion.button>
    );
});

// Memoized stats card with cleaner design
const StatCard = memo(function StatCard({
    icon,
    value,
    label,
    gradient,
}: {
    icon: string;
    value: number | string;
    label: string;
    gradient?: string;
}) {
    return (
        <motion.div 
            className={`relative p-6 rounded-2xl overflow-hidden ${gradient || 'bg-white border border-neutral-200'}`}
        >
            {gradient && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            )}
            <div className="relative z-10">
                <div className={`mb-3 ${gradient ? 'text-white' : 'text-neutral-600'}`}>
                    <StatIcon type={icon} />
                </div>
                <div className={`text-4xl font-bold mb-1 tracking-tight ${gradient ? 'text-white' : 'text-neutral-900'}`}>
                    {value}
                </div>
                <div className={`text-sm ${gradient ? 'text-white/80' : 'text-neutral-500'}`}>{label}</div>
            </div>
        </motion.div>
    );
});

export default function Dashboard() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const { ownedLoops, joinedLoops, isLoading, fetchLoops, prefetchLoop } = useLoopsStore();
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchLoops();
    }, [fetchLoops]);

    // Filter joined loops (exclude owned)
    const filteredJoinedLoops = joinedLoops.filter(
        (m) => !ownedLoops.some((p) => p.name === m.loop_name)
    );

    const handleLogout = useCallback(() => {
        clearToken();
        useAuthStore.getState().logout();
        window.location.reload();
    }, []);

    const handleLoopCreated = useCallback(() => {
        useLoopsStore.getState().invalidate();
        setShowCreateModal(false);
    }, []);

    const handleLoopClick = useCallback((name: string) => {
        router.push(`/loops/${encodeURIComponent(name)}`);
    }, [router]);

    const handleLoopHover = useCallback((name: string) => {
        prefetchLoop(name);
    }, [prefetchLoop]);

    if (!user) return null;

    const displayName = user.display_name || user.username;
    const avatarUrl = user.avatar_url;

    return (
        <div className="min-h-screen bg-neutral-50">
            {/* Subtle grid background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.03) 1px, transparent 0)`,
                    backgroundSize: '24px 24px',
                }} />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-200/50">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2"
                    >
                        <div className="w-7 h-7 rounded bg-black flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-full" />
                        </div>
                        <span className="font-bold text-lg text-neutral-900 tracking-tight">Wireloop</span>
                    </motion.div>

                    {/* User Menu */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3"
                    >
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
                            <span className="text-sm font-medium text-neutral-700">{displayName}</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                        >
                            Sign out
                        </button>
                    </motion.div>
                </div>
            </header>

            {/* Main content */}
            <main className="relative z-10 max-w-6xl mx-auto px-6 py-12">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Hero greeting */}
                    <motion.div variants={itemVariants} className="mb-10">
                        <h1 className="text-4xl font-bold text-neutral-900 tracking-tight mb-2">
                            Welcome back, {displayName}
                        </h1>
                        <p className="text-neutral-500 text-lg">
                            Manage your loops and collaborate with contributors
                        </p>
                    </motion.div>

                    {/* Stats cards */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                        <StatCard
                            icon="owned"
                            value={isLoading ? "–" : ownedLoops.length}
                            label="Owned Loops"
                            gradient="bg-gradient-to-br from-neutral-900 to-neutral-700"
                        />
                        <StatCard
                            icon="joined"
                            value={isLoading ? "–" : filteredJoinedLoops.length}
                            label="Joined Loops"
                        />
                        <StatCard
                            icon="total"
                            value={isLoading ? "–" : ownedLoops.length + filteredJoinedLoops.length}
                            label="Total Loops"
                        />
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                        <div 
                            className="p-6 rounded-2xl bg-white border border-neutral-200 hover:border-neutral-300 hover:shadow-lg transition-all"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-200 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg text-neutral-900 mb-1">Create a Loop</h3>
                                    <p className="text-neutral-500 text-sm mb-4">
                                        Set up a merit-based chat for your repository
                                    </p>
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors shadow-lg shadow-neutral-900/10"
                                    >
                                        Create Loop
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div 
                            className="p-6 rounded-2xl bg-white border border-neutral-200 hover:border-neutral-300 hover:shadow-lg transition-all"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg text-neutral-900 mb-1">Browse Loops</h3>
                                    <p className="text-neutral-500 text-sm mb-4">
                                        Discover and join communities based on your contributions
                                    </p>
                                    <button
                                        onClick={() => router.push("/loops")}
                                        className="px-5 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-50 hover:border-neutral-400 transition-colors"
                                    >
                                        Browse Loops
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Joined Loops */}
                    {(isLoading || filteredJoinedLoops.length > 0) && (
                        <motion.div variants={itemVariants} className="mb-10">
                            <h2 className="text-xl font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                Joined Loops
                            </h2>
                            {isLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredJoinedLoops.map((membership) => (
                                        <LoopCard
                                            key={membership.loop_id}
                                            name={membership.loop_name}
                                            subtitle={membership.role}
                                            date={`Joined ${new Date(membership.joined_at).toLocaleDateString()}`}
                                            onClick={() => handleLoopClick(membership.loop_name)}
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Your Loops */}
                    <motion.div variants={itemVariants} className="mb-10">
                        <h2 className="text-xl font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Your Loops
                        </h2>
                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
                            </div>
                        ) : ownedLoops.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {ownedLoops.map((project) => (
                                    <div
                                        key={project.id}
                                        onMouseEnter={() => handleLoopHover(project.name)}
                                    >
                                        <LoopCard
                                            name={project.name}
                                            subtitle="Created by you"
                                            onClick={() => handleLoopClick(project.name)}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div 
                                className="text-center py-16 rounded-2xl border-2 border-dashed border-neutral-300 bg-white"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-neutral-900 mb-2">No loops yet</h3>
                                <p className="text-neutral-500 mb-6">
                                    Create your first loop to start collaborating
                                </p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="px-6 py-3 rounded-xl bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition-colors shadow-lg shadow-neutral-900/10"
                                >
                                    Create Your First Loop
                                </button>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
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
