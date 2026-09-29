/**
 * Phase 3 happy path: create → photos → indicators → review → submit →
 * done, with zero AI involvement. Runs at phone width (375 px) and
 * exercises keyboard operation plus the real client-side photo resize.
 */
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 375, height: 667 } });

test("human-only happy path", async ({ page }) => {
  // Landing
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "See your stream clearly." })).toBeVisible();
  await page.getByRole("link", { name: "Start an assessment" }).click();
  await expect(page).toHaveURL(/\/assess\/new$/);
  await expect(page.getByText("Step 1 of 4")).toBeVisible();

  // Step 1: keyboard tab order reaches lat/lng, consent toggles with Space
  await page.locator("#site-name").focus();
  await page.keyboard.press("Tab");
  await expect(page.locator("#lat")).toBeFocused();
  await page.keyboard.type("12.9716");
  await page.keyboard.press("Tab");
  await expect(page.locator("#lng")).toBeFocused();
  await page.keyboard.type("77.5946");
  await page.locator("#rain").selectOption("light");
  await page.locator("#consent").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#consent")).toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();
  // Cold dev-server compile can take a while on first navigation.
  await expect(page).toHaveURL(/\/assess\/[0-9a-f-]+$/, { timeout: 30000 });
  const wizardUrl = page.url();

  // Step 2: upload a 3000px-wide photo generated in the browser; the UI
  // must resize it to 1600px before the server stores it.
  const filePayload = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 3000;
    canvas.height = 2000;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#3a6ea5";
    ctx.fillRect(0, 0, 3000, 2000);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9)
    );
    const buffer = new Uint8Array(await blob.arrayBuffer());
    return { bytes: Array.from(buffer), type: "image/jpeg", name: "stream.jpg" };
  });
  await page.locator("#photo-input").setInputFiles({
    name: filePayload.name,
    mimeType: filePayload.type,
    buffer: Buffer.from(filePayload.bytes),
  });
  await expect(page.getByAltText(/Stream photo/)).toBeVisible({ timeout: 60000 });
  await expect(page.getByText("1600 × 1067")).toBeVisible({ timeout: 60000 });

  // Step 3: answer all six questions via their labels (radios are
  // visually hidden but focusable; keyboard operation itself is proven
  // by the Tab-order and Space-toggle assertions on step 1).
  await page.locator('label[for="clarity-clear"]').click();
  await page.locator('label[for="color-green"]').click();
  await page.locator('label[for="algae-patches"]').click();
  await page.locator('label[for="litter-some"]').click();
  await page.locator('label[for="flow-slow"]').click();
  await page.locator('label[for="odor-earthy"]').click();
  await expect(page.getByText("All changes saved.")).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: "docs/verification/screenshots/phase-3-indicators.png" });

  // Step 4: review lists every answer, then submit
  await page.getByRole("link", { name: "Review and submit" }).click();
  await expect(page).toHaveURL(/\/review$/, { timeout: 30000 });
  for (const answer of [
    "Clear",
    "Green tint",
    "Some patches",
    "A little",
    "Slow",
    "Earthy or musty",
  ]) {
    await expect(page.getByText(answer, { exact: true }).first()).toBeVisible();
  }
  await page.screenshot({ path: "docs/verification/screenshots/phase-3-review.png" });
  await page.getByRole("button", { name: "Submit assessment" }).click();

  // Done: success, raw data, submitted status — no AI anywhere
  await expect(page).toHaveURL(/\/done$/, { timeout: 30000 });
  await expect(page.getByRole("heading", { name: "Assessment saved. Thank you!" })).toBeVisible({
    timeout: 30000,
  });
  await page.getByText("Raw JSON").click();
  const raw = await page.locator("pre").innerText();
  expect(raw).toContain('"status": "submitted"');
  expect(raw).toContain('"decisionSource": "human_only"');
  expect(page.url()).toBe(wizardUrl.replace(/\/assess\/([0-9a-f-]+)$/, "/assess/$1/done"));
  await page.screenshot({ path: "docs/verification/screenshots/phase-3-done.png" });
});
