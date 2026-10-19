import type { Metadata } from "next";
import SettingsPanel from "@/components/accessibility/settings-panel";

export const metadata: Metadata = { title: "Accessibility settings" };

export default function SettingsPage() {
  return <SettingsPanel />;
}