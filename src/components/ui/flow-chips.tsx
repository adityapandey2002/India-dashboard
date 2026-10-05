"use client";

import { memo, useMemo, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Shared spring so every chip/pill row in the app settles the same way. */
export const flowTransition = { type: "spring", stiffness: 420, damping: 30 } as const;
const checkTransition = { type: "spring", stiffness: 520, damping: 22 } as const;

export type FlowChipItem = { value: string; label: ReactNode };

type FlowChipsProps = {
  items: FlowChipItem[];
  /** Currently selected values. */
  selected: string[];
  onToggle: (value: string) => void;
  className?: string;
  /** Accessible name for the chip row (announced once for the whole group). */
  label?: string;
  /** Pop-in ✓ in front of the label of every selected chip. */
  showCheck?: boolean;
  /** Move selected chips to the front of the row, FLIP-animated (the FlowChips look). */
  sortSelectedFirst?: boolean;
};

/**
 * Wrapping row of pill-shaped toggle chips: selected chips flow to the front with a
 * spring layout animation, tap scales the chip down, and the ✓ pops in on select.
 */
export const FlowChips = memo(function FlowChips({
  items,
  selected,
  onToggle,
  className,
  label,
  showCheck = true,
  sortSelectedFirst = true,
}: FlowChipsProps) {
  // Set lookups keep the sort linear — `selected.includes` inside a sort is O(n²)
  // across the 217-country row, and this re-renders on every search keystroke.
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const ordered = useMemo(
    () =>
      sortSelectedFirst
        ? [...items].sort(
            (a, b) => (selectedSet.has(b.value) ? 1 : 0) - (selectedSet.has(a.value) ? 1 : 0),
          )
        : items,
    [items, selectedSet, sortSelectedFirst],
  );

  return (
    <div className={className} role="group" aria-label={label}>
      {ordered.map((item) => {
        const active = selectedSet.has(item.value);
        return (
          <motion.button
            key={item.value}
            layout
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(item.value)}
            transition={flowTransition}
            whileTap={{ scale: 0.94 }}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-border bg-card text-muted-foreground hover:border-blue-300",
            )}
          >
            <span className="flex items-center gap-1.5">
              {showCheck && active && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={checkTransition}
                  className="text-[10px] leading-none"
                  aria-hidden="true"
                >
                  ✓
                </motion.span>
              )}
              {item.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
});
