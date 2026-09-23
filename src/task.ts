import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export type TaskKind = "implement" | "debug" | "refactor";

export type Task = {
  id: string;
  kind: TaskKind;
  prompt: string;
  context: string[];
  signature: string;
};

const taskIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const taskKinds = new Set<TaskKind>(["implement", "debug", "refactor"]);
const tasksDirectory = fileURLToPath(new URL("../tasks/", import.meta.url));

export function isTaskId(value: string): boolean {
  return taskIdPattern.test(value);
}

export function parseTask(value: unknown): Task {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Task must be an object");
  }

  const task = value as Record<string, unknown>;
  if (typeof task.id !== "string" || !isTaskId(task.id)) {
    throw new Error("Task id must use lowercase words separated by hyphens");
  }
  if (typeof task.kind !== "string" || !taskKinds.has(task.kind as TaskKind)) {
    throw new Error(`Task ${task.id} has an unsupported kind`);
  }
  if (typeof task.prompt !== "string" || task.prompt.trim() === "") {
    throw new Error(`Task ${task.id} needs a prompt`);
  }
  if (!Array.isArray(task.context) || !task.context.every((item) => typeof item === "string")) {
    throw new Error(`Task ${task.id} context must be an array of strings`);
  }
  if (typeof task.signature !== "string" || task.signature.trim() === "") {
    throw new Error(`Task ${task.id} needs a TypeScript function signature`);
  }

  return {
    id: task.id,
    kind: task.kind as TaskKind,
    prompt: task.prompt,
    context: task.context as string[],
    signature: task.signature,
  };
}

export async function loadTask(id: string): Promise<Task> {
  if (!isTaskId(id)) {
    throw new Error("Invalid task id");
  }
  const url = new URL(`../tasks/${id}/task.json`, import.meta.url);
  const task = parseTask(JSON.parse(await readFile(url, "utf8")));
  if (task.id !== id) {
    throw new Error(`Task id in ${id}/task.json does not match its directory`);
  }
  return task;
}

export async function listTaskIds(): Promise<string[]> {
  const entries = await readdir(tasksDirectory, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && isTaskId(entry.name))
    .map((entry) => entry.name).sort();
}

export { tasksDirectory };
