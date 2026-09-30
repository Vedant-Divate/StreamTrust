/**
 * FHIR route tests with a stubbed validator (no live calls).
 * Own temp file DB per file; files are left in the OS temp dir.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { fhirExports } from "@/server/db/schema";
import {
  createAssessment,
  createSite,
  createVolunteer,
  submitAssessment,
  upsertIndicatorEntry,
} from "@/server/db/repositories/assessments";
import type { TestDb } from "../db/helpers";
import * as schema from "@/server/db/schema";

const dbFile = join(tmpdir(), `st-fhir-test-${process.pid}-${Date.now()}.db`).replace(/\\/g, "/");

let GET_BUNDLE: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
let POST_VALIDATE: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
let setupDb: TestDb;
let setupClient: Client;

const SIX = [
  { indicator: "clarity", finalValue: "clear" },
  { indicator: "color", finalValue: "colorless" },
  { indicator: "algae", finalValue: "none" },
  { indicator: "litter", finalValue: "none" },
  { indicator: "flow", finalValue: "slow" },
  { indicator: "odor", finalValue: "none" },
];

async function submittedFixture() {
  const volunteer = await createVolunteer(setupDb);
  const site = await createSite(setupDb, { name: "FHIR Creek", lat: 12.9716, lng: 77.5946 });
  const created = await createAssessment(setupDb, {
    volunteerId: volunteer.id,
    siteId: site.id,
    observedAt: "2026-09-30T08:00:00.000Z",
    rainLast24h: "none",
  });
  const id = created!.id;
  for (const e of SIX) {
    await upsertIndicatorEntry(setupDb, {
      assessmentId: id,
      indicator: e.indicator,
      finalValue: e.finalValue,
      decisionSource: "human_only",
    });
  }
  await submitAssessment(setupDb, id, { photoWaived: true });
  return { id, cookie: volunteer.id };
}

beforeAll(async () => {
  process.env.DATABASE_URL = `file:${dbFile}`;
  setupClient = createClient({ url: `file:${dbFile}` });
  setupDb = drizzle(setupClient, { schema });
  await migrate(setupDb, { migrationsFolder: "./src/server/db/migrations" });

  ({ GET: GET_BUNDLE } = await import("@/app/api/assessments/[id]/fhir/route"));
  ({ POST: POST_VALIDATE } = await import("@/app/api/assessments/[id]/fhir/validate/route"));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(() => {
  setupClient.close();
});

describe("GET /api/assessments/:id/fhir", () => {
  it("returns a transaction Bundle for a submitted assessment", async () => {
    const { id, cookie } = await submittedFixture();
    const res = await GET_BUNDLE(
      new Request(`http://localhost/api/assessments/${id}/fhir`, {
        headers: { cookie: `st_vid=${cookie}` },
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(res.status).toBe(200);
    const bundle = (await res.json()) as {
      resourceType: string;
      type: string;
      entry: { fullUrl: string; request: { method: string; url: string } }[];
    };
    expect(bundle.resourceType).toBe("Bundle");
    expect(bundle.type).toBe("transaction");
    expect(bundle.entry).toHaveLength(15);
    expect(bundle.entry[0].fullUrl).toMatch(/^urn:uuid:/);
  });

  it("rejects drafts (409), strangers (404), and anonymous calls (403)", async () => {
    const { id } = await submittedFixture();
    const volunteer = await createVolunteer(setupDb);
    const site = await createSite(setupDb, { lat: 0, lng: 0 });
    const draft = await createAssessment(setupDb, {
      volunteerId: volunteer.id,
      siteId: site.id,
      observedAt: "2026-09-30T08:00:00.000Z",
      rainLast24h: "none",
    });
    const draftRes = await GET_BUNDLE(
      new Request(`http://localhost/api/assessments/${draft!.id}/fhir`, {
        headers: { cookie: `st_vid=${volunteer.id}` },
      }),
      { params: Promise.resolve({ id: draft!.id }) }
    );
    expect(draftRes.status).toBe(409);

    const stranger = await GET_BUNDLE(
      new Request(`http://localhost/api/assessments/${id}/fhir`, {
        headers: { cookie: "st_vid=00000000-0000-4000-8000-000000000000" },
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(stranger.status).toBe(404);

    const anon = await GET_BUNDLE(new Request(`http://localhost/api/assessments/${id}/fhir`), {
      params: Promise.resolve({ id }),
    });
    expect(anon.status).toBe(403);
  });
});

describe("POST /api/assessments/:id/fhir/validate", () => {
  function stubOutcome(outcome: unknown, status = 200) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: status >= 200 && status < 300,
        status,
        text: async () => JSON.stringify(outcome),
      }))
    );
  }

  it("stores the outcome and returns counts", async () => {
    const { id, cookie } = await submittedFixture();
    stubOutcome({
      resourceType: "OperationOutcome",
      issue: [
        { severity: "warning", code: "processing", diagnostics: "Unknown extension, ignored." },
        { severity: "information", code: "informational", diagnostics: "All good." },
      ],
    });
    const res = await POST_VALIDATE(
      new Request(`http://localhost/api/assessments/${id}/fhir/validate`, {
        method: "POST",
        headers: { cookie: `st_vid=${cookie}` },
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { errorCount: number; warningCount: number };
    expect(body).toMatchObject({ errorCount: 0, warningCount: 1 });

    const rows = await setupDb.select().from(fhirExports).where(eq(fhirExports.assessmentId, id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ errorCount: 0, warningCount: 1 });
    expect(rows[0].validatorBaseUrl).toContain("hapi.fhir.org");
  });

  it("returns 502 when the validator is unreachable", async () => {
    const { id, cookie } = await submittedFixture();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("socket hang up");
      })
    );
    const res = await POST_VALIDATE(
      new Request(`http://localhost/api/assessments/${id}/fhir/validate`, {
        method: "POST",
        headers: { cookie: `st_vid=${cookie}` },
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(res.status).toBe(502);
  });
});
