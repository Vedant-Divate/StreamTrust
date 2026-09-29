/**
 * Photo route integration tests. Own temp file DB per file (see the
 * assessments route tests for why files are left in the OS temp dir).
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { MAX_PHOTO_BYTES } from "@/domain/schemas";
import { assessments } from "@/server/db/schema";

const dbFile = join(tmpdir(), `st-photo-test-${process.pid}-${Date.now()}.db`).replace(/\\/g, "/");

let POST_ASSESSMENT: (req: Request) => Promise<Response>;
let POST_PHOTO: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
let DELETE_PHOTO: (
  req: Request,
  ctx: { params: Promise<{ id: string; photoId: string }> }
) => Promise<Response>;
let GET_BYTES: (req: Request, ctx: { params: Promise<{ photoId: string }> }) => Promise<Response>;
let setupDb: ReturnType<typeof drizzle>;
let setupClient: Client;

/** Minimal valid JPEG: SOI + SOF0 (16x32) + EOI. */
const JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x10, 0x00, 0x20, 0x01, 0x01, 0x11, 0x00, 0xff,
  0xd9,
]);

const draftPayload = {
  site: { lat: 5, lng: 5 },
  observed_at: "2026-09-29T08:00:00.000Z",
  rain_last_24h: "none",
  consent: true,
};

function readCookie(res: Response): string | undefined {
  return res.headers.get("set-cookie")?.match(/st_vid=([^;]+)/)?.[1];
}

async function createDraft() {
  const res = await POST_ASSESSMENT(
    new Request("http://localhost/api/assessments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draftPayload),
    })
  );
  const json = (await res.json()) as { assessment: { id: string } };
  return { id: json.assessment.id, cookie: readCookie(res)! };
}

function uploadReq(id: string, cookie: string | null, file: File) {
  const form = new FormData();
  form.append("photo", file);
  return new Request(`http://localhost/api/assessments/${id}/photos`, {
    method: "POST",
    headers: cookie ? { cookie: `st_vid=${cookie}` } : {},
    body: form,
  });
}

const jpegFile = () => new File([JPEG], "photo.jpg", { type: "image/jpeg" });

beforeAll(async () => {
  process.env.DATABASE_URL = `file:${dbFile}`;
  setupClient = createClient({ url: `file:${dbFile}` });
  setupDb = drizzle(setupClient);
  await migrate(setupDb, { migrationsFolder: "./src/server/db/migrations" });

  ({ POST: POST_ASSESSMENT } = await import("@/app/api/assessments/route"));
  ({ POST: POST_PHOTO } = await import("@/app/api/assessments/[id]/photos/route"));
  ({ DELETE: DELETE_PHOTO } = await import("@/app/api/assessments/[id]/photos/[photoId]/route"));
  ({ GET: GET_BYTES } = await import("@/app/api/photos/[photoId]/route"));
});

afterAll(() => {
  setupClient.close();
});

describe("POST /api/assessments/:id/photos", () => {
  it("stores a valid JPEG with server-parsed dimensions", async () => {
    const { id, cookie } = await createDraft();
    const res = await POST_PHOTO(uploadReq(id, cookie, jpegFile()), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(201);
    const json = (await res.json()) as {
      photo: { id: string; width: number; height: number; mime: string };
    };
    expect(json.photo).toMatchObject({ width: 32, height: 16, mime: "image/jpeg" });
  });

  it("rejects non-JPEG content and oversize uploads", async () => {
    const { id, cookie } = await createDraft();
    const png = await POST_PHOTO(
      uploadReq(id, cookie, new File([JPEG], "p.png", { type: "image/png" })),
      { params: Promise.resolve({ id }) }
    );
    expect(png.status).toBe(400);

    const big = Buffer.alloc(MAX_PHOTO_BYTES + 1, 0);
    big[0] = 0xff;
    big[1] = 0xd8;
    const tooBig = await POST_PHOTO(
      uploadReq(id, cookie, new File([big], "big.jpg", { type: "image/jpeg" })),
      { params: Promise.resolve({ id }) }
    );
    expect(tooBig.status).toBe(400);
  });

  it("rejects a fourth photo", async () => {
    const { id, cookie } = await createDraft();
    for (let i = 0; i < 3; i++) {
      const res = await POST_PHOTO(uploadReq(id, cookie, jpegFile()), {
        params: Promise.resolve({ id }),
      });
      expect(res.status).toBe(201);
    }
    const fourth = await POST_PHOTO(uploadReq(id, cookie, jpegFile()), {
      params: Promise.resolve({ id }),
    });
    expect(fourth.status).toBe(400);
    const body = (await fourth.json()) as { error: { code: string } };
    expect(body.error.code).toBe("photo_limit");
  });

  it("rejects uploads with no cookie (403)", async () => {
    const { id } = await createDraft();
    const res = await POST_PHOTO(uploadReq(id, null, jpegFile()), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/photos/:photoId", () => {
  it("streams identical bytes to the owner and 404s strangers", async () => {
    const { id, cookie } = await createDraft();
    const up = await POST_PHOTO(uploadReq(id, cookie, jpegFile()), {
      params: Promise.resolve({ id }),
    });
    const { photo } = (await up.json()) as { photo: { id: string } };

    const ok = await GET_BYTES(
      new Request(`http://localhost/api/photos/${photo.id}`, {
        headers: { cookie: `st_vid=${cookie}` },
      }),
      { params: Promise.resolve({ photoId: photo.id }) }
    );
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("image/jpeg");
    expect(Buffer.from(await ok.arrayBuffer()).equals(JPEG)).toBe(true);

    const stranger = await GET_BYTES(
      new Request(`http://localhost/api/photos/${photo.id}`, {
        headers: { cookie: "st_vid=00000000-0000-4000-8000-000000000000" },
      }),
      { params: Promise.resolve({ photoId: photo.id }) }
    );
    expect(stranger.status).toBe(404);
  });
});

describe("DELETE /api/assessments/:id/photos/:photoId", () => {
  it("deletes an owned photo and 404s afterwards", async () => {
    const { id, cookie } = await createDraft();
    const up = await POST_PHOTO(uploadReq(id, cookie, jpegFile()), {
      params: Promise.resolve({ id }),
    });
    const { photo } = (await up.json()) as { photo: { id: string } };

    const del = await DELETE_PHOTO(
      new Request(`http://localhost/api/assessments/${id}/photos/${photo.id}`, {
        method: "DELETE",
        headers: { cookie: `st_vid=${cookie}` },
      }),
      { params: Promise.resolve({ id, photoId: photo.id }) }
    );
    expect(del.status).toBe(200);

    const gone = await GET_BYTES(
      new Request(`http://localhost/api/photos/${photo.id}`, {
        headers: { cookie: `st_vid=${cookie}` },
      }),
      { params: Promise.resolve({ photoId: photo.id }) }
    );
    expect(gone.status).toBe(404);
  });

  it("refuses to delete another volunteer's photo and edits after submit", async () => {
    const a = await createDraft();
    const b = await createDraft();
    const up = await POST_PHOTO(uploadReq(a.id, a.cookie, jpegFile()), {
      params: Promise.resolve({ id: a.id }),
    });
    const { photo } = (await up.json()) as { photo: { id: string } };

    const cross = await DELETE_PHOTO(
      new Request(`http://localhost/api/assessments/${b.id}/photos/${photo.id}`, {
        method: "DELETE",
        headers: { cookie: `st_vid=${b.cookie}` },
      }),
      { params: Promise.resolve({ id: b.id, photoId: photo.id }) }
    );
    expect(cross.status).toBe(404);

    await setupDb.update(assessments).set({ status: "submitted" }).where(eq(assessments.id, a.id));
    const frozen = await DELETE_PHOTO(
      new Request(`http://localhost/api/assessments/${a.id}/photos/${photo.id}`, {
        method: "DELETE",
        headers: { cookie: `st_vid=${a.cookie}` },
      }),
      { params: Promise.resolve({ id: a.id, photoId: photo.id }) }
    );
    expect(frozen.status).toBe(409);
  });
});
