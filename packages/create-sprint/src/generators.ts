export function getTypeScriptPackageJson(name: string, telemetry: string) {
    const deps: Record<string, string> = {
        "sprint-es": "^0.0.35",
        "node-cron": "^3.0.3",
        dotenv: "^17.0.0",
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
        },
        dependencies: deps,
        devDependencies: devDeps,
    };
}

export function getJavaScriptPackageJson(name: string, telemetry: string) {
    const deps: Record<string, string> = {
        "sprint-es": "^0.0.35",
        "node-cron": "^3.0.3",
        dotenv: "^17.0.0",
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
        },
        dependencies: deps,
    };
}

export function getTsConfig() {
    return JSON.stringify({
        compilerOptions: {
            target: "ES2020",
            module: "ESNext",
            moduleResolution: "bundler",
            lib: ["ES2020"],
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
            tabWidth: 4,
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
import { homeController } from "@/controllers/home";

const router = Router();

router.get("/", homeSchema, homeController);

export default router;
`;
    }
    return `import { Router } from "sprint-es";
import { homeSchema } from "../schemas/home.js";
import { homeController } from "../controllers/home.js";

const router = Router();

router.get("/", homeSchema, homeController);

export default router;
`;
}

export function getAdminRoute(language: string) {
    if (language === "typescript") {
        return `import { Router } from "sprint-es";
import { adminSchema } from "@/schemas/admin";
import { adminController, adminUsersController } from "@/controllers/admin";

const router = Router();

router.get("/", adminSchema, adminController);
router.get("/users", adminSchema, adminUsersController);

export default router;
`;
    }
    return `import { Router } from "sprint-es";
import { adminSchema } from "../schemas/admin.js";
import { adminController, adminUsersController } from "../controllers/admin.js";

const router = Router();

router.get("/", adminSchema, adminController);
router.get("/users", adminSchema, adminUsersController);

export default router;
`;
}

export function getHomeController(language: string) {
    if (language === "typescript") {
        return `import { Handler } from "sprint-es";

export const homeController: Handler = (req, res) => {
    res.json({
        message: "Hello World",
        status: "ok"
    });
};
`;
    }
    return `import { Handler } from "sprint-es";

export const homeController = (req, res) => {
    res.json({
        message: "Hello World",
        status: "ok"
    });
};
`;
}

export function getAdminController(language: string) {
    if (language === "typescript") {
        return `import { Handler } from "sprint-es";

export const adminController: Handler = (req, res) => {
    res.json({
        message: "Admin Dashboard",
        status: "ok"
    });
};

export const adminUsersController: Handler = (req, res) => {
    res.json({
        users: [
            { id: 1, name: "John Doe", role: "admin" },
            { id: 2, name: "Jane Smith", role: "user" }
        ]
    });
};
`;
    }
    return `import { Handler } from "sprint-es";

export const adminController = (req, res) => {
    res.json({
        message: "Admin Dashboard",
        status: "ok"
    });
};

export const adminUsersController = (req, res) => {
    res.json({
        users: [
            { id: 1, name: "John Doe", role: "admin" },
            { id: 2, name: "Jane Smith", role: "user" }
        ]
    });
};
`;
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
`;
}

export function getAuthMiddleware(language: string) {
    if (language === "typescript") {
        return `import { defineMiddleware } from "sprint-es";

export default defineMiddleware({
    name: "auth",
    priority: 10,
    include: "/admin/**",
    handler: (req, res, next) => {
        const auth = req.sprint.getAuthorization();

        if (!auth) {
            return res.status(401).json({ error: "No authorization header" });
        }

        const token = auth.replace("Bearer ", "");

        if (token !== "admin-token") {
            return res.status(403).json({ error: "Invalid token" });
        }

        next();
    }
});
`;
    }
    return `import { defineMiddleware } from "sprint-es";

export default defineMiddleware({
    name: "auth",
    priority: 10,
    include: "/admin/**",
    handler: (req, res, next) => {
        const auth = req.sprint.getAuthorization();

        if (!auth) {
            return res.status(401).json({ error: "No authorization header" });
        }

        const token = auth.replace("Bearer ", "");

        if (token !== "admin-token") {
            return res.status(403).json({ error: "Invalid token" });
        }

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
    return `version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
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
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000
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
    webhookUrl: process.env.DISCORD_WEBHOOK_URL || ""
});
`;
        }

        return config;
    }

    let config = `export const config = {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000
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
    webhookUrl: process.env.DISCORD_WEBHOOK_URL || ""
});
`;
    }

    return config;
}

export function getEnvExample(telemetry: string) {
    let env = `PORT=3000

# Development: npm run dev (NODE_ENV=development)
# Production: npm start (NODE_ENV=production)
`;

    if (telemetry === "sentry" || telemetry === "glitchtip") {
        env += `
# Sentry / GlitchTip (use GlitchTip DSN for self-hosted)
SENTRY_DSN=
`;
    } else if (telemetry === "discord") {
        env += `
# Discord Webhook URL for error notifications
DISCORD_WEBHOOK_URL=
`;
    }

    return env;
}

export function getEnvDevelopment(telemetry: string) {
    let env = `NODE_ENV=development
PORT=3000
`;

    if (telemetry === "sentry" || telemetry === "glitchtip") {
        env += `
# Sentry / GlitchTip
SENTRY_DSN=
`;
    } else if (telemetry === "discord") {
        env += `
# Discord Webhook URL
DISCORD_WEBHOOK_URL=
`;
    }

    return env;
}

export function getEnvProduction(telemetry: string) {
    let env = `NODE_ENV=production
PORT=3000
`;

    if (telemetry === "sentry" || telemetry === "glitchtip") {
        env += `
# Sentry / GlitchTip
SENTRY_DSN=
`;
    } else if (telemetry === "discord") {
        env += `
# Discord Webhook URL
DISCORD_WEBHOOK_URL=
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