"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function AuthSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");
    
    if (error) {
      // OAuth failed — redirect to landing with error message
      console.error("[auth] OAuth error:", error);
      router.push("/?error=" + encodeURIComponent(error));
    } else if (token) {
      localStorage.setItem("wireloop_token", token);
      router.push("/");
    } else {
      router.push("/?error=auth_failed");
    }
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-zinc-500">Signing you in...</p>
    </div>
  );
}

export default function AuthSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-500">Loading...</p>
          </div>
        }
      >
        <AuthSuccessContent />
      </Suspense>
    </div>
  );
}
