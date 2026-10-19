"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Accessibility, AudioLines, Compass, Home, ScanEye, ShieldAlert, Sparkles } from "lucide-react";
import VoiceCommandControls from "@/components/accessibility/voice-command-controls";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/scanner", label: "Scanner", icon: ScanEye },
  { href: "/safety", label: "Safety", icon: ShieldAlert },
  { href: "/about", label: "About", icon: Compass },
];
const pageNames: Record<string, string> = {
  "/": "Home",
  "/dashboard": "Dashboard",
  "/scanner": "Scanner",
  "/safety": "Safety",
  "/about": "About",
  "/settings": "Accessibility settings",
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function renderNav() {
    return navigation.map(({ href, label, icon: Icon }) => (
      <Link key={href} href={href} className="nav-link" aria-current={pathname === href ? "page" : undefined}>
        <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
        <span>{label}</span>
      </Link>
    ));
  }

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <Link href="/" className="brand" aria-label="DishaAI home">
          <span className="brand-mark"><AudioLines aria-hidden="true" size={19} /></span>
          <span>Disha<span>AI</span></span>
        </Link>
        <nav className="topnav" aria-label="Main navigation">{renderNav()}</nav>
        <div className="nav-utilities">
          <VoiceCommandControls />
          <Link href="/settings" className="utility-link" aria-label="Accessibility settings" aria-current={pathname === "/settings" ? "page" : undefined}>
            <Accessibility aria-hidden="true" size={19} />
          </Link>
          <Link href="/scanner" className="button button-primary nav-scan">
            <Sparkles aria-hidden="true" size={15} /> Start scan
          </Link>
        </div>
      </header>
      <main id="main-content" className="main-content">{children}</main>
      <p className="visually-hidden" role="status" aria-live="assertive" aria-atomic="true">Page changed: {pageNames[pathname] ?? "DishaAI"}.</p>
      <nav className="mobile-nav" aria-label="Mobile navigation">{renderNav()}</nav>
      <footer className="site-footer">
        <span>DishaAI · An assistive technology prototype</span>
        <Link href="/about" className="inline-link">Limits & responsible use</Link>
      </footer>
    </div>
  );
}