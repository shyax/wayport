"use client";

import { motion } from "framer-motion";

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
  return (
    <section id="how-it-works" className="py-36 px-4" aria-label="How it works">
      <div className="max-w-6xl mx-auto">
        {/* Header — left-aligned */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <h2
            className="text-3xl sm:text-4xl md:text-5xl text-text leading-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Up and running in three steps
          </h2>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          {steps.map((step, i) => (
            <div key={step.number} className="flex gap-6">
              {/* Left: circle + connector line */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center shrink-0">
                  <span
                    className="text-xs text-text-muted tabular-nums"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {step.number}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="w-px flex-1 mt-3 mb-0 border-l border-border" aria-hidden="true" />
                )}
              </div>

              {/* Right: content */}
              <div className={`flex flex-col gap-3 pb-12 flex-1 ${i === steps.length - 1 ? "pb-0" : ""}`}>
                <h3 className="text-lg font-semibold text-text leading-snug">
                  {step.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {step.description}
                </p>
                <div className="rounded-lg bg-bg-elevated border border-border px-4 py-3 overflow-x-auto">
                  <pre
                    className="text-xs text-teal leading-5 whitespace-pre"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {step.code}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
