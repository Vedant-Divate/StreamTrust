import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./helpers";
import {
  createAssessment,
  createSite,
  createVolunteer,
} from "@/server/db/repositories/assessments";
import {
  countPhotosByAssessment,
  deletePhotoById,
  getPhotoById,
  getPhotosByAssessment,
  insertPhoto,
} from "@/server/db/repositories/photos";

describe("photo repository", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  let assessmentId: string;

  beforeEach(async () => {
    ctx = await createTestDb();
    const volunteer = await createVolunteer(ctx.db);
    const site = await createSite(ctx.db, { lat: 2, lng: 2 });
    const created = await createAssessment(ctx.db, {
      volunteerId: volunteer.id,
      siteId: site.id,
      observedAt: "2026-09-29T08:00:00.000Z",
      rainLast24h: "none",
    });
    assessmentId = created!.id;
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

  it("stores photo bytes and reads them back intact", async () => {
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const inserted = await insertPhoto(ctx.db, {
      assessmentId,
      mime: "image/jpeg",
      width: 1280,
      height: 960,
      bytes,
      sha256,
    });

    expect(inserted?.mime).toBe("image/jpeg");
    const fetched = await getPhotoById(ctx.db, inserted!.id);
    expect(Buffer.from(fetched!.bytes as Uint8Array).equals(bytes)).toBe(true);
    expect(fetched?.sha256).toBe(sha256);
  });

  it("lists, counts and deletes photos per assessment", async () => {
    expect(await countPhotosByAssessment(ctx.db, assessmentId)).toBe(0);
    const first = await insertPhoto(ctx.db, {
      assessmentId,
      mime: "image/jpeg",
      width: 640,
      height: 480,
      bytes,
      sha256: "aaa",
    });
    await insertPhoto(ctx.db, {
      assessmentId,
      mime: "image/jpeg",
      width: 640,
      height: 480,
      bytes,
      sha256: "bbb",
    });

    expect(await countPhotosByAssessment(ctx.db, assessmentId)).toBe(2);
    expect(await getPhotosByAssessment(ctx.db, assessmentId)).toHaveLength(2);

    await deletePhotoById(ctx.db, first!.id);
    expect(await countPhotosByAssessment(ctx.db, assessmentId)).toBe(1);
    expect(await getPhotoById(ctx.db, first!.id)).toBeUndefined();
  });
});
