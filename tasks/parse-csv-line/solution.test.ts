import { describe, expect, it } from "vitest";
import { parseCsvLine } from "./candidate.js";

describe("parseCsvLine", () => {
  it("parses a plain record", () => {
    expect(parseCsvLine("red,green,blue")).toEqual(["red", "green", "blue"]);
  });
  it("preserves empty fields", () => {
    expect(parseCsvLine(",middle,")).toEqual(["", "middle", ""]);
    expect(parseCsvLine("")).toEqual([""]);
  });
  it("allows a comma inside a quoted field", () => {
    expect(parseCsvLine('one,"two,three",four')).toEqual(["one", "two,three", "four"]);
  });
  it("decodes doubled quotes", () => {
    expect(parseCsvLine('"He said ""hi""",ok')).toEqual(['He said "hi"', "ok"]);
  });
  it("preserves whitespace", () => {
    expect(parseCsvLine('  left  ," right ",last')).toEqual(["  left  ", " right ", "last"]);
  });
});
