/**
 * R-SMELL-CLEAN path: trigger the warning, acknowledge it explicitly,
 * then submit successfully — all through the real UI.
 */
import { expect, test } from "@playwright/test";
import { markAssessmentDemo } from "./demo-flag";

test.use({ viewport: { width: 375, height: 667 } });

test("smell warning acknowledged then submitted", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Start an assessment" }).click();
  await page.locator("#lat").fill("12.9716");
  await page.locator("#lng").fill("77.5946");
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/assess\/[0-9a-f-]+$/, { timeout: 30000 });

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

  const answers: [string, string][] = [
    ["clarity", "clear"],
    ["color", "colorless"],
    ["algae", "none"],
    ["litter", "none"],
    ["flow", "slow"],
    ["odor", "sewage_like"],
  ];
  for (const [code, value] of answers) {
    await page.locator(`label[for="${code}-${value}"]`).click();
    await expect(page.locator(`#${code}-${value}`)).toBeChecked();
  }
  await expect(page.getByText("All changes saved.")).toBeVisible({ timeout: 15000 });

  await page.getByRole("link", { name: "Review and submit" }).click();
  await expect(page).toHaveURL(/\/review$/, { timeout: 30000 });
  await expect(page.getByText("You noted a strong smell")).toBeVisible();

  await page.getByRole("button", { name: "I understand, continue" }).click();
  await expect(page.getByText("Acknowledged")).toBeVisible({ timeout: 30000 });

  await page.getByRole("button", { name: "Submit assessment" }).click();
  await expect(page).toHaveURL(/\/done$/, { timeout: 30000 });
  await expect(page.getByRole("heading", { name: "Assessment saved. Thank you!" })).toBeVisible({
    timeout: 30000,
  });
  // Flag last: test rows must never pose as genuine submissions.
  await markAssessmentDemo(page.url().match(/\/assess\/([0-9a-f-]+)\/done$/)![1]);
});
