/**
 * Security: the client resize pipeline must strip EXIF (incl. GPS) from
 * photo bytes. Builds a 2000px JPEG with a structurally valid EXIF/GPS
 * APP1 segment in-browser, uploads it through the real PhotoUploader,
 * then asserts the stored bytes contain no EXIF and were downscaled.
 */
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 375, height: 667 } });

function exifApp1(): number[] {
  const tiff: number[] = [];
  const push16 = (v: number) => tiff.push(v & 0xff, (v >> 8) & 0xff);
  const push32 = (v: number) =>
    tiff.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff);
  tiff.push(0x49, 0x49); // "II" little-endian
  push16(42);
  push32(8); // IFD0 offset
  push16(1); // one entry: GPSInfo pointer
  push16(0x8825);
  push16(4);
  push32(1);
  push32(26); // GPS IFD offset
  push32(0); // next IFD
  push16(2); // GPS IFD: two entries
  push16(0x0000);
  push16(1);
  push32(4);
  tiff.push(2, 3, 0, 0); // GPSVersionID inline
  push16(0x0001);
  push16(2);
  push32(2);
  tiff.push(0x4e, 0x00, 0x00, 0x00); // "N\0" inline
  push32(0);
  const exif = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff]; // "Exif\0\0"
  const len = exif.length + 2;
  return [0xff, 0xe1, (len >> 8) & 0xff, len & 0xff, ...exif];
}

test("uploaded bytes carry no EXIF and are downscaled", async ({ page, request }) => {
  const res = await request.post("/api/assessments", {
    data: {
      site: { lat: 12.9716, lng: 77.5946 },
      observed_at: "2026-09-30T08:00:00.000Z",
      rain_last_24h: "none",
      consent: true,
    },
  });
  expect(res.ok()).toBe(true);
  const { assessment } = (await res.json()) as { assessment: { id: string } };
  const stVid = (res.headers()["set-cookie"] ?? "").match(/st_vid=([^;]+)/)?.[1];
  await page
    .context()
    .addCookies([{ name: "st_vid", value: stVid!, domain: "localhost", path: "/" }]);
  await page.goto(`/assess/${assessment.id}`);
  await expect(page.locator("#photo-input")).toBeAttached({ timeout: 30000 });

  const outcome = await page.evaluate(async (app1: number[]) => {
    const canvas = document.createElement("canvas");
    canvas.width = 2000;
    canvas.height = 1500;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#3a6ea5";
    ctx.fillRect(0, 0, 2000, 1500);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9)
    );
    const raw = new Uint8Array(await blob.arrayBuffer());
    const spliced = new Uint8Array([raw[0], raw[1], ...app1, ...raw.slice(2)]);
    const input = document.querySelector("#photo-input") as HTMLInputElement;
    const dt = new DataTransfer();
    dt.items.add(new File([spliced], "gps.jpg", { type: "image/jpeg" }));
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return { sentBytes: spliced.length };
  }, exifApp1());

  await expect(page.getByAltText(/Stream photo/)).toBeVisible({ timeout: 60000 });

  const stored = await page.evaluate(async (aid: string) => {
    const view = (await (await fetch(`/api/assessments/${aid}`)).json()) as {
      photos: { id: string; width: number; height: number }[];
    };
    const meta = view.photos[0];
    const bytes = new Uint8Array(await (await fetch(`/api/photos/${meta.id}`)).arrayBuffer());
    let hasExif = false;
    const needle = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
    outer: for (let i = 0; i + needle.length < bytes.length; i++) {
      for (let j = 0; j < needle.length; j++) {
        if (bytes[i + j] !== needle[j]) continue outer;
      }
      hasExif = true;
      break;
    }
    return { width: meta.width, height: meta.height, bytes: bytes.length, hasExif };
  }, assessment.id);

  // Resize ran (2000px source stored at 1600px) and EXIF is gone.
  expect(stored.width).toBe(1600);
  expect(stored.height).toBe(1200);
  expect(stored.hasExif).toBe(false);
  expect(stored.bytes).toBeLessThan(outcome.sentBytes);
});
