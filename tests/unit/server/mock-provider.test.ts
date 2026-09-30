import { describe, expect, it } from "vitest";
import { MockProvider } from "@/server/ai/mock-provider";

describe("mock provider", () => {
  it("returns a deterministic, varied fixture", async () => {
    const provider = new MockProvider();
    expect(provider.name).toBe("mock");
    const first = await provider.suggest({ images: [], rainLast24h: "none", promptVersion: "v1" });
    const second = await provider.suggest({ images: [], rainLast24h: "none", promptVersion: "v1" });
    expect(first).toEqual(second);
    expect(first.image_quality).toBe("ok");
    expect(first.indicators).toHaveLength(6);
  });

  it("includes an abstention and a low-confidence case", async () => {
    const provider = new MockProvider();
    const result = await provider.suggest({ images: [], rainLast24h: "none", promptVersion: "v1" });
    const flow = result.indicators.find((i) => i.indicator === "flow");
    expect(flow?.value).toBe("cannot_determine");
    const color = result.indicators.find((i) => i.indicator === "color");
    expect(color!.confidence).toBeLessThan(0.5);
  });
});
