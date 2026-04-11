"use client";

import { motion } from "framer-motion";

interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  featured?: boolean;
}

const tiers: PricingTier[] = [
  {
    name: "Open Source",
    price: "Free",
    description: "Everything. No limits. MIT licensed.",
    features: [
      "Unlimited tunnels & profiles",
      "Auto-reconnect",
      "Port scanner & monitor",
      "Folders & environments",
      "Connection history",
      "Import / export (JSON, YAML, TOML)",
      "CLI included",
    ],
    cta: "Download for free",
    featured: true,
  },
];

function CheckMark() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0 mt-0.5"
    >
      <circle cx="8" cy="8" r="7" fill="rgba(212,148,76,0.15)" />
      <polyline
        points="4.5 8 6.5 10.5 11.5 5.5"
        stroke="#d4944c"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Pricing() {
  return (
    <section id="pricing" className="py-36 px-4" aria-label="Pricing">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl md:text-5xl text-text leading-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Free and open source. Always.
          </motion.h2>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-sm mx-auto"
        >
          {/* GitHub stars badge */}
          <div className="flex justify-center mb-6">
            <a
              href="https://github.com/shyax/wayport"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border text-sm text-text-secondary hover:text-text transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.185 6.839 9.512.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.031 1.531 1.031.892 1.529 2.341 1.088 2.91.832.091-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.748 0 .268.18.58.688.481C19.138 20.2 22 16.447 22 12.021 22 6.484 17.523 2 12 2z" />
              </svg>
              Star on GitHub
            </a>
          </div>

          {/* Pricing card */}
          {tiers.map((tier) => (
            <article
              key={tier.name}
              className="relative flex flex-col gap-6 rounded-lg border border-accent/40 bg-surface p-6"
            >
              <div className="flex flex-col gap-1 pt-2">
                <h3 className="text-text-secondary text-sm font-semibold uppercase tracking-wide">
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-4xl font-bold text-text"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {tier.price}
                  </span>
                </div>
                <p className="text-sm text-text-secondary mt-1">{tier.description}</p>
              </div>

              <hr className="border-border" />

              <ul className="flex flex-col gap-2.5 flex-1" role="list">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-text-secondary"
                  >
                    <CheckMark />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href="#download"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .querySelector("#download")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-2 flex items-center justify-center py-3 px-5 rounded-lg font-semibold text-sm transition-colors duration-200 bg-accent hover:bg-accent-hover text-white"
              >
                {tier.cta}
              </a>
            </article>
          ))}

          {/* Trust footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-text-muted mb-4">
              Trusted by developers who are tired of SSH commands.
            </p>
            <div className="flex justify-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-xs text-text-muted">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
                  <circle cx="8" cy="8" r="6" />
                  <path d="M8 4v4l2.5 2.5" />
                </svg>
                Rust
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-xs text-text-muted">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-teal">
                  <rect x="3" y="7" width="10" height="7" rx="1.5" />
                  <path d="M5 7V5a3 3 0 016 0v2" />
                </svg>
                MIT License
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
