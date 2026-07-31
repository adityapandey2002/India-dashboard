import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ScatterCard, ScatterTooltip, percentile, fmtAxis, fmtVal } from "./scatter-chart";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: (props: { children: React.ReactElement }) => (
      <div data-testid="responsive" style={{ width: 600, height: 360 }}>
        {props.children}
      </div>
    ),
  };
});

const INDICATORS = [
  { id: "gni_per_capita", name: "GNI per capita", category: "economy" },
  { id: "innovation_idx", name: "Innovation Index", category: "technology" },
  { id: "gdp_per_capita", name: "GDP per capita", category: "economy" },
  { id: "democracy_idx", name: "Democracy Index", category: "governance" },
];

const MOCK_POINTS = [
  { iso3: "USA", name: "United States", x: 80000, y: 60, xYear: 2023, yYear: 2023 },
  { iso3: "CHN", name: "China", x: 12000, y: 55, xYear: 2022, yYear: 2022 },
  { iso3: "IND", name: "India", x: 2500, y: 40, xYear: 2023, yYear: 2023 },
];

function mockFetch() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      x: { id: "gni_per_capita", name: "GNI per capita", unit: "$" },
      y: { id: "innovation_idx", name: "Innovation Index", unit: "index" },
      points: MOCK_POINTS,
      correlation: 0.81,
      india: MOCK_POINTS[2],
    }),
  });
}

describe("ScatterCard", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch());
  });

  it("renders the heading and selects grouped by category", async () => {
    render(<ScatterCard indicators={INDICATORS} />);
    expect(screen.getByText("How does India compare?")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Loading data/)).not.toBeInTheDocument();
    });

    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(2);
    expect(screen.getAllByRole("group", { name: "economy" })).toHaveLength(2);
    expect(screen.getAllByRole("group", { name: "technology" })).toHaveLength(2);
  });

  it("loads data and shows the correlation plus India percentile chips", async () => {
    render(<ScatterCard indicators={INDICATORS} initialX="gni_per_capita" initialY="innovation_idx" />);

    await waitFor(() => {
      expect(screen.getByText("r = 0.81")).toBeInTheDocument();
    });

    expect(screen.getByText(/India GNI per capita: 2,500/)).toBeInTheDocument();
    expect(screen.getByText(/India Innovation Index: 40/)).toBeInTheDocument();
    expect(screen.getAllByText(/beats 0% of 3 countries/)).toHaveLength(2);
  });

  it("shows an error message when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<ScatterCard indicators={INDICATORS} />);
    await waitFor(() => {
      expect(screen.getByText("Could not load scatter data.")).toBeInTheDocument();
    });
  });
});

describe("ScatterTooltip", () => {
  it("renders nothing when inactive", () => {
    const { container } = render(
      <ScatterTooltip active={false} payload={[]} xLabel="X" yLabel="Y" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders country name and both axis values", () => {
    render(
      <ScatterTooltip
        active
        payload={[{ payload: MOCK_POINTS[2] }]}
        xLabel="GNI per capita"
        yLabel="Innovation Index"
      />
    );
    expect(screen.getByText("India (IND)")).toBeInTheDocument();
    expect(screen.getByText("GNI per capita:")).toBeInTheDocument();
    expect(screen.getByText("2,500")).toBeInTheDocument();
    expect(screen.getByText("Innovation Index:")).toBeInTheDocument();
  });
});

function pt(x: number): { iso3: string; name: string; x: number; y: number; xYear: number; yYear: number } {
  return { iso3: `C${x}`, name: `Country ${x}`, x, y: x * 2, xYear: 2023, yYear: 2023 };
}

describe("percentile", () => {
  it("returns null for fewer than 2 points", () => {
    expect(percentile([pt(5)], "x", 5)).toBeNull();
  });

  it("maps lowest value to 0th percentile and highest to 100th", () => {
    const points = [10, 20, 30, 40].map(pt);
    expect(percentile(points, "x", 10)).toBe(0);
    expect(percentile(points, "x", 40)).toBe(100);
  });

  it("interpolates an in-between value", () => {
    const points = [10, 20, 30, 40].map(pt);
    expect(percentile(points, "x", 30)).toBe(67);
  });

  it("returns null when value is above all points", () => {
    const points = [10, 20, 30].map(pt);
    expect(percentile(points, "x", 99)).toBeNull();
  });
});

describe("fmtAxis", () => {
  it("formats large numbers with suffixes", () => {
    expect(fmtAxis(1.5e12)).toBe("1.5T");
    expect(fmtAxis(2.3e9)).toBe("2.3B");
    expect(fmtAxis(4.5e6)).toBe("4.5M");
    expect(fmtAxis(1200)).toBe("1.2k");
  });

  it("formats ordinary and decimal values", () => {
    expect(fmtAxis(500)).toBe("500");
    expect(fmtAxis(3.14159)).toBe("3.14");
  });
});

describe("fmtVal", () => {
  it("formats huge money values", () => {
    expect(fmtVal(1e12)).toBe("$1.00T");
    expect(fmtVal(1.2e9)).toBe("$1.2B");
    expect(fmtVal(1.5e6)).toBe("$1.5M");
  });

  it("formats plain numbers with locale separators", () => {
    expect(fmtVal(12000)).toBe("12,000");
    expect(fmtVal(3.14159)).toBe("3.14");
  });
});
