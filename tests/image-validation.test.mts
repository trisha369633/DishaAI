import assert from "node:assert/strict";
import test from "node:test";
import { imageTypeFromBytes, normalizeGeminiObject } from "../lib/ai/provider.ts";
import { parseVoiceCommand, voiceCommandMessages } from "../lib/speech/voice-command-engine.ts";
import { welcomeGreeting } from "../lib/speech/speech-engine.ts";
import { validateImageFile } from "../lib/validation/image.ts";

test("accepts supported image formats under the size limit", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    assert.equal(validateImageFile(new File(["image"], "test", { type })), null);
  }
});

test("rejects unsupported, empty, and oversized files", () => {
  assert.match(validateImageFile(new File(["image"], "test.svg", { type: "image/svg+xml" })) ?? "", /JPEG, PNG, or WebP/);
  assert.match(validateImageFile(new File([], "empty.png", { type: "image/png" })) ?? "", /empty/);
  assert.match(validateImageFile(new File([new Uint8Array(8 * 1024 * 1024 + 1)], "large.png", { type: "image/png" })) ?? "", /8 MB/);
});

test("checks file signatures instead of trusting declared image types", () => {
  assert.equal(imageTypeFromBytes(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg"), true);
  assert.equal(imageTypeFromBytes(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"), true);
  assert.equal(imageTypeFromBytes(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]), "image/webp"), true);
  assert.equal(imageTypeFromBytes(Uint8Array.from([1, 2, 3]), "image/png"), false);
});

test("normalizes Gemini boxes without fabricating a confidence score", () => {
  const detection = normalizeGeminiObject({
    label: "chair",
    box_2d: { ymin: 100, xmin: 200, ymax: 500, xmax: 600 },
  });
  assert.deepEqual(detection?.boundingBox, { x: 0.2, y: 0.1, width: 0.4, height: 0.4 });
  assert.equal(detection?.confidence, undefined);
  assert.equal(detection?.description, "chair detected near the center of the image.");
});

test("rejects invalid Gemini box coordinates", () => {
  assert.equal(normalizeGeminiObject({
    label: "object",
    box_2d: { ymin: -1, xmin: 0, ymax: 10, xmax: 10 },
  }), null);
  assert.equal(normalizeGeminiObject({
    label: "object",
    box_2d: { ymin: 500, xmin: 0, ymax: 100, xmax: 10 },
  }), null);
});

test("maps English, Bangla, and Hindi voice commands", () => {
  assert.equal(parseVoiceCommand("Start scanning!"), "scan");
  assert.equal(parseVoiceCommand("Scanner"), "scanner");
  assert.equal(parseVoiceCommand("স্ক্যানার"), "scanner");
  assert.equal(parseVoiceCommand("Safety"), "safety");
  assert.equal(parseVoiceCommand("সেফটি"), "safety");
  assert.equal(parseVoiceCommand("সাহায্য"), "safety");
  assert.equal(parseVoiceCommand("Dashboard"), "dashboard");
  assert.equal(parseVoiceCommand("ড্যাশবোর্ড"), "dashboard");
  assert.equal(parseVoiceCommand("Home"), "home");
  assert.equal(parseVoiceCommand("শুরু"), "scan");
  assert.equal(parseVoiceCommand("शुरू"), "scan");
  assert.equal(parseVoiceCommand("আবার বলো"), "repeat");
  assert.equal(parseVoiceCommand("दोहराओ"), "repeat");
  assert.equal(parseVoiceCommand("থামো"), "stop");
  assert.equal(parseVoiceCommand("रुको"), "stop");
  assert.equal(parseVoiceCommand("জরুরি"), "emergency");
  assert.equal(parseVoiceCommand("मदद"), "emergency");
  assert.equal(parseVoiceCommand("অচেনা কথা"), null);
});

test("provides a welcome greeting in English, Bangla, and Hindi", () => {
  assert.match(welcomeGreeting("en-US", "Dashboard"), /You are on Dashboard\. Say Scanner, Safety, Dashboard, or Home to navigate hands-free\./);
  assert.match(welcomeGreeting("bn-BD"), /স্বাগতম/);
  assert.match(welcomeGreeting("hi-IN"), /स्वागत/);
});

test("localizes voice command prompts and recovery messages", () => {
  assert.match(voiceCommandMessages("bn-BD").listening, /সেফটি/);
  assert.match(voiceCommandMessages("bn-BD").unknown, /বোঝা যায়নি/);
  assert.match(voiceCommandMessages("hi-IN").listening, /मदद/);
  assert.match(voiceCommandMessages("hi-IN").denied, /अनुमति/);
  assert.match(voiceCommandMessages("en-US").unknown, /not recognized/);
});