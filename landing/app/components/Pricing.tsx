"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

interface PricingTier {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  featured?: boolean;
  badge?: string;
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
    cta: "Get Pro",
    featured: true,
    badge: "Most popular",
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
    cta: "Start team trial",
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
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="pricing" className="py-24 px-4" aria-label="Pricing">
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
            Pricing
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl text-[#e8ecf4] leading-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Start free. Scale with your team.
          </motion.h2>
        </div>

        {/* Cards */}
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-start">
          {tiers.map((tier, i) => (
            <motion.article
              key={tier.name}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 32 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.55,
                delay: i * 0.1,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className={`relative flex flex-col gap-6 rounded-2xl border p-6 ${
                tier.featured
                  ? "border-[#d4944c]/40 bg-[#111623] md:scale-[1.03] md:-translate-y-2 shadow-xl shadow-[#d4944c]/10"
                  : "border-[#1e2538] bg-[#0c1019]"
              }`}
            >
              {/* Featured gradient overlay */}
              {tier.featured && (
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(ellipse at top, rgba(212,148,76,0.07) 0%, transparent 70%)",
                  }}
                  aria-hidden="true"
                />
              )}

              {/* Badge */}
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#d4944c] text-white shadow-lg">
                    {tier.badge}
                  </span>
                </div>
              )}

              {/* Name + price */}
              <div className="flex flex-col gap-1 pt-2">
                <h3 className="text-[#8891a5] text-sm font-semibold uppercase tracking-wide">
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-4xl font-bold text-[#e8ecf4]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-sm text-[#545d73]">{tier.period}</span>
                  )}
                </div>
                <p className="text-sm text-[#8891a5] mt-1">{tier.description}</p>
              </div>

              {/* Divider */}
              <hr className="border-[#1e2538]" />

              {/* Features */}
              <ul className="flex flex-col gap-2.5 flex-1" role="list">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-[#8891a5]"
                  >
                    <CheckMark featured={tier.featured} />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href="#download"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .querySelector("#download")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`mt-2 flex items-center justify-center py-3 px-5 rounded-xl font-semibold text-sm transition-colors duration-200 ${
                  tier.featured
                    ? "bg-[#d4944c] hover:bg-[#e0a35c] text-white shadow-lg shadow-[#d4944c]/20"
                    : "border border-[#1e2538] hover:border-[#545d73] text-[#8891a5] hover:text-[#e8ecf4]"
                }`}
              >
                {tier.cta}
              </a>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
