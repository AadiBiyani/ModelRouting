import type { Task } from "../task.js";
import { buildPrompt, type CodeProvider, type GeneratedCode } from "./types.js";

type OllamaChatResponse = {
  model?: unknown;
  message?: { content?: unknown };
  prompt_eval_count?: unknown;
  eval_count?: unknown;
  done_reason?: unknown;
};

export class OllamaProvider implements CodeProvider {
  constructor(
    public readonly modelName: string,
    private readonly baseUrl = "http://localhost:11434",
    private readonly timeoutMs = 120_000,
  ) {}

  async generate(task: Task, diagnostic?: string): Promise<GeneratedCode> {
    const started = performance.now();
    const response = await fetch(new URL("/api/chat", this.baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.modelName,
        stream: false,
        options: { temperature: 0 },
        messages: [{ role: "user", content: buildPrompt(task, diagnostic) }],
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`Ollama returned HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }

    const data = (await response.json()) as OllamaChatResponse;
    return {
      text: typeof data.message?.content === "string" ? data.message.content : "",
      model: typeof data.model === "string" ? data.model : this.modelName,
      inputTokens: typeof data.prompt_eval_count === "number" ? data.prompt_eval_count : null,
      outputTokens: typeof data.eval_count === "number" ? data.eval_count : null,
      elapsedMs: Math.round(performance.now() - started),
      truncated: data.done_reason === "length",
    };
  }
}
