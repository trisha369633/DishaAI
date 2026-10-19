"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { VoiceCommandLanguage } from "@/lib/speech/voice-command-engine";

export type AccessibilityPreferences = {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  voiceGuidance: boolean;
  speechRate: number;
  speechLanguage: VoiceCommandLanguage;
  speechVoice: string;
  enhancedFocus: boolean;
};

type AccessibilityContextValue = {
  preferences: AccessibilityPreferences;
  updatePreference: <K extends keyof AccessibilityPreferences>(key: K, value: AccessibilityPreferences[K]) => void;
};

const defaults: AccessibilityPreferences = {
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  voiceGuidance: true,
  speechRate: 1,
  speechLanguage: "en-US",
  speechVoice: "",
  enhancedFocus: false,
};

const storageKey = "dishaai-accessibility-preferences";
const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const saved = JSON.parse(stored) as Partial<AccessibilityPreferences>;
          const supportedLanguages: VoiceCommandLanguage[] = ["en-US", "bn-BD", "hi-IN"];
          setPreferences({
            ...defaults,
            ...saved,
            speechLanguage: supportedLanguages.includes(saved.speechLanguage as VoiceCommandLanguage) ? saved.speechLanguage as VoiceCommandLanguage : "en-US",
          });
        }
        else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setPreferences((current) => ({ ...current, reducedMotion: true }));
        }
      } catch {
        setPreferences(defaults);
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    root.dataset.contrast = preferences.highContrast ? "high" : "normal";
    root.dataset.text = preferences.largeText ? "large" : "normal";
    root.dataset.motion = preferences.reducedMotion ? "reduced" : "normal";
    root.dataset.focus = preferences.enhancedFocus ? "enhanced" : "normal";
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch {
      // Preferences remain available for the current session when storage is disabled.
    }
  }, [loaded, preferences]);

  function updatePreference<K extends keyof AccessibilityPreferences>(key: K, value: AccessibilityPreferences[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  return <AccessibilityContext.Provider value={{ preferences, updatePreference }}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibilityPreferences() {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error("useAccessibilityPreferences must be used inside AccessibilityProvider");
  return context;
}