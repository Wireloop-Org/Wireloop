"use client";

import { memo } from "react";
import { motion } from "framer-motion";

interface SidebarProject {
  id: string;
  name: string;
  role: string;
}

interface LoopsListProps {
  projects: SidebarProject[];
  onSelectLoop: (project: SidebarProject) => void;
  onHoverLoop?: (project: SidebarProject) => void;
  selectedLoopName?: string;
}

// Memoized individual loop item with cleaner design
const LoopItem = memo(function LoopItem({
  project,
  isSelected,
  onSelect,
  onHover,
  badge,
  badgeColor,
}: {
  project: SidebarProject;
  isSelected: boolean;
  onSelect: (project: SidebarProject) => void;
  onHover?: (project: SidebarProject) => void;
  badge: string;
  badgeColor: "accent" | "emerald";
}) {
  const colorClasses = {
    accent: {
      selected: "bg-neutral-900 text-white",
      badge: "bg-white/20 text-white",
    },
    emerald: {
      selected: "bg-emerald-500 text-white",
      badge: "bg-white/20 text-white",
    },
  };

  const colors = colorClasses[badgeColor];

  return (
    <motion.button
      onClick={() => onSelect(project)}
      onMouseEnter={() => onHover?.(project)}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${
        isSelected
          ? colors.selected
          : "hover:bg-neutral-100 text-neutral-700"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isSelected 
            ? "bg-white/20" 
            : "bg-neutral-200/60 group-hover:bg-neutral-200"
        }`}
      >
        <svg className={`w-4 h-4 ${isSelected ? "text-white" : "text-neutral-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-medium truncate text-sm ${isSelected ? "text-white" : "text-neutral-800"}`}>
          {project.name}
        </div>
        <div className={`text-[10px] mt-0.5 px-1.5 py-0.5 rounded-full inline-block font-medium ${
          isSelected 
            ? colors.badge 
            : badgeColor === "accent" 
              ? "bg-neutral-200 text-neutral-600" 
              : "bg-emerald-100 text-emerald-600"
        }`}>
          {badge}
        </div>
      </div>
      {isSelected && (
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-white" />
      )}
    </motion.button>
  );
});

// Memoized loops list component
const LoopsList = memo(function LoopsList({
  projects,
  onSelectLoop,
  onHoverLoop,
  selectedLoopName,
}: LoopsListProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-sm">
        <p className="font-medium">No loops yet</p>
        <p className="text-xs mt-1 text-neutral-400">Create or join a loop to get started</p>
      </div>
    );
  }

  // Separate owned vs joined
  const ownedLoops = projects.filter(p => p.role === "owner");
  const joinedLoops = projects.filter(p => p.role !== "owner");

  return (
    <div className="space-y-5">
      {/* Owned Loops */}
      {ownedLoops.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-2 mb-2">
            Your Loops
          </h3>
          <div className="space-y-1">
            {ownedLoops.map((project) => (
              <LoopItem
                key={project.id}
                project={project}
                isSelected={selectedLoopName === project.name}
                onSelect={onSelectLoop}
                onHover={onHoverLoop}
                badge="Owner"
                badgeColor="accent"
              />
            ))}
          </div>
        </div>
      )}

      {/* Joined Loops */}
      {joinedLoops.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-2 mb-2">
            Joined
          </h3>
          <div className="space-y-1">
            {joinedLoops.map((project) => (
              <LoopItem
                key={project.id}
                project={project}
                isSelected={selectedLoopName === project.name}
                onSelect={onSelectLoop}
                onHover={onHoverLoop}
                badge="Member"
                badgeColor="emerald"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default LoopsList;
