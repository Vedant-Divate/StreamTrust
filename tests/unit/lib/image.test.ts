import { describe, expect, it } from "vitest";
import { JPEG_QUALITY, MAX_UPLOAD_DIMENSION, computeTargetSize, resizePhoto } from "@/lib/image";

describe("computeTargetSize", () => {
  it("leaves small photos untouched", () => {
    expect(computeTargetSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("scales the long edge down to the limit", () => {
    expect(computeTargetSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(computeTargetSize(1000, 3200)).toEqual({ width: 500, height: 1600 });
    expect(computeTargetSize(3200, 3200, 800)).toEqual({ width: 800, height: 800 });
  });

  it("rejects non-positive dimensions", () => {
    expect(() => computeTargetSize(0, 600)).toThrow("Invalid image dimensions.");
    expect(() => computeTargetSize(640, -1)).toThrow("Invalid image dimensions.");
  });
});

describe("resizePhoto", () => {
  it("fails loudly outside a browser", async () => {
    expect(typeof document).toBe("undefined");
    await expect(resizePhoto(new Blob())).rejects.toThrow("requires a browser");
  });
});

describe("upload constants", () => {
  it("matches the server-side photo budget", () => {
    expect(MAX_UPLOAD_DIMENSION).toBe(1600);
    expect(JPEG_QUALITY).toBeGreaterThan(0);
    expect(JPEG_QUALITY).toBeLessThanOrEqual(1);
  });
});
