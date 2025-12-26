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

// GitHub Repo types
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  owner: {
    login: string;
    avatar_url: string;
  };
}

// Project/Loop types
export interface Project {
  ID: { Bytes: string; Valid: boolean };
  GithubRepoID: number;
  FullName: string;
  Name: string;
  OwnerID: { Bytes: string; Valid: boolean };
  CreatedAt: { Time: string; Valid: boolean };
}

export interface Rule {
  criteria_type: string;
  threshold: number;
}

export interface CreateLoopData {
  repo_id: number;
  name: string;
  rules: Rule[];
}

// API functions
export const api = {
  // Profile
  getProfile: () => apiRequest<Profile>("/api/profile"),

  updateProfile: (data: UpdateProfileData) =>
    apiRequest<Profile>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

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

  getPublicProfile: (username: string) =>
    apiRequest<Omit<Profile, "profile_completed">>(`/api/users/${username}`),

  // GitHub Repos
  getGitHubRepos: () =>
    apiRequest<{ repos: GitHubRepo[] }>("/api/github/repos"),

  // Loops/Projects
  getProjects: () => apiRequest<{ projects: Project[] }>("/api/projects"),

  createLoop: (data: CreateLoopData) =>
    apiRequest<{ id: string; name: string }>("/api/channel", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
