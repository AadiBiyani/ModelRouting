import { describe, expect, it } from "vitest";
import { evaluate } from "./candidate.js";

describe("evaluate", () => {
  it("applies multiplication before addition", () => {
    expect(evaluate("1 + 2 * 3")).toBe(7);
    expect(evaluate("(1 + 2) * 3")).toBe(9);
  });

  it("evaluates subtraction and division from left to right", () => {
    expect(evaluate("10 - 4 - 3")).toBe(3);
    expect(evaluate("64 / 4 / 2")).toBe(8);
  });

  it("evaluates exponentiation from right to left", () => {
    expect(evaluate("2 ^ 3 ^ 2")).toBe(512);
  });

  it("applies exponentiation before unary minus", () => {
    expect(evaluate("-2 ^ 2")).toBe(-4);
    expect(evaluate("(-2) ^ 2")).toBe(4);
    expect(evaluate("2 * -3 ^ 2")).toBe(-18);
  });

  it("allows unary minus in operands", () => {
    expect(evaluate("2 ^ -1")).toBe(0.5);
    expect(evaluate("3 * -2")).toBe(-6);
    expect(evaluate("--3")).toBe(3);
  });

  it("handles decimals, whitespace, and nested parentheses", () => {
    expect(evaluate("1.5 * 4")).toBe(6);
    expect(evaluate("  7 ")).toBe(7);
    expect(evaluate("((2))")).toBe(2);
    expect(evaluate("12.25-(0.25)")).toBe(12);
  });

  it("rejects invalid expressions", () => {
    expect(() => evaluate("")).toThrow();
    expect(() => evaluate("1 +")).toThrow();
    expect(() => evaluate("1 + a")).toThrow();
    expect(() => evaluate("(1 + 2")).toThrow();
    expect(() => evaluate("1 + 2)")).toThrow();
    expect(() => evaluate("2 3")).toThrow();
  });
});
