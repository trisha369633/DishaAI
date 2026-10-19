import Link from "next/link";
import { AlertTriangle, ArrowDown, ArrowRight, AudioLines, Eye, ScanEye, ShieldCheck } from "lucide-react";
import FirstUseGuide from "@/components/accessibility/first-use-guide";
import WelcomeGreeting from "@/components/accessibility/welcome-greeting";

export default function Home() {
  return (
    <>
      <WelcomeGreeting />
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow">Visual assistance, at your pace</span>
          <h1 id="hero-title">See Your Surroundings.<br /><em>Hear Your Next Step.</em></h1>
          <p>DishaAI turns a photo of your surroundings into a spoken description of objects the model can recognize, helping you pause, listen, and make your own informed choices.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/scanner"><ScanEye aria-hidden="true" size={18} /> Start scanning <ArrowRight aria-hidden="true" size={17} /></Link>
            <Link className="button" href="#features">Explore features <ArrowDown aria-hidden="true" size={16} /></Link>
          </div>
          <div className="hero-note"><ShieldCheck aria-hidden="true" size={17} /> Nothing is analyzed until you choose an image and start a scan.</div>
        </div>
        <div className="hero-visual" aria-label="Illustration of an image analysis frame">
          <div className="visual-image" role="img" aria-label="City buildings illuminated after dusk">
            <div className="visual-overlay" />
            <span className="scan-corner top-left" /><span className="scan-corner top-right" />
            <span className="scan-corner bottom-left" /><span className="scan-corner bottom-right" />
            <div className="visual-topline"><span className="live-dot" /> User-initiated scan</div>
            <div className="visual-readout" aria-hidden="true" />
            <div className="visual-caption"><small>Pause. Listen. Decide.</small><h2>Information that supports your next choice.</h2></div>
          </div>
        </div>
      </section>
      <FirstUseGuide />
      <section className="section" id="features" aria-labelledby="features-title">
        <div className="section-heading">
          <div><span className="eyebrow">Designed around agency</span><h2 id="features-title">A little more context.<br />A choice that stays yours.</h2></div>
          <p>Every scan starts with you. DishaAI describes what its configured model detects without claiming to know what is safe or what you should do.</p>
        </div>
        <div className="feature-grid">
          <article className="feature-item"><span className="feature-icon"><Eye aria-hidden="true" size={21} /></span><h3>AI vision</h3><p>On-demand object detection through a replaceable server-side model. No sample detections presented as real results.</p></article>
          <article className="feature-item"><span className="feature-icon"><AudioLines aria-hidden="true" size={21} /></span><h3>Voice guidance</h3><p>Listen to actual scan results at a rate and voice supported by your browser. Replay or stop narration whenever you choose.</p></article>
          <article className="feature-item"><span className="feature-icon"><ShieldCheck aria-hidden="true" size={21} /></span><h3>Safety tools</h3><p>A local audible alert and optional saved contact shortcut, both behind deliberate confirmation. No automatic emergency calls.</p></article>
        </div>
      </section>
      <section className="section" aria-labelledby="steps-title">
        <div className="section-heading"><div><span className="eyebrow">How it works</span><h2 id="steps-title">Your image. Your request. Your pace.</h2></div></div>
        <div className="steps">
          <article className="step"><span className="step-number">01 / Choose</span><h3>Start with a camera or image</h3><p>Camera access waits for your request. Uploaded images stay in the browser until you tap Analyze.</p></article>
          <article className="step"><span className="step-number">02 / Review</span><h3>See what the model returned</h3><p>Recognized labels and scores are shown as model output, not as a guarantee of complete or accurate perception.</p></article>
          <article className="step"><span className="step-number">03 / Listen</span><h3>Choose what helps</h3><p>Replay a concise description, adjust accessibility settings, or clear local scan history at any time.</p></article>
        </div>
        <div className="disclaimer" role="note"><AlertTriangle aria-hidden="true" size={19} /><span><strong>Assistive prototype, not a navigation system.</strong> DishaAI can miss objects or describe them incorrectly. It does not measure distance, detect motion reliably, identify a safe route, or replace a mobility aid, trained orientation support, or your own judgment.</span></div>
      </section>
    </>
  );
}