/**
 * Health readiness (scoped follow-up to Phase 8 §4): GET /api/health must
 * report 200 only when the database is reachable AND migrated. A
 * reachable-but-unmigrated DB (the exact state Phase 8's probe found)
 * must yield a non-200 status with a clear reason, so deploy smoke tests
 * can trust the endpoint as a readiness signal.
 *
 * Each case re-imports the real route against its own temp file DB
 * (clearing the dev-global client cache first); test files run module-
 * isolated, so no other suite is affected.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "@/server/db/schema";

function freshFile(tag: string): string {
  return join(tmpdir(), `st-health-${process.pid}-${Date.now()}-${tag}.db`).replace(/\\/g, "/");
}

async function getHealth(url: string): Promise<Response> {
  process.env.DATABASE_URL = url;
  delete (globalThis as Record<string, unknown>).__streamtrustDb;
  vi.resetModules();
  const mod = await import("@/app/api/health/route");
  return mod.GET();
}

describe("GET /api/health migration readiness", () => {
  // Each test re-transforms the route module graph via resetModules;
  // allow headroom when the machine is saturated (cf. hookTimeout bump).
  it(
    "reports 503 with a clear reason against a reachable-but-unmigrated DB",
    { timeout: 30000 },
    async () => {
      // No client ever touches this file: the route's own SELECT 1 creates
      // the empty DB, proving reachability without any migrated tables.
      const res = await getHealth(`file:${freshFile("empty")}`);
      expect(res.status).toBe(503);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json.status).toBe("unavailable");
      expect(json.db).toBe("unmigrated");
      expect(String(json.detail)).toMatch(/db reachable but not migrated/);
      expect(String(json.detail)).toMatch(/volunteers/);
    }
  );

  it("reports 200 healthy against a migrated DB", { timeout: 30000 }, async () => {
    const url = `file:${freshFile("migrated")}`;
    const client = createClient({ url });
    try {
      await migrate(drizzle(client, { schema }), {
        migrationsFolder: "./src/server/db/migrations",
      });
      const res = await getHealth(url);
      expect(res.status).toBe(200);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json.status).toBe("ok");
      expect(json.db).toBe("up");
      expect(json).not.toHaveProperty("detail");
    } finally {
      client.close();
    }
  });
});
