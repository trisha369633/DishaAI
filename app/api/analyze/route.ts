import { getDefaultProvider, getProviderAvailability, getProviderConfiguration, type ProviderName } from "@/lib/ai/config";
import { analyzeWithGemini, analyzeWithRoboflow, imageTypeFromBytes, ProviderError } from "@/lib/ai/provider";

export const maxDuration = 30;

const maximumImageBytes = 8 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function jsonError(error: string, code: string, status: number) {
  return Response.json({ error, code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const defaultProvider = getDefaultProvider();
  const providers = getProviderAvailability();
  return Response.json(
    { configured: providers[defaultProvider], provider: defaultProvider, providers },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumImageBytes + 1024 * 1024) {
    return jsonError("Image is too large. Choose an image under 8 MB.", "invalid_image", 413);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Choose a JPEG, PNG, or WebP image, then try again.", "invalid_image", 400);
  }

  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0 || image.size > maximumImageBytes || !allowedTypes.has(image.type)) {
    return jsonError("Choose a JPEG, PNG, or WebP image under 8 MB.", "invalid_image", image instanceof File && image.size > maximumImageBytes ? 413 : 400);
  }

  const bytes = new Uint8Array(await image.arrayBuffer());
  if (!imageTypeFromBytes(bytes, image.type)) {
    return jsonError("The image contents do not match the selected file type.", "invalid_image", 400);
  }

  const requestedProvider = formData.get("provider");
  if (requestedProvider !== null && requestedProvider !== "roboflow" && requestedProvider !== "gemini") {
    return jsonError("Choose a supported image analysis provider.", "invalid_provider", 400);
  }
  const provider: ProviderName = requestedProvider === "gemini" || requestedProvider === "roboflow"
    ? requestedProvider
    : getDefaultProvider();
  const configuration = getProviderConfiguration(provider);
  if (!configuration) {
    const setupMessage = provider === "gemini"
      ? "Gemini is not configured. Add GEMINI_API_KEY to the server environment."
      : "Roboflow is not configured. Add ROBOFLOW_API_KEY and a ROBOFLOW_MODEL_ID in project/version format.";
    return jsonError(setupMessage, "not_configured", 503);
  }

  try {
    const result = configuration.provider === "gemini"
      ? await analyzeWithGemini(bytes, configuration, image.type)
      : await analyzeWithRoboflow(bytes, configuration, image.type);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ProviderError) {
      return jsonError(error.message, error.kind === "timeout" ? "timeout" : "provider_error", error.kind === "timeout" ? 504 : 502);
    }
    return jsonError("Image analysis failed. Please try again.", "provider_error", 502);
  }
}