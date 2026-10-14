import { describe, expect, it } from "vitest";
import { flatten } from "./candidate.js";

describe("flatten", () => {
  it("preserves left-to-right order", () => {
    expect(flatten([1, [2, [3, 4]], 5, [[6]]])).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("skips empty arrays", () => {
    expect(flatten([[], [[]], 1, [[], 2]])).toEqual([1, 2]);
    expect(flatten([])).toEqual([]);
  });

  it("does not mutate the input", () => {
    const values = [1, [2, [3]], [], 4];
    const before = JSON.stringify(values);
    expect(flatten(values)).toEqual([1, 2, 3, 4]);
    expect(JSON.stringify(values)).toBe(before);
  });

  it("handles very deep nesting without overflowing the stack", () => {
    // Built iteratively; a recursive flatten overflows at this depth.
    let deep: any = [42];
    for (let depth = 0; depth < 100_000; depth++) deep = [deep];
    expect(flatten([1, deep, 2])).toEqual([1, 42, 2]);
  });
});
