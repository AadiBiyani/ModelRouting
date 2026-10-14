import { describe, expect, it } from "vitest";
import { chunk } from "./candidate.js";

describe("chunk", () => {
  it("keeps a shorter final group", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("splits evenly when the length is a multiple of size", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  it("returns one group when size exceeds the length", () => {
    expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
  });

  it("handles size one and empty input", () => {
    expect(chunk([7, 8, 9], 1)).toEqual([[7], [8], [9]]);
    expect(chunk([], 3)).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const values = [1, 2, 3];
    expect(chunk(values, 2)).toEqual([[1, 2], [3]]);
    expect(values).toEqual([1, 2, 3]);
  });
});
