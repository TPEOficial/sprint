<div align="center">
  <br />
  <img src="./docs/images/banner.png" alt="Sprint Banner" />
  <h1>Sprint — Edge Server [EXPERIMENTAL]</h1>
  <p>A next-generation backend framework that enables instant API development with a single command, enforcing clean structure by default and eliminating repetitive code while keeping projects fast, organized, and scalable.</p>
  <img src="https://img.shields.io/badge/TypeScript-purple?style=for-the-badge&logo=typescript&logoColor=white"/> 
  <a href="https://github.com/TPEOficial"> <img alt="GitHub" src="https://img.shields.io/badge/GitHub-purple?style=for-the-badge&logo=github&logoColor=white"/></a>
  <a href="https://ko-fi.com/fjrg2007"> <img alt="Kofi" src="https://img.shields.io/badge/Ko--fi-purple?style=for-the-badge&logo=ko-fi&logoColor=white"></a>
  <br />
  <br />
  <a href="#quickstart">Quickstart</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://tpe.li/D-SPRINT">Docs</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://tpe.li/dsc">Discord</a>
  <hr />
</div>

## Quickstart

```bash
npx -y create-sprint@latest
```

<details>
  <summary>View auto-generated project structure</summary>

```
 📂<your-app>
 ┣ 📂node_modules (It depends on specs)
 ┣ 📂src
 ┃ ┣ 📂config
 ┃ ┃ ┣ 📜clients.{ts.js}
 ┃ ┃ ┗ 📜index.{ts.js}
 ┃ ┣ 📂controllers
 ┃ ┃ ┣ 📜admin.{ts.js}
 ┃ ┃ ┗ 📜home.{ts.js}
 ┃ ┣ 📂cronjobs
 ┃ ┃ ┗ 📜example.{ts.js}
 ┃ ┣ 📂graphql (It depends on specs)
 ┃ ┃ ┣ 📜resolvers.{ts.js}
 ┃ ┃ ┣ 📜schema.{ts.js}
 ┃ ┃ ┗ 📜types.{ts.js}
 ┃ ┣ 📂middlewares
 ┃ ┃ ┣ 📜auth.internal.{ts.js}
 ┃ ┃ ┗ 📜auth.user.{ts.js}
 ┃ ┣ 📂routes
 ┃ ┃ ┣ 📜admin.{ts.js}
 ┃ ┃ ┗ 📜home.{ts.js}
 ┃ ┣ 📂schemas
 ┃ ┃ ┣ 📜admin.{ts.js}
 ┃ ┃ ┗ 📜home.{ts.js}
 ┃ ┣ 📂services
 ┃ ┃ ┣ 📜.gitkeep
 ┃ ┗ 📜app.{ts.js}
 ┣ 📜.dockerignore (It depends on specs)
 ┣ 📜.env.development
 ┣ 📜.env.development.example
 ┣ 📜.env.production
 ┣ 📜.env.production.example
 ┣ 📜.gitignore
 ┣ 📜docker-compose.yml (It depends on specs)
 ┣ 📜Dockerfile (It depends on specs)
 ┣ 📜package-lock.json (It depends on specs)
 ┣ 📜package.json
 ┣ 📜sprint.config.{ts.js}
 ┗ 📜tsconfig.json (It depends on specs)
```
</details>

This will create a new Sprint project in the current directory with:
- TypeScript configuration
- Default routes and middlewares folders
- Healthcheck endpoint

### Development

```bash
npm run dev
```

If you want to check that your project is designed correctly, you can run the following command to receive a report in case you have anti-patterns:

```bash
npm run doctor
```

### Production

```bash
npm run build && npm run start

# or

docker compose up -d
```

## Features

**Sprint** provides different modules depending on the required use.

| Feature                                                                | Status         |
| ---------------------------------------------------------------------- | -------------- |
| File-based dynamic routing system                                      | 🟢 Active      |
| Advanced middleware system                                             | 🟢 Active      |
| Pre-established security policies                                      | 🟢 Active      |
| Native support for JSON, formatted and ready to use                    | 🟢 Active      |
| CORS, Morgan, and similar modules preinstalled                         | 🟢 Active      |
| Validation scheme and documentation generation system                  | 🟢 Active      |
| Automatic generation of OpenAPI + Swagger UI                  | 🟢 Active      |
| Sprint Doctor for detecting anti-patterns                  | 🟢 Active      |
| Support for GraphQL and GraphiQL                   | 🟢 Active      |
| Preconfigured health check and 404 error pages                         | 🟢 Active      |
| Anti-directory listing rate limiting system                            | 🟢 Active      |
| Logger module included to reduce memory consumption                   | 🟢 Active      |
| JWT authentication with EC signing                                      | 🟢 Active      |
| Encrypted JWT (JWE-like with AES-256-GCM)                             | 🟢 Active      |
| Token pairs (access + refresh tokens)                                 | 🟢 Active      |
| CronJobs scheduler with node-cron                                      | 🟢 Active      |
| Agnostic Telemetry (OpenTelemetry, Sentry, GlitchTip, Discord, Telegram, Nodemailer...)                       | 🟢 Active      |
| Typed `HttpError` hierarchy + global error envelope                    | 🟢 Active      |
| `X-Request-ID` + W3C `traceparent` propagation (AsyncLocalStorage)     | 🟢 Active      |
| Graceful shutdown + `/healthz` + `/readyz` (K8s probes)                | 🟢 Active      |
| Resource lifecycle registry (`registerResource`, `defineDb`)           | 🟢 Active      |
| Secure-by-default CORS (allowlist) + helmet-equivalent headers         | 🟢 Active      |
| Cache module (in-memory LRU + Redis adapter)                           | 🟢 Active      |
| Queue + DLQ + retries + idempotency (in-memory + BullMQ)               | 🟢 Active      |
| Pub/Sub (in-memory + Redis)                                            | 🟢 Active      |
| Server-Sent Events (SSE) helper                                        | 🟢 Active      |
| WebSocket integration (`ws` peer dep)                                  | 🟢 Active      |
| Worker thread pool helper                                              | 🟢 Active      |
| Env validation (Zod, fail-fast)                                        | 🟢 Active      |
| Per-route body-size limits                                             | 🟢 Active      |
| CSRF middleware (double-submit cookie)                                 | 🟢 Active      |
| Idempotency middleware                                                 | 🟢 Active      |
| Circuit breaker (closed / open / half-open)                            | 🟢 Active      |
| Service discovery (in-memory + adapter API)                            | 🟢 Active      |
| Feature flags (static / env / file / composite)                        | 🟢 Active      |
| tRPC adapter (peer dep `@trpc/server`)                                 | 🟢 Active      |
| gRPC server adapter (peer dep `@grpc/grpc-js`)                         | 🟢 Active      |
| HTTP client with retry + circuit breaker + trace propagation           | 🟢 Active      |
| Pagination + filter + sort helpers (offset & cursor)                   | 🟢 Active      |
| Secrets manager (env / file / memoized / composite)                    | 🟢 Active      |
| OpenAPI converter (full Zod coverage: enums, unions, refines, formats) | 🟢 Active      |


<details>
  <summary>Default routes reserved for Sprint</summary>

```
 - /healthz       (liveness)
 - /readyz        (readiness)
 - /health        (deprecated alias)
 - /healthcheck   (deprecated)
 - /openapi.json
 - /swagger
 - /graphql
 - /graphiql
```
</details>

```ts
import Sprint from "sprint-es";

const app = new Sprint();

app.get("/", (req, res) => res.send("Hello World!"));
```

#### File-based dynamic routing system 

In this example, we generate a route called random with subroutes inside it.
```
📦example
 ┣ 📂middlewares
 ┃ ┗ 📜auth.js
 ┣ 📂routes
 ┃ ┗ 📜random.js
 ┗ 📜app.js
```

#### Define route

We define a `Router` as we would in **ExpressJS** and export it to a file with the desired route name within the `routes` folder. **Sprint** will recognize it automatically.

```ts
import { Router } from "sprint-es";

const router = Router();

router.get("/", (req, res) => res.send("Hello World 2!"));

export default router;
```

#### Visual grouping of routes

You can create folders with names in parentheses to group your routes more easily without affecting the path in the API URL.

```
📦routes
 ┣ 📂(auth)
 ┃ ┣ 📂(protected)
 ┃ ┃ ┣ 📂settings
 ┃ ┃ ┃ ┗ 📜index.js
 ┃ ┃ ┗ 📜profile.js
 ┃ ┗ 📜login.js
```

#### Define middleware

We export a `defineMiddleware` function in a file with the name of your choice in the `middlewares` folder. **Sprint** will recognize it automatically.

```ts
import { defineMiddleware } from "sprint-es";

export default defineMiddleware({
    name: "admin",
    priority: 20, // Runs after auth.
    include: "/admin/**",
    handler: (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: "Not authenticated" });

        if (req.user.role !== "admin") {
            console.log(`[Sprint Example: Admin] Access denied for user: ${req.user.name} (role: ${req.user.role})`);
            return res.status(403).json({
                error: "Forbidden",
                message: "Admin access required"
            });
        }

        console.log(`[Sprint Example: Admin] Admin access granted for: ${req.user.name}`);
        next();
    }
});
```

#### Define Rate Limit

```ts
import { defineMiddleware } from "sprint-es";
import { createRateLimit } from "sprint-es/rate-limit";

const ratelimitIp = createRateLimit(3, "5s", "ip", {
    blockDuration: "1m"
});

export default defineMiddleware({
    name: "rate-limit",
    priority: 7, // Runs after logger.
    include: "/**",
    handler: async (req, res, next) => {
        const { success, limit, remaining, reset } = await ratelimitIp.limit(req.ip);

        if (!success) return res.status(429).send("Too many requests. Try again later.");

        console.log(`Request allowed. Remaining: ${remaining}/${limit}`);
        next();
    }
});
```

More info: https://docs.tpeoficial.com/docs/toolkitify/rate-limit/introduction

#### Use Logger

Logger is designed to reduce memory consumption when using `console.logs`. Using it will improve the performance of your API.

```ts
import { defineMiddleware } from "sprint-es";
import { logger } from "sprint-es/logger";

export default defineMiddleware({
    name: "logger",
    priority: 5, // Runs first.
    include: "/**", // All routes.
    handler: (req, res, next) => {
        const start = Date.now();

        res.on("finish", () => {
            const duration = Date.now() - start;
            logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
        });

        next();
    }
});
```

More info: https://docs.tpeoficial.com/docs/toolkitify/logger/introduction

#### JWT Authentication

Sprint includes a built-in JWT module using EC (elliptic curve) signing with ES256 algorithm.

```ts
import { sign, verify, generateKeyPair, createTokenPair, verifyTokenPair, getJwtFromEnv } from "sprint-es/jwt";

// Generate key pair
const { publicKey, privateKey } = generateKeyPair();

// Sign a token
const token = sign({ userId: 123 }, privateKey, { expiresIn: "15m" });

// Verify a token
const payload = verify(token, publicKey);

// Create token pair (access + refresh)
const { accessToken, refreshToken } = createTokenPair(
    { userId: 123, role: "admin" },
    privateKey,
    { expiresIn: "15m" }
);

// Or load keys from environment
const { publicKey, privateKey, encryptionSecret } = getJwtFromEnv();
```

More info: https://docs.tpeoficial.com/docs/sprint/jwt (Link not yet available)

#### Encrypted JWT

For sensitive data, use encrypted JWT (JWE-like) that combines EC signing with AES-256-GCM encryption.

```ts
import { signEncrypted, verifyEncrypted, getJwtFromEnv } from "sprint-es/jwt";

const { publicKey, privateKey, encryptionSecret } = getJwtFromEnv();

// Sign encrypted token
const encryptedToken = signEncrypted(
    { ssn: "123-45-6789", secret: "very-sensitive-data" },
    privateKey,
    encryptionSecret,
    { expiresIn: "1h" }
);

// Verify and decrypt
const payload = verifyEncrypted(encryptedToken, publicKey, encryptionSecret);
```

More info: https://docs.tpeoficial.com/docs/sprint/jwt (Link not yet available)

#### CronJobs

Schedule recurring tasks using cron expressions.

```ts
import { defineCronJob, stopAllCronJobs, getCronJobs } from "sprint-es/cronjobs";

// Define a cronjob
defineCronJob({
    name: "cleanup",
    cronExpression: "0 2 * * *", // Daily at 2 AM
    timezone: "Europe/Madrid",
    enabled: true,
    handler: () => {
        console.log("Running daily cleanup...");
    }
});

// Get all registered cronjobs
console.log(getCronJobs()); // ["cleanup"]

// Stop all cronjobs (useful for testing)
stopAllCronJobs();
```

More info: https://docs.tpeoficial.com/docs/sprint/cronjobs (Link not yet available)

#### Agnostic Telemetry

Sprint supports multiple telemetry providers: Sentry, GlitchTip, and Discord webhooks.

```ts
import { initTelemetry, captureError, captureMessage, setUser, providers } from "sprint-es/telemetry";

// Initialize with Sentry
initTelemetry({
    provider: providers.SENTRY,
    dsn: "https://xxx@sentry.io/xxx",
    environment: "production"
});

// Initialize with GlitchTip (open-source Sentry alternative)
initTelemetry({
    provider: providers.GLITCHTIP,
    dsn: "https://xxx@glitchtip.com/xxx"
});

// Initialize with Discord webhook
initTelemetry({
    provider: providers.DISCORD,
    webhookUrl: "https://discord.com/api/webhooks/xxx"
});

// Capture errors and messages
try {
    throw new Error("Something went wrong");
} catch (err) {
    captureError(err, { extra: { context: "user-action" } });
}

captureMessage("User logged in", { level: "info" });

// Set user context
setUser({ id: "123", email: "user@example.com", username: "john" });
```

More info: https://docs.tpeoficial.com/docs/sprint/telemetry (Link not yet available)

## Modules

### Errors + global error handler

```ts
import { BadRequestError, NotFoundError, asyncHandler } from "sprint-es/errors";

router.get("/users/:id", asyncHandler(async (req, res) => {
    const user = await db.users.find(req.params.id);
    if (!user) throw new NotFoundError("User not found");
    res.json(user);
}));
```

Response envelope (auto):
```json
{ "error": { "code": "NOT_FOUND", "message": "User not found", "status": 404, "requestId": "..." } }
```

### Request context (correlation + traceparent)

```ts
import { getRequestId, getTraceId, getContext } from "sprint-es/context";

logger.info({ requestId: getRequestId(), traceId: getTraceId() }, "request handled");
```

Headers `X-Request-ID` and W3C `traceparent` are read from the incoming request and re-emitted on the response. AsyncLocalStorage exposes them anywhere downstream.

### Graceful shutdown + readiness

```ts
import { onShutdown, registerResource } from "sprint-es/lifecycle";

registerResource("redis", {
    init: async () => redis.connect(),
    close: async () => redis.quit(),
    ready: async () => redis.status === "ready"
});

onShutdown(async () => { await drainBackgroundJobs(); });
```

`/readyz` returns 503 while shutting down or while any resource reports `ready: false`. SIGTERM/SIGINT close HTTP, run shutdown hooks LIFO, close resources, then exit.

### Secure CORS + headers (defaults)

```ts
// sprint.config.ts
export default {
    cors: { origin: ["https://app.example.com"], credentials: true },
    security: { hsts: { maxAge: 63072000, preload: true } }
};
```

Default = no CORS (deny all), HSTS, COOP/CORP, Frame-Options, no `X-XSS-Protection` (deprecated). CSP is HTML-only.

### Cache

```ts
import { defineCache, MemoryCache, RedisCache } from "sprint-es/cache";
import Redis from "ioredis";

export const cache = defineCache({
    name: "main",
    adapter: process.env.REDIS_URL
        ? new RedisCache({ client: new Redis(process.env.REDIS_URL) })
        : new MemoryCache({ maxEntries: 10_000 })
});

await cache.set("user:1", { name: "Ada" }, 60_000);
```

### Queues + pub/sub + DLQ + idempotency

```ts
import { defineQueue, MemoryQueue, BullMQQueue } from "sprint-es/queue";
import { Queue, Worker } from "bullmq";

export const emails = defineQueue({
    name: "emails",
    adapter: new BullMQQueue({
        queue: new Queue("emails", { connection }),
        workerFactory: (proc) => new Worker("emails", proc, { connection })
    })
});

emails.process(async (job) => sendEmail(job.data));
await emails.add("welcome", { to: "ada@x.com" }, {
    idempotencyKey: "welcome:user:1",
    attempts: 5,
    backoff: { type: "exponential", delay: 1000, maxDelay: 30_000 }
});
```

### SSE

```ts
import { createSSEStream } from "sprint-es/sse";

router.get("/events", async (req, res) => {
    const stream = createSSEStream(req, res);
    const interval = setInterval(() => stream.send({ event: "tick", data: { now: Date.now() } }), 1000);
    await stream.done;
    clearInterval(interval);
});
```

### WebSocket

```ts
import { attachWebSocket } from "sprint-es/ws";

await attachWebSocket({
    server: app.server,
    handlers: {
        "/ws/chat": {
            onConnection: (socket) => {
                socket.on("message", (m) => socket.send(`echo: ${m}`));
            }
        }
    }
});
```

### Worker pool (CPU-bound offload)

```ts
import { defineWorkerPool } from "sprint-es/workers";

const pool = defineWorkerPool({ file: "./workers/hash.js", size: 4 });
const result = await pool.run({ password: "..." });
```

### Env validation (fail-fast at boot)

```ts
import { defineEnv } from "sprint-es/env";
import { z } from "zod";

export const env = defineEnv({
    schema: z.object({
        PORT: z.string().transform(Number).pipe(z.number().int().positive()),
        DATABASE_URL: z.string().url(),
        REDIS_URL: z.string().url().optional()
    })
});
```

### CSRF + idempotency

```ts
import { defineMiddleware } from "sprint-es";
import { createCsrfMiddleware } from "sprint-es/csrf";
import { createIdempotencyMiddleware } from "sprint-es/idempotency";
import { cache } from "./cache";

export default defineMiddleware({
    name: "guards",
    include: "/api/**",
    handler: [
        createCsrfMiddleware({ cookie: { sameSite: "strict", secure: true } }),
        createIdempotencyMiddleware({ cache, ttlMs: 24 * 60 * 60 * 1000 })
    ]
});
```

### Circuit breaker

```ts
import { CircuitBreaker } from "sprint-es/circuit-breaker";

const callPayments = new CircuitBreaker(
    async (orderId: string) => paymentsApi.charge(orderId),
    {
        failureThreshold: 5,
        successThreshold: 2,
        resetTimeoutMs: 30_000,
        callTimeoutMs: 3_000,
        fallback: () => ({ status: "queued" })
    }
);

const result = await callPayments.fire("order-1");
```

### Service discovery

```ts
import { selfRegister, getDefaultDiscovery } from "sprint-es/discovery";

await selfRegister({
    id: `auth-${process.pid}`,
    name: "auth",
    address: "10.0.0.42",
    port: Number(process.env.PORT) || 5000
}, { heartbeatMs: 5_000 });

const instances = await getDefaultDiscovery().discover("auth");
```

### Feature flags

```ts
import { configureFlags, flag, CompositeFlagProvider, EnvFlagProvider, FileFlagProvider } from "sprint-es/flags";

configureFlags(new CompositeFlagProvider([
    new EnvFlagProvider(),                            // SPRINT_FLAG_NEW_CHECKOUT=1 wins
    new FileFlagProvider({ path: "./flags.json" })    // hot-reloads on file change
]));

if (await flag("new-checkout", false, { userId: req.user.id })) { /* ... */ }
```

### tRPC

```ts
import { attachTrpc } from "sprint-es/trpc";
import { appRouter } from "./trpc/router";

await attachTrpc({
    app: app.app,
    path: "/trpc",
    router: appRouter,
    createContext: ({ req }) => ({ user: req.custom.user })
});
```

### gRPC

```ts
import { createGrpcServer } from "sprint-es/grpc";
import { authService } from "./grpc/auth";

await createGrpcServer({
    address: "0.0.0.0:50051",
    services: [authService]
});
```

### HTTP client (retry + circuit + trace propagation)

```ts
import { createHttpClient } from "sprint-es/http-client";

const api = createHttpClient({
    baseUrl: "https://payments.internal",
    timeoutMs: 5_000,
    retries: 2,
    backoff: { type: "exponential", delay: 200, maxDelay: 2_000 },
    circuit: { failureThreshold: 10, resetTimeoutMs: 30_000 }
});

const res = await api.post("/charge", { json: { amount: 99 } });
```

`X-Request-ID` and W3C `traceparent` from the current Sprint request context are forwarded automatically.

### Pagination + filter + sort

```ts
import {
    parseOffsetPagination, offsetEnvelope,
    parseCursorPagination, cursorEnvelope,
    parseFilters, parseSort
} from "sprint-es/pagination";

router.get("/users", asyncHandler(async (req, res) => {
    const page = parseOffsetPagination(req, { defaultLimit: 20, maxLimit: 100 });
    const filters = parseFilters(req, { allowedFields: ["status", "createdAt"] });
    const sort = parseSort(req, { allowedFields: ["name", "createdAt"], defaultSort: [{ field: "createdAt", direction: "desc" }] });

    const { rows, total } = await db.users.find({ filters, sort, limit: page.limit, offset: page.offset });
    res.json(offsetEnvelope(rows, page, total));
}));
```

Filter syntax: `?filter=age>=18,status:in:active|pending,name:like:ada`. Fields not in `allowedFields` are silently dropped.

### Secrets

```ts
import { configureSecrets, secret, CompositeSecretProvider, EnvSecretProvider, FileSecretProvider, MemoizedSecretProvider } from "sprint-es/secrets";

configureSecrets(new MemoizedSecretProvider({
    inner: new CompositeSecretProvider([
        new FileSecretProvider({ path: "/run/secrets/app.env", watch: true }),
        new EnvSecretProvider()
    ]),
    ttlMs: 60_000
}));

const dbPassword = await secret("DB_PASSWORD", { required: true });
```

## Defaults to be aware of

- Health probes are split: `/healthz` (liveness) and `/readyz` (readiness). `/health` and `/healthcheck` remain as deprecated aliases.
- Default JSON / urlencoded body limit is `1mb`. Override via `jsonLimit` / `urlEncodedLimit` in `sprint.config.ts`, or per-route with `createBodyLimit`.
- CORS is **deny-all by default**. Set `cors: { origin: [...] }` to allowlist.
- `X-XSS-Protection` is not emitted (deprecated by browsers).
- 404 responses go through the global error handler (consistent JSON envelope) — not plain text.
- All peer deps are optional: `bullmq`, `ioredis`, `ws`, `@trpc/server`, `@grpc/grpc-js`. Install only the ones you use.

<p align="right"><a href="#top">Back to top 🔼</a></p>