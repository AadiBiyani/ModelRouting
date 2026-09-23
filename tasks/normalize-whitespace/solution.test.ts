import { describe, expect, it } from "vitest";
import { normalizeWhitespace } from "./candidate.js";

describe("normalizeWhitespace", () => {
  it("handles empty and whitespace-only strings", () => {
    expect(normalizeWhitespace("")).toBe("");
    expect(normalizeWhitespace("  \t\n ")).toBe("");
  });
  it("trims surrounding whitespace", () => {
    expect(normalizeWhitespace("  hello  ")).toBe("hello");
  });
  it("collapses spaces, tabs, and line breaks", () => {
    expect(normalizeWhitespace("one   two\t\tthree\n four")).toBe("one two three four");
  });
  it("leaves an already normalized string unchanged", () => {
    expect(normalizeWhitespace("one two three")).toBe("one two three");
  });
});
