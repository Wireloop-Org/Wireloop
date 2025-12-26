const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Get stored auth token
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("wireloop_token");
}

// Set auth token
export function setToken(token: string): void {
  localStorage.setItem("wireloop_token", token);
}

// Clear auth token
export function clearToken(): void {
  localStorage.removeItem("wireloop_token");
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return !!getToken();
}

// API request helper with auth
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

// Profile types
export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  display_name: string | null;
  profile_completed: boolean;
  created_at: string;
}

export interface UpdateProfileData {
  display_name?: string;
}

// API functions
export const api = {
  // Get current user profile
  getProfile: () => apiRequest<Profile>("/api/profile"),

  // Update profile
  updateProfile: (data: UpdateProfileData) =>
    apiRequest<Profile>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Upload avatar
  uploadAvatar: async (file: File): Promise<{ avatar_url: string }> => {
    const token = getToken();
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await fetch(`${API_URL}/api/profile/avatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || "Upload failed");
    }

    return response.json();
  },

  // Get public profile
  getPublicProfile: (username: string) =>
    apiRequest<Omit<Profile, "profile_completed">>(`/api/users/${username}`),
};
