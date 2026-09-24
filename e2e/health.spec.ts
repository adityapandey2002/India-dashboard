import { test, expect } from "@playwright/test";
import { CRITICAL_PATHS } from "./helpers/pages";
import {
  installCollectors,
  checkPageHealth,
  formatHealth,
  type PageHealth,
} from "./helpers/health";
import { getCountryCount, getIndicatorName } from "./helpers/db";

/**
 * Flow 8 — app health check.
 * Every critical page must load WITHOUT:
 *   - a Next.js dev error overlay (portal dialog),
 *   - a "digest" server error marker,
 *   - unhandled page errors,
 *   - unexpected console errors.
 * All captured messages are annotated on the test and printed in the report.
 */

const healthResults: Array<{ path: string; health: PageHealth }> = [];

test.describe("App health — no error overlay, no digest, no console/page errors", () => {
  test("DB sanity — local SQLite is reachable for trend cross-checks", () => {
    expect(getCountryCount(), "countries in data/india.db").toBeGreaterThan(0);
    expect(getIndicatorName("infant_mortality")).toBe("Infant mortality rate");
  });

  for (const critical of CRITICAL_PATHS) {
    test(`health: ${critical.name} (${critical.path})`, async ({ page }) => {
      const collector = installCollectors(page);

      await page.goto(critical.path, { waitUntil: "load" });
      // Let client-side data fetches + hydration settle
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(1500);

      const health = await checkPageHealth(page, critical.path, collector);

      test.info().annotations.push({
        type: "health",
        description: formatHealth(health),
      });
      test.info().annotations.push({
        type: "console errors",
        description:
          health.consoleErrors.length || collector.consoleErrors.length
            ? collector.consoleErrors.join("\n")
            : "none",
      });
      test.info().annotations.push({
        type: "page errors",
        description: health.pageErrors.length
          ? health.pageErrors.join("\n").slice(0, 2000)
          : "none",
      });

      healthResults.push({ path: critical.path, health });

      expect
        .soft(health.overlay, `Next.js error overlay on ${critical.path}: ${health.overlayText}`)
        .toBe(false);
      expect.soft(health.digest, `digest error on ${critical.path}`).toBeNull();
      expect.soft(health.pageErrors, `page errors on ${critical.path}`).toEqual([]);
      expect.soft(health.consoleErrors, `console errors on ${critical.path}`).toEqual([]);
    });
  }

  test.afterAll("print health summary", () => {
    // eslint-disable-next-line no-console
    console.log("\n==================== E2E HEALTH SUMMARY ====================");
    for (const r of healthResults) {
      // eslint-disable-next-line no-console
      console.log(
        `[${r.path}] ${r.health.overlay ? "OVERLAY!" : "no-overlay"}` +
          ` | digest=${r.health.digest ?? "none"}` +
          ` | pageErrors=${r.health.pageErrors.length}` +
          ` | consoleErrors=${r.health.consoleErrors.length}`,
      );
    }
    // eslint-disable-next-line no-console
    console.log("============================================================");
  });
});