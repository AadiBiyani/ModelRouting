# Model Routing Prototype

This TypeScript CLI tests a narrow question from the Adaptive Execution Optimizer project: can simple routing reduce cloud-model calls on single-function coding tasks while preserving success on predefined checks?

Each task has a prompt, category, supporting code, fixed function signature, and separately written tests. Before any model call, the router sends a task to Anthropic if it would not fit in the local model's context window or if it scores as too complex; everything else, including simple debugging and refactoring tasks, goes to Ollama first. If a local attempt fails generation or validation, one cloud attempt receives the original task plus a brief diagnostic. There is never more than one attempt per provider for a task.

## Requirements

- Node.js 22 or newer and npm
- Docker Desktop, running locally
- Ollama, running locally, with a coding model pulled
- An Anthropic API key and a chosen cloud model

Install dependencies with `npm ci`. Copy `.env.example` to `.env` and set the model names, API key, cloud token prices, and the date you checked those prices. The real `.env` is ignored by Git. Check [Anthropic model IDs](https://platform.claude.com/docs/en/models/overview) and [pricing](https://platform.claude.com/docs/en/about-claude/pricing) for the model you choose.

Build the validator image once after installing dependencies:

~~~sh
npm run validator:build
~~~

The image installs validation dependencies. Individual candidate runs then use no network, a read-only filesystem and test mount, limited CPU and memory, and a 30-second command timeout. The CLI never mounts the repository, Docker socket, or API credentials into the execution container.

## Commands

~~~sh
npm run tasks
npm run route -- unique-numbers
npm run smoke -- local unique-numbers
npm run smoke -- cloud unique-numbers
npm run execute -- unique-numbers local-only
npm run execute -- unique-numbers cloud-only
npm run execute -- unique-numbers routed
npm run benchmark
npm run typecheck
npm test
~~~

`route` explains the routing decision without calling a model. `smoke` confirms a real provider request and prints its response without executing the generated code. `execute` runs one task. `benchmark` runs every task under local-only, cloud-only, and routed policies, then writes `results/report.md`. Every execution attempt is appended to `results/attempts.jsonl`, including failures. Both files are ignored by Git until you choose which evidence to publish.

The router applies three checks in order, and `route` prints the scores behind each decision:

1. **Capacity.** The full prompt is estimated at one token per three characters. If that estimate plus `LOCAL_OUTPUT_RESERVE_TOKENS` (default 2048) exceeds `LOCAL_CONTEXT_TOKENS` (default 4096), the task goes to the cloud. The same context size is sent to Ollama as `num_ctx`, so the router's assumption matches the window the local model actually uses.
2. **Specification score.** The prompt's count of rule words (such as "precedence", "unless", "invalid", "must") plus worked examples (such as "2 ^ 3 is 8"). Above `MAX_LOCAL_SPEC_SCORE` (default 8), the task goes to the cloud.
3. **Code complexity score.** For debugging and refactoring tasks only, the supplied code's decision points (`if`, loops, `case`, `catch`, `&&`, `||`, ternaries) plus its deepest brace nesting, ignoring comments and strings. Above `MAX_LOCAL_CODE_SCORE` (default 8), the task goes to the cloud. Supporting code for implementation tasks counts toward capacity but not complexity, because it is reference material rather than code to change.

The default limits were calibrated on the current task set, so treat them as starting points and check them against new tasks. Routed results from benchmarks run before this routing change are not comparable with later ones. A benchmark report also includes an `ideal (hindsight)` row: the cost and success the batch would have had if every task had gone to the right model, which measures how much room the router leaves.

## Task set and review

The eleven task definitions live under `tasks/`. Each task's `solution.test.ts` file was written before any model-generated solution was run. [Task review notes](docs/task-review.md) summarize the expected behavior and covered cases. Review the prompts and tests before running a benchmark; changing them afterward makes results from different runs incomparable.

Passing means TypeScript compiled the candidate and Vitest passed these predefined checks. The checks cannot prove general correctness or refactoring quality. The benchmark is small, so its success rates are descriptive rather than a statistical equivalence claim.

## Results

Each JSONL line records the task and policy, routing reason, provider and model, attempt status, diagnostic, token counts, provider and validation time, estimated API cost, generated code and its SHA-256 hash, and run IDs. Statuses distinguish provider errors/timeouts, invalid or truncated responses, compilation failures, failed tests, validation timeouts, and infrastructure failures.

The report shows task success rate, cloud calls, percentage of tasks using cloud, total API spending, spending per successful task, and end-to-end latency. Failed attempts count toward cost when token usage is known. Local inference has zero provider API fees; local compute cost is excluded. If cloud usage or prices are unavailable, cost is reported as unavailable.

## Learning resources

- [Ollama chat API](https://docs.ollama.com/api/chat): request format, nonstreaming responses, token counts, and timing fields. It does not establish that a chosen local model will solve these tasks well.
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript): client setup, message calls, and usage fields. It does not determine which model or price is right for this benchmark.
- [Vitest CLI](https://vitest.dev/guide/cli): single-run test command used by validation.
- [Docker run reference](https://docs.docker.com/reference/cli/docker/container/run/): container controls used to isolate candidate code.

The assignment-facing objectives, evidence checklist, and remaining reflection are in [assignment notes](docs/assignment-notes.md).
