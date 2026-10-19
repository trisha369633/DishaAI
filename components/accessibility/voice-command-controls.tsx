"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Mic, MicOff } from "lucide-react";
import { useAccessibilityPreferences } from "@/components/accessibility/accessibility-provider";
import { useSpeech } from "@/hooks/use-speech";
import { useVoiceCommands } from "@/hooks/use-voice-commands";
import { dispatchVoiceAction, queueVoiceAction } from "@/lib/speech/voice-command-actions";
import type { VoiceCommand } from "@/lib/speech/voice-command-engine";

export default function VoiceCommandControls() {
  const pathname = usePathname();
  const router = useRouter();
  const { preferences } = useAccessibilityPreferences();
  const speech = useSpeech();
  const [commandFeedback, setCommandFeedback] = useState("");

  const handleCommand = useCallback((command: VoiceCommand) => {
    setCommandFeedback("");
    if (command === "repeat") {
      if (!speech.repeat()) setCommandFeedback("Nothing has been spoken yet. Use a speech button first.");
      else setCommandFeedback("");
      return;
    }
    if (command === "stop") {
      speech.stop();
      setCommandFeedback("Speech stopped.");
      return;
    }
    if (command === "scanner" || command === "safety" || command === "dashboard" || command === "home") {
      const target = command === "scanner" ? "/scanner" : command === "safety" ? "/safety" : command === "home" ? "/" : "/dashboard";
      router.push(target);
      return;
    }
    const action = command === "scan" ? "scan" : "emergency";
    const target = action === "scan" ? "/scanner" : "/safety";
    if (pathname === target) dispatchVoiceAction(action);
    else {
      queueVoiceAction(action);
      router.push(target);
    }
  }, [pathname, router, speech]);

  const voice = useVoiceCommands({ language: preferences.speechLanguage, onCommand: handleCommand });
  const startListeningRef = useRef(voice.startListening);
  useEffect(() => { startListeningRef.current = voice.startListening; }, [voice.startListening]);
  useEffect(() => {
    if (pathname !== "/dashboard") return;
    let timer: number;
    const startAfterWelcome = (deadline: number) => {
      const synthesis = "speechSynthesis" in window ? window.speechSynthesis : null;
      if (synthesis && (synthesis.speaking || synthesis.pending) && Date.now() < deadline) {
        timer = window.setTimeout(() => startAfterWelcome(deadline), 250);
        return;
      }
      startListeningRef.current();
    };
    timer = window.setTimeout(() => startAfterWelcome(Date.now() + 15000), 750);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  const listening = voice.status === "listening" || voice.status === "starting";
  const urgentAnnouncement = voice.status === "denied" || voice.status === "error" || voice.status === "unsupported";

  return (
    <div className="voice-command-controls">
      <button
        className={`voice-command-button${listening ? " is-listening" : ""}`}
        type="button"
        onClick={listening ? () => voice.stopListening() : voice.startListening}
        aria-label={voice.status === "checking" ? "Checking voice command support" : voice.status === "starting" ? "Cancel starting voice commands" : listening ? "Stop listening for voice commands" : "Start voice commands"}
        aria-pressed={listening}
        aria-describedby="voice-command-privacy"
        disabled={voice.status === "checking" || voice.status === "unsupported"}
      >
        {listening ? <MicOff aria-hidden="true" size={16} /> : <Mic aria-hidden="true" size={16} />}
        <span>{voice.status === "checking" ? "Checking voice command support…" : voice.status === "starting" ? "Starting voice commands…" : listening ? "Stop listening" : voice.status === "unsupported" ? "Voice commands unavailable" : "Start voice commands"}</span>
      </button>
      <span id="voice-command-privacy" className="voice-command-privacy">Microphone is used only while listening. Stop anytime.</span>
      <p className="visually-hidden" role={urgentAnnouncement ? "alert" : "status"} aria-live={urgentAnnouncement ? "assertive" : "polite"} aria-atomic="true">{voice.announcement}{commandFeedback ? ` ${commandFeedback}` : ""}</p>
      {urgentAnnouncement && <p className="voice-command-error" aria-hidden="true">{voice.announcement}</p>}
    </div>
  );
}