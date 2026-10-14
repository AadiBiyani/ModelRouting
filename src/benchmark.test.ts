import { describe, expect, it } from "vitest";
import { formatReport, summarizeIdeal } from "./benchmark.js";
import type { AttemptRecord, Policy, TaskRunResult } from "./runner.js";
import type { ProviderName } from "./providers/types.js";

function result(taskId: string, policy: Policy, provider: ProviderName, success: boolean, cost: number, elapsedMs: number): TaskRunResult {
  const attempt: AttemptRecord = {
    batchId: "batch", runId: `${taskId}-${policy}`, taskId, policy, routingReason: "test",
    attemptNumber: 1, provider, model: provider, status: success ? "passed" : "tests_failed",
    diagnostic: "", inputTokens: 10, outputTokens: 10, providerElapsedMs: elapsedMs,
    validationElapsedMs: 0, attemptElapsedMs: elapsedMs, estimatedApiCostUsd: cost,
    priceDate: "2026-10-12", generatedCodeSha256: null, generatedCode: null, timestamp: "2026-10-13T00:00:00.000Z",
  };
  return { batchId: "batch", runId: attempt.runId, taskId, policy, routingReason: "test", success, elapsedMs, attempts: [attempt] };
}

const results = [
  result("easy", "local-only", "local", true, 0, 100),
  result("easy", "cloud-only", "cloud", true, 0.5, 300),
  result("hard", "local-only", "local", false, 0, 200),
  result("hard", "cloud-only", "cloud", true, 0.25, 400),
];

describe("summarizeIdeal", () => {
  it("uses local results that passed and cloud results otherwise", () => {
    expect(summarizeIdeal(results)).toMatchObject({
      policy: "ideal (hindsight)",
      tasks: 2,
      successes: 2,
      cloudCalls: 1,
      totalApiCostUsd: 0.25,
      totalElapsedMs: 500,
    });
  });

  it("appears in the report after the policies that ran", () => {
    const report = formatReport("batch", results, "2026-10-12");
    expect(report).toContain("| ideal (hindsight) | 2/2 | 100.0% | 1 |");
    expect(report.indexOf("| routed |")).toBeLessThan(report.indexOf("| ideal (hindsight) |"));
  });
});
