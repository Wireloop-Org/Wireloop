"use client";

import { useState, useCallback, memo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  api,
  GitHubIssueItem,
  GitHubPRItem,
  GitHubSummary,
} from "@/lib/api";
import { renderMarkdown } from "@/lib/markdown";

// ============================================================================
// Types
// ============================================================================

interface GitHubPanelProps {
  loopName: string;
  onShareToChat: (content: string) => void;
  onClose: () => void;
}

type Tab = "issues" | "prs";
type StateFilter = "open" | "closed" | "all";

// ============================================================================
// Sub-components
// ============================================================================

function StatusBadge({ state, draft, merged }: { state: string; draft?: boolean; merged?: boolean }) {
  if (merged) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
          <path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218zM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5zm8-9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5z" />
        </svg>
        Merged
      </span>
    );
  }
  if (draft) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-neutral-200 text-neutral-600">
        Draft
      </span>
    );
  }
  if (state === "open") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
        </svg>
        Open
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-600">
      <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
        <path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L8 7.94 5.78 5.72a.75.75 0 0 0-1.06 1.06L6.94 9l-2.22 2.22a.75.75 0 1 0 1.06 1.06L8 10.06l2.22 2.22a.75.75 0 1 0 1.06-1.06L9.06 9l2.22-2.22Z" />
      </svg>
      Closed
    </span>
  );
}

function LabelBadge({ name, color }: { name: string; color: string }) {
  const bgColor = `#${color}20`;
  const textColor = `#${color}`;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full border"
      style={{ backgroundColor: bgColor, color: textColor, borderColor: `#${color}40` }}
    >
      {name}
    </span>
  );
}

// Summary card shown after AI summarization
const SummaryCard = memo(function SummaryCard({
  summary,
  onShare,
  onClose,
}: {
  summary: GitHubSummary;
  onShare: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-2 p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm overflow-hidden"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI Summary
        </div>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="text-neutral-700 whitespace-pre-wrap text-[13px] leading-relaxed">
        {renderMarkdown(summary.summary)}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <motion.button
          onClick={onShare}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share to Chat
        </motion.button>
        <a
          href={summary.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View on GitHub
        </a>
      </div>
    </motion.div>
  );
});

// Individual issue/PR card
function ItemCard({
  type,
  number,
  title,
  state,
  labels,
  user,
  commentsCount,
  updatedAt,
  htmlUrl,
  draft,
  merged,
  additions,
  deletions,
  headRef,
  baseRef,
  loopName,
  onShare,
}: {
  type: "issue" | "pr";
  number: number;
  title: string;
  state: string;
  labels: { name: string; color: string }[];
  user: { login: string; avatar_url: string };
  commentsCount: number;
  updatedAt: string;
  htmlUrl: string;
  draft?: boolean;
  merged?: boolean;
  additions?: number;
  deletions?: number;
  headRef?: string;
  baseRef?: string;
  loopName: string;
  onShare: (content: string) => void;
}) {
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<GitHubSummary | null>(null);
  const [error, setError] = useState("");

  const handleSummarize = useCallback(async () => {
    setSummarizing(true);
    setError("");
    try {
      const result = await api.summarizeGitHubItem(loopName, type, number);
      setSummary(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to summarize");
    } finally {
      setSummarizing(false);
    }
  }, [loopName, type, number]);

  const handleShare = useCallback(() => {
    if (!summary) return;
    const prefix = type === "pr" ? "PR" : "Issue";
    const content = `**${prefix} #${number}**: ${summary.title}\n${summary.url}\n\n${summary.summary}`;
    onShare(content);
    setSummary(null);
  }, [summary, type, number, onShare]);

  const timeAgo = getTimeAgo(updatedAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 border border-neutral-200 rounded-xl hover:border-neutral-300 transition-colors bg-white"
    >
      <div className="flex items-start gap-2">
        <div className="shrink-0 mt-0.5">
          {type === "issue" ? (
            <svg className="w-4 h-4 text-neutral-400" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-neutral-400" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-neutral-900 hover:text-neutral-600 transition-colors line-clamp-2"
            >
              {title}
            </a>
            <span className="text-xs text-neutral-400 shrink-0">#{number}</span>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <StatusBadge state={state} draft={draft} merged={merged} />
            {labels.slice(0, 3).map((label) => (
              <LabelBadge key={label.name} name={label.name} color={label.color} />
            ))}
            {labels.length > 3 && (
              <span className="text-[10px] text-neutral-400">+{labels.length - 3}</span>
            )}
          </div>

          {type === "pr" && headRef && baseRef && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-neutral-400">
              <code className="px-1 py-0.5 bg-neutral-100 rounded text-[10px]">{headRef}</code>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <code className="px-1 py-0.5 bg-neutral-100 rounded text-[10px]">{baseRef}</code>
              {additions !== undefined && deletions !== undefined && (additions > 0 || deletions > 0) && (
                <span className="ml-1">
                  <span className="text-emerald-600">+{additions}</span>
                  {" "}
                  <span className="text-red-500">-{deletions}</span>
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full overflow-hidden bg-neutral-200">
                <Image
                  src={user.avatar_url}
                  alt={user.login}
                  width={16}
                  height={16}
                  className="object-cover"
                  unoptimized
                />
              </div>
              <span className="text-xs text-neutral-500">{user.login}</span>
            </div>
            {commentsCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-neutral-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {commentsCount}
              </span>
            )}
            <span className="text-xs text-neutral-400">{timeAgo}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            <motion.button
              onClick={handleSummarize}
              disabled={summarizing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {summarizing ? (
                <>
                  <div className="w-3 h-3 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                  Summarizing...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Summarize
                </>
              )}
            </motion.button>
          </div>

          {error && (
            <p className="text-xs text-red-500 mt-1.5">{error}</p>
          )}

          <AnimatePresence>
            {summary && (
              <SummaryCard
                summary={summary}
                onShare={handleShare}
                onClose={() => setSummary(null)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// Loading skeleton
function ItemSkeleton() {
  return (
    <div className="p-3 border border-neutral-200 rounded-xl animate-pulse">
      <div className="flex gap-2">
        <div className="w-4 h-4 rounded bg-neutral-200 mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 bg-neutral-200 rounded" />
          <div className="flex gap-2">
            <div className="h-5 w-14 bg-neutral-200 rounded-full" />
            <div className="h-5 w-16 bg-neutral-200 rounded-full" />
          </div>
          <div className="flex gap-2">
            <div className="h-4 w-4 bg-neutral-200 rounded-full" />
            <div className="h-3 w-16 bg-neutral-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Time helper
// ============================================================================

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ============================================================================
// Main Component
// ============================================================================

export default function GitHubPanel({ loopName, onShareToChat, onClose }: GitHubPanelProps) {
  const [tab, setTab] = useState<Tab>("issues");
  const [stateFilter, setStateFilter] = useState<StateFilter>("open");
  const [issues, setIssues] = useState<GitHubIssueItem[]>([]);
  const [prs, setPRs] = useState<GitHubPRItem[]>([]);
  const [repoName, setRepoName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState({ issues: false, prs: false });

  const fetchIssues = useCallback(async (state: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getGitHubIssues(loopName, state);
      setIssues(data.issues || []);
      setRepoName(data.repo_name);
      setLoaded((prev) => ({ ...prev, issues: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load issues");
    } finally {
      setLoading(false);
    }
  }, [loopName]);

  const fetchPRs = useCallback(async (state: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getGitHubPRs(loopName, state);
      setPRs(data.pull_requests || []);
      setRepoName(data.repo_name);
      setLoaded((prev) => ({ ...prev, prs: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pull requests");
    } finally {
      setLoading(false);
    }
  }, [loopName]);

  // Load data when tab or filter changes
  const handleTabChange = useCallback((newTab: Tab) => {
    setTab(newTab);
    if (newTab === "issues" && !loaded.issues) {
      fetchIssues(stateFilter);
    } else if (newTab === "prs" && !loaded.prs) {
      fetchPRs(stateFilter);
    }
  }, [loaded, stateFilter, fetchIssues, fetchPRs]);

  const handleStateChange = useCallback((state: StateFilter) => {
    setStateFilter(state);
    setLoaded({ issues: false, prs: false });
    if (tab === "issues") {
      fetchIssues(state);
    } else {
      fetchPRs(state);
    }
  }, [tab, fetchIssues, fetchPRs]);

  // Initial load
  useState(() => {
    fetchIssues("open");
  });

  const items = tab === "issues" ? issues : [];

  return (
    <motion.div
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="w-[380px] border-l border-neutral-200 bg-white flex flex-col h-full"
    >
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-neutral-200 bg-neutral-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-neutral-600" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
            </svg>
            <h3 className="font-semibold text-sm text-neutral-900">GitHub Context</h3>
          </div>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-1 rounded hover:bg-neutral-200 transition-colors text-neutral-500 hover:text-neutral-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
        </div>

        {repoName && (
          <a
            href={`https://github.com/${repoName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors mb-3 block"
          >
            {repoName}
          </a>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 bg-neutral-200/60 rounded-lg p-0.5">
          <button
            onClick={() => handleTabChange("issues")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              tab === "issues"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Issues
          </button>
          <button
            onClick={() => handleTabChange("prs")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              tab === "prs"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Pull Requests
          </button>
        </div>

        {/* State filter */}
        <div className="flex gap-2 mt-2">
          {(["open", "closed", "all"] as StateFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => handleStateChange(s)}
              className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all capitalize ${
                stateFilter === s
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <>
            <ItemSkeleton />
            <ItemSkeleton />
            <ItemSkeleton />
            <ItemSkeleton />
          </>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm text-neutral-500 mb-3">{error}</p>
            <motion.button
              onClick={() => tab === "issues" ? fetchIssues(stateFilter) : fetchPRs(stateFilter)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800"
            >
              Retry
            </motion.button>
          </div>
        ) : tab === "issues" ? (
          issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-neutral-400" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                  <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
                </svg>
              </div>
              <p className="text-sm text-neutral-500">No {stateFilter} issues found</p>
            </div>
          ) : (
            issues.map((issue) => (
              <ItemCard
                key={issue.number}
                type="issue"
                number={issue.number}
                title={issue.title}
                state={issue.state}
                labels={issue.labels}
                user={issue.user}
                commentsCount={issue.comments}
                updatedAt={issue.updated_at}
                htmlUrl={issue.html_url}
                loopName={loopName}
                onShare={onShareToChat}
              />
            ))
          )
        ) : (
          prs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-neutral-400" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z" />
                </svg>
              </div>
              <p className="text-sm text-neutral-500">No {stateFilter} pull requests found</p>
            </div>
          ) : (
            prs.map((pr) => (
              <ItemCard
                key={pr.number}
                type="pr"
                number={pr.number}
                title={pr.title}
                state={pr.state}
                labels={pr.labels}
                user={pr.user}
                commentsCount={pr.comments}
                updatedAt={pr.updated_at}
                htmlUrl={pr.html_url}
                draft={pr.draft}
                merged={pr.merged_at !== null}
                additions={pr.additions}
                deletions={pr.deletions}
                headRef={pr.head.ref}
                baseRef={pr.base.ref}
                loopName={loopName}
                onShare={onShareToChat}
              />
            ))
          )
        )}
      </div>
    </motion.div>
  );
}
