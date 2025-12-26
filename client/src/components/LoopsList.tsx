"use client";

import { Project } from "@/lib/api";

interface LoopsListProps {
  projects: Project[];
  onSelectLoop: (project: Project) => void;
  selectedLoop: Project | null;
}

export default function LoopsList({
  projects,
  onSelectLoop,
  selectedLoop,
}: LoopsListProps) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-zinc-400 px-2 mb-3">Your Loops</h3>
      {projects.map((project) => {
        const isSelected =
          selectedLoop?.ID?.Bytes === project.ID?.Bytes;

        return (
          <button
            key={project.ID?.Bytes || project.GithubRepoID}
            onClick={() => onSelectLoop(project)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
              isSelected
                ? "bg-indigo-600/20 border border-indigo-500/30"
                : "hover:bg-zinc-800/50 border border-transparent"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                isSelected
                  ? "bg-indigo-600/30"
                  : "bg-zinc-800"
              }`}
            >
              💬
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{project.Name}</div>
              <div className="text-xs text-zinc-500 truncate">
                {project.FullName}
              </div>
            </div>
            {isSelected && (
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}

