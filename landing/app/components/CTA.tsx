"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

function GitHubIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.185 6.839 9.512.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.031 1.531 1.031.892 1.529 2.341 1.088 2.91.832.091-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.748 0 .268.18.58.688.481C19.138 20.2 22 16.447 22 12.021 22 6.484 17.523 2 12 2z" />
    </svg>
  );
}

export default function CTA() {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="download"
      ref={ref}
      className="relative py-32 px-4 flex flex-col items-center text-center overflow-hidden"
      aria-label="Download call to action"
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(94,234,212,0.04) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Top gradient line */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(94,234,212,0.15), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center gap-6">
        <motion.h2
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-4xl sm:text-5xl md:text-6xl text-text leading-tight"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Stop fighting your tunnels.
          <br />
          <em className="italic text-accent">Start shipping.</em>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-base sm:text-lg text-text-secondary max-w-md"
        >
          Free forever for individuals. Set up in 10 seconds.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <a
            href="https://github.com/porthole-app/porthole/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-base transition-colors duration-200 shadow-xl shadow-accent/25"
          >
            Download Porthole
          </a>
          <a
            href="https://github.com/porthole-app/porthole"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg border border-border hover:border-text-muted text-text-secondary hover:text-text font-semibold text-base transition-colors duration-200"
          >
            <GitHubIcon />
            View on GitHub
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-sm text-text-muted"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          macOS &nbsp;·&nbsp; Windows &nbsp;·&nbsp; Linux
        </motion.p>
      </div>
    </section>
  );
}
