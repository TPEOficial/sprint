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
 ┣ 📜tsconfig.json (It depends on specs)
 ┗ 📜vite.config.ts (It depends on specs)
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
| Preconfigured health check and 404 error pages                         | 🟢 Active      |
| Anti-directory listing rate limiting system                            | 🟢 Active      |
| Logger module included to reduce memory consumption                   | 🟢 Active      |
| JWT authentication with EC signing                                      | 🟢 Active      |
| Encrypted JWT (JWE-like with AES-256-GCM)                             | 🟢 Active      |
| Token pairs (access + refresh tokens)                                 | 🟢 Active      |
| CronJobs scheduler with node-cron                                      | 🟢 Active      |
| Agnostic Telemetry (Sentry, GlitchTip, Discord)                       | 🟢 Active      |

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

More info: https://docs.tpeoficial.com/docs/sprint/jwt

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

More info: https://docs.tpeoficial.com/docs/sprint/jwt

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

More info: https://docs.tpeoficial.com/docs/sprint/cronjobs

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

More info: https://docs.tpeoficial.com/docs/sprint/telemetry