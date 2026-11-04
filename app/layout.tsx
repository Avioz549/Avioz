import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./v3.css";
export const metadata: Metadata = {
  title: "SAVIO 3.0 — הכסף שלך. העתיד שלך.",
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
  themeColor: "#090c0b",
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
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
