"use client";

import { motion } from "framer-motion";

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
    code: "wayport connect",
  },
  {
    icon: <JumpIcon />,
    title: "Always-On Tunnels",
    description:
      "Tunnels drop? Wayport reconnects automatically. Exponential backoff, TCP verification, zero downtime.",
    code: "● Reconnecting...",
  },
  {
    icon: <ScanIcon />,
    title: "Port Intelligence",
    description:
      "See what's running on any port. Kill rogue processes instantly. Full visibility into your local network.",
    tag: "Utility",
    tagColor: "text-teal bg-teal/10 border-teal/20",
    code: "wayport scan 3000",
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
    tagColor: "text-accent bg-accent/10 border-accent/20",
  },
  {
    icon: <SyncIcon />,
    title: "Works Everywhere",
    description:
      "Native app for macOS, Windows, and Linux. ~8MB. Launches in under a second.",
    tag: "Cross Platform",
    tagColor: "text-teal bg-teal/10 border-teal/20",
  },
];

const [heroFeature, ...gridFeatures] = features;

export default function Features() {
  return (
    <section id="features" className="py-36 px-4" aria-label="Features">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl md:text-5xl text-text mb-5 leading-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Everything you need to manage tunnels
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto"
          >
            From solo developers to engineering teams, Wayport makes port forwarding effortless.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Hero feature */}
          <article className="w-full bg-surface rounded-lg p-8 sm:p-10 flex flex-col sm:flex-row gap-8 mb-4">
            <div className="w-14 h-14 rounded-xl bg-bg-elevated border border-border flex items-center justify-center text-accent shrink-0">
              <span className="scale-150">{heroFeature.icon}</span>
            </div>
            <div className="flex flex-col gap-3 flex-1">
              <h3 className="text-text font-semibold text-xl leading-snug">
                {heroFeature.title}
              </h3>
              <p className="text-base text-text-secondary leading-relaxed">
                {heroFeature.description}
              </p>
              {heroFeature.code && (
                <div
                  className="mt-2 pt-3 border-t border-border"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  <code className="text-sm text-accent">{heroFeature.code}</code>
                </div>
              )}
            </div>
          </article>

          {/* Remaining features grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gridFeatures.map((feature) => (
              <article
                key={feature.title}
                className="group relative rounded-lg bg-surface border border-border p-6 flex flex-col gap-4 overflow-hidden transition-colors duration-200 hover:bg-surface-hover"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-bg-elevated border border-border flex items-center justify-center text-accent shrink-0">
                  {feature.icon}
                </div>

                <div className="flex flex-col gap-2 flex-1">
                  {/* Title row */}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-text font-semibold text-base leading-snug">
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
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Code snippet */}
                {feature.code && (
                  <div
                    className="mt-auto pt-3 border-t border-border"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    <code className="text-xs text-accent">{feature.code}</code>
                  </div>
                )}
              </article>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
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
