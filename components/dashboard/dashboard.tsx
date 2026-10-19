"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Accessibility, ArrowRight, AudioLines, Camera, Clock3, FileImage, ScanEye, ShieldAlert, Trash2 } from "lucide-react";
import { useAccessibilityPreferences } from "@/components/accessibility/accessibility-provider";
import { clearScanHistory, readScanHistory, type ScanHistoryItem } from "@/lib/scan-history";
import WelcomeGreeting from "@/components/accessibility/welcome-greeting";

export default function Dashboard() {
  const { preferences } = useAccessibilityPreferences();
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setHistory(readScanHistory()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function clearHistory() {
    clearScanHistory();
    setHistory([]);
  }

  return (
    <div>
      <WelcomeGreeting />
      <div className="page-heading">
        <div><span className="eyebrow">Your space</span><h1>Good to have you here.</h1><p>Start a scan when you’re ready. DishaAI only analyzes a still image after you ask it to.</p></div>
        <Link className="button button-primary" href="/scanner"><ScanEye aria-hidden="true" size={17} /> Open scanner <ArrowRight aria-hidden="true" size={16} /></Link>
      </div>

      <section className="dashboard-quick" aria-labelledby="quick-start-title">
        <div className="quick-main surface surface-pad">
          <span className="feature-icon"><ScanEye aria-hidden="true" size={22} /></span>
          <span className="eyebrow">Quick start</span>
          <h2 id="quick-start-title">A snapshot, on your terms.</h2>
          <p>Use your camera for a still frame or choose a photo from this device. The configured vision service receives it only when you select Analyze.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/scanner"><Camera aria-hidden="true" size={17} /> Open camera scanner</Link>
            <Link className="button" href="/scanner?mode=upload"><FileImage aria-hidden="true" size={17} /> Upload image</Link>
          </div>
        </div>
        <div className="quick-side">
          <article className="surface shortcut-row"><span className="feature-icon"><AudioLines aria-hidden="true" size={20} /></span><div><h3>Voice guidance</h3><p>{preferences.voiceGuidance ? "Enabled" : "Disabled"} · {preferences.speechLanguage}</p></div><Link href="/settings" className="icon-button" aria-label="Change voice guidance settings"><Accessibility aria-hidden="true" size={18} /></Link></article>
          <article className="surface shortcut-row safety-shortcut"><span className="feature-icon"><ShieldAlert aria-hidden="true" size={20} /></span><div><h3>Safety tools</h3><p>Local alert and optional contact</p></div><Link href="/safety" className="icon-button" aria-label="Open safety tools"><ArrowRight aria-hidden="true" size={18} /></Link></article>
        </div>
      </section>

      <section className="history-section" aria-labelledby="history-title">
        <div className="section-heading history-heading"><div><span className="eyebrow">On this device only</span><h2 id="history-title">Recent scans</h2></div>{history.length > 0 && <button className="text-button" type="button" onClick={clearHistory}><Trash2 aria-hidden="true" size={15} /> Clear history</button>}</div>
        {history.length === 0 ? <div className="history-empty"><Clock3 aria-hidden="true" size={19} /><span>No scans saved yet. History stores labels and time only, never images or location.</span></div> : <ul className="history-list">{history.map((entry) => <li key={entry.id} className="history-entry"><span className="history-icon"><ScanEye aria-hidden="true" size={17} /></span><span className="history-labels">{entry.labels.length ? entry.labels.join(", ") : "No objects recognized"}</span><time dateTime={entry.scannedAt}>{new Date(entry.scannedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time></li>)}</ul>}
      </section>
    </div>
  );
}