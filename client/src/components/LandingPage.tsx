"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function LandingPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleGitHubLogin = () => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
        window.location.href = `${apiUrl}/api/auth/github`;
    };

    if (!mounted) return null;

    return (
        <div className="relative min-h-screen flex flex-col overflow-hidden">
            {/* Dynamic Background */}
            <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />

            {/* Grid Overlay */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
                    backgroundSize: "40px 40px",
                }}
            />

            {/* Navbar */}
            <nav className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 flex items-center justify-between animate-fade-in-up">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
                        <svg className="w-6 h-6 text-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <span className="text-2xl font-bold tracking-tight">Wireloop</span>
                </div>
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted">
                    <a href="#features" className="hover:text-foreground transition-colors">Features</a>
                    <a href="#about" className="hover:text-foreground transition-colors">Manifesto</a>
                    <button
                        onClick={handleGitHubLogin}
                        className="text-foreground hover:text-accent transition-colors"
                    >
                        Sign In
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-20 text-center">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium animate-fade-in-up stagger-1">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                        </span>
                        Meritocratic access control is here
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] animate-fade-in-up stagger-2">
                        Code talks. <br />
                        <span className="text-gradient">Bullshit walks.</span>
                    </h1>

                    {/* Subheadline */}
                    <p className="max-w-xl mx-auto text-lg md:text-xl text-muted leading-relaxed animate-fade-in-up stagger-3">
                        Join exclusive high-signal chat loops gated by your GitHub contribution footprint. Stop wasting time in noise; start coordinating with builders.
                    </p>

                    {/* CTA */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-fade-in-up stagger-3">
                        <button
                            onClick={handleGitHubLogin}
                            className="group relative px-8 py-4 bg-foreground text-background rounded-2xl font-semibold text-lg hover-lift shadow-xl overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-accent/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <span className="relative flex items-center gap-2">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.03 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
                                </svg>
                                Continue with GitHub
                            </span>
                        </button>
                        <a href="#how-it-works" className="px-8 py-4 rounded-2xl border border-border hover:bg-card hover:border-accent/30 transition-all font-medium text-muted hover:text-foreground">
                            How it works
                        </a>
                    </div>
                </div>
            </main>

            {/* Feature Grid Preview */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-24">
                <div className="grid md:grid-cols-3 gap-6">
                    <FeatureCard
                        icon="🔒"
                        title="Proof of Work"
                        description="Access is gated by real GitHub commits, PRs, and merges. No posers allowed."
                        delay="delay-100"
                    />
                    <FeatureCard
                        icon="⚡"
                        title="High-Perf Chat"
                        description="Bi-directional WebSockets built on Go for sub-millisecond coordination."
                        delay="delay-200"
                    />
                    <FeatureCard
                        icon="🌐"
                        title="Global Presence"
                        description="See who is coding what in real-time. Jump into active loops instantly."
                        delay="delay-300"
                    />
                </div>
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, description, delay }: { icon: string, title: string, description: string, delay: string }) {
    return (
        <div className={`glass p-8 rounded-3xl hover-lift ${delay}`}>
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-2xl mb-4 text-foreground">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">{title}</h3>
            <p className="text-muted leading-relaxed">
                {description}
            </p>
        </div>
    );
}
