/**
 * Insights route tests: demo filtering end to end through the handler.
 * Own temp file DB per file; files are left in the OS temp dir.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { assessments } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  createAssessment,
  createSite,
  createVolunteer,
  upsertIndicatorEntry,
} from "@/server/db/repositories/assessments";
import { insertSuggestion } from "@/server/db/repositories/suggestions";
import type { TestDb } from "../db/helpers";
import * as schema from "@/server/db/schema";

const dbFile = join(tmpdir(), `st-insights-test-${process.pid}-${Date.now()}.db`).replace(
  /\\/g,
  "/"
);

let GET_INSIGHTS: (req: Request) => Promise<Response>;
let setupDb: TestDb;
let setupClient: Client;

const SUGGESTION = {
  suggestedValue: "cloudy",
  confidenceBand: "medium",
  confidenceScore: 0.7,
  evidence: "Haze.",
  cuesJson: JSON.stringify(["haze"]),
  provider: "mock",
  model: "mock-1",
  promptVersion: "v1",
  latencyMs: 5,
  rawResponseJson: "{}",
};

async function submitted(isDemo: boolean, finalValue: string, source: string) {
  const volunteer = await createVolunteer(setupDb);
  const site = await createSite(setupDb, { lat: 1, lng: 1 });
  const a = await createAssessment(setupDb, {
    volunteerId: volunteer.id,
    siteId: site.id,
    observedAt: "2026-09-30T08:00:00.000Z",
    rainLast24h: "none",
  });
  await setupDb
    .update(assessments)
    .set({ isDemo, status: "submitted", submittedAt: "2026-09-30T09:00:00.000Z" })
    .where(eq(assessments.id, a!.id));
  await upsertIndicatorEntry(setupDb, {
    assessmentId: a!.id,
    indicator: "clarity",
    finalValue,
    decisionSource: source,
  });
  await insertSuggestion(setupDb, { assessmentId: a!.id, indicator: "clarity", ...SUGGESTION });
  return a!.id;
}

async function get(demo?: string) {
  const url = `http://localhost/api/insights${demo ? `?demo=${demo}` : ""}`;
  return GET_INSIGHTS(new Request(url));
}

beforeAll(async () => {
  process.env.DATABASE_URL = `file:${dbFile}`;
  setupClient = createClient({ url: `file:${dbFile}` });
  setupDb = drizzle(setupClient, { schema });
  await migrate(setupDb, { migrationsFolder: "./src/server/db/migrations" });

  ({ GET: GET_INSIGHTS } = await import("@/app/api/insights/route"));
});

afterAll(() => {
  setupClient.close();
});

describe("GET /api/insights", () => {
  it("excludes demo data by default and honors only/include", async () => {
    await submitted(false, "cloudy", "ai_accepted");
    await submitted(true, "muddy", "human_override");

    const def = (await (await get()).json()) as { summary: { pairs: number; agreed: number } };
    expect(def.summary).toMatchObject({ pairs: 1, agreed: 1 });

    const only = (await (await get("only")).json()) as {
      summary: { pairs: number; agreed: number };
    };
    expect(only.summary).toMatchObject({ pairs: 1, agreed: 0 });

    const incl = (await (await get("include")).json()) as {
      summary: { pairs: number; agreed: number; rate: number };
    };
    expect(incl.summary).toMatchObject({ pairs: 2, agreed: 1, rate: 50 });
  });

  it("rejects unknown demo modes", async () => {
    const res = await get("everything");
    expect(res.status).toBe(400);
  });
});
