/**
 * Automated accessibility checks (Phase 8): axe with no serious-or-worse
 * violations on the main public and wizard pages.
 */
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter((v) =>
    ["serious", "critical"].includes(v.impact ?? "")
  );
  expect(
    blocking.map((v) => `${v.id}: ${v.description} (${v.nodes.length} nodes)`),
    "axe serious/critical violations"
  ).toEqual([]);
}

test("landing has no serious axe violations", async ({ page }) => {
  await page.goto("/");
  await expectAccessible(page);
});

test("new assessment has no serious axe violations", async ({ page }) => {
  await page.goto("/assess/new");
  await expectAccessible(page);
});

test("wizard step has no serious axe violations", async ({ page, request }) => {
  const res = await request.post("/api/assessments", {
    data: {
      site: { lat: 12.9716, lng: 77.5946 },
      observed_at: "2026-09-30T08:00:00.000Z",
      rain_last_24h: "none",
      consent: true,
    },
  });
  expect(res.ok()).toBe(true);
  const { assessment } = (await res.json()) as { assessment: { id: string } };
  const stVid = (res.headers()["set-cookie"] ?? "").match(/st_vid=([^;]+)/)?.[1];
  expect(stVid).toBeTruthy();
  await page
    .context()
    .addCookies([{ name: "st_vid", value: stVid!, domain: "localhost", path: "/" }]);
  await page.goto(`/assess/${assessment.id}`);
  await expect(page.getByText("Describe the water")).toBeVisible({ timeout: 30000 });
  await expectAccessible(page);
});

test("insights has no serious axe violations", async ({ page }) => {
  await page.goto("/insights");
  await expect(page.getByRole("heading", { name: "Community insights" })).toBeVisible({
    timeout: 30000,
  });
  await expectAccessible(page);
});
