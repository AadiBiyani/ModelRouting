import { describe, expect, it } from "vitest";
import { buildPrompt } from "./providers/types.js";
import { codeScore, defaultRoutingOptions, estimateTokens, route, specScore } from "./router.js";
import type { Task } from "./task.js";

const task: Task = {
  id: "example",
  kind: "implement",
  prompt: "Write a function",
  context: [],
  signature: "export function example(): number",
};

const branchyCode = [
  "function f(a: boolean, b: boolean, items: number[]) {",
  "  if (a) {",
  "    if (b) {",
  "      for (const item of items) {",
  "        while (item > 0 && a) {",
  "          break;",
  "        }",
  "      }",
  "    }",
  "  }",
  "}",
].join("\n");

describe("route", () => {
  it("keeps a small, simple implementation local", () => {
    const decision = route(task);
    expect(decision.target).toBe("local");
    expect(decision.reason).toMatch(/^Fits local context/);
    expect(decision.signals.codeScore).toBeNull();
  });

  it("routes to the cloud only when input plus output reserve exceeds the local context", () => {
    const tokens = estimateTokens(buildPrompt(task));
    const reserve = 100;
    const options = { ...defaultRoutingOptions, outputReserveTokens: reserve };
    expect(route(task, { ...options, contextTokens: tokens + reserve }).target).toBe("local");
    const over = route(task, { ...options, contextTokens: tokens + reserve - 1 });
    expect(over.target).toBe("cloud");
    expect(over.reason).toContain("local context");
  });

  it("routes a rule-dense specification to the cloud", () => {
    const prompt = "Throw on invalid input; precedence matters. For example, 2 ^ 3 is 8 and f(1) returns [1].";
    expect(specScore(prompt)).toBe(5);
    const decision = route({ ...task, prompt }, { ...defaultRoutingOptions, maxSpecScore: 4 });
    expect(decision.target).toBe("cloud");
    expect(decision.reason).toContain("Specification score 5");
  });

  it("keeps a simple debugging task local", () => {
    const decision = route({ ...task, kind: "debug", context: ["export function f(x: number) { return x + 1; }"] });
    expect(decision.target).toBe("local");
    expect(decision.signals.codeScore).toBe(1);
  });

  it("routes complex code to the cloud for debugging and refactoring", () => {
    expect(codeScore(branchyCode)).toBe(10);
    for (const kind of ["debug", "refactor"] as const) {
      const decision = route({ ...task, kind, context: [branchyCode] });
      expect(decision.target).toBe("cloud");
      expect(decision.reason).toContain("Code complexity score 10");
    }
  });

  it("does not score supporting code for implementation tasks", () => {
    const decision = route({ ...task, context: [branchyCode] });
    expect(decision.target).toBe("local");
    expect(decision.signals.codeScore).toBeNull();
  });

  it("ignores branches inside comments and strings", () => {
    expect(codeScore("// if (a && b)\nconst s = \"if && ||\";\n/* while */ const t = 'for' + `case ${1}`;")).toBe(0);
  });

  it("counts ternaries but not optional chaining, nullish coalescing, or optional properties", () => {
    expect(codeScore("const v = a ? 1 : 2;")).toBe(1);
    expect(codeScore("const v = a?.b ?? c;")).toBe(0);
    expect(codeScore("type T = { x?: number };")).toBe(1);
  });

  it("rejects an output reserve that leaves no room for input", () => {
    expect(() => route(task, { ...defaultRoutingOptions, outputReserveTokens: defaultRoutingOptions.contextTokens }))
      .toThrow("outputReserveTokens must be smaller than contextTokens");
  });
});
