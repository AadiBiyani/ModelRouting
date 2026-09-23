import { describe, expect, it } from "vitest";
import { loadTask, parseTask } from "./task.js";

describe("task definitions", () => {
  it("loads the example task", async () => {
    const task = await loadTask("unique-numbers");
    expect(task).toMatchObject({
      id: "unique-numbers",
      kind: "implement",
      signature: "export function uniqueNumbers(values: number[]): number[]",
    });
  });

  it("rejects paths outside the task directory", async () => {
    await expect(loadTask("../secret")).rejects.toThrow("Invalid task id");
  });

  it("rejects malformed task definitions", () => {
    expect(() => parseTask({ id: "missing-fields" })).toThrow();
    expect(() => parseTask({
      id: "bad-context",
      kind: "implement",
      prompt: "Hello",
      context: [42],
      signature: "export function x(): number",
    })).toThrow("context must be an array of strings");
  });
});
