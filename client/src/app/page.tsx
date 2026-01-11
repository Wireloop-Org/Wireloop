"use client";

import { useEffect, Suspense, lazy } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";

// Lazy load heavy components for code splitting
const LandingPage = lazy(() => import("@/components/LandingPage"));
const Dashboard = lazy(() => import("@/components/Dashboard"));

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted animate-pulse">Loading...</span>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, fetchUser } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    // Redirect to setup if profile not completed
    if (user && !user.profile_completed) {
      router.push("/setup");
    }
  }, [user, router]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      {isAuthenticated && user ? (
        <Dashboard />
      ) : (
        <LandingPage />
      )}
    </Suspense>
  );
}
