function WayportIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="3.5" fill="currentColor" />
      <line
        x1="16" y1="2" x2="16" y2="7"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
      <line
        x1="16" y1="25" x2="16" y2="30"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
      <line
        x1="2" y1="16" x2="7" y2="16"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
      <line
        x1="25" y1="16" x2="30" y2="16"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
    </svg>
  );
}

const allLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Download", href: "#download" },
  { label: "Changelog", href: "https://github.com/shyax/wayport/releases", external: true },
  { label: "Documentation", href: "https://docs.wayport.dev", external: true },
  { label: "GitHub", href: "https://github.com/shyax/wayport", external: true },
  { label: "X", href: "https://x.com/0shyax", external: true },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border" aria-label="Footer">
      {/* Gradient separator */}
      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(212,148,76,0.2), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8">
          {/* Brand */}
          <a
            href="/"
            className="inline-flex items-center gap-2.5 text-accent shrink-0"
            aria-label="Wayport home"
          >
            <WayportIcon />
            <span
              className="text-text font-semibold text-base"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Wayport
            </span>
          </a>

          {/* Nav links */}
          <nav aria-label="Site links">
            <ul className="flex flex-wrap gap-x-6 gap-y-2" role="list">
              {allLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="text-sm text-text-secondary hover:text-text transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-text-muted">
            &copy; 2026 Wayport. All rights reserved.
          </p>
          <p className="text-sm text-text-muted">
            Built with{" "}
            <code
              className="text-accent"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Rust
            </code>
          </p>
        </div>
      </div>
    </footer>
  );
}
