import type { AnalysisResult, Detection, RelativePosition } from "@/lib/ai/types";
import type { ProviderConfiguration } from "@/lib/ai/config";

const timeoutMs = 20_000;
const roadUserClasses = new Set(["person", "bicycle", "car", "motorcycle", "bus", "truck"]);

type RoboflowPrediction = {
  class: unknown;
  confidence: unknown;
  x?: unknown;
  y?: unknown;
  width?: unknown;
  height?: unknown;
};

type RoboflowResponse = {
  predictions?: unknown;
  image?: { width?: unknown; height?: unknown };
};

export class ProviderError extends Error {
  readonly kind: "timeout" | "provider_error";

  constructor(message: string, kind: "timeout" | "provider_error" = "provider_error") {
    super(message);
    this.kind = kind;
  }
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getPosition(centerX: number): RelativePosition {
  if (centerX < 0.38) return "left";
  if (centerX > 0.62) return "right";
  return "center";
}

function normalizePrediction(prediction: RoboflowPrediction, imageWidth?: number, imageHeight?: number): Detection | null {
  if (typeof prediction.class !== "string" || !prediction.class.trim()) return null;
  if (!isNumber(prediction.confidence) || prediction.confidence < 0 || prediction.confidence > 1) return null;

  const className = prediction.class.trim();
  let boundingBox: Detection["boundingBox"];
  let relativePosition: RelativePosition | undefined;
  if (
    isNumber(prediction.x) && isNumber(prediction.y) && isNumber(prediction.width) && isNumber(prediction.height)
    && prediction.width > 0 && prediction.height > 0 && imageWidth && imageHeight
  ) {
    const x = Math.max(0, Math.min(1, (prediction.x - prediction.width / 2) / imageWidth));
    const y = Math.max(0, Math.min(1, (prediction.y - prediction.height / 2) / imageHeight));
    boundingBox = {
      x,
      y,
      width: Math.max(0, Math.min(1 - x, prediction.width / imageWidth)),
      height: Math.max(0, Math.min(1 - y, prediction.height / imageHeight)),
    };
    relativePosition = getPosition(Math.max(0, Math.min(1, prediction.x / imageWidth)));
  }
  const hazardCategory = roadUserClasses.has(className.toLowerCase()) ? "road-user" as const : undefined;
  const location = relativePosition === "center"
    ? " near the center of the image"
    : relativePosition ? ` on the ${relativePosition} side of the image` : "";

  return {
    className,
    confidence: prediction.confidence,
    ...(boundingBox ? { boundingBox } : {}),
    ...(hazardCategory ? { hazardCategory } : {}),
    ...(relativePosition ? { relativePosition } : {}),
    description: `${className} detected${location}.`,
  };
}

export async function analyzeWithRoboflow(
  image: Uint8Array,
  configuration: ProviderConfiguration,
  contentType: string,
): Promise<AnalysisResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const modelId = configuration.modelId.split("/").map(encodeURIComponent).join("/");
  const endpoint = `https://serverless.roboflow.com/${modelId}`;
  const formData = new FormData();
  formData.set("file", new Blob([Uint8Array.from(image).buffer], { type: contentType }), "image");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${configuration.apiKey}` },
      body: formData,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) throw new ProviderError("The vision provider could not analyze this image.");
    let payload: RoboflowResponse;
    try {
      payload = await response.json() as RoboflowResponse;
    } catch {
      throw new ProviderError("The vision provider returned an unreadable response.");
    }

    if (!Array.isArray(payload.predictions)) throw new ProviderError("The vision provider returned an unexpected response.");
    const imageWidth = isNumber(payload.image?.width) ? payload.image.width : undefined;
    const imageHeight = isNumber(payload.image?.height) ? payload.image.height : undefined;
    const detections = payload.predictions.map((entry) => {
      if (typeof entry !== "object" || entry === null) {
        throw new ProviderError("The vision provider returned an unexpected response.");
      }
      const detection = normalizePrediction(entry as RoboflowPrediction, imageWidth, imageHeight);
      if (!detection) throw new ProviderError("The vision provider returned an unexpected response.");
      return detection;
    });

    return {
      provider: "roboflow",
      model: configuration.modelId,
      ...(imageWidth ? { imageWidth } : {}),
      ...(imageHeight ? { imageHeight } : {}),
      detections: detections.map((detection) => ({
        ...detection,
        ...(detection.boundingBox ? {
          boundingBox: {
            x: detection.boundingBox.x,
            y: detection.boundingBox.y,
            width: detection.boundingBox.width,
            height: detection.boundingBox.height,
          },
        } : {}),
      })),
    };
  } catch (error) {
    if (controller.signal.aborted) throw new ProviderError("The vision provider timed out. Try a smaller image.", "timeout");
    if (error instanceof ProviderError) throw error;
    throw new ProviderError("Could not reach the vision provider. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
}

type GeminiObject = {
  label?: unknown;
  box_2d?: { ymin?: unknown; xmin?: unknown; ymax?: unknown; xmax?: unknown };
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: unknown }> };
    finishReason?: string;
  }>;
};

const geminiDetectionSchema = {
  type: "OBJECT",
  properties: {
    objects: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          label: { type: "STRING" },
          box_2d: {
            type: "OBJECT",
            properties: {
              ymin: { type: "INTEGER" },
              xmin: { type: "INTEGER" },
              ymax: { type: "INTEGER" },
              xmax: { type: "INTEGER" },
            },
            required: ["ymin", "xmin", "ymax", "xmax"],
          },
        },
        required: ["label", "box_2d"],
      },
    },
  },
  required: ["objects"],
};

export function normalizeGeminiObject(value: unknown): Detection | null {
  if (typeof value !== "object" || value === null) return null;
  const item = value as GeminiObject;
  const box = item.box_2d;
  if (typeof item.label !== "string" || !item.label.trim() || !box) return null;
  const { ymin, xmin, ymax, xmax } = box;
  if (![ymin, xmin, ymax, xmax].every((coordinate) => isNumber(coordinate) && coordinate >= 0 && coordinate <= 1000)) return null;
  if (!isNumber(ymin) || !isNumber(xmin) || !isNumber(ymax) || !isNumber(xmax)) return null;
  if (ymax <= ymin || xmax <= xmin) return null;

  const x = xmin / 1000;
  const y = ymin / 1000;
  const width = (xmax - xmin) / 1000;
  const height = (ymax - ymin) / 1000;
  const relativePosition = getPosition((xmin + xmax) / 2000);
  const className = item.label.trim();
  const hazardCategory = roadUserClasses.has(className.toLowerCase()) ? "road-user" as const : undefined;
  const location = relativePosition === "center"
    ? " near the center of the image"
    : ` on the ${relativePosition} side of the image`;

  return {
    className,
    boundingBox: { x, y, width, height },
    relativePosition,
    ...(hazardCategory ? { hazardCategory } : {}),
    description: `${className} detected${location}.`,
  };
}

export async function analyzeWithGemini(
  image: Uint8Array,
  configuration: Extract<ProviderConfiguration, { provider: "gemini" }>,
  contentType: string,
): Promise<AnalysisResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(configuration.modelId)}:generateContent`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": configuration.apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Identify prominent, clearly visible objects in this image. Return only object labels and bounding boxes. Do not infer distance, motion, danger, a safe direction, or objects that are not clearly visible. The box_2d coordinates must be integers from 0 to 1000 in [ymin, xmin, ymax, xmax] format. Return an empty objects array if no objects can be identified." },
            { inlineData: { mimeType: contentType, data: Buffer.from(image).toString("base64") } },
          ],
        }],
        generationConfig: {
          responseFormat: {
            text: {
              mimeType: "APPLICATION_JSON",
              schema: geminiDetectionSchema,
            },
          },
        },
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) throw new ProviderError("Gemini could not analyze this image. Check the Gemini API key and model availability.");
    let payload: GeminiGenerateContentResponse;
    try {
      payload = await response.json() as GeminiGenerateContentResponse;
    } catch {
      throw new ProviderError("Gemini returned an unreadable response.");
    }

    const candidate = payload.candidates?.[0];
    const responseText = candidate?.content?.parts?.find((part) => typeof part.text === "string")?.text;
    if (typeof responseText !== "string" || candidate?.finishReason === "SAFETY") {
      throw new ProviderError("Gemini did not return a usable image analysis. Try another image.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      throw new ProviderError("Gemini returned malformed detection data.");
    }
    if (typeof parsed !== "object" || parsed === null || !Array.isArray((parsed as { objects?: unknown }).objects)) {
      throw new ProviderError("Gemini returned an unexpected detection response.");
    }
    const objects = (parsed as { objects: unknown[] }).objects;
    const detections = objects.map(normalizeGeminiObject);
    if (detections.some((detection) => detection === null)) {
      throw new ProviderError("Gemini returned invalid object coordinates. Try again.");
    }

    return {
      provider: "gemini",
      model: configuration.modelId,
      detections: detections as Detection[],
    };
  } catch (error) {
    if (controller.signal.aborted) throw new ProviderError("Gemini image analysis timed out. Try a smaller image.", "timeout");
    if (error instanceof ProviderError) throw error;
    throw new ProviderError("Could not reach Gemini. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
}

export function imageTypeFromBytes(bytes: Uint8Array, declaredType: string): boolean {
  if (declaredType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (declaredType === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (declaredType === "image/webp") {
    return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  return false;
}