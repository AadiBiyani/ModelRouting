# Model Routing Prototype

This TypeScript CLI tests a narrow question from the Adaptive Execution Optimizer project: can simple routing reduce cloud-model calls on single-function coding tasks while preserving success on predefined checks?

Each task has a prompt, category, supporting code, fixed function signature, and separately written tests. The router sends small implementation tasks to Ollama and debugging, refactoring, or longer tasks to Anthropic. If a local attempt fails generation or validation, one cloud attempt receives the original task plus a brief diagnostic. There is never more than one attempt per provider for a task.

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

The route's 6,000-character threshold is a heuristic over the prompt and supporting code. It is not the local model's context limit. Change it with `MAX_LOCAL_CHARS`.

## Task set and review

The seven task definitions live under `tasks/`. Each task's `solution.test.ts` file was written before any model-generated solution was run. [Task review notes](docs/task-review.md) summarize the expected behavior and covered cases. Review the prompts and tests before running a benchmark; changing them afterward makes results from different runs incomparable.

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
