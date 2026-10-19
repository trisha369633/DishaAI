"use client";

import { useEffect, useRef } from "react";
import { Volume2 } from "lucide-react";
import { useAccessibilityPreferences } from "@/components/accessibility/accessibility-provider";
import { useSpeech } from "@/hooks/use-speech";
import { welcomeGreeting } from "@/lib/speech/speech-engine";

export default function WelcomeGreeting() {
  const { preferences, updatePreference } = useAccessibilityPreferences();
  const speech = useSpeech();
  const spokenRef = useRef(false);

  useEffect(() => {
    if (spokenRef.current) return;

    const timer = window.setTimeout(() => {
      spokenRef.current = true;
      speech.speak(welcomeGreeting(preferences.speechLanguage, "Dashboard"), preferences.speechRate, preferences.speechLanguage, preferences.speechVoice);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [preferences.speechLanguage, preferences.speechRate, preferences.speechVoice, speech]);

  function speakWelcome() {
    updatePreference("voiceGuidance", true);
    speech.speak(welcomeGreeting(preferences.speechLanguage, "Dashboard"), preferences.speechRate, preferences.speechLanguage, preferences.speechVoice);
  }

  return (
    <button className="welcome-greeting-button" type="button" onClick={speakWelcome} aria-label="Speak the DishaAI welcome greeting">
      <Volume2 aria-hidden="true" size={16} />
      <span>Hear welcome</span>
    </button>
  );
}