/**
 * POST /api/assessments/:id/photos — upload one resized JPEG (owner only,
 * draft only). Enforces count, size and type server-side; dimensions are
 * parsed from the JPEG headers, never trusted from the client.
 */
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { MAX_PHOTO_BYTES } from "@/domain/schemas";
import { db } from "@/server/db/client";
import { countPhotosByAssessment, insertPhoto } from "@/server/db/repositories/photos";
import { errorBody, requireOwnedAssessment } from "@/server/security/volunteer-cookie";

export const MAX_PHOTOS_PER_ASSESSMENT = 3;

/**
 * Parse JPEG dimensions from SOF0–SOF3 markers. Returns null when the
 * bytes are not a parseable JPEG.
 */
export function parseJpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 3 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i += 1; // fill byte, re-examine
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2; // SOI / restart markers carry no length
      continue;
    }
    if (marker === 0xd9) break; // EOI before any SOF
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (len < 2 || i + 2 + len > bytes.length) return null;
    if (marker >= 0xc0 && marker <= 0xc3) {
      if (len < 7) return null;
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      if (width === 0 || height === 0) return null;
      return { width, height };
    }
    i += 2 + len;
  }
  return null;
}

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const owned = await requireOwnedAssessment(db, id, req);
  if (owned.error) return owned.error;
  if (owned.assessment.status !== "draft") {
    return NextResponse.json(errorBody("not_draft", "Submitted assessments cannot be edited."), {
      status: 409,
    });
  }

  if ((await countPhotosByAssessment(db, id)) >= MAX_PHOTOS_PER_ASSESSMENT) {
    return NextResponse.json(
      errorBody("photo_limit", `At most ${MAX_PHOTOS_PER_ASSESSMENT} photos per assessment.`),
      { status: 400 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(errorBody("invalid_input", "Request must be multipart."), {
      status: 400,
    });
  }
  const file = form.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json(errorBody("invalid_input", "Field 'photo' is required."), {
      status: 400,
    });
  }
  if (file.type !== "image/jpeg") {
    return NextResponse.json(errorBody("invalid_input", "Only image/jpeg is accepted."), {
      status: 400,
    });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > MAX_PHOTO_BYTES) {
    return NextResponse.json(
      errorBody("invalid_input", `Photo must be at most ${MAX_PHOTO_BYTES} bytes.`),
      { status: 400 }
    );
  }
  const dims = parseJpegDimensions(bytes);
  if (!dims) {
    return NextResponse.json(errorBody("invalid_input", "File is not a readable JPEG."), {
      status: 400,
    });
  }

  const photo = await insertPhoto(db, {
    assessmentId: id,
    mime: "image/jpeg",
    width: dims.width,
    height: dims.height,
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  const { bytes: _b, ...meta } = photo!;
  void _b;
  return NextResponse.json({ photo: meta }, { status: 201 });
}
