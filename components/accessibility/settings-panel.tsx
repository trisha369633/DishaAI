"use client";

import Link from "next/link";
import { Accessibility, AudioLines, Check, Eye, Volume2, VolumeX } from "lucide-react";
import { useAccessibilityPreferences } from "@/components/accessibility/accessibility-provider";
import { useSpeech } from "@/hooks/use-speech";
import type { VoiceCommandLanguage } from "@/lib/speech/voice-command-engine";

export default function SettingsPanel() {
  const { preferences, updatePreference } = useAccessibilityPreferences();
  const speech = useSpeech();
  const languageChoices: VoiceCommandLanguage[] = ["en-US", "bn-BD", "hi-IN"];
  const languagePrefix = preferences.speechLanguage.toLowerCase().split("-")[0];
  const filteredVoices = speech.voices.filter((voice) => voice.lang.toLowerCase().startsWith(languagePrefix));
  const hasInstalledVoice = speech.voices.some((voice) => voice.lang.toLowerCase().startsWith(preferences.speechLanguage.toLowerCase().split("-")[0]));

  function toggle(key: "highContrast" | "largeText" | "reducedMotion" | "voiceGuidance" | "enhancedFocus", label: string, description: string) {
    return (
      <label className="setting-row" key={key}>
        <span className="setting-copy"><strong>{label}</strong><span>{description}</span></span>
        <input className="switch-input" type="checkbox" checked={preferences[key]} onChange={(event) => updatePreference(key, event.target.checked)} aria-label={label} />
      </label>
    );
  }

  return (
    <div>
      <div className="page-heading"><div><span className="eyebrow">Personalize</span><h1>Accessibility settings</h1><p>Your preferences are saved in this browser. They are not sent to the detection provider.</p></div><Accessibility aria-hidden="true" className="page-heading-icon" size={29} /></div>
      <div className="settings-layout">
        <section className="surface settings-section" aria-labelledby="display-title">
          <div className="settings-section-heading"><span className="feature-icon"><Eye aria-hidden="true" size={20} /></span><div><h2 id="display-title">Display & navigation</h2><p>Adjust contrast, type size, motion, and focus visibility.</p></div></div>
          <div className="settings-list">
            {toggle("highContrast", "High contrast", "Strengthen text and interface boundaries.")}
            {toggle("largeText", "Larger text", "Increase the base interface text size.")}
            {toggle("reducedMotion", "Reduce motion", "Minimize transitions and follow system motion preferences.")}
            {toggle("enhancedFocus", "Enhanced focus indicator", "Make the active keyboard target easier to locate.")}
          </div>
        </section>
        <section className="surface settings-section" aria-labelledby="speech-title">
          <div className="settings-section-heading"><span className="feature-icon"><AudioLines aria-hidden="true" size={20} /></span><div><h2 id="speech-title">Voice guidance</h2><p>Uses browser-installed voices. English, Bangla, and Hindi are available when supported by this device.</p></div></div>
          <div className="settings-list">
            {toggle("voiceGuidance", "Enable spoken guidance", "DishaAI speaks only when you activate a speak control. It never starts speech when a page loads.")}
            <label className="setting-control"><span><strong>Speech rate</strong><span>Current rate: {preferences.speechRate.toFixed(1)}×</span></span><input type="range" min="0.5" max="2" step="0.1" value={preferences.speechRate} onChange={(event) => updatePreference("speechRate", Number(event.target.value))} aria-label="Speech rate" /></label>
            <label className="setting-control"><span><strong>Speech and recognition language</strong><span>{hasInstalledVoice ? "A matching speech voice is installed." : "No matching speech voice detected; browser default may be used."}</span></span><select value={preferences.speechLanguage} onChange={(event) => { updatePreference("speechLanguage", event.target.value as VoiceCommandLanguage); updatePreference("speechVoice", ""); }} aria-label="Speech and recognition language">{languageChoices.map((language) => {
              const installed = speech.voices.some((voice) => voice.lang.toLowerCase().startsWith(language.toLowerCase().split("-")[0]));
              const label = language === "en-US" ? "English" : language === "bn-BD" ? "Bangla" : language === "hi-IN" ? "Hindi" : language;
              return <option key={language} value={language}>{label}{installed ? "" : " (no installed voice detected)"}</option>;
            })}</select></label>
            <label className="setting-control"><span><strong>Voice</strong><span>Choose an installed voice for the selected language.</span></span><select value={preferences.speechVoice} onChange={(event) => updatePreference("speechVoice", event.target.value)} aria-label="Speech voice"><option value="">Browser default</option>{filteredVoices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name}{voice.default ? " (default)" : ""}</option>)}</select></label>
          </div>
          <div className="speech-test"><button className="button button-quiet" type="button" onClick={() => speech.speak("DishaAI voice guidance is ready.", preferences.speechRate, preferences.speechLanguage, preferences.speechVoice)}><Volume2 aria-hidden="true" size={17} /> Test voice</button><button className="icon-button" type="button" onClick={speech.stop} aria-label="Stop voice test" title="Stop"><VolumeX aria-hidden="true" size={17} /></button><span aria-live="off">{speech.status === "unsupported" ? "Speech synthesis is unavailable." : speech.status === "error" ? "The selected voice could not speak." : speech.status === "speaking" ? "Speaking" : "Ready"}</span>{(speech.status === "unsupported" || speech.status === "error") && <span role="alert">{speech.status === "unsupported" ? "Speech synthesis is unavailable. Use your screen reader instead." : "The selected voice could not speak. Choose another voice or use your screen reader."}</span>}</div>
        </section>
      </div>
      <p className="settings-footnote"><Check aria-hidden="true" size={16} /> Keyboard navigation and visible focus indicators are always available. <Link className="inline-link" href="/scanner">Return to scanner</Link></p>
    </div>
  );
}