import Anthropic from "@anthropic-ai/sdk";
import type { Task } from "../task.js";
import { buildPrompt, type CodeProvider, type GeneratedCode } from "./types.js";

export class AnthropicProvider implements CodeProvider {
  private readonly client: Anthropic;

  constructor(
    public readonly modelName: string,
    apiKey: string,
    timeoutMs = 120_000,
    private readonly maxOutputTokens = 2048,
  ) {
    this.client = new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 0 });
  }

  async generate(task: Task, diagnostic?: string): Promise<GeneratedCode> {
    const started = performance.now();
    const message = await this.client.messages.create({
      model: this.modelName,
      max_tokens: this.maxOutputTokens,
      messages: [{ role: "user", content: buildPrompt(task, diagnostic) }],
    });
    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    return {
      text,
      model: message.model,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      elapsedMs: Math.round(performance.now() - started),
      truncated: message.stop_reason === "max_tokens",
    };
  }
}
