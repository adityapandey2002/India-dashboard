import type { Page } from "@playwright/test";

/**
 * Health-check helpers: collect console/page errors and detect the
 * Next.js dev error overlay + digest error text.
 */

export interface Collector {
  consoleErrors: string[];
  pageErrors: string[];
}

/** Attach listeners to a page and return the collected error groups. */
export function installCollectors(page: Page): Collector {
  const collector: Collector = { consoleErrors: [], pageErrors: [] };
  page.on("console", (msg) => {
    if (msg.type() === "error") collector.consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => collector.pageErrors.push(err.message));
  return collector;
}

/** Ignored console-error messages (not app regressions). */
const BENIGN_CONSOLE_ERRORS: RegExp[] = [
  // Any 404 (favicon, source maps, etc.)
  /Failed to load resource: the server responded with a status of 404/,
  /favicon/i,
];

export function isBenignConsoleError(msg: string): boolean {
  return BENIGN_CONSOLE_ERRORS.some((re) => re.test(msg));
}

export function unexpectedConsoleErrors(collector: Collector): string[] {
  return collector.consoleErrors.filter((m) => !isBenignConsoleError(m));
}

/**
 * Detect an actual Next.js dev error overlay.
 * `nextjs-portal` is always present in dev (it holds styles/scripts); a real
 * error renders a `div[role="dialog"]` whose text mentions the error type, and
 * the dev badge expands to a visible "N Issues" toast in the top-right corner.
 */
export async function detectOverlayError(
  page: Page,
): Promise<{ found: boolean; text: string }> {
  return page.evaluate(() => {
    const el = document.querySelector("nextjs-portal");
    const sr = el && (el as HTMLElement).shadowRoot;
    if (!sr) return { found: false, text: "" };

    // 1) A dialog with error markers
    const dialogs = Array.from(sr.querySelectorAll('div[role="dialog"]'));
    for (const d of dialogs) {
      const text = (d.textContent || "").replace(/\s+/g, " ");
      if (
        /(Console Error|Unhandled Runtime Error|Build Error|hydration error|Application error|digest|server error)/i.test(
          text,
        )
      ) {
        return { found: true, text: text.slice(0, 500) };
      }
    }

    // 2) A visible dev-badge expanded to "N Issues" (non-zero rect)
    const toasts = Array.from(sr.querySelectorAll(".nextjs-toast"));
    for (const t of toasts) {
      const rect = t.getBoundingClientRect();
      const style = getComputedStyle(t);
      const text = (t.textContent || "").replace(/\s+/g, " ");
      if (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        /[1-9][\d,]*(\.\d+)?\s+issues?/i.test(text)
      ) {
        return { found: true, text: `Next.js dev badge: "${text.slice(-80)}"` };
      }
    }
    return { found: false, text: "" };
  });
}

/** Look for a "digest: <hex>" server-error marker in the visible body text. */
export async function digestInBody(page: Page): Promise<string | null> {
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const m = bodyText.match(/digest\s*[:=]?\s*[a-f0-9]{4,}/i);
  return m ? m[0] : null;
}

export type PageHealth = {
  path: string;
  overlay: boolean;
  overlayText: string;
  digest: string | null;
  pageErrors: string[];
  consoleErrors: string[];
};

export function formatHealth(health: PageHealth): string {
  const parts: string[] = [];
  if (health.overlay) {
    parts.push(`Next.js error overlay: ${health.overlayText}`);
  }
  if (health.digest) {
    parts.push(`digest error text: ${health.digest}`);
  }
  if (health.pageErrors.length) {
    parts.push(`page errors (${health.pageErrors.length}): ${health.pageErrors.join(" | ").slice(0, 400)}`);
  }
  if (health.consoleErrors.length) {
    parts.push(`console errors (${health.consoleErrors.length}): ${health.consoleErrors.join(" | ").slice(0, 400)}`);
  }
  return parts.length ? parts.join("\n") : "clean";
}

/** A combined overlay + digest + pageerror + console-error check. */
export async function checkPageHealth(
  page: Page,
  path: string,
  collector: Collector,
): Promise<PageHealth> {
  const overlay = await detectOverlayError(page);
  const digest = await digestInBody(page);
  return {
    path,
    overlay: overlay.found,
    overlayText: overlay.text,
    digest,
    pageErrors: collector.pageErrors,
    consoleErrors: unexpectedConsoleErrors(collector),
  };
}