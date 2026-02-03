"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl max-h-[85vh] bg-white border border-neutral-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
            <div className="flex items-center gap-3">
              {step === "set-rules" && (
                <motion.button
                  onClick={handleBack}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-neutral-500"
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
                </motion.button>
              )}
              <h2 className="text-xl font-semibold text-neutral-900">
                {step === "select-repo" ? "Select Repository" : "Configure Loop"}
              </h2>
            </div>
            <motion.button
              onClick={handleClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </motion.button>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
            >
              {error}
            </motion.div>
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
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-colors"
                />
              </div>

              {/* Repos list */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  {searchQuery
                    ? "No repositories found"
                    : "No repositories available"}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRepos.map((repo) => (
                    <motion.button
                      key={repo.id}
                      onClick={() => handleSelectRepo(repo)}
                      whileHover={{ scale: 1.01, y: -2 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full flex items-center gap-4 p-4 bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-300 rounded-xl transition-all text-left group shadow-sm hover:shadow-md"
                    >
                      <div className="w-10 h-10 rounded-lg bg-neutral-100 overflow-hidden relative flex-shrink-0 border border-neutral-200">
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
                          <span className="font-medium truncate text-neutral-900">
                            {repo.full_name}
                          </span>
                          {repo.private && (
                            <span className="px-2 py-0.5 text-xs bg-neutral-100 text-neutral-500 rounded-full">
                              Private
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-sm text-neutral-500 truncate mt-1">
                            {repo.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                          {repo.language && (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-neutral-900" />
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {repo.stargazers_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            {repo.forks_count}
                          </span>
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-neutral-400 group-hover:text-neutral-900 transition-colors"
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
                    </motion.button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Selected Repo */}
              {selectedRepo && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-4 bg-neutral-50 border border-neutral-200 rounded-xl mb-6"
                >
                  <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden relative flex-shrink-0 border border-neutral-200">
                    <Image
                      src={selectedRepo.owner.avatar_url}
                      alt={selectedRepo.owner.login}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div>
                    <div className="font-medium text-neutral-900">{selectedRepo.full_name}</div>
                    <div className="text-sm text-neutral-500">
                      {selectedRepo.description || "No description"}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Loop Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-600 mb-2">
                  Loop Name
                </label>
                <input
                  type="text"
                  value={loopName}
                  onChange={(e) => setLoopName(e.target.value)}
                  placeholder="Enter loop name"
                  className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-colors"
                />
              </div>

              {/* Rules */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-neutral-600">
                    Access Rules
                  </label>
                  <motion.button
                    onClick={handleAddRule}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-sm text-neutral-900 hover:text-neutral-700 transition-colors font-medium"
                  >
                    + Add Rule
                  </motion.button>
                </div>

                <div className="space-y-3">
                  {rules.map((rule, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-4 bg-neutral-50 border border-neutral-200 rounded-xl"
                    >
                      <select
                        value={rule.criteria_type}
                        onChange={(e) =>
                          handleRuleChange(index, "criteria_type", e.target.value)
                        }
                        className="flex-1 px-3 py-2 bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-colors"
                      >
                        <option value="PR_COUNT">Merged PRs</option>
                        <option value="COMMIT_COUNT">Commits</option>
                        <option value="ISSUE_COUNT">Issues Created</option>
                      </select>
                      <span className="text-neutral-500">≥</span>
                      <input
                        type="number"
                        min="1"
                        value={rule.threshold}
                        onChange={(e) =>
                          handleRuleChange(index, "threshold", e.target.value)
                        }
                        className="w-20 px-3 py-2 bg-white border border-neutral-200 rounded-lg text-neutral-900 text-center focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-colors"
                      />
                      {rules.length > 1 && (
                        <motion.button
                          onClick={() => handleRemoveRule(index)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
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
                        </motion.button>
                      )}
                    </motion.div>
                  ))}
                </div>

                <p className="text-xs text-neutral-500 mt-3">
                  Users must meet ALL rules to join this loop
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {step === "set-rules" && (
          <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-3">
            <motion.button
              onClick={handleClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              Cancel
            </motion.button>
            <motion.button
              onClick={handleCreate}
              disabled={creating || !loopName}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Loop"
              )}
            </motion.button>
          </div>
        )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

