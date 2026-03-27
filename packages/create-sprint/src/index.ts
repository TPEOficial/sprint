import { spawn } from "child_process";
import { existsSync } from "fs";
import { mkdir, writeFile as fsWriteFile } from "fs/promises";
import { join } from "path";
import color from "picocolors";
import * as p from "@clack/prompts";
import { validateProjectName } from "./validators.js";
import { getTypeScriptPackageJson, getJavaScriptPackageJson, getTsConfig, getMainFile, getHomeRoute, getAdminRoute, getUploadRoute, getHomeController, getAdminController, getUploadController, getEnvExample, getInternalAuthMiddleware, getUserAuthMiddleware, getHomeSchema, getAdminSchema, getUploadSchema, getDockerfile, getDockerCompose, getGitignore, getDockerIgnore, getSprintConfigFile, getEnvDevelopment, getEnvProduction, getExampleCronJob, getGraphQLFiles } from "./generators.js";

type TelemetryProviders =  "none" | "sentry" | "glitchtip" | "discord" | "open-telemetry" | "telegram" | "nodemailer";

export interface CLIOptions {
    projectName?: string;
    language?: "typescript" | "javascript";
    telemetry?: TelemetryProviders;
    swagger?: boolean;
    graphql?: boolean;
    docker?: boolean;
    skipInstall?: boolean;
    skipPrompts?: boolean;
}

export async function writeFile(path: string, content: string, options?: any) {
    if (typeof content === "string") content = content.trim();
    await fsWriteFile(path, content, options);
};

export async function runCLI(args: string[]) {
    const options = parseArgs(args);

    p.intro("Sprint — Quickly API Framework");

    p.intro(`${color.bgCyan(color.black(' create-sprint-app '))}`);

    let config: {
        projectName: string;
        language: "typescript" | "javascript";
        telemetry: TelemetryProviders;
        swagger: boolean;
        graphql: boolean;
        docker: boolean;
    };

    if (options.skipPrompts) {
        config = {
            projectName: options.projectName || "sprint-app",
            language: options.language || "typescript",
            telemetry: options.telemetry ?? "none",
            swagger: options.swagger ?? true,
            graphql: options.graphql ?? false,
            docker: options.docker || false
        };
    } else {
        config = await p.group(
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

                swagger: () => p.confirm({ message: "Add Swagger UI & OpenAPI?", initialValue: true }),

                graphql: () => p.confirm({ message: "Add GraphQL support?", initialValue: false }),

                docker: () => p.confirm({ message: "Add Docker support?", initialValue: false })
            },
            {
                onCancel: () => {
                    p.cancel("Cancelled.");
                    process.exit(0);
                }
            }
        );
    }

    const targetDir = config.projectName === "." ? process.cwd() : join(process.cwd(), config.projectName);

    const s = p.spinner();
    s.start("Creating project");
    await createProject(
        config.projectName,
        config.language,
        config.telemetry,
        config.swagger,
        config.graphql,
        config.docker
    );
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
    p.note([!installDeps ? `${cdCmd}npm install --include=dev` : "", `${cdCmd}npm run dev` ].filter(Boolean).join("\n"), "Next steps");

    p.outro("Ready. Happy shipping.");
};

function parseArgs(args: string[]): CLIOptions {
    const options: CLIOptions = {};

    const hasTs = args.includes("--ts") || args.includes("--typescript");
    const hasJs = args.includes("--js") || args.includes("--javascript");
    const hasName = args.indexOf("--name");
    const telemetryArg = args.includes("--telemetry") ? args[args.indexOf("--telemetry") + 1] : null;

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
    
    if (args.includes("--no-install")) options.skipInstall = true;

    if (telemetryArg && ["sentry", "glitchtip", "discord", "none"].includes(telemetryArg)) {
        if (typeof telemetryArg === "string" && ["sentry", "glitchtip", "discord", "none"].includes(telemetryArg)) options.telemetry = telemetryArg as TelemetryProviders;
    }
    
    return options;
};

async function createProject(
    projectName: string,
    language: "typescript" | "javascript",
    telemetry: TelemetryProviders,
    swagger: boolean,
    graphql: boolean,
    useDocker: boolean
) {
    const isCurrentDir = projectName === ".";
    const targetDir = isCurrentDir ? process.cwd() : join(process.cwd(), projectName);

    if (!isCurrentDir && existsSync(targetDir)) {
        p.cancel(`Directory "${projectName}" already exists.`);
        process.exit(1);
    }

    if (!isCurrentDir) await mkdir(targetDir, { recursive: true });

    let pkgJson;
    if (language === "typescript") pkgJson = getTypeScriptPackageJson(projectName, telemetry, swagger, graphql);
    else pkgJson = getJavaScriptPackageJson(projectName, telemetry, swagger, graphql);
    
    await writeFile(join(targetDir, "package.json"), JSON.stringify(pkgJson, null, 2));

    if (language === "typescript") {
        await writeFile(join(targetDir, "tsconfig.json"), getTsConfig());
        await writeFile(join(targetDir, "sprint.config.ts"), getSprintConfigFile(language, telemetry, swagger, graphql));
    } else await writeFile(join(targetDir, "sprint.config.js"), getSprintConfigFile(language, telemetry, swagger, graphql));
    
    const srcDir = join(targetDir, "src");
    await mkdir(srcDir, { recursive: true });

    await mkdir(join(srcDir, "middlewares"), { recursive: true });
    await mkdir(join(srcDir, "routes"), { recursive: true });
    await mkdir(join(srcDir, "controllers"), { recursive: true });
    await mkdir(join(srcDir, "schemas"), { recursive: true });
    await mkdir(join(srcDir, "cronjobs"), { recursive: true });
    await mkdir(join(srcDir, "config"), { recursive: true });
    await mkdir(join(srcDir, "services"), { recursive: true });
    
    if (graphql) await mkdir(join(srcDir, "graphql"), { recursive: true });

    if (language === "typescript") {
        await writeFile(join(srcDir, "config", "index.ts"), "");
        await writeFile(join(srcDir, "config", "clients.ts"), "");
    } else {
        await writeFile(join(srcDir, "config", "index.js"), "");
        await writeFile(join(srcDir, "config", "clients.js"), "");
    }

    await writeFile(join(srcDir, "services", ".gitkeep"), "");

    await writeFile(join(srcDir, "app." + (language === "typescript" ? "ts" : "js")), getMainFile(language, graphql));

    await writeFile(join(srcDir, "routes", "home." + (language === "typescript" ? "ts" : "js")), getHomeRoute(language));
    await writeFile(join(srcDir, "routes", "admin." + (language === "typescript" ? "ts" : "js")), getAdminRoute(language));
    await writeFile(join(srcDir, "routes", "upload." + (language === "typescript" ? "ts" : "js")), getUploadRoute(language));

    await writeFile(join(srcDir, "controllers", "home." + (language === "typescript" ? "ts" : "js")), getHomeController(language));
    await writeFile(join(srcDir, "controllers", "admin." + (language === "typescript" ? "ts" : "js")), getAdminController(language));
    await writeFile(join(srcDir, "controllers", "upload." + (language === "typescript" ? "ts" : "js")), getUploadController(language));

    await writeFile(join(srcDir, "middlewares", "auth.internal." + (language === "typescript" ? "ts" : "js")), getInternalAuthMiddleware(language));
    await writeFile(join(srcDir, "middlewares", "auth.user." + (language === "typescript" ? "ts" : "js")), getUserAuthMiddleware(language));

    await writeFile(join(srcDir, "schemas", "home." + (language === "typescript" ? "ts" : "js")), getHomeSchema(language));
    await writeFile(join(srcDir, "schemas", "admin." + (language === "typescript" ? "ts" : "js")), getAdminSchema(language));
    await writeFile(join(srcDir, "schemas", "upload." + (language === "typescript" ? "ts" : "js")), getUploadSchema(language));

    await writeFile(join(srcDir, "cronjobs", "example." + (language === "typescript" ? "ts" : "js")), getExampleCronJob(language));

    if (graphql) {
        const graphqlFiles = getGraphQLFiles(language);
        const ext = language === "typescript" ? "ts" : "js";
        
        await writeFile(join(srcDir, "graphql", `types.${ext}`), graphqlFiles["types.ts"]);
        await writeFile(join(srcDir, "graphql", `resolvers.${ext}`), graphqlFiles["resolvers.ts"]);
        await writeFile(join(srcDir, "graphql", `schema.${ext}`), graphqlFiles["schema.ts"]);
    }

    await writeFile(join(targetDir, ".env.development.example"), getEnvExample(telemetry));
    await writeFile(join(targetDir, ".env.production.example"), getEnvExample(telemetry));

    await writeFile(join(targetDir, ".env.development"), getEnvDevelopment(telemetry));
    await writeFile(join(targetDir, ".env.production"), getEnvProduction(telemetry));

    await writeFile(join(targetDir, ".gitignore"), getGitignore());

    if (useDocker) {
        await writeFile(join(targetDir, "Dockerfile"), getDockerfile(language));
        await writeFile(join(targetDir, "docker-compose.yml"), getDockerCompose(language));
        await writeFile(join(targetDir, ".dockerignore"), getDockerIgnore());
    }
};