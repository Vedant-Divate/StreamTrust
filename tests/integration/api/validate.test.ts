/**
 * Validate-route tests. Own temp file DB per file; files are left in the
 * OS temp dir (see the assessments route tests).
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import type { TestDb } from "../db/helpers";
import * as schema from "@/server/db/schema";

const dbFile = join(tmpdir(), `st-validate-test-${process.pid}-${Date.now()}.db`).replace(
  /\\/g,
  "/"
);

let POST_DRAFT: (req: Request) => Promise<Response>;
let PATCH_ONE: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
let POST_VALIDATE: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
let setupDb: TestDb;
let setupClient: Client;

function readCookie(res: Response): string {
  return res.headers.get("set-cookie")!.match(/st_vid=([^;]+)/)![1];
}

async function createDraft() {
  const res = await POST_DRAFT(
    new Request("http://localhost/api/assessments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        site: { lat: 12.9716, lng: 77.5946 },
        observed_at: "2020-01-01T08:00:00.000Z",
        rain_last_24h: "none",
        consent: true,
      }),
    })
  );
  const json = (await res.json()) as { assessment: { id: string } };
  return { id: json.assessment.id, cookie: readCookie(res) };
}

async function setEntries(
  id: string,
  cookie: string,
  entries: { indicator: string; final_value: string | null }[]
) {
  return PATCH_ONE(
    new Request(`http://localhost/api/assessments/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: `st_vid=${cookie}` },
      body: JSON.stringify({ entries }),
    }),
    { params: Promise.resolve({ id }) }
  );
}

function validate(id: string, cookie: string | null, waiver = false) {
  return POST_VALIDATE(
    new Request(`http://localhost/api/assessments/${id}/validate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie: `st_vid=${cookie}` } : {}),
      },
      body: JSON.stringify({ photo_waiver: waiver }),
    }),
    { params: Promise.resolve({ id }) }
  );
}

beforeAll(async () => {
  process.env.DATABASE_URL = `file:${dbFile}`;
  setupClient = createClient({ url: `file:${dbFile}` });
  setupDb = drizzle(setupClient, { schema });
  await migrate(setupDb, { migrationsFolder: "./src/server/db/migrations" });

  ({ POST: POST_DRAFT } = await import("@/app/api/assessments/route"));
  ({ PATCH: PATCH_ONE } = await import("@/app/api/assessments/[id]/route"));
  ({ POST: POST_VALIDATE } = await import("@/app/api/assessments/[id]/validate/route"));
  void setupDb;
});

afterAll(() => {
  setupClient.close();
});

describe("POST /api/assessments/:id/validate", () => {
  it("returns warnings for the smell-clean combination", async () => {
    const { id, cookie } = await createDraft();
    await setEntries(id, cookie, [
      { indicator: "clarity", final_value: "clear" },
      { indicator: "color", final_value: "colorless" },
      { indicator: "algae", final_value: "none" },
      { indicator: "litter", final_value: "none" },
      { indicator: "flow", final_value: "slow" },
      { indicator: "odor", final_value: "sewage_like" },
    ]);
    const res = await validate(id, cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: { ruleId: string; severity: string }[] };
    const smell = body.results.find((r) => r.ruleId === "R-SMELL-CLEAN");
    expect(smell?.severity).toBe("warning");
  });

  it("returns errors for a dry-bed violation with no writes", async () => {
    const { id, cookie } = await createDraft();
    await setEntries(id, cookie, [
      { indicator: "flow", final_value: "dry" },
      { indicator: "clarity", final_value: "clear" },
    ]);
    const res = await validate(id, cookie);
    const body = (await res.json()) as { results: { ruleId: string }[] };
    expect(body.results.map((r) => r.ruleId)).toContain("R-DRY-WATER");
    // Pure: the draft is untouched, still missing four answers.
    const view = await (
      await import("@/app/api/assessments/[id]/route")
    ).GET(
      new Request(`http://localhost/api/assessments/${id}`, {
        headers: { cookie: `st_vid=${cookie}` },
      }),
      { params: Promise.resolve({ id }) }
    );
    const full = (await view.json()) as { entries: unknown[] };
    expect(full.entries).toHaveLength(2);
  });

  it("honors the photo waiver for R-NO-PHOTO", async () => {
    const { id, cookie } = await createDraft();
    const plain = (await validate(id, cookie).then((r) => r.json())) as {
      results: { ruleId: string }[];
    };
    expect(plain.results.map((r) => r.ruleId)).toContain("R-NO-PHOTO");
    const waived = (await validate(id, cookie, true).then((r) => r.json())) as {
      results: { ruleId: string }[];
    };
    expect(waived.results.map((r) => r.ruleId)).not.toContain("R-NO-PHOTO");
  });

  it("rejects anonymous and foreign requests", async () => {
    const { id } = await createDraft();
    expect((await validate(id, null)).status).toBe(403);
    expect((await validate(id, "00000000-0000-4000-8000-000000000000")).status).toBe(404);
  });
});
