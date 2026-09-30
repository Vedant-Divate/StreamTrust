/**
 * POST /api/assessments/:id/suggest — run AI suggestions on the current
 * photos and store them (owner only, draft only).
 * - DB-backed rate limit: 10 calls per volunteer per hour (Section 8.4)
 * - Idempotent per (assessment, photo set) unless `rerun: true`
 * - 25 s timeout; one retry only on schema failure or retryable error
 * - Raw provider payload is stored on every call for auditability
 */
import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/server/db/client";
import { rateEvents } from "@/server/db/schema";
import { insertSuggestion } from "@/server/db/repositories/suggestions";
import { getPhotosByAssessment } from "@/server/db/repositories/photos";
import { getSuggestionsByAssessment } from "@/server/db/repositories/suggestions";
import { PROMPT_VERSION } from "@/server/ai/prompt";
import {
  ProviderError,
  type AssessmentProvider,
  type RawSuggestResult,
} from "@/server/ai/provider";
import { MockProvider } from "@/server/ai/mock-provider";
import { normalizeSuggestions } from "@/server/ai/normalize";
import { errorBody, requireOwnedAssessment } from "@/server/security/volunteer-cookie";
import { RAIN_LAST_24H_CODES, type RainLast24h } from "@/domain/vocab";

export const maxDuration = 60;

const SUGGEST_TIMEOUT_MS = 25_000;
const SUGGEST_LIMIT_PER_HOUR = 10;

type Ctx = { params: Promise<{ id: string }> };

async function getProvider(): Promise<AssessmentProvider> {
  const name = process.env.AI_PROVIDER ?? "mock";
  if (name === "mock") return new MockProvider();
  if (name === "gemini") {
    const { GeminiProvider } = await import("@/server/ai/gemini-provider");
    return new GeminiProvider();
  }
  return Promise.reject(
    Object.assign(new Error(`Provider '${name}' is not available yet.`), { status: 501 })
  );
}

function photoSetHash(sha256s: string[]): string {
  return createHash("sha256")
    .update([...sha256s].sort().join("|"))
    .digest("hex");
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ProviderError("AI request timed out.", false)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!));
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const owned = await requireOwnedAssessment(db, id, req);
  if (owned.error) return owned.error;
  if (owned.assessment.status !== "draft") {
    return NextResponse.json(errorBody("not_draft", "Submitted assessments cannot be edited."), {
      status: 409,
    });
  }

  const photos = await getPhotosByAssessment(db, id);
  if (photos.length === 0) {
    return NextResponse.json(errorBody("no_photos", "Add at least one photo first."), {
      status: 400,
    });
  }

  let rerun = false;
  try {
    const body = (await req.json()) as { rerun?: unknown };
    rerun = body.rerun === true;
  } catch {
    rerun = false;
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = await db
    .select({ id: rateEvents.id })
    .from(rateEvents)
    .where(
      and(
        eq(rateEvents.volunteerId, owned.volunteerId),
        eq(rateEvents.kind, "suggest"),
        gte(rateEvents.createdAt, oneHourAgo)
      )
    );
  if (recent.length >= SUGGEST_LIMIT_PER_HOUR) {
    return NextResponse.json(
      errorBody("rate_limited", "Too many suggestion requests. Try again later."),
      { status: 429 }
    );
  }

  const existing = await getSuggestionsByAssessment(db, id);
  const newestPhoto = photos
    .map((p) => p.createdAt)
    .sort()
    .at(-1)!;
  const newestSuggestion = existing
    .map((s) => s.createdAt)
    .sort()
    .at(-1);
  if (!rerun && newestSuggestion && newestPhoto <= newestSuggestion) {
    return NextResponse.json({
      suggestions: existing.map(toPublic),
      deduped: true,
      photoSetHash: photoSetHash(photos.map((p) => p.sha256)),
    });
  }

  let provider: AssessmentProvider;
  try {
    provider = await getProvider();
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    return NextResponse.json(errorBody("provider_unavailable", (err as Error).message), {
      status,
    });
  }

  const rain = (RAIN_LAST_24H_CODES as readonly string[]).includes(owned.assessment.rainLast24h)
    ? (owned.assessment.rainLast24h as RainLast24h)
    : ("unknown" as RainLast24h);
  const input = {
    images: photos.map((p) => ({
      mime: "image/jpeg" as const,
      base64: Buffer.from(p.bytes).toString("base64"),
    })),
    rainLast24h: rain,
    promptVersion: PROMPT_VERSION,
  };

  let raw: RawSuggestResult | undefined;
  let latencyMs = 0;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const started = Date.now();
    try {
      raw = await withTimeout(provider.suggest(input), SUGGEST_TIMEOUT_MS);
    } catch (err) {
      if (err instanceof ProviderError && err.retryable && attempt === 1) continue;
      const code =
        err instanceof ProviderError && err.message.includes("timed out")
          ? "provider_timeout"
          : "provider_failed";
      return NextResponse.json(errorBody(code, "The AI provider failed. Continue manually."), {
        status: 502,
      });
    }
    latencyMs = Date.now() - started;
    if (normalizeSuggestions(raw).length > 0) break;
    if (attempt === 2) {
      return NextResponse.json(
        errorBody("provider_failed", "The AI returned no usable suggestions. Continue manually."),
        { status: 502 }
      );
    }
    // Schema failure: one retry.
  }

  const normalized = normalizeSuggestions(raw);
  const stored = [];
  for (const s of normalized) {
    const row = await insertSuggestion(db, {
      assessmentId: id,
      indicator: s.indicator,
      suggestedValue: s.suggestedValue,
      confidenceBand: s.confidenceBand,
      ...(s.confidenceScore === null ? {} : { confidenceScore: s.confidenceScore }),
      evidence: s.evidence,
      cuesJson: JSON.stringify(s.cues),
      provider: provider.name,
      model: provider.model,
      promptVersion: PROMPT_VERSION,
      latencyMs,
      rawResponseJson: JSON.stringify(raw),
    });
    stored.push(row);
  }
  await db.insert(rateEvents).values({
    id: randomUUID(),
    volunteerId: owned.volunteerId,
    kind: "suggest",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({
    suggestions: stored.map(toPublic),
    deduped: false,
    provider: provider.name,
    model: provider.model,
    photoSetHash: photoSetHash(photos.map((p) => p.sha256)),
  });
}

function toPublic(s: {
  indicator: string;
  suggestedValue: string;
  confidenceBand: string;
  evidence: string;
  cuesJson: string;
}) {
  return {
    indicator: s.indicator,
    suggested_value: s.suggestedValue,
    confidence_band: s.confidenceBand,
    evidence: s.evidence,
    cues: JSON.parse(s.cuesJson) as string[],
  };
}
