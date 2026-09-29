/**
 * Route-handler integration tests against a temporary file database.
 * Files are left in the OS temp dir (Windows holds the SQLite lock after
 * close, so deletion races EPERM); names are unique per run.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { assessments } from "@/server/db/schema";

const dbFile = join(tmpdir(), `st-api-test-${process.pid}-${Date.now()}.db`).replace(/\\/g, "/");

let POST: (req: Request) => Promise<Response>;
let GET_ONE: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
let PATCH_ONE: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
let POST_SUBMIT: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
let GET_HEALTH: () => Promise<Response>;
let setupDb: ReturnType<typeof drizzle>;
let setupClient: Client;

function ctxFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

function readCookie(res: Response, name: string): string | undefined {
  const header = res.headers.get("set-cookie");
  if (!header) return undefined;
  const match = header.match(new RegExp(`${name}=([^;]+)`));
  return match?.[1];
}

const draftPayload = {
  site: { name: "Test Creek", lat: 12.97164, lng: 77.59464 },
  observed_at: "2026-09-29T08:00:00.000Z",
  rain_last_24h: "light",
  consent: true,
};

async function createDraft(cookie?: string) {
  const res = await POST(
    new Request("http://localhost/api/assessments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(draftPayload),
    })
  );
  const json = (await res.json()) as {
    assessment: { id: string };
    site: { lat: number };
  };
  return { res, json, cookie: readCookie(res, "st_vid") };
}

beforeAll(async () => {
  process.env.DATABASE_URL = `file:${dbFile}`;
  setupClient = createClient({ url: `file:${dbFile}` });
  setupDb = drizzle(setupClient);
  await migrate(setupDb, { migrationsFolder: "./src/server/db/migrations" });

  ({ POST } = await import("@/app/api/assessments/route"));
  const one = await import("@/app/api/assessments/[id]/route");
  GET_ONE = one.GET;
  PATCH_ONE = one.PATCH;
  ({ POST: POST_SUBMIT } = await import("@/app/api/assessments/[id]/submit/route"));
  ({ GET: GET_HEALTH } = await import("@/app/api/health/route"));
});

afterAll(async () => {
  setupClient.close();
});

describe("POST /api/assessments", () => {
  it("creates a draft, rounds coordinates, and issues a cookie", async () => {
    const { res, json, cookie } = await createDraft();
    expect(res.status).toBe(201);
    expect(cookie).toMatch(/^[0-9a-f-]{36}$/);
    expect(json.assessment.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(json.site.lat).toBe(12.9716);
  });

  it("rejects a payload without consent", async () => {
    const res = await POST(
      new Request("http://localhost/api/assessments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draftPayload, consent: false }),
      })
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("invalid_input");
  });
});

describe("GET /api/assessments/:id", () => {
  it("returns the full view to the owner", async () => {
    const { json, cookie } = await createDraft();
    const res = await GET_ONE(
      new Request(`http://localhost/api/assessments/${json.assessment.id}`, {
        headers: { cookie: `st_vid=${cookie}` },
      }),
      ctxFor(json.assessment.id)
    );
    expect(res.status).toBe(200);
    const view = (await res.json()) as Record<string, unknown>;
    for (const key of ["assessment", "site", "entries", "suggestions", "photos"]) {
      expect(view, key).toHaveProperty(key);
    }
  });

  it("rejects a request with no cookie (403)", async () => {
    const { json } = await createDraft();
    const res = await GET_ONE(
      new Request(`http://localhost/api/assessments/${json.assessment.id}`),
      ctxFor(json.assessment.id)
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("forbidden");
  });

  it("rejects a request with a mismatched cookie (404)", async () => {
    const { json } = await createDraft();
    const res = await GET_ONE(
      new Request(`http://localhost/api/assessments/${json.assessment.id}`, {
        headers: { cookie: "st_vid=00000000-0000-4000-8000-000000000000" },
      }),
      ctxFor(json.assessment.id)
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("not_found");
  });

  it("returns 404 for an unknown id even with a valid cookie", async () => {
    const { cookie } = await createDraft();
    const res = await GET_ONE(
      new Request("http://localhost/api/assessments/00000000-0000-4000-8000-000000000000", {
        headers: { cookie: `st_vid=${cookie}` },
      }),
      ctxFor("00000000-0000-4000-8000-000000000000")
    );
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/assessments/:id", () => {
  it("updates draft fields and stores indicator entries", async () => {
    const { json, cookie } = await createDraft();
    const id = json.assessment.id;
    const res = await PATCH_ONE(
      new Request(`http://localhost/api/assessments/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie: `st_vid=${cookie}` },
        body: JSON.stringify({
          rain_last_24h: "heavy",
          entries: [
            { indicator: "clarity", final_value: "muddy" },
            { indicator: "odor", final_value: "earthy" },
          ],
        }),
      }),
      ctxFor(id)
    );
    expect(res.status).toBe(200);
    const view = (await res.json()) as {
      assessment: { rainLast24h: string };
      entries: { indicator: string; finalValue: string; decisionSource: string }[];
    };
    expect(view.assessment.rainLast24h).toBe("heavy");
    expect(view.entries).toHaveLength(2);
    expect(view.entries.find((e) => e.indicator === "clarity")).toMatchObject({
      finalValue: "muddy",
      decisionSource: "human_only",
    });
  });

  it("rejects an unknown indicator value code", async () => {
    const { json, cookie } = await createDraft();
    const res = await PATCH_ONE(
      new Request(`http://localhost/api/assessments/${json.assessment.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie: `st_vid=${cookie}` },
        body: JSON.stringify({ entries: [{ indicator: "fish", final_value: "muddy" }] }),
      }),
      ctxFor(json.assessment.id)
    );
    expect(res.status).toBe(400);
  });

  it("refuses edits once submitted (409)", async () => {
    const { json, cookie } = await createDraft();
    const id = json.assessment.id;
    await setupDb.update(assessments).set({ status: "submitted" }).where(eq(assessments.id, id));
    const res = await PATCH_ONE(
      new Request(`http://localhost/api/assessments/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie: `st_vid=${cookie}` },
        body: JSON.stringify({ notes: "too late" }),
      }),
      ctxFor(id)
    );
    expect(res.status).toBe(409);
  });
});

describe("POST /api/assessments/:id/submit", () => {
  const allSix = [
    { indicator: "clarity", final_value: "clear" },
    { indicator: "color", final_value: "colorless" },
    { indicator: "algae", final_value: "none" },
    { indicator: "litter", final_value: "none" },
    { indicator: "flow", final_value: "slow" },
    { indicator: "odor", final_value: "none" },
  ];

  it("rejects an incomplete draft (400)", async () => {
    const { json, cookie } = await createDraft();
    const res = await POST_SUBMIT(
      new Request(`http://localhost/api/assessments/${json.assessment.id}/submit`, {
        method: "POST",
        headers: { cookie: `st_vid=${cookie}` },
      }),
      ctxFor(json.assessment.id)
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; details?: unknown } };
    expect(body.error.code).toBe("incomplete");
  });

  it("submits a fully answered draft", async () => {
    const { json, cookie } = await createDraft();
    const id = json.assessment.id;
    const patched = await PATCH_ONE(
      new Request(`http://localhost/api/assessments/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie: `st_vid=${cookie}` },
        body: JSON.stringify({ entries: allSix }),
      }),
      ctxFor(id)
    );
    expect(patched.status).toBe(200);

    const res = await POST_SUBMIT(
      new Request(`http://localhost/api/assessments/${id}/submit`, {
        method: "POST",
        headers: { cookie: `st_vid=${cookie}` },
      }),
      ctxFor(id)
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { assessment: { status: string } };
    expect(body.assessment.status).toBe("submitted");

    const again = await POST_SUBMIT(
      new Request(`http://localhost/api/assessments/${id}/submit`, {
        method: "POST",
        headers: { cookie: `st_vid=${cookie}` },
      }),
      ctxFor(id)
    );
    expect(again.status).toBe(409);
  });
});

describe("GET /api/health", () => {
  it("reports liveness without secrets", async () => {
    const res = await GET_HEALTH();
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.status).toBe("ok");
    expect(json.db).toBe("up");
    expect(JSON.stringify(json)).not.toMatch(/KEY|TOKEN|SECRET/i);
  });
});
