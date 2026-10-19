import type { Metadata } from "next";
import SosPanel from "@/components/safety/sos-panel";

export const metadata: Metadata = { title: "Safety & SOS" };

export default function SafetyPage() {
  return <SosPanel />;
}