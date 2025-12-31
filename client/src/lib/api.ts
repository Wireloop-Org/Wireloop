const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const WS_URL = API_URL.replace(/^http/, "ws");

// Simple in-memory cache for fast access
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds for profile/projects

function getCached<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearCache(): void {
  cache.clear();
}

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
  clearCache();
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

// Loop Membership type for caching user memberships
export interface LoopMembership {
  loop_id: string;
  loop_name: string;
  role: string;
  joined_at: string;
}

// Message types
export interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_username: string;
  sender_avatar: string;
  created_at: string;
}

// Loop details types
export interface LoopMember {
  id: string;
  username: string;
  avatar_url: string;
  display_name: string;
  role: string;
  joined_at: string;
}

export interface LoopDetails {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  is_member: boolean;
  members: LoopMember[];
}

// WebSocket connection
export function createWebSocket(projectId: string): WebSocket | null {
  const token = getToken();
  if (!token) return null;

  const ws = new WebSocket(
    `${WS_URL}/api/ws?project_id=${projectId}&token=${token}`
  );
  return ws;
}

// Browse loops types
export interface BrowseLoop {
  id: string;
  name: string;
  owner_username: string;
  owner_avatar: string;
  member_count: number;
  created_at: string;
}

// Verification types
export interface VerificationResult {
  passed: boolean;
  criteria: string;
  required: number;
  actual: number;
  message: string;
}

export interface VerifyAccessResponse {
  is_member: boolean;
  can_join: boolean;
  message: string;
  results: VerificationResult[];
}

// API functions
export const api = {
  // Profile (cached)
  getProfile: async (): Promise<Profile> => {
    const cached = getCached<Profile>("profile");
    if (cached) return cached;
    const data = await apiRequest<Profile>("/api/profile");
    setCache("profile", data);
    return data;
  },

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

  // Loops/Projects (cached)
  getProjects: async (): Promise<{ projects: Project[] }> => {
    const cached = getCached<{ projects: Project[] }>("projects");
    if (cached) return cached;
    const data = await apiRequest<{ projects: Project[] }>("/api/projects");
    setCache("projects", data);
    return data;
  },

  // Get all loops the user is a member of (cached)
  getMyMemberships: async (): Promise<{ memberships: LoopMembership[] }> => {
    const cached = getCached<{ memberships: LoopMembership[] }>("memberships");
    if (cached) return cached;
    const data = await apiRequest<{ memberships: LoopMembership[] }>("/api/my-memberships");
    setCache("memberships", data);
    return data;
  },

  createLoop: (data: CreateLoopData) =>
    apiRequest<{ id: string; name: string }>("/api/channel", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Browse loops (public)
  browseLoops: (limit = 20, offset = 0) =>
    apiRequest<{ loops: BrowseLoop[] }>(
      `/api/loops?limit=${limit}&offset=${offset}`
    ),

  // Loop details (public)
  getLoopDetails: (name: string) =>
    apiRequest<LoopDetails>(`/api/loops/${name}`),

  // Gatekeeper - Verify access
  verifyAccess: (loopName: string) =>
    apiRequest<VerifyAccessResponse>("/api/verify-access", {
      method: "POST",
      body: JSON.stringify({ loop_name: loopName }),
    }),

  // Join a loop
  joinLoop: (loopName: string) =>
    apiRequest<{ message: string; loop: string }>(`/api/loops/${loopName}/join`, {
      method: "POST",
    }),

  // Messages (uses loop name, not ID)
  getMessages: (loopName: string, limit = 50, offset = 0) =>
    apiRequest<{ messages: Message[] }>(
      `/api/loops/${encodeURIComponent(loopName)}/messages?limit=${limit}&offset=${offset}`
    ),

  sendMessage: (channelId: string, message: string) =>
    apiRequest<Message>("/api/loop/message", {
      method: "POST",
      body: JSON.stringify({ channel_id: channelId, message_body: message }),
    }),
};
