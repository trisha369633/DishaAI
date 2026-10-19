"use client";

import { useEffect, useRef, useState } from "react";
import { getLastSpoken, getSpeechVoices, pauseSpeaking, resumeSpeaking, speakText, stopSpeaking, type SpeechStatus } from "@/lib/speech/speech-engine";

export function useSpeech() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const requestId = useRef(0);

  useEffect(() => {
    const updateVoices = () => setVoices(getSpeechVoices());
    const timer = window.setTimeout(updateVoices, 0);
    if ("speechSynthesis" in window) window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
    return () => {
      window.clearTimeout(timer);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function speak(text: string, rate: number, language: string, voiceURI = "") {
    const currentRequest = ++requestId.current;
    const started = speakText(text, { rate, language, voiceURI }, {
      onStart: () => { if (currentRequest === requestId.current) setStatus("speaking"); },
      onEnd: () => { if (currentRequest === requestId.current) setStatus("idle"); },
      onError: () => { if (currentRequest === requestId.current) setStatus("error"); },
    });
    setStatus(started ? "speaking" : "unsupported");
    return started;
  }

  function stop() {
    requestId.current += 1;
    stopSpeaking();
    setStatus("idle");
  }

  function pause() {
    if (status !== "speaking") return;
    pauseSpeaking();
    setStatus("paused");
  }

  function resume() {
    if (status !== "paused") return;
    resumeSpeaking();
    setStatus("speaking");
  }

  function repeat() {
    const lastSpoken = getLastSpoken();
    if (!lastSpoken) return false;
    return speak(lastSpoken.text, lastSpoken.options.rate, lastSpoken.options.language, lastSpoken.options.voiceURI);
  }

  return { voices, status, speak, stop, pause, resume, repeat };
}