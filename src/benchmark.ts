import type { Policy, TaskRunResult } from "./runner.js";

export const policies: Policy[] = ["local-only", "cloud-only", "routed"];

export type PolicySummary = {
  policy: Policy;
  tasks: number;
  successes: number;
  successRate: number;
  cloudCalls: number;
  cloudTaskPercentage: number;
  totalApiCostUsd: number | null;
  apiCostPerSuccessUsd: number | null;
  totalElapsedMs: number;
  meanElapsedMs: number;
};

export function summarize(policy: Policy, results: TaskRunResult[]): PolicySummary {
  const selected = results.filter((result) => result.policy === policy);
  const attempts = selected.flatMap((result) => result.attempts);
  const cloudAttempts = attempts.filter((attempt) => attempt.provider === "cloud");
  const costs = attempts.map((attempt) => attempt.estimatedApiCostUsd);
  const priced = costs.every((cost) => cost !== null);
  const totalApiCostUsd = priced ? costs.reduce<number>((total, cost) => total + (cost ?? 0), 0) : null;
  const successes = selected.filter((result) => result.success).length;
  const totalElapsedMs = selected.reduce((total, result) => total + result.elapsedMs, 0);
  return {
    policy,
    tasks: selected.length,
    successes,
    successRate: selected.length ? successes / selected.length : 0,
    cloudCalls: cloudAttempts.length,
    cloudTaskPercentage: selected.length
      ? selected.filter((result) => result.attempts.some((attempt) => attempt.provider === "cloud")).length / selected.length
      : 0,
    totalApiCostUsd,
    apiCostPerSuccessUsd: totalApiCostUsd !== null && successes > 0 ? totalApiCostUsd / successes : null,
    totalElapsedMs,
    meanElapsedMs: selected.length ? totalElapsedMs / selected.length : 0,
  };
}

function dollars(value: number | null): string {
  return value === null ? "n/a" : `$${value.toFixed(6)}`;
}

export function formatReport(batchId: string, results: TaskRunResult[], priceDate: string | null): string {
  const summaries = policies.map((policy) => summarize(policy, results));
  const lines = [
    "# Model routing benchmark",
    "",
    `Batch ID: \`${batchId}\`  `,
    `Pricing date: ${priceDate ?? "not configured"}  `,
    `Task count: ${summaries[0].tasks}`,
    "",
    "| Policy | Passed | Success rate | Cloud calls | Tasks using cloud | API cost | Cost per success | Total time | Mean time/task |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];
  for (const summary of summaries) {
    lines.push(`| ${summary.policy} | ${summary.successes}/${summary.tasks} | ${(summary.successRate * 100).toFixed(1)}% | ${summary.cloudCalls} | ${(summary.cloudTaskPercentage * 100).toFixed(1)}% | ${dollars(summary.totalApiCostUsd)} | ${dollars(summary.apiCostPerSuccessUsd)} | ${(summary.totalElapsedMs / 1000).toFixed(2)} s | ${(summary.meanElapsedMs / 1000).toFixed(2)} s |`);
  }
  lines.push(
    "",
    "Cloud cost includes every attempt with reported token usage, including failed validation. Local inference has zero provider API fees; local compute cost is excluded. Costs are unavailable if cloud prices or token counts are missing.",
    "",
    "Passing means the implementation compiled and passed the predefined tests. These checks do not establish general correctness. This small benchmark describes observed outcomes and cannot establish statistical equivalence in success rate.",
    "",
    "## Task outcomes",
    "",
    "| Task | Local only | Cloud only | Routed |",
    "| --- | --- | --- | --- |",
  );
  const taskIds = [...new Set(results.map((result) => result.taskId))];
  for (const taskId of taskIds) {
    const cells = policies.map((policy) => {
      const result = results.find((item) => item.taskId === taskId && item.policy === policy);
      if (!result) return "not run";
      const path = result.attempts.map((attempt) => `${attempt.provider}: ${attempt.status}`).join(" → ");
      return `${result.success ? "pass" : "fail"} (${path})`;
    });
    lines.push(`| ${taskId} | ${cells.join(" | ")} |`);
  }
  return `${lines.join("\n")}\n`;
}
