"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  {
    label: "GitHub",
    href: "https://github.com/shyax/porthole",
    external: true,
  },
];

function PortholeIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      className="text-accent"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="3.5" fill="currentColor" />
      <line
        x1="16"
        y1="2"
        x2="16"
        y2="7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="25"
        x2="16"
        y2="30"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="2"
        y1="16"
        x2="7"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="25"
        y1="16"
        x2="30"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
    external?: boolean
  ) => {
    if (external) return;
    e.preventDefault();
    setMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  const menuVariants = {
    hidden: { opacity: 0, y: -16 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-bg-elevated/95 backdrop-blur-md border-b border-border"
            : "bg-transparent"
        }`}
        aria-label="Main navigation"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a
              href="#"
              className="flex items-center gap-2.5 group"
              aria-label="Porthole home"
              onClick={(e) => handleNavClick(e, "#")}
            >
              <PortholeIcon />
              <span
                className="text-text font-semibold text-lg tracking-tight"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Porthole
              </span>
            </a>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  onClick={
                    !link.external
                      ? (e) => handleNavClick(e, link.href)
                      : undefined
                  }
                  className="text-text-secondary hover:text-text text-sm font-medium transition-colors duration-200"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Right CTA */}
            <div className="hidden md:flex items-center gap-3">
              <a
                href="#download"
                onClick={(e) => handleNavClick(e, "#download")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors duration-200"
              >
                Download
              </a>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5 rounded-lg hover:bg-surface transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <span
                className={`block w-5 h-0.5 bg-text transition-all duration-200 ${
                  menuOpen ? "rotate-45 translate-y-2" : ""
                }`}
              />
              <span
                className={`block w-5 h-0.5 bg-text transition-all duration-200 ${
                  menuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block w-5 h-0.5 bg-text transition-all duration-200 ${
                  menuOpen ? "-rotate-45 -translate-y-2" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={shouldReduceMotion ? { opacity: 0 } : "hidden"}
            animate={shouldReduceMotion ? { opacity: 1 } : "visible"}
            exit={shouldReduceMotion ? { opacity: 0 } : "exit"}
            variants={shouldReduceMotion ? undefined : menuVariants}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-40 bg-bg/98 backdrop-blur-md flex flex-col pt-20 px-6"
          >
            <nav
              className="flex flex-col gap-2"
              aria-label="Mobile navigation"
            >
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  onClick={
                    !link.external
                      ? (e) => handleNavClick(e, link.href)
                      : () => setMenuOpen(false)
                  }
                  initial={
                    shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }
                  }
                  animate={
                    shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }
                  }
                  transition={{ delay: i * 0.06, duration: 0.2 }}
                  className="text-text text-2xl font-medium py-3 border-b border-border hover:text-text-secondary transition-colors"
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.a
                href="#download"
                onClick={(e) => handleNavClick(e, "#download")}
                initial={
                  shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }
                }
                animate={
                  shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }
                }
                transition={{
                  delay: navLinks.length * 0.06,
                  duration: 0.2,
                }}
                className="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white text-lg font-semibold transition-colors"
              >
                Download for free
              </motion.a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
