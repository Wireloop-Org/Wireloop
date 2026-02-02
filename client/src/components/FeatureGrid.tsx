"use client";

import Link from "next/link";
import { motion } from "framer-motion";

// Wireframe-style SVG icons matching the design
function CoilIcon() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20" strokeWidth="1">
      <ellipse cx="40" cy="15" rx="28" ry="8" stroke="currentColor" />
      <ellipse cx="40" cy="25" rx="28" ry="8" stroke="currentColor" />
      <ellipse cx="40" cy="35" rx="28" ry="8" stroke="currentColor" />
      <ellipse cx="40" cy="45" rx="28" ry="8" stroke="currentColor" />
      <ellipse cx="40" cy="55" rx="28" ry="8" stroke="currentColor" />
      <ellipse cx="40" cy="65" rx="28" ry="8" stroke="currentColor" />
    </svg>
  );
}

function SphereGridIcon() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20" strokeWidth="0.5">
      {/* Create a grid of dots in a circular pattern */}
      {Array.from({ length: 9 }).map((_, row) =>
        Array.from({ length: 9 }).map((_, col) => {
          const x = 10 + col * 7.5;
          const y = 10 + row * 7.5;
          const centerX = 40;
          const centerY = 40;
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          const maxDistance = 35;
          if (distance > maxDistance) return null;
          const opacity = 1 - distance / maxDistance;
          return (
            <circle
              key={`${row}-${col}`}
              cx={x}
              cy={y}
              r={1.5}
              fill="currentColor"
              opacity={opacity * 0.8 + 0.2}
            />
          );
        })
      )}
    </svg>
  );
}

function ArrowsIcon() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20" strokeWidth="1">
      {/* Multiple diagonal arrows */}
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} transform={`translate(${i * 12}, ${i * 8})`}>
          <line x1="10" y1="35" x2="40" y2="15" stroke="currentColor" />
          <polyline points="35,12 40,15 37,20" stroke="currentColor" fill="none" />
        </g>
      ))}
    </svg>
  );
}

const features = [
  {
    title: "Proof-of-Contribution",
    description:
      "Repository owners set programmable entry rules (merged PRs, reviews, labels). Only verified builders get access to the Loop.",
    Icon: CoilIcon,
    link: "#gatekeeper",
  },
  {
    title: "Gatekeeper Access",
    description:
      "A high-performance Go service evaluates GitHub signals in real time and authorizes entry without friction.",
    Icon: SphereGridIcon,
    link: "#gatekeeper",
  },
  {
    title: "Realtime Loops",
    description:
      "Persistent WebSockets keep discussions tight and technical, with context anchored to the repository timeline.",
    Icon: ArrowsIcon,
    link: "#loops",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export default function FeatureGrid() {
  return (
    <section id="loops" className="py-24 bg-zinc-100">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <motion.h2
            className="text-4xl md:text-5xl font-medium tracking-tight text-zinc-900 leading-[1.1] max-w-lg"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            How Wireloop <br />
            keeps Loops high-signal
          </motion.h2>
          <motion.p
            className="text-sm text-zinc-500 max-w-xs leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            A merit-based access layer plus realtime collaboration ensures the
            conversation stays technical, productive, and builder-first.
          </motion.p>
        </div>

        {/* Cards Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              className="group bg-white rounded-3xl p-8 flex flex-col justify-between h-[420px] border border-zinc-100 hover:border-zinc-200 hover:shadow-lg transition-all duration-300"
            >
              {/* Icon area */}
              <div className="flex-1 flex items-center justify-center mb-6">
                <div className="text-zinc-300 group-hover:text-zinc-900 group-hover:scale-110 transition-all duration-500">
                  <feature.Icon />
                </div>
              </div>

              {/* Content */}
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed mb-6">
                  {feature.description}
                </p>

                <Link
                  href={feature.link}
                  className="inline-flex items-center text-xs font-medium text-zinc-900 border-b border-zinc-900 pb-0.5 hover:opacity-70 transition-opacity"
                >
                  Learn more
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
