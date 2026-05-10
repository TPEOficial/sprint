# Testing

`sprint-es` ships a Jest suite covering every module. `create-sprint` has no automated tests yet — smoke-test by generating a project and inspecting it.

## Running `sprint-es` tests

```bash
cd packages/sprint-es
npm test
```

Current count: **134 tests across 17 suites**.

The suites under `test/`:

| File | Module |
|------|--------|
| `errors.test.ts` | HttpError hierarchy + global handler + asyncHandler |
| `context.test.ts` | AsyncLocalStorage context + traceparent propagation |
| `lifecycle.test.ts` | Resource registry, init/shutdown ordering |
| `cache.test.ts` | MemoryCache LRU + TTL |
| `queue.test.ts` | MemoryQueue + MemoryPubSub (priority, retry, DLQ, idempotency) |
| `security.test.ts` | Headers + CORS allowlist |
| `sse.test.ts` | SSE stream framing |
| `csrf.test.ts` | Double-submit cookie validation |
| `idempotency.test.ts` | Replay on duplicate key |
| `workers.test.ts` | WorkerPool spawn + parallel + close |
| `circuit-breaker.test.ts` | State machine + fallback + timeout |
| `discovery.test.ts` | InMemoryDiscovery TTL + watchers |
| `flags.test.ts` | Static / Env / Composite providers |
| `openapi.test.ts` | Zod → OpenAPI 3.0 conversion |
| `pagination.test.ts` | Offset + cursor + filter + sort parsers |
| `secrets.test.ts` | Env / File / Memoized / Composite providers |
| `http-client.test.ts` | fetch wrapper + retry + circuit + timeout |

Run a single suite:

```bash
npx jest test/errors.test.ts
```

Run by name pattern:

```bash
npx jest --testNamePattern="circuit"
```

## Smoke-testing the framework end-to-end

Build first, then run a small script against the built artifacts:

```bash
cd packages/sprint-es
npm run build

node --input-type=module -e "
import Sprint from './dist/esm/index.js';
import { defineCache, MemoryCache } from './dist/esm/modules/cache/index.js';
import { initResources } from './dist/esm/modules/lifecycle/index.js';

defineCache({ name: 'main', adapter: new MemoryCache({ maxEntries: 100 }) });
await initResources();
console.log('OK');
process.exit(0);
"
```

For a full HTTP smoke (probes, error envelope, CORS, queue context propagation) see the script that lives in conversation history — paste it into a file like `scripts/smoke.mjs` if you want to keep it.

## Smoke-testing `create-sprint`

```bash
cd packages/create-sprint
npm run build

mkdir -p /tmp/cs && cd /tmp/cs && rm -rf testapp
node $OLDPWD/dist/cli.js --yes --name testapp \
    --queue bullmq --cache redis --trpc --grpc --websocket \
    --cors "https://app.example.com" --no-install

# Spot-check generated files
cat testapp/sprint.config.ts
cat testapp/src/app.ts
cat testapp/package.json
```

Then optionally install + run inside the generated project to catch dep-resolution issues:

```bash
cd testapp
npm install
npm run dev
```

## CI checklist before publishing

A minimal "ready to publish" check:

```bash
# from repo root
npm install
npm run build --workspace=sprint-es
npm test --workspace=sprint-es
npm run build --workspace=create-sprint
```

All four steps must succeed clean. If any test fails or the build emits errors, do not publish — fix first.
