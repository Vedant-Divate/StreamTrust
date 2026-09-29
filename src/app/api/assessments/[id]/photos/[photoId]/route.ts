/**
 * DELETE /api/assessments/:id/photos/:photoId — remove a photo
 * (owner only, draft only).
 */
import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { deletePhotoById, getPhotoById } from "@/server/db/repositories/photos";
import { errorBody, requireOwnedAssessment } from "@/server/security/volunteer-cookie";

type Ctx = { params: Promise<{ id: string; photoId: string }> };

export async function DELETE(req: Request, ctx: Ctx) {
  const { id, photoId } = await ctx.params;
  const owned = await requireOwnedAssessment(db, id, req);
  if (owned.error) return owned.error;
  if (owned.assessment.status !== "draft") {
    return NextResponse.json(errorBody("not_draft", "Submitted assessments cannot be edited."), {
      status: 409,
    });
  }
  const photo = await getPhotoById(db, photoId);
  if (!photo || photo.assessmentId !== id) {
    return NextResponse.json(errorBody("not_found", "Photo not found."), { status: 404 });
  }
  await deletePhotoById(db, photoId);
  return NextResponse.json({ deleted: true });
}
