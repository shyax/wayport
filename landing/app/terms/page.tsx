export const metadata = {
  title: "Terms of Service — Wayport",
  description: "Terms governing your use of Wayport.",
};

export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-24">
      <h1
        className="text-3xl sm:text-4xl text-text mb-2"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Terms of Service
      </h1>
      <p className="text-sm text-text-muted mb-12">Last updated: April 2026</p>

      <div className="space-y-10 text-text-secondary text-sm leading-relaxed">

        <section>
          <h2 className="text-base font-semibold text-text mb-3">1. Acceptance</h2>
          <p>
            By downloading or using Wayport, you agree to these terms. If you do not
            agree, do not use the software.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-3">2. License</h2>
          <p>
            Wayport is proprietary software. We grant you a personal, non-transferable,
            non-exclusive license to install and use Wayport on your devices for your
            own internal purposes. You may not redistribute, sublicense, reverse-engineer,
            or create derivative works from Wayport without written permission.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-3">3. Free tier</h2>
          <p>
            The Free tier of Wayport is provided at no cost and without warranty.
            We reserve the right to change, limit, or discontinue the Free tier at any
            time with reasonable notice.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-3">4. Paid tiers (Pro / Team)</h2>
          <p>
            Paid subscriptions are billed monthly or annually. Cancellations take effect
            at the end of the current billing period. No refunds are issued for partial
            periods. Pricing may change with 30 days notice to active subscribers.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-3">5. Acceptable use</h2>
          <p>You may not use Wayport to:</p>
          <ul className="mt-3 space-y-1.5 list-disc list-inside">
            <li>Access systems you are not authorized to access</li>
            <li>Circumvent security controls or network policies</li>
            <li>Violate any applicable law or regulation</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-3">6. No warranty</h2>
          <p>
            Wayport is provided "as is" without warranty of any kind. We make no
            guarantees about uptime, data integrity, or fitness for a particular purpose.
            Use it for production-critical infrastructure at your own risk.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-3">7. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, we are not liable for any indirect,
            incidental, or consequential damages arising from your use of Wayport,
            including data loss or security incidents.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-3">8. Changes to terms</h2>
          <p>
            We may update these terms. Continued use of Wayport after changes are posted
            constitutes acceptance. We will announce material changes via GitHub release notes.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-3">9. Contact</h2>
          <p>
            Questions?{" "}
            <a
              href="mailto:legal@wayport.dev"
              className="text-accent hover:underline"
            >
              legal@wayport.dev
            </a>
          </p>
        </section>
      </div>

      <div className="mt-16 pt-8 border-t border-border">
        <a
          href="/"
          className="text-sm text-text-muted hover:text-text transition-colors"
        >
          ← Back to Wayport
        </a>
      </div>
    </main>
  );
}
