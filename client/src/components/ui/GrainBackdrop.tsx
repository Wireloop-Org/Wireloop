"use client";

/**
 * Film-grain + ambient glow backdrop used on marketing / landing surfaces.
 *
 * Applies:
 *  - A warm off-white base (`bg-[#F7F5F2]`)
 *  - Two drifting radial-gradient orbs (Comet-style ambient light)
 *  - A fixed SVG-noise overlay (see .wl-grain in globals.css)
 *
 * All layers are `pointer-events-none` so they never intercept input.
 */
export default function GrainBackdrop({
  children,
  variant = "warm",
}: {
  children: React.ReactNode;
  variant?: "warm" | "cool";
}) {
  const base = variant === "warm" ? "bg-[#F7F5F2]" : "bg-[#F4F6F8]";
  const glow1 =
    variant === "warm"
      ? "bg-[radial-gradient(closest-side,rgba(255,184,125,0.35),transparent_70%)]"
      : "bg-[radial-gradient(closest-side,rgba(125,200,255,0.30),transparent_70%)]";
  const glow2 =
    variant === "warm"
      ? "bg-[radial-gradient(closest-side,rgba(165,195,150,0.28),transparent_70%)]"
      : "bg-[radial-gradient(closest-side,rgba(180,170,255,0.28),transparent_70%)]";

  return (
    <div className={`relative min-h-screen ${base} wl-grain overflow-hidden`}>
      {/* Ambient drifting orbs */}
      <div
        aria-hidden
        className={`pointer-events-none fixed -top-40 -left-40 h-[60vh] w-[60vh] ${glow1} blur-3xl wl-drift`}
      />
      <div
        aria-hidden
        className={`pointer-events-none fixed top-[30vh] -right-40 h-[55vh] w-[55vh] ${glow2} blur-3xl wl-drift-2`}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
