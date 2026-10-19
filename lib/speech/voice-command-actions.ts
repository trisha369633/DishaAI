import type { VoiceCommand } from "@/lib/speech/voice-command-engine";

export type RoutedVoiceAction = Extract<VoiceCommand, "scan" | "emergency">;
const eventName = "dishaai:voice-action";
const pendingActionKey = "dishaai-pending-voice-action";

export function dispatchVoiceAction(action: RoutedVoiceAction) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(eventName, { detail: action }));
}

export function listenForVoiceActions(handler: (action: RoutedVoiceAction) => void) {
  const listener = (event: Event) => {
    const action = (event as CustomEvent<unknown>).detail;
    if (action === "scan" || action === "emergency") handler(action);
  };
  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}

export function queueVoiceAction(action: RoutedVoiceAction) {
  try { sessionStorage.setItem(pendingActionKey, action); } catch { /* Route navigation still works without queued actions. */ }
}

export function takePendingVoiceAction(): RoutedVoiceAction | null {
  try {
    const action = sessionStorage.getItem(pendingActionKey);
    sessionStorage.removeItem(pendingActionKey);
    return action === "scan" || action === "emergency" ? action : null;
  } catch {
    return null;
  }
}