import { describe, expect, it } from "vitest";
import { isPalindrome } from "./candidate.js";

describe("isPalindrome", () => {
  it("handles a phrase with punctuation and mixed case", () => {
    expect(isPalindrome("A man, a plan, a canal: Panama!")).toBe(true);
  });
  it("rejects a non-palindrome", () => expect(isPalindrome("coding agent")).toBe(false));
  it("includes digits", () => {
    expect(isPalindrome("1a2a1")).toBe(true);
    expect(isPalindrome("1a2a3")).toBe(false);
  });
  it("treats no ASCII letters or digits as a palindrome", () => {
    expect(isPalindrome("?!")).toBe(true);
  });
});
