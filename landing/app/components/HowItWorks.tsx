"use client";

import { motion } from "framer-motion";

function MockupWindow({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="rounded-xl bg-bg-elevated border border-border overflow-hidden shadow-lg">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs text-text-muted" style={{ fontFamily: "var(--font-mono)" }}>
          {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function FormMockup() {
  return (
    <MockupWindow title="New Connection">
      <div className="space-y-3">
        <div>
          <div className="text-[10px] text-text-muted mb-1 uppercase tracking-wider">Name</div>
          <div className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-secondary" style={{ fontFamily: "var(--font-mono)" }}>
            Staging DB
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] text-text-muted mb-1 uppercase tracking-wider">Host</div>
            <div className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-secondary" style={{ fontFamily: "var(--font-mono)" }}>
              staging.internal
            </div>
          </div>
          <div>
            <div className="text-[10px] text-text-muted mb-1 uppercase tracking-wider">Port</div>
            <div className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-secondary" style={{ fontFamily: "var(--font-mono)" }}>
              5432
            </div>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-text-muted mb-1 uppercase tracking-wider">SSH Key</div>
          <div className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-secondary" style={{ fontFamily: "var(--font-mono)" }}>
            ~/.ssh/id_ed25519
          </div>
        </div>
      </div>
    </MockupWindow>
  );
}

function StatusMockup() {
  return (
    <MockupWindow title="Wayport">
      <div className="space-y-2">
        <div className="flex items-center gap-3 bg-surface rounded-lg px-4 py-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#5eead4]" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text-secondary">Staging DB</div>
            <div className="text-xs text-text-muted" style={{ fontFamily: "var(--font-mono)" }}>
              :5433 → staging.internal:5432
            </div>
          </div>
          <span className="text-xs text-teal" style={{ fontFamily: "var(--font-mono)" }}>
            2h 14m
          </span>
        </div>
        <div className="flex items-center gap-3 bg-surface rounded-lg px-4 py-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#5eead4]" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text-secondary">Prod Redis</div>
            <div className="text-xs text-text-muted" style={{ fontFamily: "var(--font-mono)" }}>
              :6380 → redis.prod:6379
            </div>
          </div>
          <span className="text-xs text-teal" style={{ fontFamily: "var(--font-mono)" }}>
            45m
          </span>
        </div>
      </div>
    </MockupWindow>
  );
}

function ExportMockup() {
  return (
    <MockupWindow title="Export">
      <div className="space-y-3">
        <div className="flex gap-1 bg-surface rounded-lg p-0.5">
          <span className="flex-1 text-xs py-1.5 rounded-md bg-bg-elevated text-text-secondary font-medium shadow-sm text-center">JSON</span>
          <span className="flex-1 text-xs py-1.5 rounded-md text-text-muted text-center">YAML</span>
          <span className="flex-1 text-xs py-1.5 rounded-md text-text-muted text-center">TOML</span>
        </div>
        <div className="bg-surface border border-border rounded-md px-3 py-2.5 text-xs text-teal" style={{ fontFamily: "var(--font-mono)" }}>
          team-tunnels.json
        </div>
        <div className="text-xs text-text-muted text-center">
          12 profiles · 3 folders · 2 environments
        </div>
      </div>
    </MockupWindow>
  );
}

const steps = [
  {
    number: "01",
    title: "Save your tunnel",
    description: "Enter your connection details once. Host, ports, jump servers — Wayport remembers it all.",
    mockup: <FormMockup />,
  },
  {
    number: "02",
    title: "Click to connect",
    description: "One click. Your tunnel is live, verified, and monitored. If it drops, it reconnects automatically.",
    mockup: <StatusMockup />,
  },
  {
    number: "03",
    title: "Share with your team",
    description: "Export your config and share it with the team. New engineers get every tunnel on day one.",
    mockup: <ExportMockup />,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-36 px-4" aria-label="How it works">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
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

        {/* Steps */}
        <div className="space-y-20">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              className={`flex flex-col gap-8 items-start ${
                i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
              }`}
            >
              {/* Text */}
              <div className="flex-1 flex gap-5">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-9 h-9 rounded-full border border-border flex items-center justify-center">
                    <span
                      className="text-xs text-text-muted tabular-nums"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {step.number}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px flex-1 mt-3 border-l border-border" aria-hidden="true" />
                  )}
                </div>
                <div className="pt-1">
                  <h3 className="text-lg font-semibold text-text leading-snug mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed max-w-sm">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Mockup */}
              <div className="flex-1 w-full lg:max-w-sm">
                {step.mockup}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
