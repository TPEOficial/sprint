import * as crypto from "node:crypto";

export interface JWTKeys {
    publicKey: string;
    privateKey: string;
}

export function generateJWTKeys(): JWTKeys {
    const keys = crypto.generateKeyPairSync("rsa", {
        modulusLength: 4096,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" }
    }) as unknown as { publicKey: string; privateKey: string };
    return keys;
}

export function getTypeScriptPackageJson(name: string, telemetry: string) {
    const deps: Record<string, string> = {
        "sprint-es": "^0.0.54"
    };

    const devDeps: Record<string, string> = {
        "@types/node": "^22.0.0",
        "tsx": "^4.19.0",
        typescript: "^5.6.0",
    };

    if (telemetry === "sentry" || telemetry === "glitchtip") {
        deps["@sentry/node"] = "^8.0.0";
    } else if (telemetry === "discord") {
        deps["axios"] = "^1.6.0";
    }

    return {
        name: name === "." ? "sprint-app" : name,
        version: "0.0.1",
        description: "Sprint API",
        main: "dist/index.js",
        scripts: {
            build: "sprint-es build",
            start: "sprint-es start",
            dev: "sprint-es dev",
            "generate:keys": "sprint-es generate-keys"
        },
        dependencies: deps,
        devDependencies: devDeps,
    };
}

export function getJavaScriptPackageJson(name: string, telemetry: string) {
    const deps: Record<string, string> = {
        "sprint-es": "^0.0.54"
    };

    if (telemetry === "sentry" || telemetry === "glitchtip") {
        deps["@sentry/node"] = "^8.0.0";
    } else if (telemetry === "discord") {
        deps["axios"] = "^1.6.0";
    }

    return {
        name: name === "." ? "sprint-app" : name,
        version: "0.0.1",
        description: "Sprint API",
        main: "src/index.js",
        type: "module",
        scripts: {
            build: "sprint-es build",
            start: "sprint-es start",
            dev: "sprint-es dev",
            "generate:keys": "sprint-es generate-keys"
        },
        dependencies: deps
    };
}

export function getTsConfig() {
    return JSON.stringify({
        compilerOptions: {
            target: "ES2022",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            lib: ["ES2022"],
            types: ["node"],
            outDir: "./dist",
            rootDir: "./src",
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            resolveJsonModule: true,
            declaration: true,
            declarationMap: true,
            sourceMap: true,
            baseUrl: ".",
            paths: {
                "@/*": ["./src/*"]
            }
        },
        include: ["src/**/*"],
        exclude: ["node_modules", "dist"],
    }, null, 2);
}

export function getViteConfig() {
    return `import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, "src/index.ts"),
            formats: ["es"],
            fileName: "index",
        },
        outDir: "dist",
        rollupOptions: {
            external: ["sprint-es", "express", "cors", "morgan", "serve-favicon", "dotenv"],
        },
        target: "ES2020",
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
        },
    },
});
`;
}

export function getMainFile(language: string) {
    if (language === "typescript") {
        return `import Sprint from "sprint-es";

const app = new Sprint();
`;
    }

    return `import Sprint from "sprint-es";

const app = new Sprint();
`;
}

export function getHomeRoute(language: string) {
    if (language === "typescript") {
        return `import { Router } from "sprint-es";
import { homeSchema } from "@/schemas/home";
import { homeController, jwtValidateController } from "@/controllers/home";

const router = Router();

router.get("/", homeSchema, homeController);
router.post("/me", jwtValidateController);

export default router;
`;
    }
    return `import { Router } from "sprint-es";
import { homeSchema } from "../schemas/home.js";
import { homeController, jwtValidateController } from "../controllers/home.js";

const router = Router();

router.get("/", homeSchema, homeController);
router.post("/me", jwtValidateController);

export default router;
`;
}

export function getAdminRoute(language: string) {
    if (language === "typescript") {
        return `import { Router } from "sprint-es";
import { adminSchema, jwtGenerateSchema } from "@/schemas/admin";
import { adminController, adminUsersController, jwtGenerateController } from "@/controllers/admin";

const router = Router();

router.get("/", adminSchema, adminController);
router.get("/users", adminSchema, adminUsersController);
router.post("/jwt/generate", jwtGenerateSchema, jwtGenerateController);

export default router;
`;
    }
    return `import { Router } from "sprint-es";
import { adminSchema, jwtGenerateSchema } from "../schemas/admin.js";
import { adminController, adminUsersController, jwtGenerateController } from "../controllers/admin.js";

const router = Router();

router.get("/", adminSchema, adminController);
router.get("/users", adminSchema, adminUsersController);
router.post("/jwt/generate", jwtGenerateSchema, jwtGenerateController);

export default router;
`;
}

export function getHomeController(language: string) {
    if (language === "typescript") {
        return `import { Handler, SprintRequest, SprintResponse } from "sprint-es";
import { verifyEncrypted, getJwtFromEnv } from "sprint-es/jwt";

export const homeController: Handler = (req: SprintRequest, res: SprintResponse) => {
    res.json({
        message: "Hello World",
        status: "ok"
    });
};

export const jwtValidateController: Handler = (req: SprintRequest, res: SprintResponse) => {
    return res.json(req.custom.user);
};
`;
    }
    return `import { Handler, SprintRequest, SprintResponse } from "sprint-es";
import { verifyEncrypted, getJwtFromEnv } from "sprint-es/jwt";

export const homeController = (req: SprintRequest, res: SprintResponse) => {
    res.json({
        message: "Hello World",
        status: "ok"
    });
};

export const jwtValidateController = (req: SprintRequest, res: SprintResponse) => {
    return res.json(req.custom.user);
};
`;
}

export function getAdminController(language: string) {
    if (language === "typescript") {
        return `import { Handler, SprintRequest, SprintResponse } from "sprint-es";
import { signEncrypted, getJwtFromEnv } from "sprint-es/jwt";

export const adminController: Handler = (req: SprintRequest, res: SprintResponse) => {
    res.json({
        message: "Admin Dashboard",
        status: "ok"
    });
};

export const adminUsersController: Handler = (req: SprintRequest, res: SprintResponse) => {
    res.json({
        users: [
            { id: 1, name: "John Doe", role: "admin" },
            { id: 2, name: "Jane Smith", role: "user" }
        ]
    });
};

const { privateKey, encryptionSecret } = getJwtFromEnv();

export const jwtGenerateController: Handler = (req: SprintRequest, res: SprintResponse) => {
    const { userId, role } = req.body || {};
    
    try {
        const payload = { userId, role: role || "user" };
        const token = signEncrypted(payload, privateKey, encryptionSecret, { expiresIn: "1h" });
        res.json({ token });
    } catch (error) {
        return res.status(500).json({ error: "JWT not configured" });
    }
};
`;
    } else {
        return `import { Handler, SprintRequest, SprintResponse } from "sprint-es";
import { signEncrypted, getJwtFromEnv } from "sprint-es/jwt";

export const adminController = (req: SprintRequest, res: SprintResponse) => {
    res.json({
        message: "Admin Dashboard",
        status: "ok"
    });
};

export const adminUsersController = (req: SprintRequest, res: SprintResponse) => {
    res.json({
        users: [
            { id: 1, name: "John Doe", role: "admin" },
            { id: 2, name: "Jane Smith", role: "user" }
        ]
    });
};

const { privateKey, encryptionSecret } = getJwtFromEnv();

export const jwtGenerateController = (req: SprintRequest, res: SprintResponse) => {
    const { userId, role } = req.body || {};
    
    try {
        const payload = { userId, role: role || "user" };
        const token = signEncrypted(payload, privateKey, encryptionSecret, { expiresIn: "1h" });
        res.json({ token });
    } catch (error) {
        return res.status(500).json({ error: "JWT not configured" });
    }
};
`;
    }
}

export function getHomeSchema(language: string) {
    if (language === "typescript") {
        return `import { z, defineRouteSchema } from "sprint-es/schemas";

export const homeSchema = defineRouteSchema({});
`;
    }
    return `import { z, defineRouteSchema } from "sprint-es/schemas";

export const homeSchema = defineRouteSchema({});
`;
}

export function getAdminSchema(language: string) {
    if (language === "typescript") {
        return `import { z, defineRouteSchema } from "sprint-es/schemas";

export const adminSchema = defineRouteSchema({
    queryParams: z.object({
        id: z.string().uuid()
    }),
    body: z.object({
        name: z.string().min(1),
        email: z.string().email().optional()
    })
});

export const jwtGenerateSchema = defineRouteSchema({
    body: z.object({
        userId: z.string().min(1),
        role: z.string().optional()
    })
});
`;
    }
    return `import { z, defineRouteSchema } from "sprint-es/schemas";

export const adminSchema = defineRouteSchema({
    queryParams: z.object({
        id: z.string().uuid()
    }),
    body: z.object({
        name: z.string().min(1),
        email: z.string().email().optional()
    })
});

export const jwtGenerateSchema = defineRouteSchema({
    body: z.object({
        userId: z.string().min(1),
        role: z.string().optional()
    })
});
`;
}

export function getInternalAuthMiddleware(language: string) {
    if (language === "typescript") {
        return `import { defineMiddleware, SprintRequest, SprintResponse, NextFunction } from "sprint-es";

export default defineMiddleware({
    name: "adminAuth",
    priority: 10,
    include: "/admin/**",
    handler: (req: SprintRequest, res: SprintResponse, next: NextFunction) => {
        const auth = req.sprint.getAuthorization();
        if (!auth) return res.status(401).json({ error: "No authorization header" });

        const token = auth.replace("Bearer ", "");

        if (token !== "admin-token") return res.status(403).json({ error: "Invalid token" });

        next();
    }
});
`;
    }
    return `import { defineMiddleware } from "sprint-es";

export default defineMiddleware({
    name: "adminAuth",
    priority: 10,
    include: "/admin/**",
    handler: (req, res, next) => {
        const auth = req.sprint.getAuthorization();
        if (!auth)  return res.status(401).json({ error: "No authorization header" });
        
        const token = auth.replace("Bearer ", "");

        if (token !== "admin-token") return res.status(403).json({ error: "Invalid token" });
        
        next();
    }
});
`;
}

export function getUserAuthMiddleware(language: string) {
    if (language === "typescript") {
        return `import { defineMiddleware, SprintRequest, SprintResponse, NextFunction } from "sprint-es";
import { verifyEncrypted, getJwtFromEnv } from "sprint-es/jwt";

const { publicKey, encryptionSecret } = getJwtFromEnv();

export default defineMiddleware({
    name: "userAuth",
    priority: 10,
    include: "/**",
    exclude: "/admin/**",
    handler: (req: SprintRequest, res: SprintResponse, next: NextFunction) => {
        const auth = req.sprint.getAuthorization();
        if (!auth) return res.status(401).json({ error: "No authorization header" });

        const token = auth.replace("Bearer ", "");

        const decoded = verifyEncrypted(token, publicKey, encryptionSecret);

        if (!decoded) return res.status(403).json({ error: "Invalid token" });
        
        req.custom.user = decoded;

        next();
    }
});
`;
    }
    return `import { defineMiddleware } from "sprint-es";
import { verifyEncrypted, getJwtFromEnv } from "sprint-es/jwt";

const { publicKey, encryptionSecret } = getJwtFromEnv();

export default defineMiddleware({
    name: "userAuth",
    priority: 10,
    include: "/**",
    exclude: "/admin/**",
    handler: (req, res, next) => {
        const auth = req.sprint.getAuthorization();
        if (!auth) return res.status(401).json({ error: "No authorization header" });

        const token = auth.replace("Bearer ", "");

        const decoded = verifyEncrypted(token, publicKey, encryptionSecret);

        if (!decoded) return res.status(403).json({ error: "Invalid token" });

        req.custom.user = decoded;

        next();
    }
});
`;
}

export function getDockerfile(language: string) {
    if (language === "typescript") {
        return `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
`;
    }
    return `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
`;
}

export function getDockerCompose(language: string) {
    return `
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=5000
    restart: unless-stopped
`;
}

export function getGitignore() {
    return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build
dist/
build/
*.tsbuildinfo

# Environment
.env.development
.env.production
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Test
coverage/

# Temporary
tmp/
temp/
`;
}

export function getDockerIgnore() {
    return `node_modules
npm-debug.log
.env
.env.*
.git
.gitignore
README.md
dist
build
coverage
.vscode
.idea
*.log
tmp
temp
`;
}

export function getSprintConfigFile(language: string, telemetry: string) {
    if (language === "typescript") {
        let config = `import type { SprintOptions } from "sprint-es";

export const config: SprintOptions = {
    openapi: {
        /* Generate OpenAPI spec on build - Coming Soon */
        generateOnBuild: false
    }
};

// Add Vite config here if needed
// export const vite = {
    // build: { ... }
// };
`;

        if (telemetry === "sentry" || telemetry === "glitchtip") {
            config += `import { initTelemetry } from "sprint-es/telemetry";

initTelemetry({
    provider: "${telemetry}",
    dsn: process.env.SENTRY_DSN || "",
    environment: process.env.NODE_ENV || "development"
});
`;
        } else if (telemetry === "discord") {
            config += `import { initTelemetry } from "sprint-es/telemetry";

initTelemetry({
    provider: "discord",
    webhookUrl: process.env.DISCORD_TELEMETRY_WEBHOOK_URL || ""
});
`;
        }

        return config;
    }

    let config = `export const config = {
    openapi: {
        /* Generate OpenAPI spec on build - Coming Soon */
        generateOnBuild: false
    }
};
`;

    if (telemetry === "sentry" || telemetry === "glitchtip") {
        config += `
import { initTelemetry } from "sprint-es/telemetry";

initTelemetry({
    provider: "${telemetry}",
    dsn: process.env.SENTRY_DSN || "",
    environment: process.env.NODE_ENV || "development"
});
`;
    } else if (telemetry === "discord") {
        config += `
import { initTelemetry } from "sprint-es/telemetry";

initTelemetry({
    provider: "discord",
    webhookUrl: process.env.DISCORD_TELEMETRY_WEBHOOK_URL || ""
});
`;
    }

    return config;
}

export function getEnvExample(telemetry: string) {
    let env = `PORT=5000

JWT_PUBLIC_KEY=""
JWT_PRIVATE_KEY=""
JWT_ENCRYPTION_SECRET=""

# Development: npm run dev (NODE_ENV=development)
# Production: npm start (NODE_ENV=production)
`;

    if (telemetry === "sentry" || telemetry === "glitchtip") {
        env += `
# Sentry / GlitchTip (use GlitchTip DSN for self-hosted)
SENTRY_DSN=""
`;
    } else if (telemetry === "discord") {
        env += `
# Discord Webhook URL for error notifications
DISCORD_TELEMETRY_WEBHOOK_URL=""
`;
    }

    return env;
}

function envKey(key: any): string {
    return key;
}

export function getEnvDevelopment(telemetry: string) {
    const keys = generateJWTKeys();
    let env = `NODE_ENV=development
PORT=5000
JWT_PUBLIC_KEY='${keys.publicKey}'
JWT_PRIVATE_KEY='${keys.privateKey}'
JWT_ENCRYPTION_SECRET='${crypto.randomBytes(32).toString("hex")}'
`;

    if (telemetry === "sentry" || telemetry === "glitchtip") {
        env += `
# Sentry / GlitchTip
SENTRY_DSN=""
`;
    } else if (telemetry === "discord") {
        env += `
# Discord Webhook URL
DISCORD_TELEMETRY_WEBHOOK_URL=""
`;
    }

    return env;
}

export function getEnvProduction(telemetry: string) {
    const keys = generateJWTKeys();
    let env = `NODE_ENV=production
PORT=5000
JWT_PUBLIC_KEY='${keys.publicKey}'
JWT_PRIVATE_KEY='${keys.privateKey}'
JWT_ENCRYPTION_SECRET='${crypto.randomBytes(32).toString("hex")}'
`;

    if (telemetry === "sentry" || telemetry === "glitchtip") {
        env += `
# Sentry / GlitchTip
SENTRY_DSN=
`;
    } else if (telemetry === "discord") {
        env += `
# Discord Webhook URL
DISCORD_TELEMETRY_WEBHOOK_URL=
`;
    }

    return env;
}

export function getExampleCronJob(language: string) {
    if (language === "typescript") {
        return `import { defineCronJob } from "sprint-es/cronjobs";

export default defineCronJob({
    name: "daily-task",
    cronExpression: "0 21 * * *",
    handler: () => {
        console.log("Hello World from cronjob!");
    }
});
`;
    }
    return `import { defineCronJob } from "sprint-es/cronjobs";

export default defineCronJob({
    name: "daily-task",
    cronExpression: "0 21 * * *",
    handler: () => {
        console.log("Hello World from cronjob!");
    }
});
`;
}