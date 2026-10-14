import { buildPrompt } from "./providers/types.js";
import type { Task } from "./task.js";

export type RoutingOptions = {
  contextTokens: number;
  outputReserveTokens: number;
  maxSpecScore: number;
  maxCodeScore: number;
};

export const defaultRoutingOptions: RoutingOptions = {
  contextTokens: 4096,
  outputReserveTokens: 2048,
  maxSpecScore: 8,
  maxCodeScore: 8,
};

export type Decision = {
  target: "local" | "cloud";
  reason: string;
  signals: {
    estimatedInputTokens: number;
    specScore: number;
    codeScore: number | null;
  };
};

// Observed local tokenizers used 3.2-5.2 characters per token; 3 overestimates on purpose.
const charsPerToken = 3;
const ruleTerms = /\b(precedence|associative|unless|except|only if|otherwise|instead|preserv\w*|invalid|throw\w*|tie|stable|escape\w*|order|mutate|at least|at most|exactly|must|may)\b/gi;
const workedExamples = /\b(is|returns)\s+-?[\d[]/gi;
const decisionPoints = /\b(if|for|while|case|catch)\b|&&|\|\||(?<!\?)\?(?![.?:])/g;

export function assertRoutingOptions(options: RoutingOptions): void {
  for (const [name, value] of Object.entries(options)) {
    if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  }
  if (options.outputReserveTokens >= options.contextTokens) {
    throw new Error("outputReserveTokens must be smaller than contextTokens");
  }
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / charsPerToken);
}

// Counts explicit rules and worked examples: dense specifications are hard regardless of length.
export function specScore(prompt: string): number {
  return (prompt.match(ruleTerms)?.length ?? 0) + (prompt.match(workedExamples)?.length ?? 0);
}

function stripCommentsAndStrings(code: string): string {
  let result = "";
  let index = 0;
  while (index < code.length) {
    const char = code[index];
    const next = code[index + 1];
    if (char === "/" && next === "/") {
      while (index < code.length && code[index] !== "\n") index++;
    } else if (char === "/" && next === "*") {
      const end = code.indexOf("*/", index + 2);
      index = end === -1 ? code.length : end + 2;
      result += " ";
    } else if (char === "\"" || char === "'" || char === "`") {
      index++;
      while (index < code.length && code[index] !== char) index += code[index] === "\\" ? 2 : 1;
      index++;
      result += "\"\"";
    } else {
      result += char;
      index++;
    }
  }
  return result;
}

// Decision points plus maximum brace nesting, ignoring comments and string contents.
export function codeScore(code: string): number {
  const stripped = stripCommentsAndStrings(code);
  let depth = 0;
  let maxDepth = 0;
  for (const char of stripped) {
    if (char === "{") maxDepth = Math.max(maxDepth, ++depth);
    else if (char === "}") depth = Math.max(0, depth - 1);
  }
  return (stripped.match(decisionPoints)?.length ?? 0) + maxDepth;
}

export function route(task: Task, options: RoutingOptions = defaultRoutingOptions): Decision {
  assertRoutingOptions(options);

  const signals = {
    estimatedInputTokens: estimateTokens(buildPrompt(task)),
    specScore: specScore(task.prompt),
    // Context of an implementation task is reference material, so only changed code is scored.
    codeScore: task.kind === "implement" ? null : codeScore(task.context.join("\n")),
  };

  if (signals.estimatedInputTokens + options.outputReserveTokens > options.contextTokens) {
    return {
      target: "cloud",
      reason: `Estimated ${signals.estimatedInputTokens} input tokens plus ${options.outputReserveTokens} reserved for output exceed the ${options.contextTokens}-token local context`,
      signals,
    };
  }
  if (signals.specScore > options.maxSpecScore) {
    return {
      target: "cloud",
      reason: `Specification score ${signals.specScore} exceeds the local limit of ${options.maxSpecScore}`,
      signals,
    };
  }
  if (signals.codeScore !== null && signals.codeScore > options.maxCodeScore) {
    return {
      target: "cloud",
      reason: `Code complexity score ${signals.codeScore} exceeds the local limit of ${options.maxCodeScore}`,
      signals,
    };
  }
  const codePart = signals.codeScore === null ? "" : `, code complexity score ${signals.codeScore}`;
  return {
    target: "local",
    reason: `Fits local context; specification score ${signals.specScore}${codePart} within limits`,
    signals,
  };
}
