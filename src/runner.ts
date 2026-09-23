import { randomUUID, createHash } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { route } from "./router.js";
import type { Task } from "./task.js";
import type { CodeProvider, GeneratedCode, ProviderName } from "./providers/types.js";
import { validateGenerated, type ValidationResult, type ValidationStatus } from "./validate.js";

export type Policy = "local-only" | "cloud-only" | "routed";
export type AttemptStatus = ValidationStatus | "provider_error" | "provider_timeout";

export type AttemptRecord = {
  batchId: string;
  runId: string;
  taskId: string;
  policy: Policy;
  routingReason: string;
  attemptNumber: number;
  provider: ProviderName;
  model: string | null;
  status: AttemptStatus;
  diagnostic: string;
  inputTokens: number | null;
  outputTokens: number | null;
  providerElapsedMs: number;
  validationElapsedMs: number;
  attemptElapsedMs: number;
  estimatedApiCostUsd: number | null;
  priceDate: string | null;
  generatedCodeSha256: string | null;
  generatedCode: string | null;
  timestamp: string;
};

export type TaskRunResult = {
  batchId: string;
  runId: string;
  taskId: string;
  policy: Policy;
  routingReason: string;
  success: boolean;
  elapsedMs: number;
  attempts: AttemptRecord[];
};

export type RunOptions = {
  providers: Record<ProviderName, CodeProvider>;
  maxLocalChars: number;
  cloudInputUsdPerMillion: number | null;
  cloudOutputUsdPerMillion: number | null;
  priceDate: string | null;
  logPath: string;
  batchId?: string;
  validate?: (task: Task, generatedText: string) => Promise<ValidationResult>;
};

function errorDiagnostic(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 2_000);
}

function isTimeout(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /timeout|timed out|abort/i.test(`${error.name} ${error.message}`);
}

function apiCost(
  provider: ProviderName, inputTokens: number | null, outputTokens: number | null,
  options: RunOptions,
): number | null {
  if (provider === "local") return 0;
  if (inputTokens === null || outputTokens === null ||
      options.cloudInputUsdPerMillion === null || options.cloudOutputUsdPerMillion === null) return null;
  return (inputTokens * options.cloudInputUsdPerMillion + outputTokens * options.cloudOutputUsdPerMillion) / 1_000_000;
}

async function recordAttempt(path: string, record: AttemptRecord): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(record)}\n`, "utf8");
}

export async function runTask(task: Task, policy: Policy, options: RunOptions): Promise<TaskRunResult> {
  const started = performance.now();
  const runId = randomUUID();
  const batchId = options.batchId ?? randomUUID();
  const decision = route(task, options.maxLocalChars);
  const routingReason = policy === "routed" ? decision.reason : `${policy} baseline`;
  const targets: ProviderName[] = policy === "local-only"
    ? ["local"]
    : policy === "cloud-only" || decision.target === "cloud"
      ? ["cloud"]
      : ["local", "cloud"];
  const attempts: AttemptRecord[] = [];
  let diagnostic: string | undefined;

  for (const provider of targets) {
    const attemptStarted = performance.now();
    const base = {
      batchId, runId, taskId: task.id, policy, routingReason,
      attemptNumber: attempts.length + 1, provider, priceDate: options.priceDate,
      timestamp: new Date().toISOString(),
    };
    let record: AttemptRecord;
    let generated: GeneratedCode | null = null;
    try {
      generated = await options.providers[provider].generate(task, diagnostic);
      const validation = generated.truncated
        ? { status: "invalid_response" as const, diagnostic: "Model output reached its token limit", elapsedMs: 0 }
        : await (options.validate ?? validateGenerated)(task, generated.text);
      record = {
        ...base,
        model: generated.model,
        status: validation.status,
        diagnostic: validation.diagnostic.slice(0, 2_000),
        inputTokens: generated.inputTokens,
        outputTokens: generated.outputTokens,
        providerElapsedMs: generated.elapsedMs,
        validationElapsedMs: validation.elapsedMs,
        attemptElapsedMs: Math.round(performance.now() - attemptStarted),
        estimatedApiCostUsd: apiCost(provider, generated.inputTokens, generated.outputTokens, options),
        generatedCodeSha256: createHash("sha256").update(generated.text).digest("hex"),
        generatedCode: generated.text,
      };
    } catch (error) {
      record = {
        ...base,
        model: generated?.model ?? options.providers[provider].modelName,
        status: generated === null
          ? (isTimeout(error) ? "provider_timeout" : "provider_error")
          : "infrastructure_error",
        diagnostic: errorDiagnostic(error),
        inputTokens: generated?.inputTokens ?? null,
        outputTokens: generated?.outputTokens ?? null,
        providerElapsedMs: generated?.elapsedMs ?? Math.round(performance.now() - attemptStarted),
        validationElapsedMs: 0,
        attemptElapsedMs: Math.round(performance.now() - attemptStarted),
        estimatedApiCostUsd: apiCost(provider, generated?.inputTokens ?? null, generated?.outputTokens ?? null, options),
        generatedCodeSha256: generated ? createHash("sha256").update(generated.text).digest("hex") : null,
        generatedCode: generated?.text ?? null,
      };
    }
    await recordAttempt(options.logPath, record);
    attempts.push(record);
    if (record.status === "passed" || record.status === "infrastructure_error") break;
    diagnostic = `${record.status}: ${record.diagnostic}`.slice(0, 2_000);
  }

  return {
    batchId, runId, taskId: task.id, policy, routingReason,
    success: attempts.some((attempt) => attempt.status === "passed"),
    elapsedMs: Math.round(performance.now() - started),
    attempts,
  };
}
