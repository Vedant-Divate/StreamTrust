/**
 * Secondary Gemini provider (ADR-0008). Default model live-verified on
 * 2026-09-30: `gemini-3.8-flash` reads a test image correctly over the
 * API. (`gemini-2.5-flash` returns 404 "no longer available to new users"
 * for current keys; see phase-4-preflight.md.)
 * Compile-checked plus one live describe call; full suggest-flow testing
 * is optional (see the Phase 4 gate).
 */
import { SYSTEM_PROMPT } from "@/server/ai/prompt";
import {
  ProviderError,
  type AssessmentProvider,
  type RawSuggestResult,
  type SuggestInput,
} from "@/server/ai/provider";

export const GEMINI_DEFAULT_MODEL = "gemini-3.8-flash";

const EXTRACTION_INSTRUCTION = `Assess these stream indicators from the attached photo(s) and return ONLY this JSON shape, no other text:
{"image_quality": "ok | blurry | too_dark | no_water_visible", "indicators": [{"indicator": "<code>", "value": "<code or cannot_determine>", "confidence": <0-1>, "evidence": "<max 240 chars>", "visible_cues": ["<cue>"]}]}`;

export class GeminiProvider implements AssessmentProvider {
  readonly name = "gemini" as const;
  readonly model: string;

  constructor(model?: string) {
    this.model = model ?? process.env.AI_MODEL ?? GEMINI_DEFAULT_MODEL;
  }

  async suggest(input: SuggestInput): Promise<RawSuggestResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ProviderError("GEMINI_API_KEY is not set.", false);
    }
    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
        {
          method: "POST",
          headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [
              {
                parts: [
                  {
                    text: `Rain in the last 24 hours: ${input.rainLast24h}.\n${EXTRACTION_INSTRUCTION}`,
                  },
                  ...input.images.map((img) => ({
                    inline_data: { mime_type: img.mime, data: img.base64 },
                  })),
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              topP: 0.9,
              maxOutputTokens: 800,
              responseMimeType: "application/json",
            },
          }),
          signal: input.signal,
        }
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderError("Gemini request timed out.", false);
      }
      throw new ProviderError(`Gemini request failed: ${(err as Error).message}`, true);
    }
    if (!res.ok) {
      const retryable = res.status >= 500;
      throw new ProviderError(`Gemini API error ${res.status}.`, retryable);
    }
    const body = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new ProviderError("Gemini returned no text.", true);
    try {
      const parsed = JSON.parse(text) as RawSuggestResult;
      if (!Array.isArray(parsed.indicators)) throw new Error("no indicators array");
      return parsed;
    } catch {
      throw new ProviderError("Gemini returned unparseable JSON.", true);
    }
  }
}
