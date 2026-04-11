"use client";

import { motion } from "framer-motion";

const badges = [
  {
    label: "MIT Licensed",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="10" height="7" rx="1.5" />
        <path d="M5 7V5a3 3 0 016 0v2" />
      </svg>
    ),
  },
  {
    label: "Built with Rust",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="6" />
        <path d="M8 4v4l2.5 2.5" />
      </svg>
    ),
  },
  {
    label: "Cross Platform",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="12" height="9" rx="1.5" />
        <path d="M5 15h6M8 12v3" />
      </svg>
    ),
  },
  {
    label: "Privacy First",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1L2 4v4c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V4L8 1z" />
        <polyline points="5.5 8 7 10 10.5 6" />
      </svg>
    ),
  },
  {
    label: "Under 8 MB",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 13L8 2 4 13" />
        <path d="M5.5 8.5L8 6l2.5 2.5" />
      </svg>
    ),
  },
];

export default function TrustBadges() {
  return (
    <section className="py-16 px-4" aria-label="Trust signals">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto flex flex-wrap justify-center gap-3"
      >
        {badges.map((badge) => (
          <span
            key={badge.label}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border text-sm text-text-secondary"
          >
            <span className="text-teal">{badge.icon}</span>
            {badge.label}
          </span>
        ))}
      </motion.div>
    </section>
  );
}
