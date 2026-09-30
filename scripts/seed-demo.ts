/**
 * Seed clearly-synthetic demo assessments (PROJECT.md F-15, Phase 7).
 * Run:  DATABASE_URL=file:./local.db pnpm seed:demo
 *
 * IDEMPOTENT: fixed `demo-*` ids are deleted (children first) and
 * re-inserted, so re-running yields the identical dashboard. Never
 * touches non-demo rows. Every site name starts with "(Demo)".
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq, inArray, like } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import {
  aiSuggestions,
  assessments,
  indicatorEntries,
  sites,
  volunteers,
} from "../src/server/db/schema";

const VOLUNTEER_ID = "demo-volunteer";

const SITES = [
  { id: "demo-site-1", name: "(Demo) Mill Creek", lat: 12.9716, lng: 77.5946 },
  { id: "demo-site-2", name: "(Demo) Lake Outflow", lat: 13.0827, lng: 80.2707 },
  { id: "demo-site-3", name: "(Demo) Hill Stream", lat: 11.0168, lng: 76.9558 },
];

interface DemoEntry {
  indicator: string;
  final: string;
  suggested: string;
  band: "low" | "medium" | "high" | "none";
  score: number | null;
}

interface DemoAssessment {
  id: string;
  site: string;
  observedAt: string;
  rain: string;
  entries: DemoEntry[];
}

const E = (
  indicator: string,
  final: string,
  suggested: string,
  band: DemoEntry["band"],
  score: number | null
): DemoEntry => ({ indicator, final: final, suggested, band, score });

const ASSESSMENTS: DemoAssessment[] = [
  {
    id: "demo-assessment-01",
    site: "demo-site-1",
    observedAt: "2026-09-20T08:00:00.000Z",
    rain: "none",
    entries: [
      E("clarity", "clear", "clear", "high", 0.9),
      E("color", "colorless", "colorless", "high", 0.88),
      E("algae", "none", "none", "medium", 0.7),
      E("litter", "none", "none", "medium", 0.65),
      E("flow", "slow", "slow", "low", 0.4),
      E("odor", "none", "cannot_determine", "none", null),
    ],
  },
  {
    id: "demo-assessment-02",
    site: "demo-site-1",
    observedAt: "2026-09-21T08:00:00.000Z",
    rain: "light",
    entries: [
      E("clarity", "slightly_cloudy", "slightly_cloudy", "medium", 0.72),
      E("color", "brown", "brown", "medium", 0.68),
      E("algae", "patches", "patches", "high", 0.86),
      E("litter", "some", "some", "low", 0.45),
      E("flow", "moderate", "moderate", "medium", 0.6),
      E("odor", "earthy", "cannot_determine", "none", null),
    ],
  },
  {
    id: "demo-assessment-03",
    site: "demo-site-2",
    observedAt: "2026-09-21T09:00:00.000Z",
    rain: "none",
    entries: [
      E("clarity", "clear", "clear", "high", 0.92),
      E("color", "green", "green", "medium", 0.7),
      E("algae", "patches", "patches", "high", 0.84),
      E("litter", "none", "none", "high", 0.9),
      E("flow", "standing", "standing", "low", 0.35),
      E("odor", "none", "cannot_determine", "none", null),
    ],
  },
  {
    id: "demo-assessment-04",
    site: "demo-site-2",
    observedAt: "2026-09-22T08:00:00.000Z",
    rain: "none",
    entries: [
      E("clarity", "cloudy", "cloudy", "medium", 0.66),
      E("color", "colorless", "colorless", "low", 0.42),
      E("algae", "none", "none", "medium", 0.71),
      E("litter", "a_lot", "some", "medium", 0.62),
      E("flow", "slow", "slow", "low", 0.38),
      E("odor", "none", "cannot_determine", "none", null),
    ],
  },
  {
    id: "demo-assessment-05",
    site: "demo-site-1",
    observedAt: "2026-09-23T08:00:00.000Z",
    rain: "heavy",
    entries: [
      E("clarity", "muddy", "cloudy", "high", 0.83),
      E("color", "brown", "brown", "high", 0.88),
      E("algae", "none", "none", "medium", 0.7),
      E("litter", "some", "none", "low", 0.44),
      E("flow", "fast", "moderate", "medium", 0.6),
      E("odor", "earthy", "cannot_determine", "none", null),
    ],
  },
  {
    id: "demo-assessment-06",
    site: "demo-site-3",
    observedAt: "2026-09-23T09:00:00.000Z",
    rain: "heavy",
    entries: [
      E("clarity", "muddy", "muddy", "high", 0.9),
      E("color", "unusual", "brown", "medium", 0.64),
      E("algae", "patches", "none", "low", 0.4),
      E("litter", "none", "none", "high", 0.91),
      E("flow", "fast", "fast", "medium", 0.73),
      E("odor", "none", "cannot_determine", "none", null),
    ],
  },
  {
    id: "demo-assessment-07",
    site: "demo-site-3",
    observedAt: "2026-09-24T08:00:00.000Z",
    rain: "light",
    entries: [
      E("clarity", "slightly_cloudy", "cloudy", "high", 0.81),
      E("color", "colorless", "colorless", "medium", 0.69),
      E("algae", "none", "none", "high", 0.87),
      E("litter", "none", "none", "medium", 0.66),
      E("flow", "slow", "slow", "low", 0.33),
      E("odor", "none", "cannot_determine", "none", null),
    ],
  },
  {
    id: "demo-assessment-08",
    site: "demo-site-1",
    observedAt: "2026-09-25T08:00:00.000Z",
    rain: "none",
    entries: [
      E("clarity", "clear", "clear", "low", 0.46),
      E("color", "green", "colorless", "low", 0.41),
      E("algae", "heavy", "patches", "medium", 0.63),
      E("litter", "none", "none", "medium", 0.7),
      E("flow", "slow", "cannot_determine", "none", null),
      E("odor", "sewage_like", "cannot_determine", "none", null),
    ],
  },
  {
    id: "demo-assessment-09",
    site: "demo-site-2",
    observedAt: "2026-09-26T08:00:00.000Z",
    rain: "unknown",
    entries: [
      E("clarity", "cloudy", "cloudy", "low", 0.48),
      E("color", "brown", "brown", "low", 0.43),
      E("algae", "none", "patches", "low", 0.39),
      E("litter", "some", "some", "low", 0.47),
      E("flow", "moderate", "slow", "low", 0.36),
      E("odor", "none", "cannot_determine", "none", null),
    ],
  },
  {
    id: "demo-assessment-10",
    site: "demo-site-3",
    observedAt: "2026-09-27T08:00:00.000Z",
    rain: "none",
    entries: [
      E("clarity", "clear", "slightly_cloudy", "medium", 0.67),
      E("color", "colorless", "colorless", "medium", 0.74),
      E("algae", "none", "none", "high", 0.89),
      E("litter", "none", "a_lot", "medium", 0.61),
      E("flow", "standing", "standing", "low", 0.49),
      E("odor", "earthy", "cannot_determine", "none", null),
    ],
  },
];

function sourceFor(e: DemoEntry): string {
  if (e.suggested === "cannot_determine") return "human_only";
  return e.final === e.suggested ? "ai_accepted" : "human_override";
}

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./local.db";
  const client = createClient(
    url.startsWith("file:") ? { url } : { url, authToken: process.env.DATABASE_AUTH_TOKEN }
  );
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "./src/server/db/migrations" });

  const ids = ASSESSMENTS.map((a) => a.id);
  await db.delete(indicatorEntries).where(inArray(indicatorEntries.assessmentId, ids));
  await db.delete(aiSuggestions).where(inArray(aiSuggestions.assessmentId, ids));
  await db.delete(assessments).where(inArray(assessments.id, ids));
  await db.delete(sites).where(like(sites.name, "(Demo)%"));
  await db.insert(sites).values(
    SITES.map((s) => ({
      id: s.id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      accuracyM: null,
      createdAt: "2026-09-20T07:00:00.000Z",
    }))
  );
  const existing = await db.select().from(volunteers).where(eq(volunteers.id, VOLUNTEER_ID));
  if (existing.length === 0) {
    await db.insert(volunteers).values({ id: VOLUNTEER_ID, createdAt: "2026-09-20T07:00:00.000Z" });
  }

  for (const a of ASSESSMENTS) {
    const submittedAt = new Date(new Date(a.observedAt).getTime() + 60 * 60 * 1000).toISOString();
    await db.insert(assessments).values({
      id: a.id,
      volunteerId: VOLUNTEER_ID,
      siteId: a.site,
      observedAt: a.observedAt,
      rainLast24h: a.rain,
      notes: null,
      status: "submitted",
      isDemo: true,
      consentAt: a.observedAt,
      createdAt: a.observedAt,
      submittedAt,
    });
    for (const e of a.entries) {
      const suggestionId = randomUUID();
      await db.insert(aiSuggestions).values({
        id: suggestionId,
        assessmentId: a.id,
        indicator: e.indicator,
        suggestedValue: e.suggested,
        confidenceBand: e.band,
        confidenceScore: e.score,
        evidence: "Demo evidence.",
        cuesJson: "[]",
        provider: "mock",
        model: "mock-1",
        promptVersion: "v1",
        latencyMs: 5,
        rawResponseJson: "{}",
        createdAt: a.observedAt,
      });
      await db.insert(indicatorEntries).values({
        id: randomUUID(),
        assessmentId: a.id,
        indicator: e.indicator,
        finalValue: e.final,
        decisionSource: sourceFor(e),
        aiSuggestionId: e.suggested === "cannot_determine" ? null : suggestionId,
        updatedAt: a.observedAt,
      });
    }
  }
  console.log(`Seeded ${ASSESSMENTS.length} demo assessments (idempotent, demo-only).`);
  client.close();
}

main().catch((err) => {
  console.error("SEED_FAILED", err);
  process.exit(1);
});
