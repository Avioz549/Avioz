import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./v3.css";
import "./approved.css";
import "./themes.css";
import "./production.css";
import "./life.css";
import "./ocean.css";
import "./refined.css";
export const metadata: Metadata = {
  title: "SAVIO 4.0 — הכסף שלך. העתיד שלך.",
  description: "Your money. Your future. Personal finance, shifts and savings.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: { capable: true, title: "SAVIO" },
};
export const viewport: Viewport = {
  themeColor: "#061426",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" data-theme="ocean" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
