/**
 * Client-side photo preparation (PROJECT.md F-02, Section 11.5).
 * Runs in the browser only: downscales large photos and re-encodes to
 * JPEG, which discards EXIF metadata (including GPS) by construction.
 * No imports from `src/server/**`.
 */

export const MAX_UPLOAD_DIMENSION = 1600;
export const JPEG_QUALITY = 0.82;

export interface TargetSize {
  width: number;
  height: number;
}

export interface ResizedPhoto extends TargetSize {
  blob: Blob;
}

/** Scale dimensions to fit within maxDimension; never upscale. Pure. */
export function computeTargetSize(
  width: number,
  height: number,
  maxDimension: number = MAX_UPLOAD_DIMENSION
): TargetSize {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(maxDimension) ||
    width <= 0 ||
    height <= 0 ||
    maxDimension <= 0
  ) {
    throw new Error("Invalid image dimensions.");
  }
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the photo."))),
      "image/jpeg",
      quality
    );
  });
}

/**
 * Downscale + re-encode a photo file. Requires browser APIs
 * (`createImageBitmap`, `document`); throws a clear error elsewhere so
 * tests and SSR fail loudly instead of silently.
 */
export async function resizePhoto(
  file: Blob,
  maxDimension: number = MAX_UPLOAD_DIMENSION,
  quality: number = JPEG_QUALITY
): Promise<ResizedPhoto> {
  if (typeof createImageBitmap === "undefined" || typeof document === "undefined") {
    throw new Error("resizePhoto requires a browser (createImageBitmap/document).");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = computeTargetSize(bitmap.width, bitmap.height, maxDimension);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get a 2d canvas context.");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, quality);
    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}
