import type { Task } from "./task.js";

export type Decision = {
  target: "local" | "cloud";
  reason: string;
  inputChars: number;
};

export function route(task: Task, maxLocalChars = 6000): Decision {
  if (!Number.isInteger(maxLocalChars) || maxLocalChars < 1) {
    throw new Error("maxLocalChars must be a positive integer");
  }

  const inputChars = task.prompt.length + task.context.reduce((total, text) => total + text.length, 0);

  if (task.kind !== "implement") {
    return { target: "cloud", reason: "Debugging or refactoring task", inputChars };
  }
  if (inputChars > maxLocalChars) {
    return { target: "cloud", reason: "Input exceeds configured local routing threshold", inputChars };
  }
  return { target: "local", reason: "Small implementation task", inputChars };
}
