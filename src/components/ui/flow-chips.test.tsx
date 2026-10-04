import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlowChips } from "./flow-chips";

const ITEMS = [
  { value: "AFG", label: "Afghanistan" },
  { value: "ALB", label: "Albania" },
  { value: "IND", label: "India" },
  { value: "USA", label: "United States" },
];

const order = () =>
  screen.getAllByRole("button").map((b) => b.getAttribute("aria-pressed") + ":" + b.textContent?.replace("✓", ""));

describe("FlowChips", () => {
  it("marks selected chips with aria-pressed and a checkmark", () => {
    render(<FlowChips items={ITEMS} selected={["IND"]} onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: /India/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Albania/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /India/ }).textContent).toContain("✓");
    expect(screen.getByRole("button", { name: /Albania/ }).textContent).not.toContain("✓");
  });

  it("emits the chip value on click", async () => {
    const onToggle = vi.fn();
    render(<FlowChips items={ITEMS} selected={[]} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole("button", { name: /United States/ }));
    expect(onToggle).toHaveBeenCalledWith("USA");
  });

  it("flows selected chips to the front, in item order", () => {
    render(<FlowChips items={ITEMS} selected={["IND", "AFG"]} onToggle={vi.fn()} />);
    expect(order()).toEqual([
      "true:Afghanistan",
      "true:India",
      "false:Albania",
      "false:United States",
    ]);
  });

  it("keeps item order when sortSelectedFirst is off (single-select rows)", () => {
    render(<FlowChips items={ITEMS} selected={["IND"]} onToggle={vi.fn()} sortSelectedFirst={false} />);
    expect(order()).toEqual([
      "false:Afghanistan",
      "false:Albania",
      "true:India",
      "false:United States",
    ]);
  });

  it("hides the checkmark when showCheck is false", () => {
    render(<FlowChips items={ITEMS} selected={["IND"]} onToggle={vi.fn()} showCheck={false} />);
    expect(screen.getByRole("button", { name: /India/ }).textContent).toBe("India");
  });
});
