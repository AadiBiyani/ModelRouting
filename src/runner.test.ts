import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { summarize } from "./benchmark.js";
import { runTask, type RunOptions } from "./runner.js";
import type { Task } from "./task.js";
import type { CodeProvider, GeneratedCode } from "./providers/types.js";

const task: Task = {
  id: "sample",
  kind: "implement",
  prompt: "Implement sample",
  context: [],
  signature: "export function sample(): number",
};

function generated(text: string, model: string): GeneratedCode {
  return { text, model, inputTokens: 100, outputTokens: 20, elapsedMs: 50, truncated: false };
}

async function withOptions(test: (options: RunOptions, cloudCalls: string[]) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "model-routing-runner-test-"));
  const cloudCalls: string[] = [];
  const local: CodeProvider = { modelName: "local-model", async generate() { return generated("local code", "local-model"); } };
  const cloud: CodeProvider = {
    modelName: "cloud-model",
    async generate(_task, diagnostic) {
      cloudCalls.push(diagnostic ?? "");
      return generated("cloud code", "cloud-model");
    },
  };
  const options: RunOptions = {
    providers: { local, cloud },
    maxLocalChars: 6000,
    cloudInputUsdPerMillion: 3,
    cloudOutputUsdPerMillion: 15,
    priceDate: "2026-09-22",
    logPath: join(directory, "attempts.jsonl"),
    validate: async (_task, code) => code === "local code"
      ? { status: "tests_failed", diagnostic: "ordering assertion failed", elapsedMs: 10 }
      : { status: "passed", diagnostic: "", elapsedMs: 10 },
  };
  try {
    await test(options, cloudCalls);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("runTask", () => {
  it("escalates a failed local validation once and records both attempts", async () => {
    await withOptions(async (options, cloudCalls) => {
      const result = await runTask(task, "routed", options);
      expect(result.success).toBe(true);
      expect(result.attempts.map((attempt) => attempt.status)).toEqual(["tests_failed", "passed"]);
      expect(cloudCalls).toEqual(["tests_failed: ordering assertion failed"]);
      expect(result.attempts[0].estimatedApiCostUsd).toBe(0);
      expect(result.attempts[1].estimatedApiCostUsd).toBeCloseTo(0.0006);
      expect(summarize("routed", [result])).toMatchObject({
        successes: 1,
        cloudCalls: 1,
        cloudTaskPercentage: 1,
      });
      const rows = (await readFile(options.logPath, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
      expect(rows).toHaveLength(2);
      expect(rows[0].runId).toBe(rows[1].runId);
    });
  });

  it("does not call cloud when the local implementation passes", async () => {
    await withOptions(async (options, cloudCalls) => {
      options.validate = async () => ({ status: "passed", diagnostic: "", elapsedMs: 10 });
      const result = await runTask(task, "routed", options);
      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0].provider).toBe("local");
      expect(cloudCalls).toHaveLength(0);
    });
  });

  it("keeps a failed local-only baseline to one attempt", async () => {
    await withOptions(async (options, cloudCalls) => {
      const result = await runTask(task, "local-only", options);
      expect(result.success).toBe(false);
      expect(result.attempts.map((attempt) => attempt.provider)).toEqual(["local"]);
      expect(cloudCalls).toHaveLength(0);
    });
  });

  it("does not spend a cloud call on validator infrastructure failure", async () => {
    await withOptions(async (options, cloudCalls) => {
      options.validate = async () => ({ status: "infrastructure_error", diagnostic: "Docker unavailable", elapsedMs: 0 });
      const result = await runTask(task, "routed", options);
      expect(result.success).toBe(false);
      expect(result.attempts).toHaveLength(1);
      expect(cloudCalls).toHaveLength(0);
    });
  });

  it("routes a debugging task directly to cloud", async () => {
    await withOptions(async (options, cloudCalls) => {
      const result = await runTask({ ...task, kind: "debug" }, "routed", options);
      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0].provider).toBe("cloud");
      expect(cloudCalls).toEqual([""]);
    });
  });
});
