"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const handleLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    window.location.href = `${apiUrl}/api/auth/github`;
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-md border-b border-zinc-100"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-12">
            <a href="/" className="flex items-center gap-2 group">
              <div className="w-6 h-6 bg-black rounded flex items-center justify-center transition-transform group-hover:scale-105">
                <div className="w-2.5 h-2.5 bg-white rounded-full" />
              </div>
              <span className="font-bold text-lg tracking-tight">Wireloop</span>
            </a>

            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600">
              <a href="/platform" className="hover:text-black transition-colors">Platform</a>
              <a href="/features" className="hover:text-black transition-colors">Features</a>
              <a href="/how-it-works" className="hover:text-black transition-colors">How It Works</a>
              <a href="/manifesto" className="hover:text-black transition-colors">Manifesto</a>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={handleLogin}
              className="bg-black text-white px-6 py-2.5 rounded-sm text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2"
            >
              Connect GitHub <ArrowRight size={14} />
            </button>
          </div>

          <button
            className="md:hidden p-2 -mr-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="fixed inset-0 top-[73px] bg-white z-40 md:hidden">
          <div className="flex flex-col p-6 gap-6">
            <a href="/platform" className="text-lg font-medium text-zinc-900 py-2 border-b border-zinc-100" onClick={() => setIsMenuOpen(false)}>Platform</a>
            <a href="/features" className="text-lg font-medium text-zinc-900 py-2 border-b border-zinc-100" onClick={() => setIsMenuOpen(false)}>Features</a>
            <a href="/how-it-works" className="text-lg font-medium text-zinc-900 py-2 border-b border-zinc-100" onClick={() => setIsMenuOpen(false)}>How It Works</a>
            <a href="/manifesto" className="text-lg font-medium text-zinc-900 py-2 border-b border-zinc-100" onClick={() => setIsMenuOpen(false)}>Manifesto</a>

            <button
              onClick={() => {
                setIsMenuOpen(false);
                handleLogin();
              }}
              className="mt-4 bg-black text-white px-6 py-3 rounded-sm text-sm font-medium flex items-center justify-center gap-2"
            >
              Connect GitHub <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
