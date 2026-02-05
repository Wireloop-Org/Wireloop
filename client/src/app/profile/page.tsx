"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api, getToken, clearToken, Profile } from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/");
      return;
    }

    api
      .getProfile()
      .then((data) => {
        setProfile(data);
        setDisplayName(data.display_name || "");
        setAvatarPreview(data.avatar_url);
        setLoading(false);
      })
      .catch(() => {
        router.push("/");
      });
  }, [router]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setAvatarFile(file);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (avatarFile) {
        const result = await api.uploadAvatar(avatarFile);
        setAvatarPreview(result.avatar_url);
        setAvatarFile(null);
      }

      const updated = await api.updateProfile({
        display_name: displayName || undefined,
      });

      setProfile(updated);
      setSuccess("Profile updated!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.03) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }} />
      </div>

      {/* Header */}
      <header className="border-b border-neutral-200/50 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-7 h-7 rounded bg-black flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
            <span className="font-bold text-lg text-neutral-900 tracking-tight">Wireloop</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors font-medium"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-6 py-12 relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/")}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-neutral-500 hover:text-neutral-900"
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
          </button>
          <h1 className="text-2xl font-bold text-neutral-900">Profile Settings</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm"
        >
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-sm">
              {success}
            </div>
          )}

          {/* Avatar */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-neutral-500 mb-4">
              Profile Photo
            </label>
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={handleAvatarClick}
                className="relative group"
              >
                <div className="w-20 h-20 rounded-full overflow-hidden bg-neutral-100 border-2 border-neutral-200 group-hover:border-neutral-400 transition-colors relative">
                  {avatarPreview ? (
                    <Image
                      src={avatarPreview}
                      alt="Avatar"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl text-neutral-400">
                      {displayName?.[0]?.toUpperCase() ||
                        profile?.username?.[0]?.toUpperCase() ||
                        "?"}
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="text-sm">
                <p className="text-neutral-900">Upload a new photo</p>
                <p className="text-neutral-500">JPG or PNG. Max 200KB.</p>
              </div>
            </div>
          </div>

          {/* Display Name */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-neutral-500 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white focus:ring-4 focus:ring-neutral-100 transition-all"
              placeholder="Your name"
            />
          </div>

          {/* Username (read-only) */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-neutral-500 mb-2">
              Username
            </label>
            <div className="px-4 py-3 bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-500">
              @{profile?.username}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Username is linked to your GitHub account
            </p>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
