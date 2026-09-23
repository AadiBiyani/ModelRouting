import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { chmod, copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isTaskId, type Task } from "./task.js";

export type ValidationStatus =
  | "passed"
  | "invalid_response"
  | "compile_failed"
  | "tests_failed"
  | "timeout"
  | "infrastructure_error";

export type ValidationResult = {
  status: ValidationStatus;
  diagnostic: string;
  elapsedMs: number;
};

type CommandResult = {
  exitCode: number | null;
  output: string;
  timedOut: boolean;
  spawnError?: string;
};

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const validatorImage = "model-routing-validator:local";
const commandTimeoutMs = 30_000;
const maxOutputChars = 8_000;

function normalizeCode(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("```")) return trimmed;
  const match = /^```(?:typescript|ts)?\s*\n([\s\S]*?)\n```$/.exec(trimmed);
  return match?.[1] ?? null;
}

async function runDocker(args: string[], containerName: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let timedOut = false;
    let spawnError: string | undefined;
    const append = (data: Buffer) => {
      output = (output + data.toString()).slice(-maxOutputChars);
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    child.on("error", (error) => { spawnError = error.message; });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
      const cleanup = spawn("docker", ["rm", "--force", containerName], { stdio: "ignore" });
      cleanup.on("error", () => {});
    }, commandTimeoutMs);
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode, output: output.trim(), timedOut, spawnError });
    });
  });
}

async function runValidatorContainer(directory: string, executable: string, args: string[]): Promise<CommandResult> {
  const name = `model-routing-${randomUUID()}`;
  return runDocker([
    "run", "--rm", "--name", name,
    "--network", "none", "--read-only", "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges", "--memory", "512m", "--memory-swap", "512m", "--cpus", "1",
    "--pids-limit", "64", "--user", "1000:1000",
    "--env", "XDG_DATA_HOME=/tmp", "--env", "XDG_CACHE_HOME=/tmp",
    "--tmpfs", "/tmp:rw,nosuid,nodev,size=64m",
    "--tmpfs", "/app/node_modules/.vite-temp:rw,nosuid,nodev,size=16m,mode=1777",
    "--mount", `type=bind,src=${directory},dst=/app/work,readonly`,
    validatorImage, executable, ...args,
  ], name);
}

function classify(result: CommandResult, failure: "compile_failed" | "tests_failed"): ValidationResult {
  if (result.timedOut) return { status: "timeout", diagnostic: "Validation exceeded 30 seconds", elapsedMs: 0 };
  if (result.spawnError || [125, 126, 127].includes(result.exitCode ?? -1)) {
    return { status: "infrastructure_error", diagnostic: result.spawnError ?? result.output, elapsedMs: 0 };
  }
  if (failure === "tests_failed" && /Startup Error|failed to load config/i.test(result.output)) {
    return { status: "infrastructure_error", diagnostic: result.output, elapsedMs: 0 };
  }
  if (result.exitCode !== 0) return { status: failure, diagnostic: result.output, elapsedMs: 0 };
  return { status: "passed", diagnostic: "", elapsedMs: 0 };
}

export async function validateGenerated(task: Task, generatedText: string): Promise<ValidationResult> {
  const started = performance.now();
  if (!isTaskId(task.id)) {
    return { status: "infrastructure_error", diagnostic: "Invalid task id", elapsedMs: 0 };
  }
  const code = normalizeCode(generatedText);
  if (!code) {
    return { status: "invalid_response", diagnostic: "Model response was empty or not a single code block", elapsedMs: 0 };
  }

  const runsDirectory = join(repositoryRoot, ".runs");
  await mkdir(runsDirectory, { recursive: true });
  const attemptDirectory = await mkdtemp(join(runsDirectory, "attempt-"));
  try {
    await chmod(attemptDirectory, 0o755);
    await writeFile(join(attemptDirectory, "candidate.ts"), `${code}\n`, "utf8");
    await copyFile(
      new URL(`../tasks/${task.id}/solution.test.ts`, import.meta.url),
      join(attemptDirectory, "solution.test.ts"),
    );
    await writeFile(join(attemptDirectory, "tsconfig.json"), JSON.stringify({
      compilerOptions: {
        target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext",
        strict: true, noEmit: true, skipLibCheck: true, types: ["node"],
      },
      files: ["candidate.ts", "solution.test.ts"],
    }), "utf8");
    await writeFile(join(attemptDirectory, "package.json"), '{"type":"module"}', "utf8");
    await writeFile(join(attemptDirectory, "vitest.config.ts"), [
      'import { defineConfig } from "vitest/config";',
      'export default defineConfig({ cacheDir: "/tmp/vite-cache", test: { include: ["solution.test.ts"] } });',
    ].join("\n"), "utf8");

    const compile = classify(await runValidatorContainer(
      attemptDirectory, "/app/node_modules/.bin/tsc", ["--project", "/app/work/tsconfig.json"],
    ), "compile_failed");
    if (compile.status !== "passed") return { ...compile, elapsedMs: Math.round(performance.now() - started) };

    const tests = classify(await runValidatorContainer(
      attemptDirectory, "/app/node_modules/.bin/vitest",
      ["run", "solution.test.ts", "--root", "/app/work", "--maxWorkers", "1", "--no-file-parallelism"],
    ), "tests_failed");
    return { ...tests, elapsedMs: Math.round(performance.now() - started) };
  } catch (error) {
    return {
      status: "infrastructure_error",
      diagnostic: error instanceof Error ? error.message : String(error),
      elapsedMs: Math.round(performance.now() - started),
    };
  } finally {
    await rm(attemptDirectory, { recursive: true, force: true });
  }
}
