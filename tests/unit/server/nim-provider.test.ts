import { afterEach, describe, expect, it, vi } from "vitest";
import { NIM_LLAMA_MODEL, NIM_NEMOTRON_MODEL, NimProvider } from "@/server/ai/nim-provider";
import { ProviderError } from "@/server/ai/provider";

const INPUT = { images: [], rainLast24h: "light" as const, promptVersion: "v1" };

function stubFetch(handler: (url: string, init: RequestInit) => unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => handler(url, init))
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.NIM_API_KEY;
});

describe("nim provider (stubbed fetch, no live calls)", () => {
  it("uses the nemotron function-calling path by default", async () => {
    process.env.NIM_API_KEY = "test-key";
    let seen: Record<string, unknown> = {};
    stubFetch((_url, init) => {
      seen = JSON.parse(init.body as string) as Record<string, unknown>;
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    function: {
                      name: "record_indicators",
                      arguments: JSON.stringify({
                        image_quality: "ok",
                        indicators: [
                          {
                            indicator: "clarity",
                            value: "cloudy",
                            confidence: 0.7,
                            evidence: "Haze.",
                            visible_cues: ["haze"],
                          },
                        ],
                      }),
                    },
                  },
                ],
              },
            },
          ],
        }),
      };
    });
    const provider = new NimProvider(NIM_NEMOTRON_MODEL);
    expect(provider.model).toBe(NIM_NEMOTRON_MODEL);
    const out = await provider.suggest(INPUT);
    expect(out.indicators).toHaveLength(1);
    expect(out.indicators[0]).toMatchObject({ indicator: "clarity", value: "cloudy" });
    const tools = seen.tools as { function: { name: string } }[];
    expect(tools[0].function.name).toBe("record_indicators");
    expect(seen.tool_choice).toMatchObject({ type: "function" });
    expect(seen.reasoning_budget).toBe(2048);
    expect(seen.temperature).toBe(0.3);
  });

  it("uses the prompt-JSON path for the llama fallback model", async () => {
    process.env.NIM_API_KEY = "test-key";
    let seen: Record<string, unknown> = {};
    stubFetch((_url, init) => {
      seen = JSON.parse(init.body as string) as Record<string, unknown>;
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  image_quality: "ok",
                  indicators: [
                    {
                      indicator: "color",
                      value: "brown",
                      confidence: 0.4,
                      evidence: "Brown.",
                      visible_cues: [],
                    },
                  ],
                }),
              },
            },
          ],
        }),
      };
    });
    const provider = new NimProvider(NIM_LLAMA_MODEL);
    const out = await provider.suggest(INPUT);
    expect(out.indicators).toMatchObject([{ indicator: "color", value: "brown" }]);
    expect(seen.tools).toBeUndefined();
    expect(seen.reasoning_budget).toBeUndefined();
  });

  it("defaults to the fast llama path", () => {
    expect(new NimProvider().model).toBe(NIM_LLAMA_MODEL);
  });

  it("classifies failures for the retry policy", async () => {
    process.env.NIM_API_KEY = "test-key";
    stubFetch(() => ({ ok: false, status: 503 }));
    await expect(new NimProvider().suggest(INPUT)).rejects.toMatchObject({
      name: "ProviderError",
      retryable: true,
    });
    stubFetch(() => ({ ok: false, status: 400 }));
    await expect(new NimProvider().suggest(INPUT)).rejects.toMatchObject({ retryable: false });
    delete process.env.NIM_API_KEY;
    await expect(new NimProvider().suggest(INPUT)).rejects.toThrow("NIM_API_KEY is not set");
  });

  it("strips markdown fences from prompt-JSON payloads", async () => {
    process.env.NIM_API_KEY = "test-key";
    stubFetch(() => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                'Here is the assessment:\n```json\n{"image_quality": "ok", "indicators": []}\n```',
            },
          },
        ],
      }),
    }));
    const out = await new NimProvider(NIM_LLAMA_MODEL).suggest(INPUT);
    expect(out.image_quality).toBe("ok");
    expect(out.indicators).toEqual([]);
  });

  it("extracts JSON wrapped in prose", async () => {
    process.env.NIM_API_KEY = "test-key";
    stubFetch(() => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                'Here is my assessment:\n{"image_quality": "ok", "indicators": []}\nHope that helps!',
            },
          },
        ],
      }),
    }));
    const out = await new NimProvider(NIM_LLAMA_MODEL).suggest(INPUT);
    expect(out.image_quality).toBe("ok");
    expect(out.indicators).toEqual([]);
  });

  it("treats unparseable payloads as retryable schema failures", async () => {
    process.env.NIM_API_KEY = "test-key";
    stubFetch(() => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "not json" } }] }),
    }));
    const provider = new NimProvider(NIM_LLAMA_MODEL);
    let caught: unknown;
    try {
      await provider.suggest(INPUT);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ProviderError);
    expect((caught as ProviderError).retryable).toBe(true);
  });
});
