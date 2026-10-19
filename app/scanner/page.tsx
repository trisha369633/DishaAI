import type { Metadata } from "next";
import Scanner from "@/components/scanner/scanner";

export const metadata: Metadata = {
  title: "Environment scanner",
  description: "Request object detection on a still image using your configured model.",
};

export default function ScannerPage() {
  return <Scanner />;
}