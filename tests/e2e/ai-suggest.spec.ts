/**
 * AI suggestion paths with the mock provider (AI_PROVIDER=mock):
 * accepting a suggestion records ai_accepted, overriding records
 * human_override, and abstentions show no button.
 */
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 375, height: 667 } });

test("accept and override suggestions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Start an assessment" }).click();
  await page.locator("#lat").fill("12.9716");
  await page.locator("#lng").fill("77.5946");
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/assess\/[0-9a-f-]+$/, { timeout: 30000 });
  const id = page.url().match(/\/assess\/([0-9a-f-]+)$/)![1];

  // Small in-browser photo (no resize assertion needed here).
  const filePayload = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    canvas.getContext("2d")!.fillStyle = "#3a6ea5";
    canvas.getContext("2d")!.fillRect(0, 0, 800, 600);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9)
    );
    return { bytes: Array.from(new Uint8Array(await blob.arrayBuffer())) };
  });
  await page.locator("#photo-input").setInputFiles({
    name: "stream.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(filePayload.bytes),
  });
  await expect(page.getByAltText(/Stream photo/)).toBeVisible({ timeout: 60000 });

  // Request suggestions; panel shows chip, band, evidence, button.
  await page.getByRole("button", { name: "Get AI suggestions" }).click();
  await expect(page.getByText("AI suggests: cloudy")).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("Medium confidence").first()).toBeVisible();
  await page.getByText("Why?").first().click();
  await expect(page.getByText(/uniform grey-brown haze/)).toBeVisible();
  // Abstained odor shows the message and no button in its card.
  await expect(page.getByText("AI can't tell from a photo").first()).toBeVisible();

  // Accept clarity, override color (mock suggests brown), answer the rest.
  await page.getByRole("button", { name: "Use suggestion" }).first().click();
  await expect(page.locator("#clarity-cloudy")).toBeChecked();
  await page.locator('label[for="color-green"]').click();
  await page.locator('label[for="algae-patches"]').click();
  await page.locator('label[for="litter-none"]').click();
  await page.locator('label[for="flow-slow"]').click();
  await page.locator('label[for="odor-earthy"]').click();
  await expect(page.getByText("All changes saved.")).toBeVisible({ timeout: 15000 });

  await page.getByRole("link", { name: "Review and submit" }).click();
  await expect(page).toHaveURL(/\/review$/, { timeout: 30000 });
  await page.getByRole("button", { name: "Submit assessment" }).click();
  await expect(page).toHaveURL(/\/done$/, { timeout: 30000 });
  await expect(page.getByRole("heading", { name: "Assessment saved. Thank you!" })).toBeVisible({
    timeout: 30000,
  });

  const view = await page.evaluate(async (aid: string) => {
    const res = await fetch(`/api/assessments/${aid}`);
    return (await res.json()) as {
      entries: { indicator: string; decisionSource: string }[];
    };
  }, id);
  const byIndicator = Object.fromEntries(view.entries.map((e) => [e.indicator, e]));
  expect(byIndicator.clarity.decisionSource).toBe("ai_accepted");
  expect(byIndicator.color.decisionSource).toBe("human_override");
  expect(byIndicator.odor.decisionSource).toBe("human_only");
});
