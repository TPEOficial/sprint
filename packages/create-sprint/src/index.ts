import { spawn } from "child_process";
import { existsSync } from "fs";
import { mkdir, writeFile as fsWriteFile } from "fs/promises";
import { join } from "path";
import color from "picocolors";
import * as p from "@clack/prompts";
import { validateProjectName } from "./validators.js";
import { getTypeScriptPackageJson, getJavaScriptPackageJson, getTsConfig, getMainFile, getHomeRoute, getAdminRoute, getUploadRoute, getHomeController, getAdminController, getUploadController, getEnvExample, getInternalAuthMiddleware, getUserAuthMiddleware, getHomeSchema, getAdminSchema, getUploadSchema, getDockerfile, getDockerCompose, getGitignore, getDockerIgnore, getSprintConfigFile, getEnvDevelopment, getEnvProduction, getExampleCronJob, getGraphQLFiles } from "./generators.js";
import { getQueueService, getCacheService, getTrpcRouter, getGrpcServer, getWebSocketScaffold } from "./templates/services.js";

type TelemetryProviders = "none" | "sentry" | "glitchtip" | "discord" | "open-telemetry" | "telegram" | "nodemailer";
type QueueChoice = "none" | "memory" | "bullmq";
type CacheChoice = "none" | "memory" | "redis";

export interface CLIOptions {
    projectName?: string;
    language?: "typescript" | "javascript";
    telemetry?: TelemetryProviders;
    swagger?: boolean;
    graphql?: boolean;
    docker?: boolean;
    queue?: QueueChoice;
    cache?: CacheChoice;
    websocket?: boolean;
    trpc?: boolean;
    grpc?: boolean;
    csrf?: boolean;
    cors?: string;
    skipInstall?: boolean;
    skipPrompts?: boolean;
}

export interface ProjectFeatures {
    projectName: string;
    language: "typescript" | "javascript";
    telemetry: TelemetryProviders;
    swagger: boolean;
    graphql: boolean;
    docker: boolean;
    queue: QueueChoice;
    cache: CacheChoice;
    websocket: boolean;
    trpc: boolean;
    grpc: boolean;
    csrf: boolean;
    cors: string;
}

export async function writeFile(path: string, content: string, options?: any) {
    if (typeof content === "string") content = content.trim();
    await fsWriteFile(path, content, options);
};

export async function runCLI(args: string[]) {
    const options = parseArgs(args);

    p.intro(`${color.bgCyan(color.black(' create-sprint-app '))}`);

    let config: ProjectFeatures;

    if (options.skipPrompts) {
        config = {
            projectName: options.projectName || "sprint-app",
            language: options.language || "typescript",
            telemetry: options.telemetry ?? "none",
            swagger: options.swagger ?? true,
            graphql: options.graphql ?? false,
            docker: options.docker || false,
            queue: options.queue ?? "none",
            cache: options.cache ?? "none",
            websocket: options.websocket ?? false,
            trpc: options.trpc ?? false,
            grpc: options.grpc ?? false,
            csrf: options.csrf ?? false,
            cors: options.cors ?? ""
        };
    } else {
        const result = await p.group(
            {
                projectName: () =>
                    p.text({
                        message: "Project name:",
                        placeholder: "my-api",
                        validate: (v) => validateProjectName(v || "sprint-app") || undefined
                    }),

                language: () =>
                    p.select({
                        message: "Language:",
                        options: [
                            { value: "typescript", label: "TypeScript", hint: "recommended" },
                            { value: "javascript", label: "JavaScript", hint: "not recommended" }
                        ]
                    }),

                cors: () =>
                    p.text({
                        message: "CORS allowed origins (comma-separated, blank = deny all, '*' = wildcard):",
                        placeholder: "https://app.example.com,http://localhost:3000",
                        defaultValue: ""
                    }),

                telemetry: () =>
                    p.select({
                        message: "Error tracking:",
                        options: [
                            { value: "none", label: "None" },
                            { value: "open-telemetry", label: "OpenTelemetry", hint: "flexible, open standard", disabled: true },
                            { value: "sentry", label: "Sentry", hint: "free tier available" },
                            { value: "glitchtip", label: "GlitchTip", hint: "self-hostable" },
                            { value: "discord", label: "Discord Webhook", hint: "sends to a channel" },
                            { value: "telegram", label: "Telegram Bot", hint: "sends to a chat", disabled: true },
                            { value: "nodemailer", label: "Nodemailer", hint: "sends emails", disabled: true }
                        ]
                    }),

                queue: () =>
                    p.select({
                        message: "Job queue:",
                        options: [
                            { value: "none", label: "None" },
                            { value: "memory", label: "In-memory", hint: "single process, retries + DLQ" },
                            { value: "bullmq", label: "BullMQ + Redis", hint: "distributed, production-grade" }
                        ]
                    }),

                cache: () =>
                    p.select({
                        message: "Cache:",
                        options: [
                            { value: "none", label: "None" },
                            { value: "memory", label: "In-memory LRU", hint: "single process" },
                            { value: "redis", label: "Redis", hint: "shared across instances" }
                        ]
                    }),

                websocket: () => p.confirm({ message: "Add WebSocket support?", initialValue: false }),
                trpc: () => p.confirm({ message: "Add tRPC adapter?", initialValue: false }),
                grpc: () => p.confirm({ message: "Add gRPC server?", initialValue: false }),
                graphql: () => p.confirm({ message: "Add GraphQL support?", initialValue: false }),
                swagger: () => p.confirm({ message: "Add Swagger UI & OpenAPI?", initialValue: true }),
                csrf: () => p.confirm({ message: "Add CSRF middleware (double-submit cookie)?", initialValue: false }),
                docker: () => p.confirm({ message: "Add Docker support?", initialValue: false })
            },
            {
                onCancel: () => {
                    p.cancel("Cancelled.");
                    process.exit(0);
                }
            }
        );
        config = result as unknown as ProjectFeatures;
    }

    const targetDir = config.projectName === "." ? process.cwd() : join(process.cwd(), config.projectName);

    const s = p.spinner();
    s.start("Creating project");
    await createProject(config);
    s.stop("Project created");

    let installDeps = true;
    if (options.skipInstall) installDeps = false;
    else if (!options.skipPrompts) installDeps = await p.confirm({ message: "Install dependencies now?", initialValue: true }) as boolean;

    if (installDeps) {
        const s2 = p.spinner();
        s2.start("Installing dependencies");
        try {
            await new Promise<void>((resolve, reject) => {
                const child = spawn("npm", ["install", "--include=dev"], {
                    cwd: targetDir,
                    stdio: "inherit",
                    shell: true
                });
                child.on("close", (code) => {
                    if (code === 0) resolve();
                    else reject(new Error(`npm install exited with code ${code}`));
                });
                child.on("error", (err) => {
                    p.cancel(`Failed to run npm install: ${err.message}`);
                    reject(err);
                });
            });
            s2.stop("Dependencies installed");
        } catch (err) {
            s2.stop("Install failed — run npm install manually");
            console.error(err);
        }
    }

    const cdCmd = config.projectName === "." ? "" : `cd ${config.projectName} && `;
    p.note([!installDeps ? `${cdCmd}npm install --include=dev` : "", `${cdCmd}npm run dev`].filter(Boolean).join("\n"), "Next steps");

    p.outro("Ready. Happy shipping.");
};

function parseArgs(args: string[]): CLIOptions {
    const options: CLIOptions = {};

    const hasTs = args.includes("--ts") || args.includes("--typescript");
    const hasJs = args.includes("--js") || args.includes("--javascript");
    const hasName = args.indexOf("--name");
    const telemetryArg = args.includes("--telemetry") ? args[args.indexOf("--telemetry") + 1] : null;
    const queueArg = args.includes("--queue") ? args[args.indexOf("--queue") + 1] : null;
    const cacheArg = args.includes("--cache") ? args[args.indexOf("--cache") + 1] : null;
    const corsArg = args.includes("--cors") ? args[args.indexOf("--cors") + 1] : null;

    if (args.includes("--yes") || args.includes("-y")) options.skipPrompts = true;

    if (!options.skipPrompts) {
        if (hasTs) options.language = "typescript";
        else if (hasJs) options.language = "javascript";
    } else options.language = "typescript";

    if (hasName !== -1) {
        const value = args[hasName + 1];
        if (typeof value === "string") options.projectName = value;
    }

    if (args.includes("--current")) options.projectName = ".";

    if (args.includes("--docker")) options.docker = true;

    if (args.includes("--swagger")) options.swagger = true;
    else if (args.includes("--no-swagger")) options.swagger = false;

    if (args.includes("--graphql")) options.graphql = true;
    else if (args.includes("--no-graphql")) options.graphql = false;

    if (args.includes("--websocket") || args.includes("--ws")) options.websocket = true;
    if (args.includes("--trpc")) options.trpc = true;
    if (args.includes("--grpc")) options.grpc = true;
    if (args.includes("--csrf")) options.csrf = true;
    if (args.includes("--no-install")) options.skipInstall = true;

    if (queueArg && ["none", "memory", "bullmq"].includes(queueArg)) options.queue = queueArg as QueueChoice;
    if (cacheArg && ["none", "memory", "redis"].includes(cacheArg)) options.cache = cacheArg as CacheChoice;
    if (typeof corsArg === "string") options.cors = corsArg;

    if (telemetryArg && ["sentry", "glitchtip", "discord", "none"].includes(telemetryArg)) options.telemetry = telemetryArg as TelemetryProviders;

    return options;
};

async function createProject(features: ProjectFeatures) {
    const isCurrentDir = features.projectName === ".";
    const targetDir = isCurrentDir ? process.cwd() : join(process.cwd(), features.projectName);
    const ext = features.language === "typescript" ? "ts" : "js";

    if (!isCurrentDir && existsSync(targetDir)) {
        p.cancel(`Directory "${features.projectName}" already exists.`);
        process.exit(1);
    }

    if (!isCurrentDir) await mkdir(targetDir, { recursive: true });

    const pkgJson = features.language === "typescript"
        ? getTypeScriptPackageJson(features.projectName, features.telemetry, features.swagger, features.graphql, features)
        : getJavaScriptPackageJson(features.projectName, features.telemetry, features.swagger, features.graphql, features);

    await writeFile(join(targetDir, "package.json"), JSON.stringify(pkgJson, null, 2));

    if (features.language === "typescript") await writeFile(join(targetDir, "tsconfig.json"), getTsConfig());

    await writeFile(join(targetDir, `sprint.config.${ext}`), getSprintConfigFile(features.language, features.telemetry, features.swagger, features.graphql, features));

    const srcDir = join(targetDir, "src");
    await mkdir(srcDir, { recursive: true });
    await mkdir(join(srcDir, "middlewares"), { recursive: true });
    await mkdir(join(srcDir, "routes"), { recursive: true });
    await mkdir(join(srcDir, "controllers"), { recursive: true });
    await mkdir(join(srcDir, "schemas"), { recursive: true });
    await mkdir(join(srcDir, "cronjobs"), { recursive: true });
    await mkdir(join(srcDir, "config"), { recursive: true });
    await mkdir(join(srcDir, "services"), { recursive: true });

    if (features.graphql) await mkdir(join(srcDir, "graphql"), { recursive: true });
    if (features.trpc) await mkdir(join(srcDir, "trpc"), { recursive: true });
    if (features.grpc) await mkdir(join(srcDir, "grpc"), { recursive: true });
    if (features.websocket) await mkdir(join(srcDir, "ws"), { recursive: true });

    await writeFile(join(srcDir, "config", `index.${ext}`), "");
    await writeFile(join(srcDir, "config", `clients.${ext}`), "");
    await writeFile(join(srcDir, "services", ".gitkeep"), "");

    await writeFile(join(srcDir, `app.${ext}`), getMainFile(features.language, features.graphql, features));

    await writeFile(join(srcDir, "routes", `home.${ext}`), getHomeRoute(features.language));
    await writeFile(join(srcDir, "routes", `admin.${ext}`), getAdminRoute(features.language));
    await writeFile(join(srcDir, "routes", `upload.${ext}`), getUploadRoute(features.language));

    await writeFile(join(srcDir, "controllers", `home.${ext}`), getHomeController(features.language));
    await writeFile(join(srcDir, "controllers", `admin.${ext}`), getAdminController(features.language));
    await writeFile(join(srcDir, "controllers", `upload.${ext}`), getUploadController(features.language));

    await writeFile(join(srcDir, "middlewares", `auth.internal.${ext}`), getInternalAuthMiddleware(features.language));
    await writeFile(join(srcDir, "middlewares", `auth.user.${ext}`), getUserAuthMiddleware(features.language));

    await writeFile(join(srcDir, "schemas", `home.${ext}`), getHomeSchema(features.language));
    await writeFile(join(srcDir, "schemas", `admin.${ext}`), getAdminSchema(features.language));
    await writeFile(join(srcDir, "schemas", `upload.${ext}`), getUploadSchema(features.language));

    await writeFile(join(srcDir, "cronjobs", `example.${ext}`), getExampleCronJob(features.language));

    if (features.queue !== "none") await writeFile(join(srcDir, "services", `queue.${ext}`), getQueueService(features.language, features.queue));
    if (features.cache !== "none") await writeFile(join(srcDir, "services", `cache.${ext}`), getCacheService(features.language, features.cache));
    if (features.trpc) {
        await writeFile(join(srcDir, "trpc", `router.${ext}`), getTrpcRouter(features.language));
    }
    if (features.grpc) {
        await writeFile(join(srcDir, "grpc", `server.${ext}`), getGrpcServer(features.language));
    }
    if (features.websocket) {
        await writeFile(join(srcDir, "ws", `chat.${ext}`), getWebSocketScaffold(features.language));
    }

    if (features.graphql) {
        const graphqlFiles = getGraphQLFiles(features.language);
        await writeFile(join(srcDir, "graphql", `types.${ext}`), graphqlFiles["types.ts"]);
        await writeFile(join(srcDir, "graphql", `resolvers.${ext}`), graphqlFiles["resolvers.ts"]);
        await writeFile(join(srcDir, "graphql", `schema.${ext}`), graphqlFiles["schema.ts"]);
    }

    await writeFile(join(targetDir, ".env.development.example"), getEnvExample(features.telemetry));
    await writeFile(join(targetDir, ".env.production.example"), getEnvExample(features.telemetry));
    await writeFile(join(targetDir, ".env.development"), getEnvDevelopment(features.telemetry));
    await writeFile(join(targetDir, ".env.production"), getEnvProduction(features.telemetry));
    await writeFile(join(targetDir, ".gitignore"), getGitignore());

    if (features.docker) {
        await writeFile(join(targetDir, "Dockerfile"), getDockerfile(features.language));
        await writeFile(join(targetDir, "docker-compose.yml"), getDockerCompose(features.language));
        await writeFile(join(targetDir, ".dockerignore"), getDockerIgnore());
    }
};
