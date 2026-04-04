"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const TYPED_LINE = "Prod Redis      ● Active    45m";

interface TerminalLineProps {
  children: React.ReactNode;
  className?: string;
}

function TerminalLine({ children, className = "" }: TerminalLineProps) {
  return (
    <div className={`leading-6 ${className}`} aria-label="terminal line">
      {children}
    </div>
  );
}

function TypedLine({ shouldType }: { shouldType: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  const [displayed, setDisplayed] = useState(
    shouldReduceMotion ? TYPED_LINE : ""
  );
  const [cursorVisible, setCursorVisible] = useState(true);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!shouldType || shouldReduceMotion) {
      setDisplayed(TYPED_LINE);
      return;
    }

    const typeNext = () => {
      if (indexRef.current < TYPED_LINE.length) {
        setDisplayed(TYPED_LINE.slice(0, indexRef.current + 1));
        indexRef.current++;
        const delay = 40 + Math.random() * 30;
        setTimeout(typeNext, delay);
      }
    };

    const startDelay = setTimeout(typeNext, 600);
    return () => clearTimeout(startDelay);
  }, [shouldType, shouldReduceMotion]);

  useEffect(() => {
    const blink = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(blink);
  }, []);

  const nameEnd = 14;
  const statusStart = displayed.indexOf("●");

  return (
    <span>
      <span className="text-text-secondary">{displayed.slice(0, nameEnd)}</span>
      {statusStart >= nameEnd ? (
        <span className="text-teal">{displayed.slice(nameEnd)}</span>
      ) : (
        <span className="text-text-secondary">{displayed.slice(nameEnd)}</span>
      )}
      <span
        className={`inline-block w-2 h-4 bg-text align-text-bottom ml-0.5 transition-opacity duration-100 ${
          cursorVisible ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      />
    </span>
  );
}

export default function Terminal() {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText("brew install --cask porthole");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
    }
  };

  return (
    <section
      id="terminal"
      className="relative py-24 px-4 flex justify-center items-center"
      aria-label="Terminal demo"
    >
      <motion.div
        ref={ref}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
        animate={
          isInView
            ? { opacity: 1, y: 0 }
            : shouldReduceMotion
            ? { opacity: 0 }
            : { opacity: 0, y: 40 }
        }
        transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-3xl rounded-xl overflow-hidden border border-border shadow-2xl shadow-black/60"
      >
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: "0 0 60px 0 rgba(94,234,212,0.06)",
          }}
          aria-hidden="true"
        />

        {/* Title bar */}
        <div className="relative bg-surface px-4 py-3 flex items-center justify-between border-b border-border">
          {/* Traffic lights */}
          <div className="flex items-center gap-2" aria-hidden="true">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57] block" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e] block" />
            <span className="w-3 h-3 rounded-full bg-[#28c840] block" />
          </div>

          {/* Title */}
          <span
            className="absolute left-1/2 -translate-x-1/2 text-text-muted text-sm"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Porthole
          </span>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors border border-border"
            style={{ fontFamily: "var(--font-mono)" }}
            aria-label="Copy install command"
          >
            {copied ? (
              <>
                <CheckIcon />
                Copied!
              </>
            ) : (
              <>
                <CopyIcon />
                brew install --cask porthole
              </>
            )}
          </button>
        </div>

        {/* Terminal body */}
        <div
          className="bg-bg-elevated px-5 py-5 text-sm overflow-x-auto"
          style={{ fontFamily: "var(--font-mono)" }}
          role="region"
          aria-label="Terminal output"
        >
          <div className="flex flex-col gap-1 min-w-max">
            {/* Block 1 — connect staging db */}
            <TerminalLine className="text-text-muted">
              # Your tunnels, one click away
            </TerminalLine>
            <TerminalLine>
              <span className="text-accent">❯ </span>
              <span className="text-text">porthole connect </span>
              <span className="text-blue">&quot;Staging DB&quot;</span>
            </TerminalLine>
            <TerminalLine>
              <span className="text-teal">✓ </span>
              <span className="text-text-secondary">Connected — </span>
              <span className="text-text">localhost:5433</span>
              <span className="text-text-muted"> → </span>
              <span className="text-text">staging-db.internal:5432</span>
            </TerminalLine>

            {/* Block 2 — connect prod redis */}
            <TerminalLine className="mt-3">
              <span className="text-accent">❯ </span>
              <span className="text-text">porthole connect </span>
              <span className="text-blue">&quot;Prod Redis&quot;</span>
            </TerminalLine>
            <TerminalLine>
              <span className="text-teal">✓ </span>
              <span className="text-text-secondary">Connected — </span>
              <span className="text-text">localhost:6380</span>
              <span className="text-text-muted"> → </span>
              <span className="text-text">redis.prod.internal:6379</span>
            </TerminalLine>

            {/* Block 3 — status */}
            <TerminalLine className="mt-3">
              <span className="text-accent">❯ </span>
              <span className="text-text">porthole status</span>
            </TerminalLine>
            <TerminalLine className="mt-1 text-text-muted grid grid-cols-[14rem_10rem_1fr] gap-0">
              <span>TUNNEL</span>
              <span>STATUS</span>
              <span>UPTIME</span>
            </TerminalLine>
            <TerminalLine className="grid grid-cols-[14rem_10rem_1fr] gap-0">
              <span className="text-text-secondary">Staging DB</span>
              <span className="text-teal">● Active</span>
              <span className="text-text-secondary">2h 14m</span>
            </TerminalLine>
            <TerminalLine className="grid grid-cols-[14rem_10rem_1fr] gap-0">
              <TypedLine shouldType={isInView} />
            </TerminalLine>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function CopyIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2H3.5A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="var(--color-teal)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="2.5 8 6.5 12 13.5 4" />
    </svg>
  );
}
