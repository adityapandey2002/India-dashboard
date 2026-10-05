import { test, expect, type Page } from "@playwright/test";
import { computeExpectedTrend } from "./helpers/db";
import {
  installCollectors,
  unexpectedConsoleErrors,
  type Collector,
} from "./helpers/health";

/**
 * Critical-user-journey E2E tests for the India Dashboard.
 * The Next.js dev server must be running on http://localhost:3456.
 */

/** Mark a test with whatever console/page errors were captured. */
function annotateErrors(info: { annotations: { type: string; description?: string }[] }, collector: Collector, pagePath: string) {
  const consoleErrors = unexpectedConsoleErrors(collector);
  if (consoleErrors.length) {
    info.annotations.push({
      type: `console-errors (${pagePath})`,
      description: consoleErrors.join("\n"),
    });
  }
  if (collector.pageErrors.length) {
    info.annotations.push({
      type: `page-errors (${pagePath})`,
      description: collector.pageErrors.join("\n").slice(0, 1000),
    });
  }
  return { consoleErrors, pageErrors: collector.pageErrors };
}

async function clickExploreTab(page: Page, name: string) {
  const byRole = page.getByRole("tab", { name, exact: true });
  if ((await byRole.count()) > 0) {
    await byRole.click();
  } else {
    await page
      .locator('[data-slot="tabs-trigger"]', { hasText: name })
      .first()
      .click();
  }
}

test.describe("India Dashboard — critical user flows", () => {
  test("1. Home / renders KPI cards and loads without an error overlay", async ({ page }) => {
    const collector = installCollectors(page);

    await page.goto("/", { waitUntil: "load" });

    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toContainText("How is India performing");
    // KPI grid renders the expected cards (button[title="Click for year-wise trend"])
    const kpiButtons = page.locator('button[title="Click for year-wise trend"]');
    await expect(kpiButtons.first()).toBeVisible();
    await expect(kpiButtons).toHaveCount(12);
    await expect(
      kpiButtons.filter({ hasText: "GDP (current US$)" }),
    ).toHaveCount(1);
    await expect(
      kpiButtons.filter({ hasText: "Global GDP Rank" }),
    ).toHaveCount(1);
    await expect(
      kpiButtons.filter({ hasText: "Life Expectancy" }),
    ).toHaveCount(1);
    await expect(kpiButtons.filter({ hasText: "HDI" })).toHaveCount(1);
    // stats line + footer render
    await expect(page.getByText(/data points/).first()).toBeVisible();
    await expect(page.getByText(/Built with Next.js/)).toBeVisible();

    // no server-side digest / application error
    await expect(page.locator("body")).not.toContainText(/Application error/i);
    await expect(page.locator("body")).not.toContainText(/digest\s*[:=]?\s*[a-f0-9]{4,}/i);

    await page.screenshot({ path: "test-results/artifacts/home.png" });

    const observed = annotateErrors(test.info(), collector, "/");
    expect(observed.pageErrors, "page errors on /").toEqual([]);
    expect(observed.consoleErrors, "console errors on /").toEqual([]);
  });

  test("2. Explore /explore — category filter, search, card click navigates to /indicator/<id>", async ({ page }) => {
    const collector = installCollectors(page);

    await page.goto("/explore", { waitUntil: "load" });
    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toHaveText("Explore Indicators");

    // Filter by category
    await clickExploreTab(page, "economy");
    await expect(
      page.getByText("Agriculture, value added (% GDP)", { exact: true }),
    ).toBeVisible();
    // Non-economy indicator should be hidden
    await expect(
      page.getByText("Human Development Index", { exact: true }),
    ).toHaveCount(0);

    // Reset to All and search
    await clickExploreTab(page, "All");
    const searchInput = page.getByPlaceholder("Search indicators...");
    await searchInput.fill("infant");
    await expect(
      page.getByText("Infant mortality rate", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("data", { exact: true }).first()).toBeVisible();

    // Click the indicator card title -> navigates to the indicator detail page
    await page.getByText("Infant mortality rate", { exact: true }).click();
    await page.waitForURL("**/indicator/infant_mortality");
    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toHaveText("Infant mortality rate");

    const observed = annotateErrors(test.info(), collector, "/explore");
    expect(observed.pageErrors, "page errors on /explore").toEqual([]);
    expect(observed.consoleErrors, "console errors on /explore").toEqual([]);
  });

  test("3. Compare /compare loads with the tool and default countries selected", async ({ page }) => {
    const collector = installCollectors(page);

    // Register the listener BEFORE goto: the client can fire the fetch before a
    // post-goto waitForResponse is attached (that race made this test flaky).
    const seriesResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/indicators/series") && resp.status() === 200,
      { timeout: 30_000 },
    );

    await page.goto("/compare", { waitUntil: "load" });
    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toHaveText("Country comparison");

    // Wait for series data to load for the default indicator
    await seriesResponse;

    // India is always part of the auto-picked selection — rendered as a removable
    // token inside the "Search countries" field (not as a list chip).
    const indiaToken = page.getByRole("button", { name: "Remove India" });
    await expect(indiaToken).toBeVisible();
    const pillClass = await indiaToken.evaluate((el) => el.parentElement?.className ?? "");
    expect(pillClass).toContain("bg-blue-500");
    // Selected countries move out of the list below, so they must not be there
    await expect(
      page.locator('[aria-label="Available countries"] button').filter({ hasText: "India" }),
    ).toHaveCount(0);
    await expect(page.getByText("5 selected ·")).toBeVisible();

    // Indicator select defaults to GDP
    const indicatorSelect = page.locator("select").filter({ has: page.locator("option[value='gdp_current_usd']") }).first();
    await expect(indicatorSelect).toHaveValue("gdp_current_usd");

    // Charts + data table + AI panel render
    await expect(page.getByText("Data table", { exact: true })).toBeVisible();
    await expect(page.getByText("AI insight", { exact: true })).toBeVisible();
    await expect(page.locator(".recharts-wrapper").first()).toHaveCount(1);

    const observed = annotateErrors(test.info(), collector, "/compare");
    expect(observed.pageErrors, "page errors on /compare").toEqual([]);
    expect(observed.consoleErrors, "console errors on /compare").toEqual([]);
  });

  test("4a. Indicator detail /indicator/ai_readiness renders without error", async ({ page }) => {
    const collector = installCollectors(page);

    await page.goto("/indicator/ai_readiness", { waitUntil: "load" });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "AI Readiness Index",
    );

    // Key cards must always render (values are absent in the stale local DB,
    // but the page must not crash).
    await expect(page.getByText("India latest", { exact: true })).toBeVisible();
    await expect(page.getByText("Global rank", { exact: true })).toBeVisible();
    await expect(page.getByText("Recent trend", { exact: true })).toBeVisible();
    await expect(page.getByText("In simple words", { exact: true })).toBeVisible();
    await expect(page.getByText("How is it calculated?", { exact: true })).toBeVisible();
    await expect(page.getByText("India vs selected countries", { exact: true })).toBeVisible();

    // Trend chart region has an SVG container (Recharts)
    const chartCard = page.locator('[data-slot="card"]', {
      hasText: "India vs selected countries",
    });
    await expect(chartCard.locator("svg").first()).toBeVisible();

    const observed = annotateErrors(test.info(), collector, "/indicator/ai_readiness");
    expect(observed.pageErrors, "page errors for ai_readiness").toEqual([]);
    expect(observed.consoleErrors, "console errors for ai_readiness").toEqual([]);
  });

  test("4b. Indicator detail /indicator/infant_mortality — lower-is-better trend icon direction", async ({ page }) => {
    const collector = installCollectors(page);

    await page.goto("/indicator/infant_mortality", { waitUntil: "load" });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Infant mortality rate",
    );

    const expected = computeExpectedTrend("infant_mortality");
    expect(expected.hasData, "DB should have India data for infant_mortality").toBe(true);

    const trendCard = page.locator('[data-slot="card"]', {
      hasText: "Recent trend",
    });
    const icon = trendCard.locator("svg").first();
    const label = trendCard.locator("span", { hasText: /\(vs \d{4}\)/ });

    await expect(icon).toBeVisible();
    await expect(label).toBeVisible();

    // Icon direction = raw change direction (down for a falling rate)
    const iconClass = await icon.getAttribute("class");
    expect(iconClass).toContain(`lucide-trending-${expected.icon}`);
    // Color must reflect "improving" (green) vs "worse" (red), using rank-direction
    expect(iconClass).toContain(expected.colorClass);
    // Label matches server-side computation, e.g. "-5.0% (vs 2023)"
    await expect(label).toHaveText(expected.label as string);

    // Trend chart renders
    const chartCard = page.locator('[data-slot="card"]', {
      hasText: "India vs selected countries",
    });
    await expect(chartCard.locator("svg").first()).toBeVisible();

    const observed = annotateErrors(test.info(), collector, "/indicator/infant_mortality");
    expect(observed.pageErrors, "page errors for infant_mortality").toEqual([]);
    expect(observed.consoleErrors, "console errors for infant_mortality (lower-is-better)").toEqual([]);
  });

  test("4c. Indicator detail /indicator/internet_penetration — higher-is-better trend icon direction", async ({ page }) => {
    const collector = installCollectors(page);

    await page.goto("/indicator/internet_penetration", { waitUntil: "load" });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Internet users (% of pop)",
    );

    const expected = computeExpectedTrend("internet_penetration");
    expect(expected.hasData).toBe(true);

    const trendCard = page.locator('[data-slot="card"]', { hasText: "Recent trend" });
    const icon = trendCard.locator("svg").first();
    const label = trendCard.locator("span", { hasText: /\(vs \d{4}\)/ });

    const iconClass = await icon.getAttribute("class");
    expect(iconClass).toContain(`lucide-trending-${expected.icon}`);
    expect(iconClass).toContain(expected.colorClass);
    await expect(label).toHaveText(expected.label as string);

    const observed = annotateErrors(test.info(), collector, "/indicator/internet_penetration");
    expect(observed.consoleErrors, "console errors for internet_penetration").toEqual([]);
  });

  test("5. Country page /country/IND renders", async ({ page }) => {
    const collector = installCollectors(page);

    await page.goto("/country/IND", { waitUntil: "load" });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("India");
    await expect(page.getByText("Overall global score:", { exact: false })).toBeVisible();
    await expect(page.getByText("Top performers", { exact: true })).toBeVisible();
    await expect(page.getByText("Bottom performers", { exact: true })).toBeVisible();

    // Category panels render
    const categoryPanel = page.locator("section", {
      has: page.locator("a[href='/explore?category=economy']"),
    });
    await expect(categoryPanel.first()).toBeVisible();

    // No digest / application error (server didn't crash — the known hydration
    // regression on this page is asserted separately in the health spec).
    await expect(page.locator("body")).not.toContainText(/Application error/i);
    await expect(page.locator("body")).not.toContainText(/digest\s*[:=]?\s*[a-f0-9]{4,}/i);

    annotateErrors(test.info(), collector, "/country/IND");
  });

  test("6. Rankings /rankings — table renders with India highlighted", async ({ page }) => {
    const collector = installCollectors(page);

    // Use GDP so India is guaranteed to be in the ranking table.
    // Listener first — see the note in test 3 about the post-goto race.
    const rankingsResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/rankings") && resp.status() === 200,
      { timeout: 30_000 },
    );

    await page.goto("/rankings?indicator=gdp_current_usd", { waitUntil: "load" });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Global Rankings",
    );

    await rankingsResponse;
    await expect(
      page.locator("tbody tr").first(),
    ).toBeVisible({ timeout: 20_000 });

    // Table renders with headers
    await expect(page.getByRole("columnheader", { name: "Rank" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Country" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Value" })).toBeVisible();

    // India summary card
    await expect(page.getByText("India rank", { exact: true })).toBeVisible();

    // India row highlighted with a "You" badge
    const indiaRow = page
      .locator("tbody tr")
      .filter({ has: page.locator('a[href="/country/IND"]') });
    await expect(indiaRow).toHaveCount(1);
    await expect(indiaRow).toContainText("You");
    await expect(indiaRow).toHaveClass(/bg-amber-50/);

    // Sorting by value works
    await page.getByRole("button", { name: /Value/ }).click();
    await page.waitForTimeout(500);

    // Search filters the table
    const search = page.getByPlaceholder("Search countries...");
    await search.fill("India");
    await expect(indiaRow).toContainText("You");

    const observed = annotateErrors(test.info(), collector, "/rankings");
    expect(observed.pageErrors, "page errors on /rankings").toEqual([]);
    expect(observed.consoleErrors, "console errors on /rankings").toEqual([]);
  });

  test("7. Report card /report-card — expand category accordion and check entries", async ({ page }) => {
    const collector = installCollectors(page);

    await page.goto("/report-card", { waitUntil: "load" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Report Card",
    );
    // Overall grade block
    await expect(page.getByText("Overall grade", { exact: true })).toBeVisible();
    await expect(page.getByText(/Scored|Indicators Scored/).first()).toBeVisible();

    // A section should already be open (first category)
    const openButton = page.locator('button[aria-controls^="report-section-"][aria-expanded="true"]').first();
    await expect(openButton).toBeVisible();

    // Expand the next collapsed section (scope to report-card accordions,
    // NOT the mobile nav toggle button). Pin the exact button by aria-controls
    // before toggling so we assert on the SAME element afterwards.
    const collapsed = page
      .locator('button[aria-controls^="report-section-"][aria-expanded="false"]')
      .first();
    await expect(collapsed).toBeVisible();
    const categoryId = await collapsed.getAttribute("aria-controls");
    await collapsed.click();
    const toggledButton = page.locator(`button[aria-controls="${categoryId}"]`);
    await expect(toggledButton).toHaveAttribute("aria-expanded", "true");

    // Entries render: indicator links pointing at /indicator/...
    if (categoryId) {
      const region = page.locator(`#${categoryId}`);
      await expect(region).toBeVisible();
      await expect(region.locator("a[href^='/indicator/']").first()).toBeVisible();
      await expect(region.locator("a[href^='/indicator/']").first()).toHaveAttribute("href", /^\/indicator\//);
    }

    const observed = annotateErrors(test.info(), collector, "/report-card");
    expect(observed.pageErrors, "page errors on /report-card").toEqual([]);
    expect(observed.consoleErrors, "console errors on /report-card").toEqual([]);
  });
});

// Shared constants for the health spec live in helpers/pages.ts
export { CRITICAL_PATHS } from "./helpers/pages";