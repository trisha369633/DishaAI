"use client";

import { useEffect, useRef, useState } from "react";
import { getSpeechRecognitionConstructor, parseVoiceCommand, recognitionSupported, voiceCommandMessages, type SpeechRecognitionLike, type VoiceCommand } from "@/lib/speech/voice-command-engine";

export type VoiceCommandStatus = "checking" | "idle" | "starting" | "listening" | "unsupported" | "denied" | "error";

export function useVoiceCommands(options: { language: string; onCommand: (command: VoiceCommand) => void }) {
  const [status, setStatus] = useState<VoiceCommandStatus>("checking");
  const [announcement, setAnnouncement] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const shouldListenRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const lastCommandRef = useRef<{ command: VoiceCommand; at: number } | null>(null);
  const commandHandlerRef = useRef(options.onCommand);
  const messages = voiceCommandMessages(options.language);
  useEffect(() => { commandHandlerRef.current = options.onCommand; }, [options.onCommand]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (recognitionSupported()) setStatus("idle");
      else {
        setStatus("unsupported");
        setAnnouncement("Voice commands are not supported in this browser. Use the buttons instead.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => () => {
    shouldListenRef.current = false;
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") void audioContextRef.current.close();
  }, []);

  function cue(pattern: "start" | "stop" | "heard" | "unknown") {
    const context = audioContextRef.current;
    if (!context || context.state !== "running") return;
    const frequencies = pattern === "start" ? [880] : pattern === "stop" ? [620, 440] : pattern === "heard" ? [1040] : [440, 440, 440];
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startTime = context.currentTime + index * 0.16;
      oscillator.frequency.setValueAtTime(frequency, startTime);
      gain.gain.setValueAtTime(0.055, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.1);
    });
  }

  function stopListening(message = messages.stopped) {
    shouldListenRef.current = false;
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = null;
    recognitionRef.current?.stop();
    setStatus("idle");
    setAnnouncement(message);
    cue("stop");
  }

  function startListening() {
    if (shouldListenRef.current) return;
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setStatus("unsupported");
      setAnnouncement("Voice commands are not supported in this browser. Use the buttons instead.");
      return;
    }

    try {
      setStatus("starting");
      if (!audioContextRef.current && window.AudioContext) audioContextRef.current = new AudioContext();
      if (audioContextRef.current?.state === "suspended") void audioContextRef.current.resume();
      shouldListenRef.current = false;
      recognitionRef.current?.abort();
      const recognition = new Recognition();
      recognition.lang = options.language;
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        setStatus("listening");
        setAnnouncement(`${messages.listening} Microphone audio is handled by your browser's speech-recognition service.`);
        cue("start");
      };
      recognition.onresult = (event) => {
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (!result?.isFinal) continue;
          const transcript = result[0]?.transcript ?? "";
          const command = parseVoiceCommand(transcript);
          if (command) {
            const now = Date.now();
            if (lastCommandRef.current?.command === command && now - lastCommandRef.current.at < 700) continue;
            lastCommandRef.current = { command, at: now };
            setAnnouncement(messages.recognized(command));
            cue("heard");
            if (command === "repeat") stopListening(messages.repeated);
            if (command === "emergency") stopListening(messages.emergency);
            commandHandlerRef.current(command);
          } else {
            setAnnouncement(messages.unknown);
            cue("unknown");
          }
        }
      };
      recognition.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          shouldListenRef.current = false;
          setStatus("denied");
          setAnnouncement(messages.denied);
        } else if (event.error !== "no-speech" && event.error !== "aborted") {
          shouldListenRef.current = false;
          setStatus("error");
          setAnnouncement(`Voice commands stopped: ${event.error}. Use the on-screen buttons instead.`);
        }
      };
      recognition.onend = () => {
        if (!shouldListenRef.current) return;
        if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = window.setTimeout(() => {
          try { recognition.start(); } catch { /* The browser may still be finalizing the previous session. */ }
        }, 250);
      };
      recognitionRef.current = recognition;
      shouldListenRef.current = true;
      setAnnouncement(`${messages.starting} Microphone audio is handled by your browser's speech-recognition service while listening is active.`);
      recognition.start();
    } catch {
      shouldListenRef.current = false;
      setStatus("error");
      setAnnouncement("Voice commands could not start. Check microphone permission or use the on-screen buttons.");
    }
  }

  return { status, announcement, startListening, stopListening };
}