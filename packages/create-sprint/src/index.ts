import { execSync } from "child_process";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { input, select, confirm } from "@inquirer/prompts";
import { validateProjectName } from "./validators.js";
import { getTypeScriptPackageJson, getJavaScriptPackageJson, getTsConfig, getViteConfig, getMainFile, getHomeRoute, getAdminRoute, getHomeController, getAdminController, getAuthMiddleware, getHomeSchema, getAdminSchema, getDockerfile, getDockerCompose, getGitignore, getDockerIgnore, getSprintConfigFile, getEnvDevelopment, getEnvProduction, getExampleCronJob } from "./generators.js";

export interface CLIOptions {
    projectName?: string;
    language?: "typescript" | "javascript";
    telemetry?: "none" | "sentry" | "glitchtip" | "discord";
    docker?: boolean;
    skipInstall?: boolean;
    skipPrompts?: boolean;
}

export async function runCLI(args: string[]) {
    const options = parseArgs(args);

    console.log("\n🚀 Welcome to Sprint - Quickly API Framework\n");

    let projectName = options.projectName;
    let language = options.language;
    const telemetry = options.telemetry;
    const useDocker = options.docker;

    if (!projectName) {
        projectName = await getProjectName();
    }

    const error = validateProjectName(projectName);
    if (error) {
        console.error(`\n❌ Error: ${error}\n`);
        process.exit(1);
    }

    if (!language) {
        language = await selectLanguage();
    }

    console.log(`\n✅ Creating Sprint project: ${projectName === "." ? "current directory" : projectName} with ${language === "typescript" ? "TypeScript" : "JavaScript"}\n`);

    await createProject(projectName, language, telemetry, useDocker);

    console.log("\n✅ Project created successfully!");

    let installDeps = true;
    if (options.skipInstall) {
        installDeps = false;
    } else {
        installDeps = await confirm({
            message: "Do you want to install dependencies now?",
            default: true,
        });
    }

    if (installDeps) {
        console.log("\n📦 Installing dependencies...\n");
        const targetDir = projectName === "." ? process.cwd() : join(process.cwd(), projectName);
        try {
            execSync("npm install", { cwd: targetDir, stdio: "inherit" });
            console.log("\n✅ Dependencies installed successfully!");
        } catch {
            console.error("\n❌ Error installing dependencies. Please run 'npm install' manually.");
        }
    }

    console.log("\n📦 Next steps:");
    const cdCmd = projectName === "." ? "" : `cd ${projectName} && `;
    if (!installDeps) {
        console.log(`   ${cdCmd}npm install`);
    }
    console.log(`   ${cdCmd}npm run dev`);
    console.log("\n");
}

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

async function getProjectName(): Promise<string> {
    const name = await input({
        message: "Enter project name:",
        validate: (value) => {
            return validateProjectName(value) || true;
        }
    });

    return name;
};

async function selectLanguage(): Promise<"typescript" | "javascript"> {
    const language = await select({
        message: "Select your preferred language:",
        choices: [
            {
                name: "TypeScript",
                value: "typescript",
                description: "Recommended - Type safety and better developer experience",
            },
            {
                name: "JavaScript",
                value: "javascript",
                description: "Vanilla JavaScript for simpler projects",
            }
        ]
    });

    return language as "typescript" | "javascript";
};

async function selectTelemetry(): Promise<"none" | "sentry" | "glitchtip" | "discord"> {
    const telemetry = await select({
        message: "Select error tracking/telemetry solution:",
        choices: [
            {
                name: "None",
                value: "none",
                description: "No error tracking integration",
            },
            {
                name: "Sentry",
                value: "sentry",
                description: "Full-featured error tracking (free tier available)",
            },
            {
                name: "GlitchTip",
                value: "glitchtip",
                description: "Simple error tracking, can be self-hosted",
            },
            {
                name: "Discord Webhook",
                value: "discord",
                description: "Send error notifications to Discord channel",
            }
        ]
    });

    return telemetry as "none" | "sentry" | "glitchtip" | "discord";
};

async function createProject(
    projectName: string,
    language: "typescript" | "javascript",
    telemetryArg?: string,
    useDockerArg?: boolean
) {
    const isCurrentDir = projectName === ".";
    const targetDir = isCurrentDir ? process.cwd() : join(process.cwd(), projectName);

    if (!isCurrentDir && existsSync(targetDir)) {
        console.error(`Error: Directory ${projectName} already exists`);
        process.exit(1);
    }

    if (!isCurrentDir) await mkdir(targetDir, { recursive: true });

    let telemetry = telemetryArg || "none";
    if (!telemetryArg) telemetry = await selectTelemetry();

    let useDocker = useDockerArg || false;
    if (!useDockerArg) {
        useDocker = await confirm({
            message: "Do you want to add Docker support?",
            default: false,
        });
    }

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

    await writeFile(join(srcDir, "middlewares", ".gitkeep"), "");

    await writeFile(join(srcDir, "app." + (language === "typescript" ? "ts" : "js")), getMainFile(language));

    await writeFile(join(srcDir, "routes", "home." + (language === "typescript" ? "ts" : "js")), getHomeRoute(language));
    await writeFile(join(srcDir, "routes", "admin." + (language === "typescript" ? "ts" : "js")), getAdminRoute(language));

    await writeFile(join(srcDir, "controllers", "home." + (language === "typescript" ? "ts" : "js")), getHomeController(language));
    await writeFile(join(srcDir, "controllers", "admin." + (language === "typescript" ? "ts" : "js")), getAdminController(language));

    await writeFile(join(srcDir, "middlewares", "auth." + (language === "typescript" ? "ts" : "js")), getAuthMiddleware(language));

    await writeFile(join(srcDir, "schemas", "home." + (language === "typescript" ? "ts" : "js")), getHomeSchema(language));
    await writeFile(join(srcDir, "schemas", "admin." + (language === "typescript" ? "ts" : "js")), getAdminSchema(language));

    await writeFile(join(srcDir, "cronjobs", "example." + (language === "typescript" ? "ts" : "js")), getExampleCronJob(language));

    await writeFile(join(targetDir, ".env.development.example"), getEnvDevelopment(telemetry));
    await writeFile(join(targetDir, ".env.production.example"), getEnvProduction(telemetry));

    await writeFile(join(targetDir, ".env.development"), "");
    await writeFile(join(targetDir, ".env.production"), "");

    await writeFile(join(targetDir, ".gitignore"), getGitignore());

    if (useDocker) {
        await writeFile(join(targetDir, "Dockerfile"), getDockerfile(language));
        await writeFile(join(targetDir, "docker-compose.yml"), getDockerCompose(language));
        await writeFile(join(targetDir, ".dockerignore"), getDockerIgnore());
    }
};