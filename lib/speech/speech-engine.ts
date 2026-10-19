export type SpeechStatus = "idle" | "speaking" | "paused" | "unsupported" | "error";

type SpeechOptions = { rate: number; language: string; voiceURI?: string };
let lastSpokenText = "";
let lastSpokenOptions: SpeechOptions = { rate: 1, language: "en-US" };
export const welcomeGreetingSessionKey = "dishaai-welcome-spoken";

export function welcomeGreeting(language: string, pageName = "DishaAI") {
  if (language.toLowerCase().startsWith("bn")) {
    return `দিশা এ আই-তে স্বাগতম। আপনি এখন ${pageName} পৃষ্ঠায় আছেন। হাতে-কলমে নেভিগেট করতে স্ক্যানার, সেফটি, ড্যাশবোর্ড, বা হোম বলুন।`;
  }
  if (language.toLowerCase().startsWith("hi")) {
    return `दिशा ए आई में आपका स्वागत है। आप ${pageName} पेज पर हैं। हाथों से नेविगेट करने के लिए स्कैनर, सुरक्षा, डैशबोर्ड, या होम कहें।`;
  }
  return `Welcome to DishaAI. You are on ${pageName}. Say Scanner, Safety, Dashboard, or Home to navigate hands-free.`;
}

export function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function getSpeechVoices(): SpeechSynthesisVoice[] {
  return speechSupported() ? window.speechSynthesis.getVoices() : [];
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

export function pauseSpeaking() {
  if (speechSupported() && window.speechSynthesis.speaking) window.speechSynthesis.pause();
}

export function resumeSpeaking() {
  if (speechSupported() && window.speechSynthesis.paused) window.speechSynthesis.resume();
}

export function speakText(
  text: string,
  options: SpeechOptions,
  handlers: { onStart?: () => void; onEnd?: () => void; onError?: () => void } = {},
) {
  if (!speechSupported()) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;

  lastSpokenText = trimmed;
  lastSpokenOptions = { ...options };
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = options.language;
  utterance.rate = Math.min(2, Math.max(0.5, options.rate));
  const selectedVoice = options.voiceURI
    ? getSpeechVoices().find((voice) => voice.voiceURI === options.voiceURI)
    : undefined;
  if (selectedVoice) utterance.voice = selectedVoice;
  utterance.onstart = handlers.onStart ?? null;
  utterance.onend = handlers.onEnd ?? null;
  utterance.onerror = handlers.onError ? () => handlers.onError?.() : null;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function repeatLastSpoken() {
  return lastSpokenText ? speakText(lastSpokenText, lastSpokenOptions) : false;
}

export function getLastSpoken() {
  return lastSpokenText ? { text: lastSpokenText, options: { ...lastSpokenOptions } } : null;
}