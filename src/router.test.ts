import { describe, expect, it } from "vitest";
import { route } from "./router.js";
import type { Task } from "./task.js";

const task: Task = {
  id: "example",
  kind: "implement",
  prompt: "Write a function",
  context: [],
  signature: "export function example(): number",
};

describe("route", () => {
  it("keeps a small implementation local", () => {
    expect(route(task)).toMatchObject({
      target: "local",
      reason: "Small implementation task",
    });
  });

  it("uses the cloud for debugging and refactoring", () => {
    expect(route({ ...task, kind: "debug" }).target).toBe("cloud");
    expect(route({ ...task, kind: "refactor" }).target).toBe("cloud");
  });

  it("routes an implementation to the cloud only above the character threshold", () => {
    const chars = task.prompt.length;
    expect(route(task, chars).target).toBe("local");
    expect(route(task, chars - 1).target).toBe("cloud");
  });

  it("includes supporting code in the routing size", () => {
    expect(route({ ...task, context: ["abcd"] }, task.prompt.length + 3).target).toBe("cloud");
  });
});
