import type { Metadata } from "next";
import { Geist } from "next/font/google";
import AppShell from "@/components/layout/app-shell";
import { AccessibilityProvider } from "@/components/accessibility/accessibility-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DishaAI | Visual assistance, at your pace",
    template: "%s | DishaAI",
  },
  description:
    "An accessibility-first visual assistance prototype with on-demand object detection and voice guidance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geistSans.variable} data-scroll-behavior="smooth">
      <body>
        <AccessibilityProvider>
          <AppShell>{children}</AppShell>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
