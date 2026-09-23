import { existsSync } from "node:fs";

export type Config = {
  ollamaModel: string | null;
  ollamaBaseUrl: string;
  anthropicModel: string | null;
  anthropicApiKey: string | null;
  maxLocalChars: number;
  providerTimeoutMs: number;
  cloudInputUsdPerMillion: number | null;
  cloudOutputUsdPerMillion: number | null;
  priceDate: string | null;
};

function positiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}

function nonnegativePrice(name: string): number | null {
  const raw = process.env[name];
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a nonnegative number`);
  return value;
}

export function readConfig(): Config {
  if (existsSync(".env")) process.loadEnvFile(".env");
  return {
    ollamaModel: process.env.OLLAMA_MODEL || null,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    anthropicModel: process.env.ANTHROPIC_MODEL || null,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
    maxLocalChars: positiveInteger("MAX_LOCAL_CHARS", 6000),
    providerTimeoutMs: positiveInteger("PROVIDER_TIMEOUT_MS", 120_000),
    cloudInputUsdPerMillion: nonnegativePrice("CLOUD_INPUT_USD_PER_MILLION"),
    cloudOutputUsdPerMillion: nonnegativePrice("CLOUD_OUTPUT_USD_PER_MILLION"),
    priceDate: process.env.PRICE_DATE || null,
  };
}
