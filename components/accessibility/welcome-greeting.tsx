"use client";

import { useEffect, useRef } from "react";
import { Volume2 } from "lucide-react";
import { useAccessibilityPreferences } from "@/components/accessibility/accessibility-provider";
import { useSpeech } from "@/hooks/use-speech";
import { welcomeGreeting, welcomeGreetingSessionKey } from "@/lib/speech/speech-engine";

export default function WelcomeGreeting() {
  const { preferences, updatePreference } = useAccessibilityPreferences();
  const speech = useSpeech();
  const spokenRef = useRef(false);

  useEffect(() => {
    if (spokenRef.current || !preferences.voiceGuidance || !navigator.userActivation?.hasBeenActive) return;
    let alreadySpoken = false;
    try { alreadySpoken = sessionStorage.getItem(welcomeGreetingSessionKey) === "yes"; } catch { /* Gesture-gated greeting still works without storage. */ }
    if (alreadySpoken) return;

    const timer = window.setTimeout(() => {
      spokenRef.current = true;
      const started = speech.speak(welcomeGreeting(preferences.speechLanguage), preferences.speechRate, preferences.speechLanguage, preferences.speechVoice);
      if (started) {
        try { sessionStorage.setItem(welcomeGreetingSessionKey, "yes"); } catch { /* Avoiding repeated speech is best-effort without storage. */ }
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [preferences.speechLanguage, preferences.speechRate, preferences.speechVoice, preferences.voiceGuidance, speech]);

  function speakWelcome() {
    spokenRef.current = true;
    try { sessionStorage.setItem(welcomeGreetingSessionKey, "yes"); } catch { /* Explicit button action remains available without storage. */ }
    updatePreference("voiceGuidance", true);
    speech.speak(welcomeGreeting(preferences.speechLanguage), preferences.speechRate, preferences.speechLanguage, preferences.speechVoice);
  }

  return (
    <button className="welcome-greeting-button" type="button" onClick={speakWelcome} aria-label="Speak the DishaAI welcome greeting">
      <Volume2 aria-hidden="true" size={16} />
      <span>Hear welcome</span>
    </button>
  );
}