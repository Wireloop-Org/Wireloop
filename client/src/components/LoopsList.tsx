"use client";

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

export default function LoopsList({
  projects,
  onSelectLoop,
  onHoverLoop,
  selectedLoopName,
}: LoopsListProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-8 text-muted text-sm">
        <p>No loops yet</p>
        <p className="text-xs mt-1">Create or join a loop to get started</p>
      </div>
    );
  }

  // Separate owned vs joined
  const ownedLoops = projects.filter(p => p.role === "owner");
  const joinedLoops = projects.filter(p => p.role !== "owner");

  return (
    <div className="space-y-4">
      {/* Owned Loops */}
      {ownedLoops.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted uppercase tracking-wider px-2 mb-2">
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
          <h3 className="text-xs font-medium text-muted uppercase tracking-wider px-2 mb-2">
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
}

function LoopItem({
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
      selected: "bg-accent/10 border-accent/20",
      icon: "bg-accent/20 text-accent-foreground",
      dot: "bg-accent",
      badge: "bg-accent/10 text-accent",
    },
    emerald: {
      selected: "bg-emerald-500/10 border-emerald-500/20",
      icon: "bg-emerald-500/20 text-emerald-600",
      dot: "bg-emerald-500",
      badge: "bg-emerald-500/10 text-emerald-500",
    },
  };

  const colors = colorClasses[badgeColor];

  return (
    <button
      onClick={() => onSelect(project)}
      onMouseEnter={() => onHover?.(project)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${isSelected
          ? `${colors.selected} border`
          : "hover:bg-secondary border border-transparent"
        }`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 transition-colors ${isSelected ? colors.icon : "bg-secondary text-muted group-hover:bg-background"
          }`}
      >
        💬
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-medium truncate text-sm ${isSelected ? "text-foreground" : "text-muted group-hover:text-foreground"}`}>
          {project.name}
        </div>
        <div className={`text-[10px] mt-0.5 px-1.5 py-0.5 rounded-full inline-block ${colors.badge}`}>
          {badge}
        </div>
      </div>
      {isSelected && (
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
      )}
    </button>
  );
}
