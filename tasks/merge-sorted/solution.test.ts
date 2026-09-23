import { describe, expect, it } from "vitest";
import { mergeSorted } from "./candidate.js";

describe("mergeSorted", () => {
  it("handles two empty arrays", () => expect(mergeSorted([], [])).toEqual([]));
  it("handles an empty side", () => {
    expect(mergeSorted([], [1, 3])).toEqual([1, 3]);
    expect(mergeSorted([-2, 0], [])).toEqual([-2, 0]);
  });
  it("interleaves values in ascending order", () => {
    expect(mergeSorted([1, 4, 8], [2, 3, 9])).toEqual([1, 2, 3, 4, 8, 9]);
  });
  it("preserves duplicates and negative values", () => {
    expect(mergeSorted([-3, 2, 2], [-3, 0, 2])).toEqual([-3, -3, 0, 2, 2, 2]);
  });
  it("does not mutate either input", () => {
    const left = [1, 5];
    const right = [2, 6];
    expect(mergeSorted(left, right)).toEqual([1, 2, 5, 6]);
    expect(left).toEqual([1, 5]);
    expect(right).toEqual([2, 6]);
  });
});
