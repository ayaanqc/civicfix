import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CivicFix — Report. Track. Resolve.",
  description:
    "A field-ready civic issue reporter. Pin potholes, broken streetlights, and dumping on the map, verify issues with one tap, and track city response in real time.",
  applicationName: "CivicFix",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "CivicFix" },
};

export const viewport: Viewport = {
  themeColor: "#1E40AF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} bg-bg-app text-ink antialiased`}>
        {children}
      </body>
    </html>
  );
}
