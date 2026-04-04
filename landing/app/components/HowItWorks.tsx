"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

interface Step {
  number: string;
  title: string;
  description: string;
  code: string;
}

const steps: Step[] = [
  {
    number: "01",
    title: "Save your tunnel",
    description:
      "Enter your connection details once. Host, ports, jump servers — Porthole remembers it all.",
    code: `Staging DB → localhost:5433`,
  },
  {
    number: "02",
    title: "Click to connect",
    description:
      "One click. Your tunnel is live, verified, and monitored. If it drops, it reconnects automatically.",
    code: `● Connected — 2h 14m`,
  },
  {
    number: "03",
    title: "Share with your team",
    description:
      "Export your config or sync it to a workspace. New engineers get every tunnel on day one.",
    code: `team-config.json`,
  },
];

export default function HowItWorks() {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="how-it-works" className="py-24 px-4" aria-label="How it works">
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
            How it works
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl text-[#e8ecf4] leading-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Up and running in three steps
          </motion.h2>
        </div>

        {/* Steps */}
        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
        >
          {steps.map((step, i) => (
            <motion.article
              key={step.number}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 32 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.55,
                delay: i * 0.12,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="relative flex flex-col gap-5 p-6 rounded-2xl bg-[#111623] border border-[#1e2538]"
            >
              {/* Step number */}
              <div
                className="text-7xl font-bold leading-none select-none text-[#d4944c]/20 italic"
                style={{ fontFamily: "var(--font-serif)" }}
                aria-hidden="true"
              >
                {step.number}
              </div>

              {/* Content */}
              <div className="flex flex-col gap-2">
                <h3 className="text-[#e8ecf4] font-semibold text-lg">
                  {step.title}
                </h3>
                <p className="text-sm text-[#8891a5] leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Code snippet */}
              <div className="mt-auto rounded-xl bg-[#0c1019] border border-[#1e2538] px-4 py-3 overflow-x-auto">
                <pre
                  className="text-xs text-[#5eead4] leading-5 whitespace-pre"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {step.code}
                </pre>
              </div>

              {/* Connector line (desktop only) */}
              {i < steps.length - 1 && (
                <div
                  className="hidden md:block absolute top-12 -right-4 w-8 h-px bg-gradient-to-r from-[#1e2538] to-transparent"
                  aria-hidden="true"
                />
              )}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
