import type { Metadata } from "next";
import { AlertTriangle, ExternalLink, Eye, KeyRound, ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "About DishaAI" };

export default function AboutPage() {
  return (
    <div>
      <div className="page-heading"><div><span className="eyebrow">International AI Builders Congress · Smart Cities & Accessibility</span><h1>About DishaAI</h1><p>A prototype exploring how on-demand object detection and spoken descriptions can support access to visual context.</p></div></div>
      <section className="about-intro surface surface-pad"><span className="feature-icon"><Eye aria-hidden="true" size={21} /></span><div><h2>Assistive context, not automated judgment.</h2><p>DishaAI accepts a still image only after a user action, sends it to a configured object-detection provider, and presents the labels, confidence values, and image regions the model returns. It does not infer a safe route or replace mobility tools, orientation support, or personal judgment.</p></div></section>

      <section className="about-section" aria-labelledby="configure-title">
        <div className="section-heading"><div><span className="eyebrow">Server-side provider setup</span><h2 id="configure-title">Connect image analysis</h2></div></div>
        <ol className="config-steps">
          <li><span>1</span><div><h3>Choose a provider in the scanner</h3><p>Roboflow returns model labels, confidence, and boxes. Gemini returns image object labels and boxes, but does not provide a confidence score here. Either provider can be selected before an image is analyzed.</p></div></li>
          <li><span>2</span><div><h3>Configure Gemini</h3><p>Set <code>GEMINI_API_KEY</code> on the server. DishaAI uses the stable <code>gemini-3.8-flash</code> model. The key is sent only to Google from the server.</p></div></li>
          <li><span>3</span><div><h3>Configure Roboflow</h3><p>Set <code>ROBOFLOW_API_KEY</code> and a deployed model ID in <code>project/version</code> format. A single project slug is not a complete model ID. The model’s own class list defines what it can recognize.</p></div></li>
          <li><span>4</span><div><h3>Keep credentials server-side</h3><p>Copy <code>.env.example</code> to <code>.env.local</code> only if needed. Keep all keys out of client code and <code>NEXT_PUBLIC_*</code> variables. <code>AI_PROVIDER</code> selects the initial preferred provider; the scanner uses the provider selected for that request.</p></div></li>
        </ol>
        <a className="button button-quiet" href="https://docs.roboflow.com/deploy/hosted-api" target="_blank" rel="noreferrer"><KeyRound aria-hidden="true" size={17} /> Roboflow hosted API documentation <ExternalLink aria-hidden="true" size={15} /></a>
        <a className="button button-quiet" href="https://ai.google.dev/gemini-api/docs/image-understanding" target="_blank" rel="noreferrer"><KeyRound aria-hidden="true" size={17} /> Gemini image understanding documentation <ExternalLink aria-hidden="true" size={15} /></a>
      </section>

      <section className="about-section" aria-labelledby="privacy-title">
        <div className="section-heading"><div><span className="eyebrow">Privacy & data flow</span><h2 id="privacy-title">Explicit requests, limited local storage</h2></div></div>
        <div className="privacy-grid">
          <article><ShieldCheck aria-hidden="true" size={21} /><h3>Images</h3><p>Camera access starts only after activation. A still image is sent to the selected provider only after you activate Analyze or say Scan again while the camera is active. DishaAI does not store image files.</p></article>
          <article><KeyRound aria-hidden="true" size={21} /><h3>Preferences & history</h3><p>Accessibility preferences and scan labels/timestamps stay in local browser storage. No image, location, account, or analytics data is collected by this MVP.</p></article>
        </div>
        <p className="text-muted text-small">The external provider’s handling and retention of requests depends on the provider, account, and deployment terms you select. Review those terms before using sensitive images.</p>
      </section>

      <section className="disclaimer about-disclaimer" role="note"><AlertTriangle aria-hidden="true" size={19} /><span><strong>Safety limitation:</strong> Object detection can be incomplete or wrong. Confidence is the model’s score, not a probability that a description is correct. A single image cannot establish distance, motion, collision risk, or a safe direction. Do not rely on DishaAI as a guarantee of safe navigation or as an emergency service.</span></section>
    </div>
  );
}