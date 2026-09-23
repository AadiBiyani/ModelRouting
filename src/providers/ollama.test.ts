import { afterEach, describe, expect, it, vi } from "vitest";
import { OllamaProvider } from "./ollama.js";
import type { Task } from "../task.js";

const task: Task = {
  id: "example",
  kind: "implement",
  prompt: "Write example",
  context: ["Existing helper code"],
  signature: "export function example(): number",
};

afterEach(() => vi.unstubAllGlobals());

describe("OllamaProvider", () => {
  it("sends a nonstreaming chat request and captures usage", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      model: "local-model",
      message: { content: "export function example() { return 1; }" },
      prompt_eval_count: 42,
      eval_count: 19,
      done_reason: "stop",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await new OllamaProvider("local-model").generate(task);
    expect(result).toMatchObject({ model: "local-model", inputTokens: 42, outputTokens: 19, truncated: false });
    const [url, request] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.toString()).toBe("http://localhost:11434/api/chat");
    const body = JSON.parse(String(request.body));
    expect(body.stream).toBe(false);
    expect(body.model).toBe("local-model");
    expect(body.messages[0].content).toContain("Existing helper code");
  });
});
