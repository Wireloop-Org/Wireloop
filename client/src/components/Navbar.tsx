"use client";

import { useState, useEffect } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const handleLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    window.location.href = `${apiUrl}/api/auth/github`;
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMenuOpen]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled ? "bg-white/90 backdrop-blur-md border-b border-zinc-100" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-12">
            <a href="/" className="flex items-center gap-2 group">
              <div className="w-6 h-6 bg-zinc-950 rounded flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-white rounded-full" />
              </div>
              <span className="font-bold text-lg tracking-tight">Wireloop</span>
            </a>

            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-500">
              <a href="/about" className="hover:text-zinc-950 transition-colors">About</a>
              <a
                href="https://github.com/Wireloop-Org/Wireloop"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-zinc-950 transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>

          <div className="hidden md:flex items-center">
            <button
              onClick={handleLogin}
              className="bg-zinc-950 text-white px-6 py-2.5 text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2"
            >
              Connect GitHub
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 -mr-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 top-[73px] bg-white z-40 md:hidden">
          <div className="flex flex-col p-6 gap-6">
            <a href="/about" className="text-lg font-medium text-zinc-900 py-2 border-b border-zinc-100" onClick={() => setIsMenuOpen(false)}>About</a>
            <a href="https://github.com/Wireloop-Org/Wireloop" target="_blank" rel="noopener noreferrer" className="text-lg font-medium text-zinc-900 py-2 border-b border-zinc-100" onClick={() => setIsMenuOpen(false)}>GitHub</a>
            <button
              onClick={() => { setIsMenuOpen(false); handleLogin(); }}
              className="mt-4 bg-zinc-950 text-white px-6 py-3 text-sm font-medium flex items-center justify-center gap-2"
            >
              Connect GitHub
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
