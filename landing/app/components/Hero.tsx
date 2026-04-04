"use client";

import { motion, useReducedMotion } from "framer-motion";

function ChevronDown() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function Hero() {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.12,
      },
    },
  };

  const itemVariants = {
    hidden: shouldReduceMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const },
    },
  };

  const handleScrollToFeatures = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.querySelector("#features");
    if (target) target.scrollIntoView({ behavior: "smooth" });
  };

  const handleScrollDown = () => {
    const target = document.querySelector("#terminal");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
    }
  };

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen px-4 text-center"
      aria-label="Hero content"
    >
      <motion.div
        className="relative z-10 flex flex-col items-center gap-6 max-w-3xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-tight tracking-tight text-text"
          style={{ fontFamily: "var(--font-serif)", textShadow: "0 2px 40px rgba(6,8,15,0.9), 0 0 80px rgba(6,8,15,0.6)" }}
        >
          All your ports.
          <br />
          <em className="not-italic text-accent italic" style={{ textShadow: "0 2px 40px rgba(212,148,76,0.3)" }}>One window.</em>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="text-lg sm:text-xl text-text-secondary max-w-xl leading-relaxed"
          style={{ fontFamily: "var(--font-sans)", textShadow: "0 2px 20px rgba(6,8,15,0.9)" }}
        >
          Save tunnels. Connect in one click. Share with your team.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center gap-3 mt-2"
        >
          <a
            href="#download"
            onClick={(e) => {
              e.preventDefault();
              document
                .querySelector("#download")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-base transition-colors duration-200 shadow-lg shadow-accent/20"
          >
            Download for free
          </a>
          <a
            href="#features"
            onClick={handleScrollToFeatures}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border hover:border-text-muted text-text-secondary hover:text-text font-semibold text-base transition-colors duration-200"
          >
            Learn more
          </a>
        </motion.div>

        {/* Meta note */}
        <motion.p
          variants={itemVariants}
          className="text-xs text-text-muted"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Free &nbsp;·&nbsp; macOS &nbsp;·&nbsp; Windows &nbsp;·&nbsp; Linux
        </motion.p>
      </motion.div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <button
          onClick={handleScrollDown}
          aria-label="Scroll down"
          className="flex flex-col items-center gap-1 text-text-muted hover:text-text-secondary transition-colors"
        >
          <motion.div
            animate={
              shouldReduceMotion
                ? {}
                : { y: [0, 6, 0] }
            }
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <ChevronDown />
          </motion.div>
        </button>
      </div>
    </div>
  );
}
