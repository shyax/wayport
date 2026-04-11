"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

type Platform = "mac" | "windows" | "linux" | "unknown";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "mac";
  if (ua.includes("win")) return "windows";
  if (ua.includes("linux")) return "linux";
  return "unknown";
}

const PLATFORM_LABELS: Record<Platform, string> = {
  mac: "Download for macOS",
  windows: "Download for Windows",
  linux: "Download for Linux",
  unknown: "Download Wayport",
};

const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  mac: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  ),
  windows: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 12V6.5l8-1.1V12H3zm0 .5V18l8 1.1V12.5H3zm9-6.8V12h9V3l-9 2.7zm0 7.3V20l9 2.7V12.5h-9z" />
    </svg>
  ),
  linux: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.5 2c-1.6 0-2.9 1.4-3.2 3.3-.2 1.1.1 2.3.6 3.2C8.5 9.3 7.4 10.5 7 12c-.4 1.6.2 3.3 1.6 4.3-.5 1.1-.5 2.4.2 3.4.6.9 1.6 1.3 2.6 1.3h1.2c1 0 2-.4 2.6-1.3.7-1 .7-2.3.2-3.4 1.4-1 2-2.7 1.6-4.3-.4-1.5-1.5-2.7-2.9-3.5.5-.9.8-2.1.6-3.2C14.4 3.4 13.1 2 12.5 2z" />
    </svg>
  ),
  unknown: null,
};

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
  const [platform, setPlatform] = useState<Platform>("unknown");

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

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
            href="https://github.com/shyax/wayport/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-base transition-colors duration-200 shadow-xl shadow-accent/25"
          >
            {PLATFORM_ICONS[platform]}
            {PLATFORM_LABELS[platform]}
          </a>
          <a
            href="https://github.com/shyax/wayport"
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
          {platform === "mac" && "Also available for Windows and Linux"}
          {platform === "windows" && "Also available for macOS and Linux"}
          {platform === "linux" && "Also available for macOS and Windows"}
          {platform === "unknown" && "macOS \u00b7 Windows \u00b7 Linux"}
        </motion.p>
      </div>
    </section>
  );
}
