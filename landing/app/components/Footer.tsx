function PortholeIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="14" stroke="#d4944c" strokeWidth="2" />
      <circle cx="16" cy="16" r="9" stroke="#d4944c" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="3.5" fill="#d4944c" />
      <line
        x1="16" y1="2" x2="16" y2="7"
        stroke="#d4944c" strokeWidth="1.5" strokeLinecap="round"
      />
      <line
        x1="16" y1="25" x2="16" y2="30"
        stroke="#d4944c" strokeWidth="1.5" strokeLinecap="round"
      />
      <line
        x1="2" y1="16" x2="7" y2="16"
        stroke="#d4944c" strokeWidth="1.5" strokeLinecap="round"
      />
      <line
        x1="25" y1="16" x2="30" y2="16"
        stroke="#d4944c" strokeWidth="1.5" strokeLinecap="round"
      />
    </svg>
  );
}

const productLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Download", href: "#download" },
  { label: "Changelog", href: "https://github.com/porthole-app/porthole/releases", external: true },
];

const resourceLinks = [
  { label: "Documentation", href: "https://docs.porthole.dev", external: true },
  { label: "GitHub", href: "https://github.com/porthole-app/porthole", external: true },
  { label: "Twitter", href: "https://twitter.com/porthole_app", external: true },
  { label: "Privacy", href: "/privacy" },
];

export default function Footer() {
  return (
    <footer className="border-t border-[#1e2538]" aria-label="Footer">
      {/* Gradient separator */}
      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(212,148,76,0.2), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8">
          {/* Col 1: Brand */}
          <div className="flex flex-col gap-4">
            <a
              href="/"
              className="inline-flex items-center gap-2.5"
              aria-label="Porthole home"
            >
              <PortholeIcon />
              <span
                className="text-[#e8ecf4] font-semibold text-base"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Porthole
              </span>
            </a>
            <p className="text-sm text-[#545d73] leading-relaxed max-w-xs">
              SSH tunnels that just work.
            </p>
          </div>

          {/* Col 2: Product */}
          <nav aria-label="Product links">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#545d73] mb-4">
              Product
            </h3>
            <ul className="flex flex-col gap-2.5" role="list">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="text-sm text-[#8891a5] hover:text-[#e8ecf4] transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Col 3: Resources */}
          <nav aria-label="Resources links">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#545d73] mb-4">
              Resources
            </h3>
            <ul className="flex flex-col gap-2.5" role="list">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="text-sm text-[#8891a5] hover:text-[#e8ecf4] transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-[#1e2538] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#545d73]">
            &copy; 2026 Porthole. Made with{" "}
            <code
              className="text-[#d4944c]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Rust
            </code>
            .
          </p>
          <p className="text-xs text-[#545d73]">
            MIT License &nbsp;·&nbsp; Open Source
          </p>
        </div>
      </div>
    </footer>
  );
}
