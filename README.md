# DishaAI

DishaAI is an accessibility-first visual assistance prototype for the International AI Builders Congress Smart Cities & Accessibility track. It lets someone request object detection for a still image, review labels and model confidence, and optionally hear the returned descriptions using the browser's speech engine.

> **Safety:** DishaAI is not a navigation system and cannot guarantee safe travel. It may miss or misidentify objects. It does not establish distance, motion, collision risk, or a safe direction. Keep using familiar mobility aids and support.

## Features

- Responsive landing page and shared navigation across `/`, `/dashboard`, `/scanner`, `/safety`, `/settings`, and `/about`.
- Camera access starts only after the Start camera action; tracks are stopped when the camera is stopped, a still is captured, the source changes, or the scanner unmounts.
- JPEG, PNG, and WebP uploads with an 8 MB limit, signature checks on the server, preview, replacement, and removal.
- Server-side Roboflow Serverless Cloud and Gemini image-analysis adapters, selectable in the scanner. No credentials or sample detections are built into the client.
- Roboflow returns its model labels, confidence values, and boxes. Gemini returns structured labels and boxes without a confidence score; the UI does not invent one.
- Browser SpeechSynthesis controls, including voice/language selection from installed browser voices, rate, replay, pause/resume, and stop.
- Optional, user-started SpeechRecognition commands: Scan, Repeat, Stop, and Emergency in English (`en-US`), Bangla (`bn-BD`), and Hindi (`hi-IN`). The recognition button is disabled if the browser exposes neither `SpeechRecognition` nor `webkitSpeechRecognition`.
- A user-gesture/settings-gated welcome greeting on the landing page and dashboard. Camera and microphone never start automatically.
- Optional browser-native voice commands for Scan, Repeat, Stop, and Emergency in English, Bangla, and Hindi. Listening starts only after the user activates Start voice commands; each command also has a button equivalent.
- A welcome greeting is spoken only when spoken guidance is enabled and the browser reports a prior user gesture. The Hear welcome button is always available as an explicit action.
- Confirmed SOS actions: a cancellable local tone and an optional saved contact that opens the device phone handler after confirmation. Neither action contacts responders automatically.
- Persistent accessibility preferences; scan history stores only labels and timestamps in local storage and can be cleared.

## Technology

- Next.js App Router, TypeScript with strict checking, React, Tailwind CSS 4, and Lucide React.
- Browser MediaDevices, SpeechSynthesis, and feature-detected SpeechRecognition APIs.
- Next.js Route Handler at `app/api/analyze/route.ts`.
- Node's built-in test runner for image validation tests.

## Prerequisites

- Node.js 22 or newer (Node 24 recommended).
- npm.
- A modern browser. Camera use requires `localhost` or HTTPS and user permission.
- A Gemini API key or a Roboflow API key plus deployed model ID to enable image analysis. These are not required to run the UI.

## Install and run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The scanner reports which providers are configured. Without either provider, analysis returns an explicit not-configured message and does not generate sample detections.

## Configure image providers

Choose either or both providers. The scanner lets you select among configured providers; `AI_PROVIDER` only sets the initial preference.

For Gemini, create an API key in [Google AI Studio](https://aistudio.google.com/apikey) and add:

```dotenv
GEMINI_API_KEY=your_server_side_key
```

The Gemini adapter uses the stable `gemini-3.8-flash` model and structured image-object labels/boxes. Gemini does not return a confidence value through this adapter, so the UI reports that no confidence was provided.

For Roboflow, select a hosted object-detection model and use the deployed model ID in `project/version` format:

```dotenv
ROBOFLOW_API_KEY=your_server_side_key
ROBOFLOW_MODEL_ID=your-project/1
```

The current local value `ROBOFLOW_MODEL_ID=dishaai` is only a project slug, not a complete Roboflow model ID, so that provider remains unavailable until you replace it with the deployed `project/version` value. This does not block Gemini.

Set the preferred provider if desired, then restart `npm run dev`:

```dotenv
AI_PROVIDER=gemini
```

The Roboflow adapter calls `https://serverless.roboflow.com/<project>/<version>` and sends the key in an `Authorization: Bearer` header. Gemini sends its key in the `x-goog-api-key` header. Both calls originate on the server; never use a `NEXT_PUBLIC_` prefix, commit `.env.local`, or send credentials to the browser. `.env.example` contains placeholders only.

The selected provider receives an image only after **Analyze environment** is activated or the user says **Scan** again while the camera is active. DishaAI does not save image files. Provider-side handling and retention depend on the provider and account terms; review those terms before sending sensitive images. The app caps images at 8 MB and provider calls at 20 seconds.

Provider references: [Roboflow Serverless Cloud API](https://docs.roboflow.com/deploy/hosted-api) and [Gemini image understanding](https://ai.google.dev/gemini-api/docs/image-understanding).

## Verify

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

The tests cover accepted image types, empty/oversized/unsupported files, and JPEG/PNG/WebP binary signatures. Camera permission, provider-backed inference, installed speech voices, and outbound contact behavior depend on the browser and your local/provider configuration and should be manually checked on the intended device.

The command parser is unit-tested for the listed English, Bangla, and Hindi phrases. Browser automation with a mocked recognition engine covers opt-in listening and routing; it does not verify live microphone transcription. Actual voice recognition requires a browser exposing `SpeechRecognition` or `webkitSpeechRecognition`; availability, language models, microphone permission, and whether recognition audio is processed by the browser vendor vary by browser and device. The app feature-detects support and leaves the control disabled when unavailable. No recognition session starts automatically.

## Deploy to Vercel

1. Push the project to a Git provider and import it into Vercel, or deploy using the Vercel CLI.
2. In Vercel project settings, add `AI_PROVIDER` and the credentials/model IDs for the provider(s) you intend to use: `GEMINI_API_KEY`, and/or `ROBOFLOW_API_KEY` plus `ROBOFLOW_MODEL_ID`.
3. Deploy or redeploy after changing environment variables. Do not add the API key as a `NEXT_PUBLIC_*` variable.
4. Test the deployed scanner with a non-sensitive image and confirm the configured model returns its expected schema.

No database, user account, analytics integration, or emergency-service integration is included.

## Known limitations

- Real image analysis is not available until at least one provider is configured. Gemini labels/boxes and Roboflow model output can be inaccurate; Roboflow confidence is its model score, not a calibrated probability. Gemini confidence is not fabricated.
- The scanner analyzes still images only. Camera preview frames are not sent automatically, and this app does not continuously monitor a video stream.
- Relative position is a coarse location inside the image, not a statement that an object is ahead, near, moving, or dangerous.
- Browser speech voices and supported controls vary. If SpeechSynthesis is unavailable, results remain visible.
- Speech recognition support and Bangla/Hindi recognition quality depend on the browser, operating system, installed recognition services, and microphone permission. Voice command tests use the parser and mocked browser APIs; they do not certify live recognition on a device.
- The welcome greeting is spoken only when spoken guidance is enabled and browser user activation is present, or after the explicit Hear welcome action. Device screen-reader voices and browser-installed TTS voices differ.
- SOS sounds only on this device. Calling a saved contact opens the device phone app after explicit confirmation; DishaAI cannot confirm whether a call connects.
- Scan labels, timestamps, preferences, and an optional contact are stored in local browser storage. They are not encrypted by this app; clear them on shared devices.
- Test coverage is intentionally focused on utility validation. Camera hardware, third-party inference, screen readers, and phone handlers require manual device testing.

## Project structure

```text
app/
  about/page.tsx
  api/analyze/route.ts
  dashboard/page.tsx
  scanner/page.tsx
  safety/page.tsx
  settings/page.tsx
  globals.css
  layout.tsx
  page.tsx
components/
  accessibility/
  dashboard/
  layout/
  safety/
  scanner/
hooks/
lib/
  ai/
  speech/
  validation/
tests/
public/
.env.example
```

## Manual next steps

- Add your own Gemini API key and/or a Roboflow key with a complete deployed model ID to `.env.local` and Vercel's server-side environment settings.
- Replace the current Roboflow project-only value `dishaai` with its deployed `project/version` ID if you want to use Roboflow.
- Review model capabilities and the selected provider's image-handling terms.
- Test camera permission, speech voices, keyboard/screen-reader behavior, and the SOS phone handoff on the target devices before any real-world use.# DishaAI
