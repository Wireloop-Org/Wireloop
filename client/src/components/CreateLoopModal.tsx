"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { api, GitHubRepo, Rule } from "@/lib/api";

interface CreateLoopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "select-repo" | "set-rules";

export default function CreateLoopModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateLoopModalProps) {
  const [step, setStep] = useState<Step>("select-repo");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Selected repo
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);

  // Rules
  const [loopName, setLoopName] = useState("");
  const [rules, setRules] = useState<Rule[]>([
    { criteria_type: "PR_COUNT", threshold: 1 },
  ]);

  useEffect(() => {
    if (isOpen) {
      fetchRepos();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedRepo) {
      setLoopName(selectedRepo.name);
    }
  }, [selectedRepo]);

  const fetchRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getGitHubRepos();
      setRepos(data.repos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch repos");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRepo = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setStep("set-rules");
  };

  const handleBack = () => {
    setStep("select-repo");
    setSelectedRepo(null);
  };

  const handleAddRule = () => {
    setRules([...rules, { criteria_type: "PR_COUNT", threshold: 1 }]);
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleRuleChange = (
    index: number,
    field: keyof Rule,
    value: string | number
  ) => {
    const newRules = [...rules];
    if (field === "threshold") {
      newRules[index].threshold = Number(value);
    } else {
      newRules[index].criteria_type = value as string;
    }
    setRules(newRules);
  };

  const handleCreate = async () => {
    if (!selectedRepo) return;

    setCreating(true);
    setError(null);

    try {
      await api.createLoop({
        repo_id: selectedRepo.id,
        name: loopName || selectedRepo.name,
        rules: rules.filter((r) => r.threshold > 0),
      });
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create loop");
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setStep("select-repo");
    setSelectedRepo(null);
    setLoopName("");
    setRules([{ criteria_type: "PR_COUNT", threshold: 1 }]);
    setSearchQuery("");
    setError(null);
    onClose();
  };

  const filteredRepos = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50">
          <div className="flex items-center gap-3">
            {step === "set-rules" && (
              <button
                onClick={handleBack}
                className="p-1 hover:bg-secondary rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-muted"
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
            )}
            <h2 className="text-xl font-semibold text-foreground">
              {step === "select-repo" ? "Select Repository" : "Configure Loop"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-muted hover:text-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {step === "select-repo" ? (
            <>
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search repositories..."
                  className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:border-accent focus:bg-card transition-colors"
                />
              </div>

              {/* Repos list */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="text-center py-12 text-muted">
                  {searchQuery
                    ? "No repositories found"
                    : "No repositories available"}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRepos.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => handleSelectRepo(repo)}
                      className="w-full flex items-center gap-4 p-4 bg-card hover:bg-secondary/40 border border-border hover:border-border/80 rounded-xl transition-all text-left group hover-lift"
                    >
                      <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden relative flex-shrink-0 border border-border">
                        <Image
                          src={repo.owner.avatar_url}
                          alt={repo.owner.login}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate text-foreground">
                            {repo.full_name}
                          </span>
                          {repo.private && (
                            <span className="px-2 py-0.5 text-xs bg-secondary text-muted rounded-full">
                              Private
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-sm text-muted truncate mt-1">
                            {repo.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                          {repo.language && (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-accent" />
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            ⭐ {repo.stargazers_count}
                          </span>
                          <span className="flex items-center gap-1">
                            🍴 {repo.forks_count}
                          </span>
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-muted group-hover:text-foreground transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Selected Repo */}
              {selectedRepo && (
                <div className="flex items-center gap-4 p-4 bg-secondary/20 border border-border rounded-xl mb-6">
                  <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden relative flex-shrink-0 border border-border">
                    <Image
                      src={selectedRepo.owner.avatar_url}
                      alt={selectedRepo.owner.login}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{selectedRepo.full_name}</div>
                    <div className="text-sm text-muted">
                      {selectedRepo.description || "No description"}
                    </div>
                  </div>
                </div>
              )}

              {/* Loop Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-muted mb-2">
                  Loop Name
                </label>
                <input
                  type="text"
                  value={loopName}
                  onChange={(e) => setLoopName(e.target.value)}
                  placeholder="Enter loop name"
                  className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Rules */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-muted">
                    Access Rules
                  </label>
                  <button
                    onClick={handleAddRule}
                    className="text-sm text-accent hover:text-accent-hover transition-colors font-medium"
                  >
                    + Add Rule
                  </button>
                </div>

                <div className="space-y-3">
                  {rules.map((rule, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-4 bg-secondary/20 border border-border rounded-xl"
                    >
                      <select
                        value={rule.criteria_type}
                        onChange={(e) =>
                          handleRuleChange(index, "criteria_type", e.target.value)
                        }
                        className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-accent transition-colors"
                      >
                        <option value="PR_COUNT">Merged PRs</option>
                        <option value="COMMIT_COUNT">Commits</option>
                        <option value="ISSUE_COUNT">Issues Created</option>
                      </select>
                      <span className="text-muted">≥</span>
                      <input
                        type="number"
                        min="1"
                        value={rule.threshold}
                        onChange={(e) =>
                          handleRuleChange(index, "threshold", e.target.value)
                        }
                        className="w-20 px-3 py-2 bg-card border border-border rounded-lg text-foreground text-center focus:outline-none focus:border-accent transition-colors"
                      />
                      {rules.length > 1 && (
                        <button
                          onClick={() => handleRemoveRule(index)}
                          className="p-2 text-muted hover:text-red-400 transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted mt-3">
                  Users must meet ALL rules to join this loop
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {step === "set-rules" && (
          <div className="px-6 py-4 border-t border-border bg-card/50 flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-xl border border-border text-muted hover:text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !loopName}
              className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover-lift"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Loop"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

