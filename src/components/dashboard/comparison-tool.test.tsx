import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompareTool } from "./comparison-tool";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const COUNTRIES = [
  { iso3: "IND", name: "India", region: null },
  { iso3: "USA", name: "United States", region: null },
  { iso3: "CHN", name: "China", region: null },
  { iso3: "BRA", name: "Brazil", region: null },
  { iso3: "ZAF", name: "South Africa", region: null },
  { iso3: "DEU", name: "Germany", region: null },
  { iso3: "JPN", name: "Japan", region: null },
];

const INDICATORS = {
  economy: [{ id: "gdp_current_usd", name: "GDP (current US$)", category: "economy", unit: "US$" }],
};

const renderTool = () =>
  render(<CompareTool countries={COUNTRIES} indicatorsByCategory={INDICATORS} />);

const counter = () => document.querySelector("p.mt-2")?.textContent ?? "";

describe("CompareTool country token field", () => {
  beforeEach(() => {
    // Leaderboard fails → auto-pick keeps the DEFAULT_COUNTRIES selection.
    // Series returns no points → charts stay unrendered.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("leaderboard")
          ? { ok: false, json: async () => ({}) }
          : { ok: true, json: async () => ({ data: [] }) },
      ),
    );
  });

  it("shows selected countries as removable tokens inside the search field", async () => {
    renderTool();

    expect(await screen.findByRole("button", { name: "Remove India" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove United States" })).toBeInTheDocument();
    expect(counter()).toContain("5 selected");

    // …and they are gone from the available list below
    const list = screen.getByRole("group", { name: "Available countries" });
    expect(within(list).queryByRole("button", { name: "India" })).toBeNull();
    expect(within(list).getByRole("button", { name: "Germany" })).toBeInTheDocument();
  });

  it("drops a country from its token's ✕ button", async () => {
    renderTool();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Remove India" }));

    await waitFor(() => expect(counter()).toContain("4 selected"));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Remove India" })).toBeNull());
    // Deselected country is offered again in the list
    expect(await screen.findByRole("button", { name: "India" })).toBeInTheDocument();
  });

  it("removes the last token on Backspace when the query is empty", async () => {
    renderTool();
    const user = userEvent.setup();

    const input = (await screen.findByPlaceholderText("Add country…")) as HTMLInputElement;
    await user.click(input);
    await user.keyboard("{Backspace}");

    await waitFor(() => expect(counter()).toContain("4 selected"));
    // South Africa is the last of the default selection
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Remove South Africa" })).toBeNull(),
    );
    // Backspace with text in the query only edits the text
    await user.keyboard("ind{Backspace}");
    expect(counter()).toContain("4 selected");
  });

  it("filters the available list by search text without touching the tokens", async () => {
    renderTool();
    const user = userEvent.setup();

    const input = await screen.findByPlaceholderText("Add country…");
    await user.type(input, "germ");

    const list = screen.getByRole("group", { name: "Available countries" });
    expect(within(list).getByRole("button", { name: "Germany" })).toBeInTheDocument();
    expect(within(list).queryByRole("button", { name: "Japan" })).toBeNull();
    expect(screen.getByRole("button", { name: "Remove India" })).toBeInTheDocument();
  });
});
