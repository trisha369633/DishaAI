"use client";

import { useEffect, useRef, useState } from "react";

export type CameraState = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  active: boolean;
  pending: boolean;
  error: string | null;
  statusMessage: string;
  start: () => Promise<void>;
  stop: () => void;
};

export function useCamera(): CameraState {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  function stop() {
    const wasRequesting = pending;
    const wasActive = active || streamRef.current !== null;
    requestIdRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
    setPending(false);
    if (wasActive) setStatusMessage("Camera stopped.");
    else if (wasRequesting) setStatusMessage("Camera request cancelled.");
  }

  async function start() {
    setError(null);
    setStatusMessage("Requesting camera permission.");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is not supported in this browser. You can upload an image instead.");
      setStatusMessage("");
      return;
    }

    const requestId = ++requestIdRef.current;
    setPending(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      setStatusMessage("Camera is on. Capture a still image when ready.");
    } catch (cause) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStatusMessage("");
      const name = cause instanceof DOMException ? cause.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Camera permission was denied. Allow camera access in your browser settings, or upload an image instead.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("No compatible camera was found. Connect a camera or upload an image instead.");
      } else if (name === "NotReadableError" || name === "AbortError") {
        setError("The camera is in use by another app. Close it there and try again.");
      } else {
        setError("The camera could not be started. Check your browser permissions and try again.");
      }
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) setPending(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  return { videoRef, active, pending, error, statusMessage, start, stop };
}