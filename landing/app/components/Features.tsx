"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  tag?: string;
  tagColor?: string;
  code?: string;
}

const features: Feature[] = [
  {
    icon: <TunnelIcon />,
    title: "One-Click Connect",
    description:
      "Save your tunnel configs once. Connect with a single click. Never type SSH commands again.",
    code: "porthole connect",
  },
  {
    icon: <JumpIcon />,
    title: "Always-On Tunnels",
    description:
      "Tunnels drop? Porthole reconnects automatically. Exponential backoff, TCP verification, zero downtime.",
    code: "● Reconnecting...",
  },
  {
    icon: <ScanIcon />,
    title: "Port Intelligence",
    description:
      "See what's running on any port. Kill rogue processes instantly. Full visibility into your local network.",
    tag: "Utility",
    tagColor: "text-[#5eead4] bg-[#5eead4]/10 border-[#5eead4]/20",
    code: "porthole scan 3000",
  },
  {
    icon: <FolderIcon />,
    title: "Organized Workflows",
    description:
      "Group tunnels into folders. Switch between staging and production with environment variables.",
    code: "staging / production",
  },
  {
    icon: <TeamIcon />,
    title: "Team Sharing",
    description:
      "Export and share tunnel configs with your team. New teammate? Onboarded in 60 seconds.",
    tag: "Collaboration",
    tagColor: "text-[#d4944c] bg-[#d4944c]/10 border-[#d4944c]/20",
  },
  {
    icon: <SyncIcon />,
    title: "Works Everywhere",
    description:
      "Native app for macOS, Windows, and Linux. ~8MB. Launches in under a second.",
    tag: "Cross Platform",
    tagColor: "text-[#5eead4] bg-[#5eead4]/10 border-[#5eead4]/20",
  },
];

export default function Features() {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="features" className="py-24 px-4" aria-label="Features">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4 }}
            className="text-xs font-semibold uppercase tracking-widest text-[#d4944c] mb-3"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Features
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl text-[#e8ecf4] mb-5 leading-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Everything you need to manage tunnels
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="text-base sm:text-lg text-[#8891a5] max-w-2xl mx-auto"
          >
            From solo developers to engineering teams, Porthole makes port forwarding effortless.
          </motion.p>
        </div>

        {/* Grid */}
        <div
          ref={ref}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((feature, i) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              index={i}
              isInView={isInView}
              shouldReduceMotion={!!shouldReduceMotion}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
  isInView,
  shouldReduceMotion,
}: {
  feature: Feature;
  index: number;
  isInView: boolean;
  shouldReduceMotion: boolean;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 28 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className="group relative rounded-2xl bg-[#111623] border border-[#1e2538] p-6 flex flex-col gap-4 overflow-hidden transition-colors duration-300 hover:bg-[#181e2e]"
    >
      {/* Gradient border glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(212,148,76,0.12) 0%, rgba(94,234,212,0.06) 100%)",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
          padding: "1px",
        }}
        aria-hidden="true"
      />
      {/* Subtle top gradient highlight */}
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#1e2538] to-transparent group-hover:via-[#d4944c]/30 transition-all duration-300"
        aria-hidden="true"
      />

      {/* Icon */}
      <div className="w-10 h-10 rounded-xl bg-[#0c1019] border border-[#1e2538] flex items-center justify-center text-[#d4944c] shrink-0">
        {feature.icon}
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {/* Title row */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[#e8ecf4] font-semibold text-base leading-snug">
            {feature.title}
          </h3>
          {feature.tag && (
            <span
              className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${feature.tagColor}`}
            >
              {feature.tag}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-[#8891a5] leading-relaxed">
          {feature.description}
        </p>
      </div>

      {/* Code snippet */}
      {feature.code && (
        <div
          className="mt-auto pt-3 border-t border-[#1e2538]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <code className="text-xs text-[#d4944c]">{feature.code}</code>
        </div>
      )}
    </motion.article>
  );
}

// Icons
function TunnelIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 10 C3 6 6 4 10 4 C14 4 17 6 17 10 C17 14 14 16 10 16 C6 16 3 14 3 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function JumpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="4" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 10h2M12 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 7l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8h14M8 8v9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 7C3 5.9 3.9 5 5 5h3.5l1.5 2H15a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 16c0-2.8 2.2-5 5-5h6c2.8 0 5 2.2 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3.5 10A6.5 6.5 0 0016 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16.5 10A6.5 6.5 0 004 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <polyline points="13 4 16 7 13 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="7 10 4 13 7 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
