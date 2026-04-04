"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView, useReducedMotion, animate as fmAnimate } from "framer-motion";

const badges = [
  "Free to Use",
  "Open Source",
  "Cross Platform",
  "Lightweight",
  "Privacy First",
];

interface Stat {
  label: string;
  value: number;
  suffix: string;
  prefix?: string;
}

const stats: Stat[] = [
  { label: "Downloads", value: 500, suffix: "+", prefix: "" },
  { label: "Platforms", value: 3, suffix: "", prefix: "" },
  { label: "Setup", value: 10, suffix: "s", prefix: "" },
  { label: "Cost", value: 0, suffix: "", prefix: "$" },
];

function StatCounter({ stat, shouldAnimate }: { stat: Stat; shouldAnimate: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  const [count, setCount] = useState(shouldReduceMotion || !shouldAnimate ? stat.value : 0);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!shouldAnimate || shouldReduceMotion || hasRun.current) return;
    hasRun.current = true;

    const controls = fmAnimate(0, stat.value, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate: (v) => setCount(Math.round(v)),
    });

    return () => controls.stop();
  }, [shouldAnimate, shouldReduceMotion, stat.value]);

  return (
    <span>
      {stat.prefix}
      {count}
      {stat.suffix}
    </span>
  );
}

export default function TrustBadges() {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="py-16 px-4"
      aria-label="Trust badges and stats"
    >
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-12">
        {/* Badge pills */}
        <motion.div
          className="flex flex-wrap justify-center gap-2.5"
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {badges.map((badge) => (
            <span
              key={badge}
              className="px-3.5 py-1.5 rounded-full border border-[#1e2538] bg-[#111623] text-sm text-[#8891a5]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {badge}
            </span>
          ))}
        </motion.div>

        {/* Stats grid */}
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-[#1e2538] border border-[#1e2538] rounded-2xl overflow-hidden bg-[#0c1019]">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-center justify-center py-8 px-4 gap-1.5 border-b md:border-b-0 border-[#1e2538] last:border-b-0 odd:md:border-b-0"
            >
              <span
                className="text-4xl font-bold text-[#e8ecf4] tabular-nums"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <StatCounter stat={stat} shouldAnimate={isInView} />
              </span>
              <span className="text-sm text-[#545d73]">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
