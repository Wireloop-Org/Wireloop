"use client";

import Link from "next/link";
import { ChevronDown, ArrowRight, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const handleLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    window.location.href = `${apiUrl}/api/auth/github`;
  };

  // Track scroll for navbar background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
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
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-md border-b border-zinc-100"
          : "bg-transparent"
      }`}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Logo & Links Container */}
          <div className="flex items-center gap-12">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-6 h-6 bg-black rounded flex items-center justify-center transition-transform group-hover:scale-105">
                <div className="w-2.5 h-2.5 bg-white rounded-full" />
              </div>
              <span className="font-bold text-lg tracking-tight">Wireloop</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600">
              <Link
                href="#platform"
                className="hover:text-black transition-colors"
              >
                Platform
              </Link>
              <Link
                href="#loops"
                className="hover:text-black transition-colors"
              >
                Loops
              </Link>
              <Link
                href="#access"
                className="hover:text-black transition-colors"
              >
                How It Works
              </Link>
              <Link
                href="#manifesto"
                className="hover:text-black transition-colors"
              >
                Manifesto
              </Link>
              <Link href="/blog" className="hover:text-black transition-colors">
                Blog
              </Link>
            </div>
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button className="flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-black px-2 transition-colors">
              EN <ChevronDown size={14} />
            </button>

            <button
              onClick={handleLogin}
              className="bg-black text-white px-6 py-2.5 rounded-sm text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2"
            >
              Connect GitHub <ArrowRight size={14} />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 -mr-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="fixed inset-0 top-[73px] bg-white z-40 md:hidden"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col p-6 gap-6">
              <Link
                href="#platform"
                className="text-lg font-medium text-zinc-900 py-2 border-b border-zinc-100"
                onClick={() => setIsMenuOpen(false)}
              >
                Platform
              </Link>
              <Link
                href="#loops"
                className="text-lg font-medium text-zinc-900 py-2 border-b border-zinc-100"
                onClick={() => setIsMenuOpen(false)}
              >
                Loops
              </Link>
              <Link
                href="#access"
                className="text-lg font-medium text-zinc-900 py-2 border-b border-zinc-100"
                onClick={() => setIsMenuOpen(false)}
              >
                How It Works
              </Link>
              <Link
                href="#manifesto"
                className="text-lg font-medium text-zinc-900 py-2 border-b border-zinc-100"
                onClick={() => setIsMenuOpen(false)}
              >
                Manifesto
              </Link>
              <Link
                href="/blog"
                className="text-lg font-medium text-zinc-900 py-2 border-b border-zinc-100"
                onClick={() => setIsMenuOpen(false)}
              >
                Blog
              </Link>

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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
