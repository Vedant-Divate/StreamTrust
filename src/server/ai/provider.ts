/**
 * AI provider abstraction (PROJECT.md Section 8.1, ADR-0008).
 * `nim` is primary, `gemini` secondary, `mock` for tests/dev only.
 * Providers return the raw decoded payload; `normalize.ts` enforces the
 * output contract unconditionally afterwards.
 */
import type { RainLast24h } from "@/domain/vocab";

export type ProviderName = "nim" | "gemini" | "mock";

export interface SuggestInput {
  images: { mime: "image/jpeg"; base64: string }[];
  rainLast24h: RainLast24h;
  promptVersion: string;
  signal?: AbortSignal;
}

export interface RawIndicatorSuggestion {
  indicator: string;
  value: string;
  confidence: number;
  evidence: string;
  visible_cues: string[];
}

export interface RawSuggestResult {
  image_quality: string;
  indicators: RawIndicatorSuggestion[];
}

export interface AssessmentProvider {
  readonly name: ProviderName;
  readonly model: string;
  suggest(input: SuggestInput): Promise<RawSuggestResult>;
}

/** Thrown by providers for transport/API failures. */
export class ProviderError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "ProviderError";
    this.retryable = retryable;
  }
}
