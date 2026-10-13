import { describe, expect, it } from "vitest";
import { fibonacci } from "./candidate.js";

describe("fibonacci", () => {
  it("returns an empty array for zero", () => {
    expect(fibonacci(0)).toEqual([]);
  });

  it("starts the sequence with 0", () => {
    expect(fibonacci(1)).toEqual([0]);
  });

  it("returns the first two seed values", () => {
    expect(fibonacci(2)).toEqual([0, 1]);
  });

  it("returns the first ten numbers", () => {
    expect(fibonacci(10)).toEqual([0, 1, 1, 2, 3, 5, 8, 13, 21, 34]);
  });

  it("continues the sequence for a larger count", () => {
    const values = fibonacci(20);
    expect(values).toHaveLength(20);
    expect(values[19]).toBe(4181);
  });
});
