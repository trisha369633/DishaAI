export type VoiceCommand = "scan" | "repeat" | "stop" | "emergency";
export type VoiceCommandLanguage = "en-US" | "bn-BD" | "hi-IN";

export type RecognitionResult = {
  isFinal: boolean;
  [index: number]: { transcript: string } | undefined;
};

export type RecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};

export type RecognitionErrorEvent = { error: string };

export type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const recognitionWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return recognitionWindow.SpeechRecognition ?? recognitionWindow.webkitSpeechRecognition ?? null;
}

export function recognitionSupported() {
  return getSpeechRecognitionConstructor() !== null;
}

export function parseVoiceCommand(transcript: string): VoiceCommand | null {
  const normalized = transcript
    .toLocaleLowerCase()
    .replace(/[.,!?।:;؛،]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  if (!normalized) return null;

  const has = (...phrases: string[]) => phrases.some((phrase) => normalized.includes(phrase));
  if (has("emergency", "help", "sos", "সাহায্য", "জরুরি", "मदद", "आपातकाल")) return "emergency";
  if (has("repeat", "again", "warning", "আবার", "পুনরায়", "আবার বলো", "दोहराओ", "फिर से")) return "repeat";
  if (has("stop", "থামো", "বন্ধ কর", "रुको", "बंद करो")) return "stop";
  if (has("scan", "start scanning", "start scan", "শুরু", "স্ক্যান", "शुरू", "स्कैन")) return "scan";
  return null;
}

export const commandLanguageLabels: Record<VoiceCommandLanguage, string> = {
  "en-US": "English",
  "bn-BD": "Bangla",
  "hi-IN": "Hindi",
};

const commandPhrases: Record<VoiceCommandLanguage, Record<VoiceCommand, string>> = {
  "en-US": { scan: "Scan", repeat: "Repeat", stop: "Stop", emergency: "Emergency" },
  "bn-BD": { scan: "শুরু", repeat: "আবার", stop: "থামো", emergency: "সাহায্য" },
  "hi-IN": { scan: "शुरू", repeat: "दोहराओ", stop: "रुको", emergency: "मदद" },
};

function commandLanguage(language: string): VoiceCommandLanguage {
  if (language.toLowerCase().startsWith("bn")) return "bn-BD";
  if (language.toLowerCase().startsWith("hi")) return "hi-IN";
  return "en-US";
}

export function voiceCommandMessages(language: string) {
  const locale = commandLanguage(language);
  const phrases = commandPhrases[locale];
  if (locale === "bn-BD") {
    return {
      listening: `বাংলা ভাষায় শুনছি। বলুন ${phrases.scan}, ${phrases.repeat}, ${phrases.stop}, অথবা ${phrases.emergency}।`,
      starting: "ভয়েস কমান্ড শুরু হচ্ছে। ব্রাউজার মাইক্রোফোন ব্যবহারের অনুমতি চাইতে পারে।",
      stopped: "ভয়েস কমান্ড বন্ধ হয়েছে।",
      repeated: "শেষ বলা বার্তাটি শোনার সময় ভয়েস কমান্ড সাময়িকভাবে বন্ধ আছে।",
      emergency: "জরুরি কাজ নিশ্চিত করার সময় ভয়েস কমান্ড সাময়িকভাবে বন্ধ আছে।",
      unknown: `কমান্ডটি বোঝা যায়নি। বলুন ${phrases.scan}, ${phrases.repeat}, ${phrases.stop}, অথবা ${phrases.emergency}।`,
      recognized: (command: VoiceCommand) => `কমান্ড চেনা হয়েছে: ${phrases[command]}।`,
      denied: "মাইক্রোফোন ব্যবহারের অনুমতি নেই। ব্রাউজার সেটিংসে অনুমতি দিয়ে আবার ভয়েস কমান্ড চালু করুন।",
    };
  }
  if (locale === "hi-IN") {
    return {
      listening: `हिंदी में सुन रहा है। ${phrases.scan}, ${phrases.repeat}, ${phrases.stop}, या ${phrases.emergency} कहें।`,
      starting: "वॉइस कमांड शुरू हो रहे हैं। ब्राउज़र माइक्रोफ़ोन की अनुमति मांग सकता है।",
      stopped: "वॉइस कमांड बंद हैं।",
      repeated: "पिछला संदेश सुनाने के लिए वॉइस कमांड रोक दिए गए हैं।",
      emergency: "आपातकालीन कार्रवाई की पुष्टि तक वॉइस कमांड रोक दिए गए हैं।",
      unknown: `कमांड समझ नहीं आया। ${phrases.scan}, ${phrases.repeat}, ${phrases.stop}, या ${phrases.emergency} कहें।`,
      recognized: (command: VoiceCommand) => `कमांड पहचाना गया: ${phrases[command]}।`,
      denied: "माइक्रोफ़ोन की अनुमति नहीं मिली। ब्राउज़र सेटिंग में अनुमति दें, फिर वॉइस कमांड शुरू करें।",
    };
  }
  return {
    listening: `Listening in English. Say ${phrases.scan}, ${phrases.repeat}, ${phrases.stop}, or ${phrases.emergency}.`,
    starting: "Starting voice commands. Your browser may ask for microphone permission.",
    stopped: "Voice commands stopped.",
    repeated: "Voice commands paused while the last spoken message is repeated.",
    emergency: "Voice commands paused while you confirm the emergency action.",
    unknown: `Voice command not recognized. Say ${phrases.scan}, ${phrases.repeat}, ${phrases.stop}, or ${phrases.emergency}.`,
    recognized: (command: VoiceCommand) => `Command recognized: ${phrases[command]}.`,
    denied: "Microphone permission was denied. Allow microphone access in browser settings, then start voice commands again.",
  };
}