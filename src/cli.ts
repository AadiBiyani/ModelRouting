import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { formatReport, policies } from "./benchmark.js";
import { readConfig, type Config } from "./config.js";
import { AnthropicProvider } from "./providers/anthropic.js";
import { OllamaProvider } from "./providers/ollama.js";
import type { CodeProvider, ProviderName } from "./providers/types.js";
import { route } from "./router.js";
import { runTask, type Policy, type RunOptions, type TaskRunResult } from "./runner.js";
import { listTaskIds, loadTask } from "./task.js";

const resultsDirectory = fileURLToPath(new URL("../results/", import.meta.url));

function requireValidatorImage(): void {
  try {
    execFileSync("docker", ["image", "inspect", "model-routing-validator:local"], { stdio: "ignore" });
  } catch {
    throw new Error("Docker or the validator image is unavailable. Install/start Docker, then run npm run validator:build.");
  }
}

function unavailable(message: string): CodeProvider {
  return { modelName: "unconfigured", async generate() { throw new Error(message); } };
}

function providersFor(config: Config, policy: Policy): Record<ProviderName, CodeProvider> {
  const localNeeded = policy !== "cloud-only";
  const cloudNeeded = policy !== "local-only";
  if (localNeeded && !config.ollamaModel) throw new Error("Set OLLAMA_MODEL in .env");
  if (cloudNeeded && !config.anthropicModel) throw new Error("Set ANTHROPIC_MODEL in .env");
  if (cloudNeeded && !config.anthropicApiKey) throw new Error("Set ANTHROPIC_API_KEY in .env");
  return {
    local: config.ollamaModel
      ? new OllamaProvider(config.ollamaModel, config.ollamaBaseUrl, config.providerTimeoutMs)
      : unavailable("OLLAMA_MODEL is not configured"),
    cloud: config.anthropicModel && config.anthropicApiKey
      ? new AnthropicProvider(config.anthropicModel, config.anthropicApiKey, config.providerTimeoutMs)
      : unavailable("Anthropic is not configured"),
  };
}

function runOptions(config: Config, policy: Policy, batchId: string): RunOptions {
  return {
    providers: providersFor(config, policy),
    maxLocalChars: config.maxLocalChars,
    cloudInputUsdPerMillion: config.cloudInputUsdPerMillion,
    cloudOutputUsdPerMillion: config.cloudOutputUsdPerMillion,
    priceDate: config.priceDate,
    logPath: `${resultsDirectory}attempts.jsonl`,
    batchId,
  };
}

function requireBenchmarkPricing(config: Config): void {
  if (config.cloudInputUsdPerMillion === null || config.cloudOutputUsdPerMillion === null || !config.priceDate) {
    throw new Error("Set both cloud token prices and PRICE_DATE in .env before benchmarking");
  }
}

async function main(): Promise<void> {
  const [command, taskId] = process.argv.slice(2);
  if (command === "list") {
    for (const id of await listTaskIds()) console.log(id);
    return;
  }

  if (command === "route" && taskId) {
    const task = await loadTask(taskId);
    console.log(JSON.stringify({ taskId: task.id, ...route(task, readConfig().maxLocalChars) }, null, 2));
    return;
  }

  if (command === "smoke") {
    if (taskId !== "local" && taskId !== "cloud") {
      throw new Error("Usage: npm run smoke -- local|cloud [task-id]");
    }
    const config = readConfig();
    const provider = providersFor(config, taskId === "local" ? "local-only" : "cloud-only")[taskId];
    const task = await loadTask(process.argv[4] ?? "unique-numbers");
    const response = await provider.generate(task);
    console.log(JSON.stringify({ provider: taskId, taskId: task.id, ...response }, null, 2));
    return;
  }

  if (command === "run" && taskId) {
    const policy = (process.argv[4] ?? "routed") as Policy;
    if (!policies.includes(policy)) throw new Error(`Policy must be one of: ${policies.join(", ")}`);
    const config = readConfig();
    requireValidatorImage();
    const task = await loadTask(taskId);
    const result = await runTask(task, policy, runOptions(config, policy, randomUUID()));
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "benchmark") {
    const config = readConfig();
    requireBenchmarkPricing(config);
    providersFor(config, "routed");
    requireValidatorImage();
    const batchId = randomUUID();
    const results: TaskRunResult[] = [];
    for (const id of await listTaskIds()) {
      const task = await loadTask(id);
      for (const policy of policies) {
        const result = await runTask(task, policy, runOptions(config, policy, batchId));
        results.push(result);
        console.log(`${id} ${policy}: ${result.success ? "pass" : "fail"} (${result.attempts.map((attempt) => attempt.status).join(" -> ")})`);
        if (result.attempts.some((attempt) => attempt.status === "infrastructure_error")) {
          throw new Error("Validator infrastructure failed; benchmark stopped. See results/attempts.jsonl.");
        }
      }
    }
    const reportPath = `${resultsDirectory}report.md`;
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, formatReport(batchId, results, config.priceDate), "utf8");
    console.log(`Report: ${reportPath}`);
    return;
  }

  throw new Error("Usage: npm run tasks | npm run route -- <task-id> | npm run smoke -- local|cloud [task-id] | npm run execute -- <task-id> [policy] | npm run benchmark");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
