export const metadata = {
  title: "Privacy Policy — Porthole",
  description: "How Porthole handles your data.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-24">
      <h1
        className="text-3xl sm:text-4xl text-text mb-2"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Privacy Policy
      </h1>
      <p className="text-sm text-text-muted mb-12">Last updated: April 2026</p>

      <div className="prose-porthole space-y-10 text-text-secondary text-sm leading-relaxed">

        <section>
          <h2 className="text-base font-semibold text-text mb-3">What Porthole does with your data</h2>
          <p>
            Porthole is a local-first desktop application. Your connection profiles, SSH keys,
            and tunnel configurations are stored exclusively on your device at{" "}
            <code className="text-accent" style={{ fontFamily: "var(--font-mono)" }}>
              ~/.config/Porthole/
            </code>. They are never uploaded to any server.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-3">Data we collect</h2>
          <p>
            Porthole collects no data whatsoever. The app makes no
            network requests except to the SSH hosts you explicitly configure.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-3">Data we never collect</h2>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>SSH private keys or passphrases</li>
            <li>Contents of your SSH sessions or traffic</li>
            <li>Credentials for the hosts you connect to</li>
            <li>Any data that passes through your tunnels</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-3">This website</h2>
          <p>
            This marketing site does not set tracking cookies and does not use analytics
            services that identify individual visitors. Basic access logs (IP address,
            user-agent, pages visited) may be retained by our hosting provider for up to
            30 days for security purposes.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-3">Third-party services</h2>
          <p>
            Porthole uses the following third-party services, each with their own privacy policy:
          </p>
          <ul className="mt-3 space-y-1.5 list-disc list-inside">
            <li>
              <strong>GitHub</strong> — for release distribution and issue tracking
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-3">Your rights</h2>
          <p>
            You can delete all locally stored data by removing{" "}
            <code className="text-accent" style={{ fontFamily: "var(--font-mono)" }}>
              ~/.config/Porthole/
            </code>{" "}
            at any time. For questions, email us at{" "}
            <a
              href="mailto:privacy@porthole.dev"
              className="text-accent hover:underline"
            >
              privacy@porthole.dev
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-3">Changes</h2>
          <p>
            We may update this policy as the product evolves. Material changes will be
            announced via a GitHub release note. Continued use of Porthole after changes
            constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-3">Contact</h2>
          <p>
            Questions?{" "}
            <a
              href="mailto:privacy@porthole.dev"
              className="text-accent hover:underline"
            >
              privacy@porthole.dev
            </a>
          </p>
        </section>
      </div>

      <div className="mt-16 pt-8 border-t border-border">
        <a
          href="/"
          className="text-sm text-text-muted hover:text-text transition-colors"
        >
          ← Back to Porthole
        </a>
      </div>
    </main>
  );
}
