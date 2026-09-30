/**
 * Suggest-route tests with AI_PROVIDER=mock (no live calls).
 * Own temp file DB per file; files are left in the OS temp dir.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { assessments } from "@/server/db/schema";
import * as schema from "@/server/db/schema";
import { getSuggestionsByAssessment } from "@/server/db/repositories/suggestions";
import type { TestDb } from "../db/helpers";

const dbFile = join(tmpdir(), `st-suggest-test-${process.pid}-${Date.now()}.db`).replace(
  /\\/g,
  "/"
);

let POST_DRAFT: (req: Request) => Promise<Response>;
let POST_PHOTO: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
let POST_SUGGEST: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
let setupDb: TestDb;
let setupClient: Client;

const JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x10, 0x00, 0x20, 0x01, 0x01, 0x11, 0x00, 0xff,
  0xd9,
]);

function readCookie(res: Response): string {
  return res.headers.get("set-cookie")!.match(/st_vid=([^;]+)/)![1];
}

async function createDraftWithPhoto() {
  const draft = await POST_DRAFT(
    new Request("http://localhost/api/assessments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        site: { lat: 1, lng: 1 },
        observed_at: "2026-09-29T08:00:00.000Z",
        rain_last_24h: "light",
        consent: true,
      }),
    })
  );
  const json = (await draft.json()) as { assessment: { id: string } };
  const cookie = readCookie(draft);
  const form = new FormData();
  form.append("photo", new File([JPEG], "p.jpg", { type: "image/jpeg" }));
  const up = await POST_PHOTO(
    new Request(`http://localhost/api/assessments/${json.assessment.id}/photos`, {
      method: "POST",
      headers: { cookie: `st_vid=${cookie}` },
      body: form,
    }),
    { params: Promise.resolve({ id: json.assessment.id }) }
  );
  expect(up.status).toBe(201);
  return { id: json.assessment.id, cookie };
}

function suggest(id: string, cookie: string | null, rerun?: boolean) {
  return POST_SUGGEST(
    new Request(`http://localhost/api/assessments/${id}/suggest`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie: `st_vid=${cookie}` } : {}),
      },
      body: JSON.stringify(rerun ? { rerun: true } : {}),
    }),
    { params: Promise.resolve({ id }) }
  );
}

beforeAll(async () => {
  process.env.AI_PROVIDER = "mock";
  process.env.DATABASE_URL = `file:${dbFile}`;
  setupClient = createClient({ url: `file:${dbFile}` });
  setupDb = drizzle(setupClient, { schema });
  await migrate(setupDb, { migrationsFolder: "./src/server/db/migrations" });

  ({ POST: POST_DRAFT } = await import("@/app/api/assessments/route"));
  ({ POST: POST_PHOTO } = await import("@/app/api/assessments/[id]/photos/route"));
  ({ POST: POST_SUGGEST } = await import("@/app/api/assessments/[id]/suggest/route"));
  void setupDb;
});

afterAll(() => {
  setupClient.close();
});

describe("POST /api/assessments/:id/suggest (mock)", () => {
  it("stores normalized suggestions with enforced abstentions", async () => {
    const { id, cookie } = await createDraftWithPhoto();
    const res = await suggest(id, cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      suggestions: {
        indicator: string;
        suggested_value: string;
        confidence_band: string;
        evidence: string;
      }[];
      deduped: boolean;
      provider: string;
    };
    expect(body.deduped).toBe(false);
    expect(body.provider).toBe("mock");
    expect(body.suggestions).toHaveLength(6);
    const byIndicator = Object.fromEntries(body.suggestions.map((s) => [s.indicator, s]));
    // Normalizer proven through the route: guessed odor + invalid litter.
    expect(byIndicator.odor.suggested_value).toBe("cannot_determine");
    expect(byIndicator.odor.confidence_band).toBe("none");
    expect(byIndicator.litter.suggested_value).toBe("cannot_determine");
    expect(byIndicator.clarity).toMatchObject({
      suggested_value: "cloudy",
      confidence_band: "medium",
    });

    const rows = await getSuggestionsByAssessment(setupDb, id);
    expect(rows).toHaveLength(6);
    expect(rows[0].rawResponseJson).toContain("image_quality");
    expect(rows[0].promptVersion).toBe("v1");
  });

  it("is idempotent for the same photo set unless re-run", async () => {
    const { id, cookie } = await createDraftWithPhoto();
    const first = await suggest(id, cookie);
    expect(((await first.json()) as { deduped: boolean }).deduped).toBe(false);
    const second = await suggest(id, cookie);
    const body = (await second.json()) as { deduped: boolean };
    expect(body.deduped).toBe(true);
    expect(await getSuggestionsByAssessment(setupDb, id)).toHaveLength(6);

    const rerun = await suggest(id, cookie, true);
    expect(((await rerun.json()) as { deduped: boolean }).deduped).toBe(false);
    expect(await getSuggestionsByAssessment(setupDb, id)).toHaveLength(12);
  });

  it("rate-limits at 10 calls per volunteer per hour", async () => {
    const { id, cookie } = await createDraftWithPhoto();
    for (let i = 0; i < 10; i++) {
      const res = await suggest(id, cookie, true);
      expect(res.status).toBe(200);
    }
    const limited = await suggest(id, cookie, true);
    expect(limited.status).toBe(429);
    const body = (await limited.json()) as { error: { code: string } };
    expect(body.error.code).toBe("rate_limited");
  });

  it("rejects photo-less, cookie-less and submitted assessments", async () => {
    const draft = await POST_DRAFT(
      new Request("http://localhost/api/assessments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          site: { lat: 2, lng: 2 },
          observed_at: "2026-09-29T08:00:00.000Z",
          rain_last_24h: "none",
          consent: true,
        }),
      })
    );
    const json = (await draft.json()) as { assessment: { id: string } };
    const cookie = readCookie(draft);

    const empty = await suggest(json.assessment.id, cookie);
    expect(empty.status).toBe(400);

    const anon = await suggest(json.assessment.id, null);
    expect(anon.status).toBe(403);

    await setupDb
      .update(assessments)
      .set({ status: "submitted" })
      .where(eq(assessments.id, json.assessment.id));
    const frozen = await suggest(json.assessment.id, cookie);
    expect(frozen.status).toBe(409);
  });
});
