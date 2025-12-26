"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

export default function LoopsPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0c0c0f] flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-zinc-800/50 flex items-center justify-center text-4xl mx-auto mb-6">
          🔍
        </div>
        <h2 className="text-2xl font-bold mb-3">Browse Loops</h2>
        <p className="text-zinc-500 mb-6">
          Discover and join loops from repositories you have contributed to.
          This feature is coming soon!
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

