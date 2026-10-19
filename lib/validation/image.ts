export const maximumImageBytes = 8 * 1024 * 1024;
export const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export function validateImageFile(file: File): string | null {
  if (!(acceptedImageTypes as readonly string[]).includes(file.type)) {
    return "Choose a JPEG, PNG, or WebP image.";
  }
  if (file.size === 0) return "This image file is empty. Choose another image.";
  if (file.size > maximumImageBytes) return "This image is larger than 8 MB. Choose a smaller image.";
  return null;
}