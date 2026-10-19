export type RelativePosition = "left" | "center" | "right";
export type HazardCategory = "road-user";

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Detection = {
  className: string;
  confidence?: number;
  boundingBox?: BoundingBox;
  hazardCategory?: HazardCategory;
  relativePosition?: RelativePosition;
  description: string;
};

export type AnalysisResult = {
  provider: "roboflow" | "gemini";
  model: string;
  imageWidth?: number;
  imageHeight?: number;
  detections: Detection[];
};

export type AnalysisErrorCode = "not_configured" | "invalid_image" | "provider_error" | "timeout";

export type AnalysisError = {
  error: string;
  code: AnalysisErrorCode;
};