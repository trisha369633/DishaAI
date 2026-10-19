"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, BellRing, Phone, ShieldAlert, Square, Trash2, UserRound } from "lucide-react";
import { useAccessibilityPreferences } from "@/components/accessibility/accessibility-provider";
import { useSpeech } from "@/hooks/use-speech";
import { listenForVoiceActions, takePendingVoiceAction } from "@/lib/speech/voice-command-actions";

const contactStorageKey = "dishaai-emergency-contact";

export default function SosPanel() {
  const { preferences } = useAccessibilityPreferences();
  const speech = useSpeech();
  const contextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const sosButtonRef = useRef<HTMLButtonElement>(null);
  const [contact, setContact] = useState("");
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [alarmActive, setAlarmActive] = useState(false);
  const [status, setStatus] = useState("");
  const [statusUsesSpeech, setStatusUsesSpeech] = useState(false);
  const [contactError, setContactError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setContact(localStorage.getItem(contactStorageKey) ?? ""); } catch { setContact(""); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => () => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    if (contextRef.current && contextRef.current.state !== "closed") void contextRef.current.close();
  }, []);

  useEffect(() => {
    const pending = window.setTimeout(() => {
      if (takePendingVoiceAction() === "emergency") {
        setStatus("Emergency command recognized. Choose whether to start a local alert or cancel. No one has been contacted.");
        setConfirming(true);
      }
    }, 0);
    const removeListener = listenForVoiceActions((action) => {
      if (action !== "emergency") return;
      setStatus("Emergency command recognized. Choose whether to start a local alert or cancel. No one has been contacted.");
      setStatusUsesSpeech(false);
      setConfirming(true);
    });
    return () => {
      window.clearTimeout(pending);
      removeListener();
    };
  }, []);

  function stopAlarm() {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (contextRef.current && contextRef.current.state !== "closed") void contextRef.current.close();
    contextRef.current = null;
    speech.stop();
    setAlarmActive(false);
    const announcement = "Local alert stopped. No emergency contact was notified.";
    setStatus(announcement);
    setStatusUsesSpeech(speech.speak(announcement, preferences.speechRate, preferences.speechLanguage, preferences.speechVoice));
  }

  function closeConfirmation() {
    setConfirming(false);
    window.requestAnimationFrame(() => sosButtonRef.current?.focus());
  }

  const cancelConfirmation = useCallback(() => {
    closeConfirmation();
    const announcement = "Emergency action cancelled. No one was contacted.";
    setStatus(announcement);
    setStatusUsesSpeech(speech.speak(announcement, preferences.speechRate, preferences.speechLanguage, preferences.speechVoice));
  }, [preferences.speechLanguage, preferences.speechRate, preferences.speechVoice, speech]);

  useEffect(() => {
    if (!confirming) return;
    function onEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      cancelConfirmation();
    }
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [cancelConfirmation, confirming]);

  async function startAlarm() {
    closeConfirmation();
    try {
      const AudioContextConstructor = window.AudioContext;
      if (!AudioContextConstructor) throw new Error("Audio alerts are unavailable in this browser.");
      const context = new AudioContextConstructor();
      contextRef.current = context;
      await context.resume();
      const beep = () => {
        if (context.state !== "running") return;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.07, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.18);
      };
      beep();
      intervalRef.current = window.setInterval(beep, 600);
      setAlarmActive(true);
      const announcement = "DishaAI local alert is active on this device only. If you need emergency help, contact the emergency service for your area or someone you trust. This alert does not contact anyone.";
      setStatus(announcement);
      setStatusUsesSpeech(speech.speak(announcement, preferences.speechRate, preferences.speechLanguage, preferences.speechVoice));
    } catch {
      setStatus("A local audible alert could not start in this browser. Use your phone or another available way to contact help.");
      setStatusUsesSpeech(false);
    }
  }

  function saveContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = draft.trim();
    if (!cleaned) return;
    if (cleaned.replace(/\D/g, "").length < 3) {
      setContactError("Enter a phone number with at least three digits.");
      return;
    }
    setContactError("");
    let saved = true;
    try { localStorage.setItem(contactStorageKey, cleaned); } catch { saved = false; }
    setContact(cleaned);
    setDraft("");
    setStatus(saved ? "Emergency contact saved only in this browser." : "Contact is available for this page only; browser storage was unavailable.");
    setStatusUsesSpeech(false);
  }

  function clearContact() {
    try { localStorage.removeItem(contactStorageKey); } catch { /* The in-memory value is still cleared. */ }
    setContact("");
    setStatus("Saved contact cleared.");
    setStatusUsesSpeech(false);
  }

  const telephoneHref = contact ? `tel:${contact.replace(/[^\d+]/g, "")}` : "";

  return (
    <div>
      <div className="page-heading"><div><span className="eyebrow">You remain in control</span><h1>Safety & SOS</h1><p>Local tools for a moment when you want to draw attention or reach someone you trust.</p></div><ShieldAlert aria-hidden="true" className="page-heading-icon danger-icon" size={31} /></div>

      <section className="sos-panel surface" aria-labelledby="sos-title">
        <div className="sos-icon-wrap"><BellRing aria-hidden="true" size={32} /></div>
        <div className="sos-copy"><span className="eyebrow">No automatic calls or messages</span><h2 id="sos-title">Need help right now?</h2><p>Start a local audible alert or use a saved contact. DishaAI cannot contact emergency services for you.</p></div>
        <button ref={sosButtonRef} className="sos-button" type="button" onClick={() => setConfirming(true)} disabled={alarmActive} aria-label="SOS. Open emergency actions. No call will be made automatically." aria-haspopup="dialog"><span aria-hidden="true">SOS</span><small aria-hidden="true">Choose an action</small></button>
      </section>

      {alarmActive && <section className="alert-active" aria-live="off"><span><span className="alert-pulse" aria-hidden="true" /> Local alert is sounding on this device.</span><button className="button button-quiet" type="button" onClick={stopAlarm}><Square aria-hidden="true" size={16} /> Stop alert</button></section>}
      {status && <p className="sos-status" role={statusUsesSpeech ? undefined : "status"} aria-live={statusUsesSpeech ? "off" : undefined}>{status}</p>}

      <section className="safety-guidance" aria-labelledby="guidance-title">
        <div className="section-heading"><div><span className="eyebrow">Practical next steps</span><h2 id="guidance-title">When you need support</h2></div></div>
        <button className="button button-quiet" type="button" onClick={() => speech.speak("If you are in immediate danger, call the emergency number for your area using a phone or service you trust. You can call someone you trust or follow your personal safety plan. DishaAI does not contact anyone for you.", preferences.speechRate, preferences.speechLanguage, preferences.speechVoice)}><BellRing aria-hidden="true" size={17} /> Speak emergency instructions</button>
        <div className="guidance-grid">
          <article><span className="guidance-number">01</span><h3>Contact local help</h3><p>If you are in immediate danger, call the emergency number for your area using a phone or service you trust.</p></article>
          <article><span className="guidance-number">02</span><h3>Reach someone you trust</h3><p>Use your device’s phone or messaging app. DishaAI does not send messages or share your location.</p></article>
          <article><span className="guidance-number">03</span><h3>Use familiar support</h3><p>Follow your established mobility, orientation, or personal safety plan where possible.</p></article>
        </div>
      </section>

      <section className="surface contact-section" aria-labelledby="contact-title">
        <div><span className="feature-icon"><UserRound aria-hidden="true" size={20} /></span><h2 id="contact-title">Emergency contact</h2><p>Optional. Saved only in this browser. A call opens your device’s phone handler after you confirm.</p></div>
        {contact ? <div className="saved-contact"><span><Phone aria-hidden="true" size={17} /> {contact}</span><a className="button button-quiet" href={telephoneHref} onClick={(event) => { if (!window.confirm(`Open your phone app to call ${contact}?`)) event.preventDefault(); }}>Call contact</a><button className="icon-button" type="button" aria-label="Clear saved emergency contact" onClick={clearContact}><Trash2 aria-hidden="true" size={17} /></button></div> : <form className="contact-form" onSubmit={saveContact} noValidate><label className="visually-hidden" htmlFor="emergency-contact">Emergency contact phone number</label><input id="emergency-contact" type="tel" autoComplete="tel" value={draft} onChange={(event) => { setDraft(event.target.value); setContactError(""); }} placeholder="Phone number" aria-invalid={Boolean(contactError)} aria-describedby={contactError ? "contact-error" : undefined} /><button className="button button-quiet" type="submit" disabled={!draft.trim()}>Save on this device</button>{contactError && <p className="inline-error" id="contact-error" role="alert">{contactError}</p>}</form>}
      </section>

      <div className="disclaimer" role="note"><AlertTriangle aria-hidden="true" size={19} /><span><strong>A local alert is not a call for help.</strong> The audible tone and spoken instructions play only through this device. They do not notify responders, contacts, or nearby people through a network.</span></div>

      {confirming && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) cancelConfirmation(); }}><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" onKeyDown={(event) => {
        if (event.key === "Tab") {
          const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)')];
          if (focusable.length < 2) return;
          if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus(); }
          else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
        }
      }}><span className="feature-icon danger-feature"><ShieldAlert aria-hidden="true" size={22} /></span><h2 id="confirm-title">Choose an SOS action</h2><p id="confirm-description">No one has been contacted. Start a local device alert, or open your phone app for the saved contact.</p><button autoFocus className="button button-danger dialog-action" type="button" onClick={() => void startAlarm()}><BellRing aria-hidden="true" size={18} /> Start local audible alert</button>{contact && <a className="button dialog-action" href={telephoneHref} onClick={(event) => { if (!window.confirm(`Open your phone app to call ${contact}?`)) event.preventDefault(); else closeConfirmation(); }}><Phone aria-hidden="true" size={18} /> Open phone to call saved contact</a>}<button className="button button-quiet dialog-action" type="button" onClick={cancelConfirmation}>Cancel</button></section></div>}
    </div>
  );
}