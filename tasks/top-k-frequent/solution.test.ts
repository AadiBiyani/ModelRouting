import { describe, expect, it } from "vitest";
import { topKFrequent } from "./candidate.js";

describe("topKFrequent", () => {
  it("handles empty input and zero k", () => {
    expect(topKFrequent([], 3)).toEqual([]);
    expect(topKFrequent([1, 2], 0)).toEqual([]);
  });
  it("ranks by frequency", () => {
    expect(topKFrequent([1, 2, 2, 3, 3, 3], 2)).toEqual([3, 2]);
  });
  it("uses first appearance to break ties", () => {
    expect(topKFrequent([9, 4, 9, 4, 2], 3)).toEqual([9, 4, 2]);
  });
  it("returns all distinct values when k is large", () => {
    expect(topKFrequent([-1, 2, -1, 3], 10)).toEqual([-1, 2, 3]);
  });
  it("does not mutate input", () => {
    const values = [3, 1, 3];
    expect(topKFrequent(values, 1)).toEqual([3]);
    expect(values).toEqual([3, 1, 3]);
  });
});
