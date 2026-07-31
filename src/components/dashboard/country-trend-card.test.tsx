import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CountryTrendCard } from "./country-trend-card";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: (props: { children: React.ReactElement }) => (
      <div data-testid="responsive" style={{ width: 600, height: 320 }}>
        {props.children}
      </div>
    ),
  };
});

const INDICATORS = [
  { id: "gni_per_capita", name: "GNI per capita", category: "economy", unit: "$" },
  { id: "innovation_idx", name: "Innovation Index", category: "technology", unit: "index" },
  { id: "gdp_per_capita", name: "GDP per capita", category: "economy", unit: "$" },
];

const SERIES = [
  { year: 2019, value: 100 },
  { year: 2020, value: 120 },
  { year: 2021, value: 140 },
];

function mockFetch() {
  return vi.fn().mockImplementation(async (url: string) => {
    const isIndia = url.includes("country=IND");
    return {
      ok: true,
      json: async () => ({
        data: isIndia ? SERIES.map((p) => ({ ...p, value: p.value * 2 })) : SERIES,
      }),
    };
  });
}

describe("CountryTrendCard", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch());
  });

  it("renders heading, selector grouped by category, and fetches both series", async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal("fetch", fetchMock);
    render(<CountryTrendCard country="USA" countryName="United States" indicators={INDICATORS} />);

    expect(screen.getByText("Trend vs India")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getAllByRole("group", { name: "economy" })).toHaveLength(1);
    expect(screen.getAllByRole("group", { name: "technology" })).toHaveLength(1);
    expect(screen.getByText("GNI per capita over time.")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("country=USA"));
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("country=IND"));
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("indicator=gni_per_capita"));
    });
  });

  it("shows an error message when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<CountryTrendCard country="USA" countryName="United States" indicators={INDICATORS} />);
    await waitFor(() => {
      expect(screen.getByText("Could not load trend data.")).toBeInTheDocument();
    });
  });
});
