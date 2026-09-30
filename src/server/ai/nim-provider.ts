/**
 * Primary NIM provider (ADR-0008, pre-flight validated in
 * docs/verification/phase-4-preflight.md).
 * - Nemotron model: forced function-calling path (single tool carrying
 *   the Section 8.2 schema), reasoning_budget 2048 (worst observed 18 s
 *   < 25 s timeout).
 * - Llama model (fallback): prompt-engineered JSON path, no tools.
 * Model IDs are the vendor-prefixed slugs confirmed live in pre-flight.
 */
import { SYSTEM_PROMPT } from "@/server/ai/prompt";
import {
  ProviderError,
  type AssessmentProvider,
  type RawSuggestResult,
  type SuggestInput,
} from "@/server/ai/provider";

export const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
export const NIM_NEMOTRON_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
export const NIM_LLAMA_MODEL = "meta/llama-3.2-11b-vision-instruct";

const TOOL_NAME = "record_indicators";

const INDICATOR_ENUM = ["clarity", "color", "algae", "litter", "flow", "odor"];

const EXTRACTION_INSTRUCTION = `Assess these stream indicators from the attached photo(s) and return ONLY this JSON shape, no other text:
{"image_quality": "ok | blurry | too_dark | no_water_visible", "indicators": [{"indicator": "<one of clarity, color, algae, litter, flow, odor>", "value": "<value code or cannot_determine>", "confidence": <0-1>, "evidence": "<max 240 chars of visible evidence>", "visible_cues": ["<cue>"]}]}`;

function toolDefinition() {
  return [
    {
      type: "function",
      function: {
        name: TOOL_NAME,
        description: "Record stream indicator assessments from photos.",
        parameters: {
          type: "object",
          properties: {
            image_quality: {
              type: "string",
              enum: ["ok", "blurry", "too_dark", "no_water_visible"],
            },
            indicators: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  indicator: { type: "string", enum: INDICATOR_ENUM },
                  value: { type: "string" },
                  confidence: { type: "number" },
                  evidence: { type: "string" },
                  visible_cues: { type: "array", items: { type: "string" } },
                },
                required: ["indicator", "value", "confidence", "evidence", "visible_cues"],
              },
            },
          },
          required: ["image_quality", "indicators"],
        },
      },
    },
  ];
}

interface NimMessage {
  content?: string | null;
  tool_calls?: { function?: { name?: string; arguments?: string } }[];
}

export class NimProvider implements AssessmentProvider {
  readonly name = "nim" as const;
  readonly model: string;

  constructor(model?: string) {
    this.model = model || process.env.AI_MODEL || NIM_NEMOTRON_MODEL;
  }

  private get useTools(): boolean {
    return this.model.includes("nemotron");
  }

  async suggest(input: SuggestInput): Promise<RawSuggestResult> {
    const apiKey = process.env.NIM_API_KEY;
    if (!apiKey) {
      throw new ProviderError("NIM_API_KEY is not set.", false);
    }
    const imageBlocks = input.images.map((img) => ({
      type: "image_url",
      image_url: { url: `data:${img.mime};base64,${img.base64}` },
    }));
    const body: Record<string, unknown> = {
      model: this.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `Rain in the last 24 hours: ${input.rainLast24h}.` +
                (this.useTools ? "" : ` ${EXTRACTION_INSTRUCTION}`),
            },
            ...imageBlocks,
          ],
        },
      ],
      temperature: 0.3,
      top_p: 0.9,
      max_tokens: 800,
    };
    if (this.useTools) {
      body.tools = toolDefinition();
      body.tool_choice = { type: "function", function: { name: TOOL_NAME } };
      body.reasoning_budget = 2048;
    }

    let res: Response;
    try {
      res = await fetch(NIM_BASE_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: input.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderError("NIM request timed out.", false);
      }
      throw new ProviderError(`NIM request failed: ${(err as Error).message}`, true);
    }
    if (!res.ok) {
      throw new ProviderError(`NIM API error ${res.status}.`, res.status >= 500);
    }
    const payload = (await res.json()) as { choices?: { message?: NimMessage }[] };
    const message = payload.choices?.[0]?.message;
    if (this.useTools) {
      const args = message?.tool_calls?.[0]?.function?.arguments;
      if (!args) throw new ProviderError("NIM returned no tool call.", true);
      return parsePayload(args);
    }
    if (typeof message?.content !== "string" || message.content.length === 0) {
      throw new ProviderError("NIM returned no text.", true);
    }
    return parsePayload(message.content);
  }
}

function parsePayload(text: string): RawSuggestResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new ProviderError("NIM returned unparseable JSON.", true);
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as { indicators?: unknown }).indicators)
  ) {
    throw new ProviderError("NIM returned JSON without an indicators array.", true);
  }
  return parsed as RawSuggestResult;
}
