# Peer dependencies — design rule

When integrating a third-party library that the user might or might not need (`bullmq`, `ioredis`, `ws`, `@trpc/server`, `@grpc/grpc-js`, `graphql`, `@sentry/node`, etc.), Sprint follows one rule:

> **Sprint exposes only its own glue. The user installs and imports the third-party library directly.**

## What that means in practice

| Pattern | When to use | Example |
|---------|-------------|---------|
| **Adapter-only export** | Default. Sprint exposes a function that takes a pre-built peer-dep object. | `defineQueue({ adapter: new BullMQQueue({ queue: new Queue("emails", { connection }) }) })` |
| **Dynamic-import wrapper** | Sprint owns the lifecycle and wants to stay loadable when the peer is missing. | `attachTrpc()`, `attachWebSocket()`, `createGrpcServer()`, `initTelemetry()` |
| **Modified re-export** | Sprint augments the library (adds methods, behavior). | `sprint-es/schemas` — re-exports `z` with `z.sprint` and `z.files` extensions added |
| **Type-only re-export** | Just a type, zero runtime cost. | `sprint-es/ws` re-exports `type WebSocket` |

## What we do NOT do

**Static value re-exports of peer deps.** Pattern to avoid:

```ts
// sprint-es/foo/index.ts
// @ts-ignore - peer dep
export { initFoo, FooError } from "foo-peer-dep";
```

Why it's banned:

1. **Eager load.** Importing `sprint-es/foo` for *any* symbol resolves `foo-peer-dep` at module-load time. Crash if the peer is missing, even when the user only wanted Sprint's adapter.
2. **`@ts-ignore` is a black hole.** If the peer renames an export, Sprint compiles clean and the user gets `undefined` at runtime instead of a type error in their own code.
3. **API coupling.** Re-exports lock Sprint to a specific peer-dep major. The user can't upgrade the peer independently.
4. **Incomplete coverage.** If the user needs an export Sprint didn't re-list, they go back to the peer anyway — breaking the "everything from sprint" promise.
5. **Docs divergence.** Stack Overflow, the peer's own docs, and AI assistants will tell users `from "foo-peer-dep"`. A re-export at `sprint-es/foo` makes copy-paste rot.
6. **Namespace pollution.** `import * as foo from "sprint-es/foo"` mixes Sprint helpers and the peer's exports under one identifier.

## Correct user-facing pattern

For a feature backed by peer dep `X`:

```ts
// User code
import { X, XError } from "x-peer-dep";              // user owns the peer surface
import { wireXIntoSprint } from "sprint-es/x";       // Sprint owns the glue

const handle = await wireXIntoSprint({ instance: new X(...) });
```

Sprint's job:
- Provide `wireXIntoSprint` (loads `x-peer-dep` via dynamic import internally if it needs the runtime).
- Document the required peer in `package.json` `peerDependencies` with `peerDependenciesMeta.optional = true`.
- Make `create-sprint` install the peer as a regular `dependency` in the *generated* project when the user opts in to that feature.

## Concrete inventory

| Sprint module | What it exports | What user imports themselves |
|---------------|-----------------|------------------------------|
| `sprint-es/trpc` | `attachTrpc`, `AttachTrpcOptions` | `initTRPC`, `TRPCError` from `@trpc/server` |
| `sprint-es/grpc` | `createGrpcServer` | `* as grpc` from `@grpc/grpc-js` |
| `sprint-es/ws` | `attachWebSocket`, type `WebSocket` (type-only re-export OK) | other symbols from `ws` if needed |
| `sprint-es/queue` | `defineQueue`, `MemoryQueue`, `BullMQQueue`, `MemoryPubSub`, `BullMQPubSub` (classes accept pre-built `Queue`, `Worker`, `Redis` clients) | `Queue`, `Worker` from `bullmq`; `Redis` from `ioredis` |
| `sprint-es/cache` | `defineCache`, `MemoryCache`, `RedisCache` | `Redis` from `ioredis` |
| `sprint-es/telemetry` | `initTelemetry`, `captureError`, `captureMessage` (sentry loaded via dynamic import internally) | nothing — fully encapsulated |
| `sprint-es/schemas` | `z` (proxied with `.sprint` and `.files`) — modified re-export, justified | nothing — `z` from sprint covers Zod use |

For GraphQL specifically: there is no `sprint-es/graphql` module. Users build their schema with vanilla `graphql` package; Sprint loads the runtime adapter (`graphql-http`, `ruru`) via dynamic import inside the `Sprint` class when `graphql.enabled` is `true`.

## When you're tempted to re-export

Ask:
1. Does Sprint **modify** the symbol? If no, don't re-export.
2. Is it **type-only**? If yes, re-export is fine (zero runtime cost).
3. Would re-exporting trap the user inside Sprint's version pin? If yes, don't re-export.

When in doubt, ship the adapter and let the user import the peer directly. It's one extra import line and a lot less coupling.
