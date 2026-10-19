"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Check, CircleStop, FileImage, ImagePlus, LoaderCircle, Pause, Play, RefreshCw, ScanEye, ShieldCheck, Trash2, Volume2, VolumeX } from "lucide-react";
import { useAccessibilityPreferences } from "@/components/accessibility/accessibility-provider";
import { useCamera } from "@/hooks/use-camera";
import { useSpeech } from "@/hooks/use-speech";
import { addScanHistory } from "@/lib/scan-history";
import { listenForVoiceActions, takePendingVoiceAction } from "@/lib/speech/voice-command-actions";
import type { ProviderName } from "@/lib/ai/config";
import type { AnalysisResult, Detection } from "@/lib/ai/types";
import { validateImageFile } from "@/lib/validation/image";

type ProviderStatus = "checking" | "ready" | "missing" | "unknown";
type ProviderAvailability = Record<ProviderName, boolean>;

function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Partial<AnalysisResult>;
  return (result.provider === "roboflow" || result.provider === "gemini") && typeof result.model === "string" && Array.isArray(result.detections)
    && result.detections.every((item) => typeof item.className === "string" && (item.confidence === undefined || typeof item.confidence === "number") && typeof item.description === "string");
}

function narrationFor(detections: Detection[]) {
  if (detections.length === 0) return "No objects were recognized by the configured model.";
  const prioritized = [...detections].sort((first, second) => Number(Boolean(second.hazardCategory)) - Number(Boolean(first.hazardCategory)));
  const descriptions = prioritized.slice(0, 4).map((item) => item.description);
  return `${descriptions.join(" ")} Please check your surroundings.`;
}

export default function Scanner() {
  const { videoRef, active: cameraActive, pending: cameraPending, error: cameraError, statusMessage: cameraStatus, start: startCamera, stop: stopCamera } = useCamera();
  const { preferences, updatePreference } = useAccessibilityPreferences();
  const speech = useSpeech();
  const uploadRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const selectedFileRef = useRef<File | null>(null);
  const cameraActiveRef = useRef(cameraActive);
  const startCameraRef = useRef(startCamera);
  const stopCameraRef = useRef(stopCamera);
  const scanByVoiceRef = useRef<() => void>(() => {});
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>("checking");
  const [providerAvailability, setProviderAvailability] = useState<ProviderAvailability>({ roboflow: false, gemini: false });
  const [selectedProvider, setSelectedProvider] = useState<ProviderName>("roboflow");
  const [providerMessage, setProviderMessage] = useState("");
  const [scanAnnouncement, setScanAnnouncement] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analyze", { cache: "no-store" })
      .then(async (response) => await response.json() as { provider?: ProviderName; providers?: Partial<ProviderAvailability> })
      .then((body) => {
        if (cancelled) return;
        const availability = {
          roboflow: body.providers?.roboflow === true,
          gemini: body.providers?.gemini === true,
        };
        const configuredDefault = body.provider === "gemini" || body.provider === "roboflow" ? body.provider : "roboflow";
        const activeProvider = availability[configuredDefault] ? configuredDefault : availability.gemini ? "gemini" : "roboflow";
        setProviderAvailability(availability);
        setSelectedProvider(activeProvider);
        setProviderStatus(availability[activeProvider] ? "ready" : "missing");
        if (activeProvider !== configuredDefault && availability[activeProvider]) {
          setProviderMessage(`${configuredDefault === "roboflow" ? "Roboflow needs a valid project/version model ID" : "Gemini is not configured"}. ${activeProvider === "gemini" ? "Gemini is selected" : "Roboflow is selected"}; the selected provider receives the image only when you analyze it.`);
        }
      })
      .catch(() => { if (!cancelled) setProviderStatus("unknown"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).get("mode") === "upload") setMode("upload");
      if (takePendingVoiceAction() === "scan") {
        setMode("camera");
        window.setTimeout(() => void startCameraRef.current(), 0);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => listenForVoiceActions((action) => {
    if (action !== "scan") return;
    scanByVoiceRef.current();
  }), []);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  function resetResult() {
    setResult(null);
    setError(null);
    speech.stop();
  }

  function chooseProvider(provider: ProviderName) {
    setSelectedProvider(provider);
    setProviderMessage("");
    resetResult();
  }

  function chooseFile(file: File | undefined) {
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    resetResult();
    setError(null);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = URL.createObjectURL(file);
    setPreviewUrl(previewUrlRef.current);
    setSelectedFile(file);
    selectedFileRef.current = file;
    if (uploadRef.current) uploadRef.current.value = "";
    stopCamera();
  }

  async function captureFrame(): Promise<File | null> {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("The camera image is not ready yet. Wait a moment and try again.");
      return null;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("This browser could not capture a camera image. You can upload a photo instead.");
      return null;
    }
    context.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) {
      setError("The camera image could not be captured. Try again or upload a photo.");
      return null;
    }
    const file = new File([blob], "dishaai-camera-capture.jpg", { type: "image/jpeg" });
    chooseFile(file);
    return file;
  }

  async function analyzeFile(file: File) {
    setBusy(true);
    setError(null);
    setScanAnnouncement("Analysis started.");
    speech.stop();
    try {
      const formData = new FormData();
      formData.set("image", file);
      formData.set("provider", selectedProvider);
      const response = await fetch("/api/analyze", { method: "POST", body: formData, cache: "no-store" });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "Image analysis failed. Try again.";
        if (typeof payload === "object" && payload !== null && "code" in payload && payload.code === "not_configured") {
          setProviderAvailability((current) => ({ ...current, [selectedProvider]: false }));
          setProviderStatus("missing");
        }
        setScanAnnouncement("");
        setError(message);
        return;
      }
      if (!isAnalysisResult(payload)) {
        setScanAnnouncement("");
        setError("The analysis service returned an unexpected response. Please try again.");
        return;
      }
      setResult(payload);
      addScanHistory(payload.detections.map((item) => item.className));
      const count = payload.detections.length;
      setScanAnnouncement(count === 0
        ? "Analysis complete. The model returned no recognized objects. Results are available below."
        : `Analysis complete. ${count} ${count === 1 ? "object was" : "objects were"} returned. Results are available below.`);
    } catch {
      setScanAnnouncement("");
      setError("Could not reach the analysis service. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function analyze() {
    if (!selectedFile) {
      setError("Choose or capture an image before starting analysis.");
      return;
    }
    void analyzeFile(selectedFile);
  }

  function removeImage() {
    stopCamera();
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    setSelectedFile(null);
    selectedFileRef.current = null;
    resetResult();
    if (uploadRef.current) uploadRef.current.value = "";
  }

  useEffect(() => {
    cameraActiveRef.current = cameraActive;
    startCameraRef.current = startCamera;
    stopCameraRef.current = stopCamera;
    scanByVoiceRef.current = () => {
      setMode("camera");
      if (cameraActiveRef.current) {
        void captureFrame().then((file) => { if (file) void analyzeFile(file); });
      } else if (selectedFileRef.current) {
        void analyzeFile(selectedFileRef.current);
      } else {
        void startCameraRef.current();
      }
    };
  });

  const orderedDetections = result ? [...result.detections].sort((first, second) => Number(Boolean(second.hazardCategory)) - Number(Boolean(first.hazardCategory))) : [];

  return (
    <div>
      <div className="page-heading">
        <div><span className="eyebrow">On-demand object detection</span><h1>Environment scanner</h1><p>Choose a still image to identify objects supported by your configured model. The scanner does not assess whether a path is safe.</p></div>
        <div className="provider-controls">
          <label className="provider-select-label" htmlFor="analysis-provider">Image analysis provider</label>
          <select id="analysis-provider" value={selectedProvider} onChange={(event) => chooseProvider(event.target.value as ProviderName)} disabled={providerStatus === "checking" || providerStatus === "unknown"}>
            <option value="roboflow" disabled={!providerAvailability.roboflow}>Roboflow hosted model{providerAvailability.roboflow ? "" : " (needs project/version ID)"}</option>
            <option value="gemini" disabled={!providerAvailability.gemini}>Gemini image analysis{providerAvailability.gemini ? "" : " (not configured)"}</option>
          </select>
          <div className={`provider-badge ${providerStatus}`} role="status">
            <span className="provider-indicator" aria-hidden="true" />
            {providerStatus === "ready" ? `${selectedProvider === "gemini" ? "Gemini" : "Roboflow"} ready` : providerStatus === "checking" ? "Checking model setup" : providerStatus === "missing" ? "No configured provider" : "Provider status unavailable"}
          </div>
        </div>
      </div>
      {providerMessage && <p className="provider-message" role="status">{providerMessage}</p>}
      <p className="visually-hidden" role="status" aria-atomic="true">{scanAnnouncement}</p>

      <div className="scanner-layout">
        <section className="surface scanner-workspace" aria-labelledby="scanner-input-title">
          <div className="scanner-tabs" role="group" aria-label="Image source">
            <button id="camera-tab" className="scanner-tab" type="button" aria-pressed={mode === "camera"} onClick={() => { setMode("camera"); resetResult(); }}><Camera aria-hidden="true" size={17} /> Camera</button>
            <button id="upload-tab" className="scanner-tab" type="button" aria-pressed={mode === "upload"} onClick={() => { setMode("upload"); stopCamera(); resetResult(); }}><FileImage aria-hidden="true" size={17} /> Upload image</button>
          </div>
          <div className="scanner-panel" id="scanner-panel">
            <h2 id="scanner-input-title">{selectedFile ? "Image ready for analysis" : mode === "camera" ? "Capture a still frame" : "Choose an image"}</h2>
            {!selectedFile && mode === "camera" && (
              <div className="camera-stage">
                <video ref={videoRef} className={`camera-preview${cameraActive ? "" : " camera-preview-hidden"}`} autoPlay playsInline muted aria-label="Live camera preview" />
                {!cameraActive && !cameraPending && <div className="camera-placeholder"><Camera aria-hidden="true" size={38} /><span>Your camera stays off until you start it.</span></div>}
                {cameraPending && <div className="camera-loading" aria-hidden="true"><LoaderCircle aria-hidden="true" className="spin" /> Starting camera…</div>}
              </div>
            )}
            {!selectedFile && mode === "upload" && (
              <button className="upload-dropzone" type="button" onClick={() => uploadRef.current?.click()}>
                <span className="feature-icon"><ImagePlus aria-hidden="true" size={23} /></span>
                <strong>Select an image</strong>
                <span>JPEG, PNG, or WebP · up to 8 MB</span>
              </button>
            )}
            {selectedFile && previewUrl && (
              <div className="image-stage">
                <Image src={previewUrl} alt="Selected image for environment analysis" fill unoptimized sizes="(max-width: 800px) 100vw, 800px" />
                {result?.detections.map((item, index) => item.boundingBox && (
                  <div key={`${item.className}-${index}`} className="detection-box" style={{ left: `${item.boundingBox.x * 100}%`, top: `${item.boundingBox.y * 100}%`, width: `${item.boundingBox.width * 100}%`, height: `${item.boundingBox.height * 100}%` }}>
                    <span>{item.className}</span>
                  </div>
                ))}
              </div>
            )}
            <canvas ref={canvasRef} className="visually-hidden" aria-hidden="true" />
            <input ref={uploadRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" aria-hidden="true" tabIndex={-1} onChange={(event) => chooseFile(event.target.files?.[0])} />

            {mode === "camera" && !selectedFile && (
              <div className="scanner-controls">
                {!cameraActive ? <button className="button button-primary" type="button" onClick={() => void startCamera()} disabled={cameraPending}><Camera aria-hidden="true" size={17} /> {cameraPending ? "Starting camera…" : "Start camera"}</button> : <><button className="button button-primary" type="button" onClick={() => void captureFrame()}><ScanEye aria-hidden="true" size={17} /> Capture still</button><button className="button button-quiet" type="button" onClick={stopCamera}><CircleStop aria-hidden="true" size={17} /> Stop camera</button></>}
              </div>
            )}
            {mode === "upload" && !selectedFile && <div className="scanner-controls"><button className="button button-primary" type="button" onClick={() => uploadRef.current?.click()}><ImagePlus aria-hidden="true" size={17} /> Choose image</button></div>}
            {selectedFile && <div className="scanner-controls"><button className="button button-quiet" type="button" onClick={() => uploadRef.current?.click()}><RefreshCw aria-hidden="true" size={16} /> Replace</button><button className="button button-quiet" type="button" onClick={removeImage}><Trash2 aria-hidden="true" size={16} /> Remove</button><button className="button button-primary" type="button" onClick={() => void analyze()} disabled={busy || providerStatus === "checking" || !providerAvailability[selectedProvider]}><ScanEye aria-hidden="true" size={17} /> {busy ? "Analyzing…" : "Analyze environment"}</button></div>}

            <p className="visually-hidden" role="status" aria-atomic="true">{cameraStatus}</p>
            <p className="camera-privacy"><ShieldCheck aria-hidden="true" size={15} /> Camera permission is requested only when you start it. A captured image is sent to {selectedProvider === "gemini" ? "Google Gemini" : "Roboflow"} only after you activate Analyze or say Scan again while the camera is active.</p>
            {cameraError && <p className="inline-error" role="alert">{cameraError}</p>}
            {error && <p className="inline-error" role="alert"><AlertTriangle aria-hidden="true" size={17} /> {error}</p>}
            {providerStatus === "missing" && <div className="setup-note"><strong>Image analysis is not configured.</strong><span>Configure GEMINI_API_KEY, or configure ROBOFLOW_API_KEY with a ROBOFLOW_MODEL_ID in project/version format. See <a href="/about" className="inline-link">provider setup</a>.</span></div>}
          </div>
        </section>

        <section className="surface results-panel" aria-labelledby="results-title" aria-busy={busy}>
          <div className="results-heading"><div><span className="eyebrow">Model output</span><h2 id="results-title">Scan results</h2></div>{result && <span className="result-count">{result.detections.length} recognized</span>}</div>
          {!result && <div className="results-empty"><span className="feature-icon"><ScanEye aria-hidden="true" size={22} /></span><p>Choose or capture an image to begin. Results will appear here after you request analysis.</p></div>}
          {result && <>
            {result.detections.length === 0 ? <p className="empty-detections"><Check aria-hidden="true" size={18} /> No objects were recognized by this model. This does not confirm that the image contains no objects.</p> : <>
              {orderedDetections.some((item) => item.hazardCategory) && <div className="result-group"><h3>Road-user labels to review</h3><p>These are model labels only; they do not indicate distance, movement, or collision risk.</p>{orderedDetections.filter((item) => item.hazardCategory).map((item, index) => <DetectionRow key={`road-${index}`} detection={item} />)}</div>}
              {orderedDetections.some((item) => !item.hazardCategory) && <div className="result-group"><h3>Other recognized objects</h3>{orderedDetections.filter((item) => !item.hazardCategory).map((item, index) => <DetectionRow key={`object-${index}`} detection={item} />)}</div>}
            </>}
            <div className="speech-controls" role="group" aria-label="Spoken result controls">
              <button className="button button-quiet" type="button" onClick={() => { updatePreference("voiceGuidance", true); speech.speak(narrationFor(result.detections), preferences.speechRate, preferences.speechLanguage, preferences.speechVoice); }}><Volume2 aria-hidden="true" size={17} /> Speak results</button>
              <button className="button button-quiet" type="button" onClick={() => { if (!speech.repeat()) setError("Nothing has been spoken yet. Use Speak results first."); }}><Volume2 aria-hidden="true" size={16} /> Repeat last spoken</button>
              <button className="button button-quiet" type="button" disabled={!orderedDetections.some((item) => item.hazardCategory)} onClick={() => { updatePreference("voiceGuidance", true); speech.speak(orderedDetections.some((item) => item.hazardCategory) ? narrationFor(orderedDetections.filter((item) => item.hazardCategory)) : "", preferences.speechRate, preferences.speechLanguage, preferences.speechVoice); }}><AlertTriangle aria-hidden="true" size={16} /> Repeat warning</button>
              {speech.status === "paused" ? <button className="button button-quiet" type="button" onClick={speech.resume}><Play aria-hidden="true" size={16} /> Resume speaking</button> : <button className="button button-quiet" type="button" onClick={speech.pause} disabled={speech.status !== "speaking"}><Pause aria-hidden="true" size={16} /> Pause speaking</button>}
              <button className="button button-quiet" type="button" onClick={speech.stop} disabled={speech.status !== "speaking" && speech.status !== "paused"}><VolumeX aria-hidden="true" size={16} /> Stop speaking</button>
              {(speech.status === "unsupported" || speech.status === "error") && <span className="speech-status" role="alert">{speech.status === "unsupported" ? "Speech synthesis is unavailable. Results remain available as text." : "Speech could not be played. Results remain available as text."}</span>}
              {speech.status === "speaking" && <span className="speech-status" aria-live="off">Speaking</span>}
            </div>
            <button className="button button-quiet scan-again" type="button" onClick={removeImage}><RefreshCw aria-hidden="true" size={16} /> Scan another image</button>
            <p className="result-model">Model: {result.model} · Provider: {result.provider === "gemini" ? "Google Gemini" : "Roboflow"}</p>
          </>}
        </section>
      </div>
    </div>
  );
}

function DetectionRow({ detection }: { detection: Detection }) {
  return (
    <div className="detection-row">
      <div><strong>{detection.className}</strong><span>{detection.description}</span></div>
      <span className="confidence-value">{typeof detection.confidence === "number" ? `${Math.round(detection.confidence * 100)}% confidence` : "Confidence not provided"}</span>
    </div>
  );
}
