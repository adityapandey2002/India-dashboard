import { test, expect, type Page, type Locator } from "@playwright/test";
import { getCountryCount } from "./helpers/db";
import {
  installCollectors,
  unexpectedConsoleErrors,
  type Collector,
} from "./helpers/health";

/**
 * E2E coverage for the /compare country **token field** (tag input):
 * selected countries are removable tokens inside the "Search countries"
 * input, and the list below only ever offers *unselected* countries — so it
 * never re-orders itself and its scroll position never jumps.
 *
 * The dev server must be running on http://localhost:3456.
 */

/** Countries the page auto-selects on mount (`DEFAULT_COLUMNS` / top-N pick). */
const EXPECTED_TOKENS = 5;

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

/** The token field: the wrapper div that holds both the tokens and the input. */
function tokenField(page: Page): Locator {
  return page.locator("#country-search").locator("xpath=..");
}

/** One locator per rendered token's ✕ button (`aria-label="Remove <Country>"`). */
function removeButtons(page: Page): Locator {
  return tokenField(page).locator('[aria-label^="Remove "]');
}

/** The chip row fed by `availableCountryItems` (unselected countries only). */
function availableGroup(page: Page): Locator {
  return page.locator('[aria-label="Available countries"]');
}

/** The `max-h-48 overflow-y-auto` wrapper that scrolls the available-country row. */
function listScroller(page: Page): Locator {
  return availableGroup(page).locator("xpath=..");
}

/** "5 selected · 217 total" */
function selectionCounter(page: Page): Locator {
  return page.locator("p").filter({ hasText: /\d+ selected · \d+ total/ });
}

function counterText(selected: number): string {
  return `${selected} selected · ${getCountryCount()} total`;
}

/** Country names of the rendered tokens, in DOM order. */
function tokenNames(page: Page): Promise<string[]> {
  return removeButtons(page).evaluateAll((els) =>
    els.map((el) => (el.getAttribute("aria-label") ?? "").replace(/^Remove /, "")),
  );
}

/** `aria-label`s of the rendered tokens, in DOM order. */
function tokenLabels(page: Page): Promise<string[]> {
  return removeButtons(page).evaluateAll((els) =>
    els.map((el) => el.getAttribute("aria-label") ?? ""),
  );
}

function chipNames(page: Page): Promise<string[]> {
  return availableGroup(page).locator("button").allTextContents();
}

/**
 * Load /compare and wait for the top-N auto-pick to settle.
 *
 * On mount the component fetches `/api/indicators/leaderboard?indicator=…&limit=5`
 * and replaces the initial selection with the top-5 countries for the indicator
 * (India always included). Waiting for that response — and for the
 * "Picking top …" hint to disappear — keeps the token assertions free of a race
 * with that in-flight update.
 */
async function gotoCompareSettled(page: Page): Promise<void> {
  const leaderboard = page.waitForResponse(
    (resp) => resp.url().includes("/api/indicators/leaderboard") && resp.ok(),
    { timeout: 60_000 },
  );
  await page.goto("/compare", { waitUntil: "load" });
  await leaderboard;
  await expect(page.getByText(/Picking top/)).toHaveCount(0);
  await expect(removeButtons(page)).toHaveCount(EXPECTED_TOKENS);
  await expect(selectionCounter(page)).toHaveText(counterText(EXPECTED_TOKENS));
}

/** Assert the page stayed clean (no console errors, no unhandled page errors). */
function expectClean(collector: Collector, pagePath: string) {
  const observed = annotateErrors(test.info(), collector, pagePath);
  expect(observed.pageErrors, `page errors on ${pagePath}`).toEqual([]);
  expect(observed.consoleErrors, `console errors on ${pagePath}`).toEqual([]);
}

test.describe("Compare page — country token field", () => {
  test("1. selected countries render as removable tokens inside the search field", async ({ page }) => {
    const collector = installCollectors(page);

    // Pin the auto-pick result so the documented default selection
    // (India + the next four leaderboard countries) is asserted deterministically
    // instead of depending on the live GDP ranking.
    await page.route("**/api/indicators/leaderboard*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            { iso3: "IND" },
            { iso3: "USA" },
            { iso3: "CHN" },
            { iso3: "BRA" },
            { iso3: "ZAF" },
          ],
        }),
      }),
    );

    await page.goto("/compare", { waitUntil: "load" });

    // Five tokens, each with a Remove <Name> ✕ button, in the documented order.
    await expect(removeButtons(page)).toHaveCount(EXPECTED_TOKENS);
    expect(await tokenLabels(page)).toEqual([
      "Remove India",
      "Remove United States",
      "Remove China",
      "Remove Brazil",
      "Remove South Africa",
    ]);

    // Tokens live inside the token field (the #country-search wrapper), not in the list below.
    await expect(tokenField(page).getByText("India", { exact: true })).toHaveCount(1);

    // Each token is a blue pill with an ✕ (lucide X icon) inside it.
    const indiaToken = page.getByRole("button", { name: "Remove India" });
    await expect(indiaToken).toBeVisible();
    await expect(indiaToken.locator("svg")).toHaveCount(1);
    await expect(indiaToken.locator("xpath=..")).toHaveClass(/bg-blue-500/);

    // With tokens present the input switches to the "add another" placeholder.
    await expect(page.locator("#country-search")).toHaveAttribute("placeholder", "Add country…");
    await expect(selectionCounter(page)).toHaveText(counterText(EXPECTED_TOKENS));

    await page.screenshot({ path: "test-results/artifacts/compare-token-field.png" });

    expectClean(collector, "/compare");
  });

  test("2. the available list holds only unselected countries", async ({ page }) => {
    const collector = installCollectors(page);
    await gotoCompareSettled(page);

    const selected = await tokenNames(page);
    expect(selected.length).toBe(EXPECTED_TOKENS);
    expect(selected).toContain("India");

    // A selected country is NOT in the list …
    await expect(
      availableGroup(page).getByRole("button", { name: "India", exact: true }),
    ).toHaveCount(0);
    // … and no chip label collides with any rendered token.
    const chips = await chipNames(page);
    for (const name of selected) {
      expect(chips, `"${name}" must not be offered as available`).not.toContain(name);
    }

    // An unselected country IS in the list.
    await expect(
      availableGroup(page).getByRole("button", { name: "Kenya", exact: true }),
    ).toBeVisible();

    // The two sets partition the country list, and nothing in the list is pressed.
    expect(chips.length + selected.length, "selected + available === total").toBe(
      getCountryCount(),
    );
    const pressedCount = await availableGroup(page)
      .locator('button[aria-pressed="true"]')
      .count();
    expect(pressedCount, "the available list must hold no selected chips").toBe(0);

    expectClean(collector, "/compare");
  });

  test("3. clicking a token's ✕ removes it, decrements the counter and returns the country to the list", async ({ page }) => {
    const collector = installCollectors(page);
    await gotoCompareSettled(page);

    const before = await chipNames(page);
    expect(before.length).toBe(getCountryCount() - EXPECTED_TOKENS);

    await page.getByRole("button", { name: "Remove India" }).click();

    // Token gone, counter decremented.
    await expect(page.getByRole("button", { name: "Remove India" })).toHaveCount(0);
    await expect(removeButtons(page)).toHaveCount(EXPECTED_TOKENS - 1);
    await expect(selectionCounter(page)).toHaveText(counterText(EXPECTED_TOKENS - 1));
    expect(await tokenNames(page)).not.toContain("India");

    // …and India is offered in the list again.
    await expect(
      availableGroup(page).getByRole("button", { name: "India", exact: true }),
    ).toBeVisible();
    const after = await chipNames(page);
    expect(after.length).toBe(getCountryCount() - (EXPECTED_TOKENS - 1));
    expect(after).toContain("India");

    // The removed country also drops out of the comparison itself (data table header).
    await expect(
      page.getByRole("columnheader", { name: "Year" }).locator("xpath=.."),
    ).not.toContainText("India");

    expectClean(collector, "/compare");
  });

  test("4. typing in the search field filters the available list without disturbing the tokens", async ({ page }) => {
    const collector = installCollectors(page);
    await gotoCompareSettled(page);

    const tokensBefore = await tokenLabels(page);
    const allChips = await chipNames(page);

    const search = page.locator("#country-search");
    await search.click();
    await search.fill("kenya");

    // The list is filtered down to the match …
    await expect(availableGroup(page).locator("button")).toHaveCount(1);
    expect(await chipNames(page)).toEqual(["Kenya"]);

    // … while the tokens and the counter are untouched.
    expect(await tokenLabels(page)).toEqual(tokensBefore);
    await expect(removeButtons(page)).toHaveCount(EXPECTED_TOKENS);
    await expect(selectionCounter(page)).toHaveText(counterText(EXPECTED_TOKENS));

    // A no-match query empties the list but keeps the tokens.
    await search.fill("zzzz-no-such-country");
    await expect(availableGroup(page).locator("button")).toHaveCount(0);
    expect(await tokenLabels(page)).toEqual(tokensBefore);

    // Searching for an already-selected country must not offer it again.
    const selectedName = (tokensBefore[tokensBefore.length - 1] ?? "").replace(/^Remove /, "");
    await search.fill(selectedName);
    expect(await chipNames(page), "selected countries are never re-listed").not.toContain(
      selectedName,
    );
    await expect(
      page.getByRole("button", { name: `Remove ${selectedName}` }),
    ).toHaveCount(1);

    // Clearing the query restores the full available list.
    await page.getByRole("button", { name: "Clear country search" }).click();
    await expect(search).toHaveValue("");
    await expect(availableGroup(page).locator("button")).toHaveCount(allChips.length);

    expectClean(collector, "/compare");
  });

  test("5. Backspace on an empty query removes the last token", async ({ page }) => {
    const collector = installCollectors(page);
    await gotoCompareSettled(page);

    const before = await tokenNames(page);
    const lastName = before[before.length - 1];
    expect(lastName, "there is a token to remove").toBeTruthy();

    const search = page.locator("#country-search");
    await search.click();
    await expect(search).toHaveValue("");
    await search.press("Backspace");

    // Exactly the last token is dropped, not the first one.
    await expect(removeButtons(page)).toHaveCount(EXPECTED_TOKENS - 1);
    const after = await tokenNames(page);
    expect(after).toEqual(before.slice(0, -1));
    expect(after).toContain("India");
    await expect(selectionCounter(page)).toHaveText(counterText(EXPECTED_TOKENS - 1));

    // The country becomes selectable again.
    await expect(
      availableGroup(page).getByRole("button", { name: lastName, exact: true }),
    ).toHaveCount(1);

    expectClean(collector, "/compare");
  });

  test("6. Backspace with text in the query only edits the text", async ({ page }) => {
    const collector = installCollectors(page);
    await gotoCompareSettled(page);

    const tokensBefore = await tokenLabels(page);

    const search = page.locator("#country-search");
    await search.click();
    await search.fill("kenya");
    await search.press("Backspace");

    // The keystroke edits the query instead of removing a token.
    await expect(search).toHaveValue("keny");
    expect(await tokenLabels(page)).toEqual(tokensBefore);
    await expect(removeButtons(page)).toHaveCount(EXPECTED_TOKENS);
    await expect(selectionCounter(page)).toHaveText(counterText(EXPECTED_TOKENS));

    // …and the filtered list still reflects the edited query.
    await expect(availableGroup(page).locator("button")).toHaveCount(1);

    // A second Backspace with a single character left still only edits the text.
    await search.press("Backspace");
    await expect(search).toHaveValue("ken");
    await expect(removeButtons(page)).toHaveCount(EXPECTED_TOKENS);

    expectClean(collector, "/compare");
  });

  test("7. selecting a country does not reset the available-list scroll position (regression)", async ({ page }) => {
    const collector = installCollectors(page);
    await gotoCompareSettled(page);

    const scroller = listScroller(page);

    // Precondition: the available list actually overflows and can be scrolled.
    const metrics = await scroller.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);

    const TARGET = 120;
    await scroller.evaluate((el, top) => { el.scrollTop = top; }, TARGET);
    const scrollBefore = await scroller.evaluate((el) => el.scrollTop);
    expect(scrollBefore, "list is scrolled away from the top").toBe(TARGET);

    // Pick a chip that is already fully visible inside the scrolled list, so the
    // click itself cannot move the scroll container.
    const visible = await availableGroup(page).locator("button").evaluateAll((btns) => {
      const group = btns[0].closest('[aria-label="Available countries"]') as HTMLElement | null;
      const scrollerEl = group?.parentElement as HTMLElement | null;
      if (!scrollerEl) return null;
      const box = scrollerEl.getBoundingClientRect();
      const index = btns.findIndex((btn) => {
        const rect = btn.getBoundingClientRect();
        return rect.top >= box.top && rect.bottom <= box.bottom;
      });
      return index === -1 ? null : { index, name: (btns[index].textContent ?? "").trim() };
    });
    expect(visible, "a chip is visible inside the scrolled list").not.toBeNull();

    const chip = availableGroup(page).locator("button").nth(visible!.index);
    expect((await chip.textContent())?.trim()).toBe(visible!.name);
    await chip.click();

    // The click adds a token …
    await expect(removeButtons(page)).toHaveCount(EXPECTED_TOKENS + 1);
    await expect(page.getByRole("button", { name: `Remove ${visible!.name}` })).toHaveCount(1);
    await expect(selectionCounter(page)).toHaveText(counterText(EXPECTED_TOKENS + 1));
    await expect(availableGroup(page).locator("button")).toHaveCount(
      getCountryCount() - (EXPECTED_TOKENS + 1),
    );

    // … and the list stays exactly where the user left it (the fixed regression:
    // the chip row used to re-sort and scroll back to the top on every selection).
    await expect
      .poll(() => scroller.evaluate((el) => el.scrollTop), { message: "scrollTop after selecting a country" })
      .toBe(scrollBefore);

    expectClean(collector, "/compare");
  });
});
