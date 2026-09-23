import type { Task } from "../task.js";

export type ProviderName = "local" | "cloud";

export type GeneratedCode = {
  text: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  elapsedMs: number;
  truncated: boolean;
};

export interface CodeProvider {
  readonly modelName: string;
  generate(task: Task, diagnostic?: string): Promise<GeneratedCode>;
}

export function buildPrompt(task: Task, diagnostic?: string): string {
  const sections = [
    "Return only a complete TypeScript implementation. Do not include Markdown or an explanation.",
    `Required exported function signature: ${task.signature}`,
    `Task: ${task.prompt}`,
  ];
  if (task.context.length > 0) {
    sections.push(`Supporting code and context:\n${task.context.join("\n\n")}`);
  }
  if (diagnostic) {
    sections.push(`A previous implementation failed validation. Use this diagnostic to correct it:\n${diagnostic}`);
  }
  return sections.join("\n\n");
}
