"use client";

import { motion } from "framer-motion";

interface Feature {
  heading: string;
  description: string;
  code: string;
}

const features: Feature[] = [
  {
    heading: "Stop memorizing SSH commands",
    description:
      "Save your tunnel once — host, ports, jump servers, keys. Connect with one click or wayport connect. Never type -L 5433:staging-db:5432 -J bastion@jump.prod:22 again.",
    code: `❯ wayport connect "Staging DB"\n✓ Connected — localhost:5433 → staging-db:5432`,
  },
  {
    heading: "Tunnels that fix themselves",
    description:
      "Laptop sleep? Network blip? Wayport detects the drop, backs off exponentially, and reconnects — no intervention needed. You'll get a notification when it's back.",
    code: `● Reconnected after 12s (attempt 2)\n  Backoff: 2s → 4s → 12s`,
  },
  {
    heading: "See what's on every port",
    description:
      "Which process is hogging port 3000? Wayport tells you. Scan ranges, kill rogue listeners, monitor connections in real time.",
    code: `PID 41923  node    :3000  LISTEN\nPID 8821   postgres :5432  LISTEN\nPID 994    redis    :6379  LISTEN`,
  },
  {
    heading: "Folders, environments, zero chaos",
    description:
      "Group tunnels by project. Switch between staging and production variables without touching a single config. Color-coded environments so you never hit prod by accident.",
    code: `📁 staging/\n   Staging DB    ● Connected\n   Staging Redis ● Connected\n📁 production/\n   Prod DB       ○ Disconnected`,
  },
  {
    heading: "Onboard teammates in 60 seconds",
    description:
      "Export your tunnel configs as JSON, YAML, or TOML. New engineer joins? Hand them one file. Every tunnel, every setting, ready to go.",
    code: `❯ wayport export --format yaml\n✓ Exported 12 profiles → team-tunnels.yml`,
  },
  {
    heading: "8 MB. Sub-second launch.",
    description:
      "Built with Rust and native webviews — no Electron, no bloat. Runs on macOS, Windows, and Linux. Uses your system's SSH, not a bundled one.",
    code: `Binary:  wayport    7.8 MB\nStartup: 0.12s\nMemory:  ~18 MB\nRuntime: Tauri + Rust`,
  },
];

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="rounded-xl bg-bg-elevated border border-border overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
      </div>
      <pre
        className="px-5 py-4 text-xs sm:text-sm leading-6 text-teal whitespace-pre overflow-x-auto"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {code}
      </pre>
    </div>
  );
}

export default function Features() {
  return (
    <section id="features" className="py-36 px-4" aria-label="Features">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl md:text-5xl text-text leading-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Everything you need to manage tunnels
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="text-base sm:text-lg text-text-secondary max-w-2xl mt-5"
          >
            From solo developers to engineering teams, Wayport makes port forwarding effortless.
          </motion.p>
        </div>

        {/* Feature blocks — alternating layout */}
        <div className="space-y-24">
          {features.map((feature, i) => {
            const isReversed = i % 2 === 1;
            return (
              <motion.div
                key={feature.heading}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5 }}
                className={`flex flex-col gap-8 items-center ${
                  isReversed ? "lg:flex-row-reverse" : "lg:flex-row"
                }`}
              >
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-xl sm:text-2xl font-semibold text-text leading-snug mb-3"
                  >
                    {feature.heading}
                  </h3>
                  <p className="text-base text-text-secondary leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Code */}
                <div className="flex-1 min-w-0 w-full lg:max-w-md">
                  <CodeBlock code={feature.code} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
