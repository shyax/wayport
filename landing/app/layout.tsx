import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://wayport.dev"),
  title: "Wayport — SSH tunnels, managed.",
  description:
    "The desktop app for SSH port forwarding. Save tunnels, connect in one click, share configs with your team. macOS, Windows, Linux.",
  openGraph: {
    title: "Wayport — SSH tunnels, managed.",
    description:
      "The desktop app for SSH port forwarding. Save tunnels, connect in one click, share configs with your team.",
    type: "website",
    url: "https://wayport.dev",
    siteName: "Wayport",
  },
  twitter: {
    card: "summary_large_image",
    site: "@0shyax",
    creator: "@0shyax",
    title: "Wayport — SSH tunnels, managed.",
    description:
      "The desktop app for SSH port forwarding. Save tunnels, connect in one click, share configs with your team.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}`}
      style={{ backgroundColor: "#06080f" }}
    >
      <body className="font-sans">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Wayport",
              applicationCategory: "DeveloperApplication",
              operatingSystem: "macOS, Windows, Linux",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              description:
                "Desktop app for managing SSH port forwarding tunnels.",
            }),
          }}
        />
      </body>
    </html>
  );
}
