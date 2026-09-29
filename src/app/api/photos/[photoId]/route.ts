/**
 * GET /api/photos/:photoId — stream photo bytes (owner only).
 */
import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { getPhotoById } from "@/server/db/repositories/photos";
import { errorBody, requireOwnedAssessment } from "@/server/security/volunteer-cookie";

type Ctx = { params: Promise<{ photoId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { photoId } = await ctx.params;
  const photo = await getPhotoById(db, photoId);
  if (!photo) {
    return NextResponse.json(errorBody("not_found", "Photo not found."), { status: 404 });
  }
  const owned = await requireOwnedAssessment(db, photo.assessmentId, req);
  if (owned.error) return owned.error;
  return new NextResponse(new Uint8Array(photo.bytes), {
    status: 200,
    headers: {
      "content-type": photo.mime,
      "content-length": String(photo.bytes.length),
      "cache-control": "private, max-age=86400",
    },
  });
}
