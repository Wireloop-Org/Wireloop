"use client";

import Link from "next/link";
import { motion } from "framer-motion";

// Wireframe-style SVG icons matching the design
function ShieldIcon() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20" strokeWidth="1">
      <path d="M40 8L12 22V38C12 56 24 70 40 74C56 70 68 56 68 38V22L40 8Z" stroke="currentColor" />
      <path d="M30 40L37 47L52 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BranchIcon() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20" strokeWidth="1">
      <circle cx="25" cy="20" r="6" stroke="currentColor" />
      <circle cx="55" cy="20" r="6" stroke="currentColor" />
      <circle cx="25" cy="60" r="6" stroke="currentColor" />
      <line x1="25" y1="26" x2="25" y2="54" stroke="currentColor" />
      <path d="M55 26V35C55 42 48 48 40 48H25" stroke="currentColor" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20" strokeWidth="1">
      <path d="M40 12V68" stroke="currentColor" strokeLinecap="round" />
      <path d="M12 40H68" stroke="currentColor" strokeLinecap="round" />
      <path d="M22 22L58 58" stroke="currentColor" strokeLinecap="round" />
      <path d="M58 22L22 58" stroke="currentColor" strokeLinecap="round" />
      <circle cx="40" cy="40" r="6" stroke="currentColor" fill="currentColor" opacity="0.15" />
      <circle cx="40" cy="12" r="2.5" fill="currentColor" />
      <circle cx="40" cy="68" r="2.5" fill="currentColor" />
      <circle cx="12" cy="40" r="2.5" fill="currentColor" />
      <circle cx="68" cy="40" r="2.5" fill="currentColor" />
    </svg>
  );
}

const features = [
  {
    title: "Contribution Gating",
    description:
      "Loop owners define entry rules — merged PRs, reviews, or labels. Only verified contributors can join, keeping every conversation high-signal.",
    Icon: ShieldIcon,
    link: "#access",
  },
  {
    title: "GitHub Context Panel",
    description:
      "Browse issues and pull requests directly inside the chat. Filter by state, view branches, labels, and comments without leaving the Loop.",
    Icon: BranchIcon,
    link: "#access",
  },
  {
    title: "AI Summaries",
    description:
      "Summarize any issue or PR with one click and share the digest straight into the conversation. Less tab-switching, faster decisions.",
    Icon: SparkleIcon,
    link: "#access",
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
            works for your team
          </motion.h2>
          <motion.p
            className="text-sm text-zinc-500 max-w-xs leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Contribution-based access, in-app GitHub context, and AI
            summaries — everything a repo team needs to stay aligned.
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
