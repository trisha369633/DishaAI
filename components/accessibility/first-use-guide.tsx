"use client";

import Link from "next/link";
import { useState } from "react";
import { AudioLines, Camera, Headphones, ShieldCheck } from "lucide-react";
import { useAccessibilityPreferences } from "@/components/accessibility/accessibility-provider";
import { useSpeech } from "@/hooks/use-speech";
import { welcomeGreeting, welcomeGreetingSessionKey } from "@/lib/speech/speech-engine";

export default function FirstUseGuide() {
  const { preferences, updatePreference } = useAccessibilityPreferences();
  const speech = useSpeech();
  const [message, setMessage] = useState("");

  function enableGuidance() {
    try { sessionStorage.setItem(welcomeGreetingSessionKey, "yes"); } catch { /* This explicit button remains available without storage. */ }
    updatePreference("voiceGuidance", true);
    const started = speech.speak(
      welcomeGreeting(preferences.speechLanguage),
      preferences.speechRate,
      preferences.speechLanguage,
      preferences.speechVoice,
    );
    setMessage(started ? "Spoken guidance enabled. A short introduction is playing." : "Speech synthesis is not available in this browser. Use your screen reader; scan results are also shown as text.");
  }

  return (
    <section className="section first-use-section" aria-labelledby="first-use-title">
      <div className="section-heading">
        <div><span className="eyebrow">A guided first step</span><h2 id="first-use-title">Use DishaAI without relying on the screen.</h2></div>
        <p>Start with your device screen reader. All scanning, narration, and safety actions remain available through labeled buttons.</p>
      </div>
      <div className="first-use-controls">
        <div className="first-use-callout"><span className="feature-icon"><AudioLines aria-hidden="true" size={21} /></span><div><strong>Spoken guidance is opt-in</strong><p>Tap once to enable it and hear a short orientation. DishaAI does not start the camera or microphone when a page opens.</p></div></div>
        <button className="button button-primary" type="button" onClick={enableGuidance}><Headphones aria-hidden="true" size={17} /> {preferences.voiceGuidance ? "Hear spoken guidance" : "Enable spoken guidance"}</button>
        <span className="first-use-status" aria-live={message.startsWith("Speech synthesis is not available") ? "polite" : "off"}>{message}</span>
      </div>
      <div className="first-use-steps">
        <article><span>1</span><h3>Start a scan</h3><p>Activate <strong>Start scanning</strong>, then choose <strong>Start camera</strong> or the upload option. With voice commands on, say Scan once to start the camera and again to capture and analyze.</p></article>
        <article><span>2</span><h3>Allow device access only when asked</h3><p>Camera permission is requested after Start camera. Microphone permission is requested only after Start voice commands. If either is denied, use browser site settings or the button controls.</p></article>
        <article><span>3</span><h3>Listen or read results</h3><p>After analysis, use <strong>Speak results</strong> or <strong>Repeat warning</strong>. Detected labels and scores are also available as text.</p></article>
      </div>
      <details className="screen-reader-instructions">
        <summary><ShieldCheck aria-hidden="true" size={17} /> Screen reader and camera instructions</summary>
        <div>
          <h3>iPhone with VoiceOver</h3>
          <p>Turn on VoiceOver in Settings &gt; Accessibility &gt; VoiceOver. Swipe right or left to move between controls; double-tap to activate the focused control. Safari may ask for camera permission after you tap Start camera.</p>
          <h3>Android with TalkBack</h3>
          <p>Turn on TalkBack in Settings &gt; Accessibility &gt; TalkBack. Swipe right or left to move between controls; double-tap to activate the focused control. In Chrome, allow camera access when prompted. If permission was denied, open the site permissions in Chrome and allow Camera, or choose Upload image.</p>
          <h3>Camera permission</h3>
          <p>The camera stays off until you activate Start camera. If camera access is unavailable or denied, scanning by image upload remains available. The camera preview is not sent; only the still image you capture and then submit with Analyze is transmitted to the configured detection provider.</p>
          <h3>Optional voice commands</h3>
          <p>Activate Start voice commands to request microphone permission and listen in the selected language. Say Scan, Repeat, Stop, or Emergency. Recognition may use the browser vendor&apos;s speech service; listening continues only while the control says Stop listening. Every command also has a button alternative.</p>
          <p>English: Scan, Repeat, Stop, Emergency. Bangla: শুরু, আবার, থামো, সাহায্য. Hindi: शुरू, दोहराओ, रुको, मदद.</p>
          <Link className="inline-link" href="/settings">Open accessibility settings</Link>
        </div>
      </details>
      <p className="first-use-note"><Camera aria-hidden="true" size={15} /> Microphone permission is optional and requested only when you start voice commands.</p>
    </section>
  );
}