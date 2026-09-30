/**
 * E2E helper: flag an assessment created by a browser test as demo data.
 * Playwright specs drive the real UI/API, so their rows would otherwise be
 * indistinguishable from genuine submissions (Section 7's demo-data
 * principle). Called at the end of each spec, after all assertions, so it
 * cannot mask a product failure. Targets the e2e database the Playwright
 * webServer is pinned to (override with E2E_DATABASE_URL if changed there).
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { assessments } from "../../src/server/db/schema";

export async function markAssessmentDemo(assessmentId: string): Promise<void> {
  const url = process.env.E2E_DATABASE_URL ?? "file:./e2e.db";
  const client = createClient({ url });
  const db = drizzle(client);
  await db.update(assessments).set({ isDemo: true }).where(eq(assessments.id, assessmentId));
  client.close();
}
