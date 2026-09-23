import { describe, expect, it } from "vitest";
import { uniqueNumbers } from "./candidate.js";

describe("uniqueNumbers", () => {
  it("handles an empty input", () => {
    expect(uniqueNumbers([])).toEqual([]);
  });

  it("keeps only the first occurrence of repeated values", () => {
    expect(uniqueNumbers([4, 4, 1, 4, 1])).toEqual([4, 1]);
  });

  it("handles negative values and zero", () => {
    expect(uniqueNumbers([-2, 0, -2, 3, 0])).toEqual([-2, 0, 3]);
  });

  it("preserves input order instead of sorting", () => {
    expect(uniqueNumbers([9, 2, 7, 2, 9])).toEqual([9, 2, 7]);
  });

  it("does not mutate the input array", () => {
    const values = [3, 1, 3];
    expect(uniqueNumbers(values)).toEqual([3, 1]);
    expect(values).toEqual([3, 1, 3]);
  });
});
