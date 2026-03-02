import { spawn } from "child_process";
import { existsSync } from "fs";
import { mkdir, writeFile as fsWriteFile } from "fs/promises";
import { join } from "path";
import color from "picocolors";
import * as p from "@clack/prompts";
import { validateProjectName } from "./validators.js";
import { getTypeScriptPackageJson, getJavaScriptPackageJson, getTsConfig, getViteConfig, getMainFile, getHomeRoute, getAdminRoute, getHomeController, getAdminController, getEnvExample, getInternalAuthMiddleware, getUserAuthMiddleware, getHomeSchema, getAdminSchema, getDockerfile, getDockerCompose, getGitignore, getDockerIgnore, getSprintConfigFile, getEnvDevelopment, getEnvProduction, getExampleCronJob } from "./generators.js";

export interface CLIOptions {
    projectName?: string;
    language?: "typescript" | "javascript";
    telemetry?: "none" | "sentry" | "glitchtip" | "discord";
    docker?: boolean;
    skipInstall?: boolean;
    skipPrompts?: boolean;
}

export async function writeFile(path: string, content: string, options?: any) {
    if (typeof content === "string") content = content.trimEnd();
    await fsWriteFile(path, content, options);
};

export async function runCLI(args: string[]) {
    const options = parseArgs(args);

    p.intro("Sprint — Quickly API Framework");

    p.intro(`${color.bgCyan(color.black(' create-sprint-app '))}`);

    let config: {
        projectName: string;
        language: "typescript" | "javascript";
        telemetry: string;
        docker: boolean;
    };

    if (options.skipPrompts) {
        config = {
            projectName: options.projectName || "sprint-app",
            language: options.language || "typescript",
            telemetry: options.telemetry || "none",
            docker: options.docker || false,
        };
    } else {
        config = await p.group(
            {
                projectName: () =>
                    p.text({
                        message: "Project name:",
                        placeholder: "my-api",
                        validate: (v) => validateProjectName(v) || undefined,
                    }),

                language: () =>
                    p.select({
                        message: "Language:",
                        options: [
                            { value: "typescript", label: "TypeScript", hint: "recommended" },
                            { value: "javascript", label: "JavaScript" },
                        ],
                    }),

                telemetry: () =>
                    p.select({
                        message: "Error tracking:",
                        options: [
                            { value: "none", label: "None" },
                            { value: "sentry", label: "Sentry", hint: "free tier available" },
                            { value: "glitchtip", label: "GlitchTip", hint: "self-hostable" },
                            { value: "discord", label: "Discord Webhook", hint: "sends to a channel" },
                        ],
                    }),

                docker: () =>
                    p.confirm({ message: "Add Docker support?", initialValue: false }),
            },
            {
                onCancel: () => {
                    p.cancel("Cancelled.");
                    process.exit(0);
                },
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
        config.docker,
    );
    s.stop("Project created");

    let installDeps = true;
    if (options.skipInstall) {
        installDeps = false;
    } else if (!options.skipPrompts) {
        installDeps = await p.confirm({ message: "Install dependencies now?", initialValue: true }) as boolean;
    }

    if (installDeps) {
        const s2 = p.spinner();
        s2.start("Installing dependencies");
        try {
            await new Promise<void>((resolve, reject) => {
                const child = spawn("npm", ["install"], {
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
    p.note(
        [
            !installDeps ? `${cdCmd}npm install` : "",
            `${cdCmd}npm run dev`,
        ]
            .filter(Boolean)
            .join("\n"),
        "Next steps"
    );

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
    
    if (hasName !== -1 && args[hasName + 1]) options.projectName = args[hasName + 1];

    if (args.includes("--current")) options.projectName = ".";

    if (args.includes("--docker")) options.docker = true;
    
    if (args.includes("--no-install")) options.skipInstall = true;

    if (telemetryArg && ["sentry", "glitchtip", "discord", "none"].includes(telemetryArg)) options.telemetry = telemetryArg as CLIOptions["telemetry"];
    
    return options;
};

async function createProject(
    projectName: string,
    language: "typescript" | "javascript",
    telemetry: string,
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
    if (language === "typescript") pkgJson = getTypeScriptPackageJson(projectName, telemetry);
    else pkgJson = getJavaScriptPackageJson(projectName, telemetry);
    
    await writeFile(join(targetDir, "package.json"), JSON.stringify(pkgJson, null, 2));

    if (language === "typescript") {
        await writeFile(join(targetDir, "tsconfig.json"), getTsConfig());
        await writeFile(join(targetDir, "vite.config.ts"), getViteConfig());
        await writeFile(join(targetDir, "sprint.config.ts"), getSprintConfigFile(language, telemetry));
    } else await writeFile(join(targetDir, "sprint.config.js"), getSprintConfigFile(language, telemetry));
    
    const srcDir = join(targetDir, "src");
    await mkdir(srcDir, { recursive: true });

    await mkdir(join(srcDir, "middlewares"), { recursive: true });
    await mkdir(join(srcDir, "routes"), { recursive: true });
    await mkdir(join(srcDir, "controllers"), { recursive: true });
    await mkdir(join(srcDir, "schemas"), { recursive: true });
    await mkdir(join(srcDir, "cronjobs"), { recursive: true });
    await mkdir(join(srcDir, "config"), { recursive: true });

    if (language === "typescript") {
        await writeFile(join(srcDir, "config", "index.ts"), "");
        await writeFile(join(srcDir, "config", "clients.ts"), "");
    } else {
        await writeFile(join(srcDir, "config", "index.js"), "");
        await writeFile(join(srcDir, "config", "clients.js"), "");
    }

    await writeFile(join(srcDir, "middlewares", ".gitkeep"), "");

    await writeFile(join(srcDir, "app." + (language === "typescript" ? "ts" : "js")), getMainFile(language));

    await writeFile(join(srcDir, "routes", "home." + (language === "typescript" ? "ts" : "js")), getHomeRoute(language));
    await writeFile(join(srcDir, "routes", "admin." + (language === "typescript" ? "ts" : "js")), getAdminRoute(language));

    await writeFile(join(srcDir, "controllers", "home." + (language === "typescript" ? "ts" : "js")), getHomeController(language));
    await writeFile(join(srcDir, "controllers", "admin." + (language === "typescript" ? "ts" : "js")), getAdminController(language));

    await writeFile(join(srcDir, "middlewares", "auth.internal." + (language === "typescript" ? "ts" : "js")), getInternalAuthMiddleware(language));
    await writeFile(join(srcDir, "middlewares", "auth.user." + (language === "typescript" ? "ts" : "js")), getUserAuthMiddleware(language));

    await writeFile(join(srcDir, "schemas", "home." + (language === "typescript" ? "ts" : "js")), getHomeSchema(language));
    await writeFile(join(srcDir, "schemas", "admin." + (language === "typescript" ? "ts" : "js")), getAdminSchema(language));

    await writeFile(join(srcDir, "cronjobs", "example." + (language === "typescript" ? "ts" : "js")), getExampleCronJob(language));

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