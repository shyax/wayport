"use client";

import { motion } from "framer-motion";

interface PricingTier {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  featured?: boolean;
  badge?: string;
  comingSoon?: boolean;
}

const tiers: PricingTier[] = [
  {
    name: "Free",
    price: "$0",
    description: "For individual developers.",
    features: [
      "Unlimited local tunnels",
      "Auto-reconnect",
      "Port scanner",
      "Folders & environments",
      "Connection history",
      "Import / export",
    ],
    cta: "Download for free",
  },
  {
    name: "Pro",
    price: "$8",
    period: "/mo",
    description: "For power users.",
    features: [
      "Everything in Free",
      "Cloud sync",
      "Unlimited profiles",
      "30-day history",
      "Priority support",
    ],
    cta: "Join waitlist",
    featured: true,
    badge: "Coming soon",
    comingSoon: true,
  },
  {
    name: "Team",
    price: "$12",
    period: "/user/mo",
    description: "For engineering teams.",
    features: [
      "Everything in Pro",
      "Team workspaces",
      "Role-based access",
      "Shared environments",
      "90-day audit log",
      "Up to 20 members",
    ],
    cta: "Join waitlist",
    comingSoon: true,
    badge: "Coming soon",
  },
];

function CheckMark({ featured }: { featured?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0 mt-0.5"
    >
      <circle
        cx="8"
        cy="8"
        r="7"
        fill={featured ? "rgba(212,148,76,0.15)" : "rgba(94,234,212,0.1)"}
      />
      <polyline
        points="4.5 8 6.5 10.5 11.5 5.5"
        stroke={featured ? "#d4944c" : "#5eead4"}
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
            Start free. Scale with your team.
          </motion.h2>
        </div>

        {/* Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-start"
        >
          {tiers.map((tier) => (
            <article
              key={tier.name}
              className={`relative flex flex-col gap-6 rounded-lg border p-6 ${
                tier.featured
                  ? "border-accent/40 bg-surface"
                  : "border-border bg-bg-elevated"
              }`}
            >
              {/* Badge */}
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent text-white">
                    {tier.badge}
                  </span>
                </div>
              )}

              {/* Name + price */}
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
                  {tier.period && (
                    <span className="text-sm text-text-muted">{tier.period}</span>
                  )}
                </div>
                <p className="text-sm text-text-secondary mt-1">{tier.description}</p>
              </div>

              {/* Divider */}
              <hr className="border-border" />

              {/* Features */}
              <ul className="flex flex-col gap-2.5 flex-1" role="list">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-text-secondary"
                  >
                    <CheckMark featured={tier.featured} />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {tier.comingSoon ? (
                <a
                  href="mailto:yesweeyes.dev@gmail.com?subject=Porthole%20Pro%20waitlist"
                  className="mt-2 flex items-center justify-center py-3 px-5 rounded-lg font-semibold text-sm transition-colors duration-200 border border-border hover:border-text-muted text-text-secondary hover:text-text"
                >
                  {tier.cta}
                </a>
              ) : (
                <a
                  href="#download"
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .querySelector("#download")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`mt-2 flex items-center justify-center py-3 px-5 rounded-lg font-semibold text-sm transition-colors duration-200 ${
                    tier.featured
                      ? "bg-accent hover:bg-accent-hover text-white"
                      : "border border-border hover:border-text-muted text-text-secondary hover:text-text"
                  }`}
                >
                  {tier.cta}
                </a>
              )}
            </article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
