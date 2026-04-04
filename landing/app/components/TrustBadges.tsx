"use client";

export default function TrustBadges() {
  return (
    <section className="py-24 px-4" aria-label="Trust signals">
      <div className="max-w-4xl mx-auto flex justify-center">
        <p
          className="text-sm text-text-muted tracking-wide"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Free · Open Source · Cross Platform · Lightweight · Privacy First
        </p>
      </div>
    </section>
  );
}
