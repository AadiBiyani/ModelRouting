import { describe, expect, it } from "vitest";
import { countWords } from "./candidate.js";

describe("countWords", () => {
  it("returns zero for empty or whitespace-only input", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("  \t\n ")).toBe(0);
  });
  it("counts a single word", () => expect(countWords("hello")).toBe(1));
  it("ignores repeated spaces", () => expect(countWords("one   two  three")).toBe(3));
  it("recognizes tabs and line breaks", () => expect(countWords("one\ttwo\nthree")).toBe(3));
});
