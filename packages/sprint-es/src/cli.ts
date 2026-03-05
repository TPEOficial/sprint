#!/usr/bin/env node

import { existsSync, readdirSync, statSync, readFileSync, writeFileSync, rmSync } from "fs";
import * as crypto from "crypto";
import { resolve, join } from "path";
import { spawn } from "child_process";
import { createRequire } from "module";

const args = process.argv.slice(2);
const command = args[0];

const pc = {
    red: (s: string) => `\x1b[31m${s}\x1b[0m`,
    yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
    cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
    green: (s: string) => `\x1b[32m${s}\x1b[0m`,
    dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
    bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

const logger = {
    error: (...args: string[]) => console.log(pc.red(args.join(" "))),
    warn: (...args: string[]) => console.log(pc.yellow(args.join(" "))),
    info: (...args: string[]) => console.log(pc.cyan(args.join(" "))),
    success: (...args: string[]) => console.log(pc.green(args.join(" "))),
    dim: (...args: string[]) => console.log(pc.dim(args.join(" "))),
    break: () => console.log(""),
};

const singleComment = Symbol("singleComment");
const multiComment = Symbol("multiComment");

type CommentState = false | typeof singleComment | typeof multiComment;

const stripWithoutWhitespace = () => "";

const stripWithWhitespace = (
    string: string,
    start: number,
    end: number
) => string.slice(start, end).replace(/[^ \t\r\n]/g, " ");

const isEscaped = (jsonString: string, quotePosition: number) => {
    let index = quotePosition - 1;
    let backslashCount = 0;

    while (jsonString[index] === "\\") {
        index -= 1;
        backslashCount += 1;
    }

    return Boolean(backslashCount % 2);
};

export default function stripJsonComments(
    jsonString: string,
    { whitespace = true, trailingCommas = false } = {}
) {
    if (typeof jsonString !== "string")
        throw new TypeError(
            `Expected argument \`jsonString\` to be a \`string\`, got \`${typeof jsonString}\``
        );

    const strip = whitespace ? stripWithWhitespace : stripWithoutWhitespace;

    let isInsideString = false;
    let isInsideComment: CommentState = false;
    let offset = 0;
    let buffer = "";
    let result = "";
    let commaIndex = -1;

    for (let index = 0; index < jsonString.length; index++) {
        const currentCharacter = jsonString[index];
        const nextCharacter = jsonString[index + 1];

        if (!isInsideComment && currentCharacter === '"') {
            const escaped = isEscaped(jsonString, index);
            if (!escaped) {
                isInsideString = !isInsideString;
            }
        }

        if (isInsideString) {
            continue;
        }

        if (!isInsideComment && currentCharacter + nextCharacter === "//") {
            buffer += jsonString.slice(offset, index);
            offset = index;
            isInsideComment = singleComment;
            index++;
        } else if (
            isInsideComment === singleComment &&
            currentCharacter + nextCharacter === "\r\n"
        ) {
            index++;
            isInsideComment = false;
            buffer += strip(jsonString, offset, index);
            offset = index;
            continue;
        } else if (
            isInsideComment === singleComment &&
            currentCharacter === "\n"
        ) {
            isInsideComment = false;
            buffer += strip(jsonString, offset, index);
            offset = index;
        } else if (
            !isInsideComment &&
            currentCharacter + nextCharacter === "/*"
        ) {
            buffer += jsonString.slice(offset, index);
            offset = index;
            isInsideComment = multiComment;
            index++;
            continue;
        } else if (
            isInsideComment === multiComment &&
            currentCharacter + nextCharacter === "*/"
        ) {
            index++;
            isInsideComment = false;
            buffer += strip(jsonString, offset, index + 1);
            offset = index + 1;
            continue;
        } else if (trailingCommas && !isInsideComment) {
            if (commaIndex !== -1) {
                if (currentCharacter === "}" || currentCharacter === "]") {
                    buffer += jsonString.slice(offset, index);
                    result += strip(buffer, 0, 1) + buffer.slice(1);
                    buffer = "";
                    offset = index;
                    commaIndex = -1;
                } else if (
                    currentCharacter !== " " &&
                    currentCharacter !== "\t" &&
                    currentCharacter !== "\r" &&
                    currentCharacter !== "\n"
                ) {
                    buffer += jsonString.slice(offset, index);
                    offset = index;
                    commaIndex = -1;
                }
            } else if (currentCharacter === ",") {
                result += buffer + jsonString.slice(offset, index);
                buffer = "";
                offset = index;
                commaIndex = index;
            }
        }
    }

    const remaining = isInsideComment === singleComment ? strip(jsonString, offset, jsonString.length) : jsonString.slice(offset);

    return result + buffer + remaining;
};

if (!command) {
    console.log("\n🚀 Sprint CLI\n");
    console.log("Usage: sprint-es <command>");
    console.log("\nCommands:");
    console.log("  dev              Start development server");
    console.log("  build            Build for production");
    console.log("  start            Start production server");
    console.log("  doctor           Analyze routes and middlewares for missing schemas");
    console.log("  generate-keys    Generate secure keys for JWT encryption");
    console.log("\nOptions:");
    console.log("  --help  Show this help message");
    process.exit(0);
}

if (command === "--help" || command === "-h") {
    console.log("\n🚀 Sprint CLI\n");
    console.log("Usage: sprint-es <command>");
    console.log("\nCommands:");
    console.log("  dev              Start development server");
    console.log("  build            Build for production");
    console.log("  start            Start production server");
    console.log("  doctor           Analyze routes and middlewares for missing schemas");
    console.log("  generate-keys    Generate secure keys for JWT encryption");
    process.exit(0);
}

function getProjectRoot() {
    let dir = process.cwd();
    while (dir !== resolve(dir, "..")) {
        if (existsSync(join(dir, "sprint.config.ts")) || existsSync(join(dir, "sprint.config.js"))) return dir;
        dir = resolve(dir, "..");
    }
    return process.cwd();
};

const projectRoot = getProjectRoot();

function runCommand(cmd: string, envVars: Record<string, string>): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, [], {
            cwd: projectRoot,
            stdio: "inherit",
            shell: true,
            env: { ...process.env, ...envVars }
        });

        child.on("exit", (code: number | null) => {
            if (code === 0 || code === null) resolve();
            else reject(new Error(`Command failed with exit code ${code}`));
        });
    });
};

function generateJWTSecret(): string {
    const chars = crypto.randomBytes(24).toString("hex").split("");

    const positions = new Set<number>();

    while (positions.size < 5) {
        const pos = crypto.randomInt(0, 48);

        let valid = true;
        for (const p of positions) {
            if (Math.abs(p - pos) <= 1) {
                valid = false;
                break;
            }
        }

        if (valid) positions.add(pos);
    }

    for (const pos of positions) {
        chars[pos] = ".";
    }

    return chars.join("");
};

interface RouteInfo {
    file: string;
    path: string;
    method: string;
    hasSchema: boolean;
}

interface MiddlewareInfo {
    file: string;
    name: string;
    hasSchema: boolean;
}

function scanDirectory(dir: string, extensions: string[]): string[] {
    const files: string[] = [];

    if (!existsSync(dir)) return files;

    const entries = readdirSync(dir);
    for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            files.push(...scanDirectory(fullPath, extensions));
        } else if (stat.isFile() && extensions.some(ext => entry.endsWith(ext))) {
            files.push(fullPath);
        }
    }

    return files;
}

function hasSchemaInRouterFile(filePath: string): boolean {
    try {
        const content = readFileSync(filePath, "utf-8");

        if (content.includes("defineRouteSchema") || content.includes("__sprintRouteSchema")) return true;

        const routerMethodPattern = /(router|get|post|put|delete|patch)\s*\.\s*(get|post|put|delete|patch|all)\s*\(\s*['"`]/;
        const schemaImportPattern = /import\s+.*\s+from\s+['"]@\/schemas\/|import\s+.*\s+from\s+['"]\.\/schemas\//;

        if (routerMethodPattern.test(content) && schemaImportPattern.test(content)) return true;

        return false;
    } catch {
        return false;
    }
};

function extractRoutesFromFile(filePath: string, schemaNames: Set<string>): RouteInfo[] {
    const routes: RouteInfo[] = [];

    try {
        const content = readFileSync(filePath, "utf-8");
        const lines = content.split("\n");

        const routerMethods = ["get", "post", "put", "delete", "patch", "all", "head", "options"];

        for (const line of lines) {
            const trimmed = line.trim();

            for (const method of routerMethods) {
                const match = trimmed.match(new RegExp(`router\\.${method}\\s*\\(\\s*['"\`]([^'"\`]+)['"\`]\\s*,\\s*([^,)]+)`));
                if (match) {
                    const routePath = match[1];
                    const firstArg = match[2].trim().split(',')[0].trim();

                    const hasSchema = schemaNames.has(firstArg);

                    routes.push({
                        file: filePath,
                        path: routePath,
                        method: method.toUpperCase(),
                        hasSchema
                    });
                    break;
                }
            }
        }
    } catch (e) {
        console.error("Error extracting routes:", e);
    }

    return routes;
}

function extractAllSchemaNames(projectRoot: string): Set<string> {
    const schemaNames = new Set<string>();
    const schemasPath = join(projectRoot, "src/schemas");

    if (!existsSync(schemasPath)) {
        return schemaNames;
    }

    const schemaFiles = scanDirectory(schemasPath, [".ts", ".js"]);

    for (const file of schemaFiles) {
        try {
            const content = readFileSync(file, "utf-8");
            const matches = content.matchAll(/export\s+const\s+(\w+)\s*=/g);
            for (const match of matches) {
                schemaNames.add(match[1]);
            }
        } catch {
            // Ignore
        }
    }

    return schemaNames;
}

function hasSchemaInMiddleware(filePath: string): boolean {
    try {
        const content = readFileSync(filePath, "utf-8");

        if (content.includes("schema:") || content.includes("__sprintMiddlewareSchema")) {
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

function extractMiddlewareName(filePath: string): string {
    try {
        const content = readFileSync(filePath, "utf-8");

        const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);
        if (nameMatch) {
            return nameMatch[1];
        }

        const fileName = filePath.split(/[/\\]/).pop() || filePath;
        return fileName.replace(/\.(ts|js)$/, "");
    } catch {
        return filePath;
    }
}

function renderFramedBox(lines: string[], title?: string): void {
    if (lines.length === 0) return;

    const maxLength = Math.max(...lines.map(line => line.length));
    const horizontalPadding = 1;
    const borderLine = "─".repeat(maxLength + horizontalPadding * 2);

    console.log(pc.dim(`┌${borderLine}┐`));

    if (title) {
        const titlePadding = " ".repeat(maxLength - title.length + horizontalPadding * 2);
        console.log(pc.dim("│") + " " + pc.bold(pc.cyan(title)) + titlePadding + pc.dim("│"));
        console.log(pc.dim(`├${borderLine}┤`));
    }

    for (const line of lines) {
        const padding = " ".repeat(maxLength - line.length + horizontalPadding * 2);
        console.log(pc.dim("│") + " " + line + padding + pc.dim("│"));
    }

    console.log(pc.dim(`└${borderLine}┘`));
}

async function runDoctor() {
    logger.break();
    logger.info("🔍 Sprint Doctor - Analyzing routes and middlewares...\n");

    const routesPath = join(projectRoot, "src/routes");
    const middlewaresPath = join(projectRoot, "src/middlewares");

    const schemaNames = extractAllSchemaNames(projectRoot);

    const routeFiles = scanDirectory(routesPath, [".ts", ".js"]);
    const middlewareFiles = scanDirectory(middlewaresPath, [".ts", ".js"]);

    const allRoutes: RouteInfo[] = [];
    for (const file of routeFiles) {
        const routes = extractRoutesFromFile(file, schemaNames);
        allRoutes.push(...routes);
    }

    const middlewares: MiddlewareInfo[] = [];
    for (const file of middlewareFiles) {
        middlewares.push({
            file,
            name: extractMiddlewareName(file),
            hasSchema: hasSchemaInMiddleware(file)
        });
    }

    const routesWithoutSchema = allRoutes.filter(r => !r.hasSchema);
    const middlewaresWithoutSchema = middlewares.filter(m => !m.hasSchema);

    const routesWithSchema = allRoutes.filter(r => r.hasSchema);
    const middlewaresWithSchema = middlewares.filter(m => m.hasSchema);

    logger.break();
    console.log(pc.bold("📊 Schema Coverage Report\n"));

    const routesLines = [
        `${pc.green("✓")} Routes with schema: ${routesWithSchema.length}`,
        `${routesWithoutSchema.length > 0 ? pc.red("✗") : pc.green("✓")} Routes without schema: ${routesWithoutSchema.length}`,
        `${pc.dim("─".repeat(40))}`,
        `Total routes: ${allRoutes.length}`,
    ];
    renderFramedBox(routesLines, "Routes");

    logger.break();

    const middlewareLines = [
        `${pc.green("✓")} Middlewares with schema: ${middlewaresWithSchema.length}`,
        `${middlewaresWithoutSchema.length > 0 ? pc.red("✗") : pc.green("✓")} Middlewares without schema: ${middlewaresWithoutSchema.length}`,
        `${pc.dim("─".repeat(40))}`,
        `Total middlewares: ${middlewares.length}`,
    ];
    renderFramedBox(middlewareLines, "Middlewares");

    logger.break();

    if (routesWithoutSchema.length > 0) {
        console.log(pc.bold(pc.yellow("⚠️  Routes without schema:")));
        logger.break();

        const uniqueRoutes = routesWithoutSchema.reduce((acc, route) => {
            const key = `${route.method}:${route.path}`;
            if (!acc[key]) acc[key] = { ...route, files: [route.file] };
            else if (!acc[key].files.includes(route.file)) acc[key].files.push(route.file);
            return acc;
        }, {} as Record<string, RouteInfo & { files: string[] }>);

        for (const route of Object.values(uniqueRoutes)) {
            const fileName = route.file.split(/[/\\]/).pop();
            console.log(`  ${pc.red("✗")} ${pc.bold(route.method)} ${route.path}`);
            console.log(`    ${pc.dim("File:")} ${fileName}`);
        }

        logger.break();
    }

    if (middlewaresWithoutSchema.length > 0) {
        console.log(pc.bold(pc.yellow("⚠️  Middlewares without schema:")));
        logger.break();

        for (const mw of middlewaresWithoutSchema) {
            const fileName = mw.file.split(/[/\\]/).pop();
            console.log(`  ${pc.red("✗")} ${pc.bold(mw.name)}`);
            console.log(`    ${pc.dim("File:")} ${fileName}`);
        }

        logger.break();
    }

    if (routesWithoutSchema.length === 0 && middlewaresWithoutSchema.length === 0) {
        console.log(pc.green(pc.bold("✅ All routes and middlewares have schemas defined!")));
        logger.break();
    }

    const totalWithoutSchema = routesWithoutSchema.length + middlewaresWithoutSchema.length;
    const totalItems = allRoutes.length + middlewares.length;

    if (totalItems > 0) {
        const coverage = Math.round(((totalItems - totalWithoutSchema) / totalItems) * 100);

        console.log(pc.bold("📈 Schema Coverage: ") + (coverage >= 80 ? pc.green(`${coverage}%`) : coverage >= 50 ? pc.yellow(`${coverage}%`) : pc.red(`${coverage}%`)));

        if (coverage < 80) {
            logger.break();
            console.log(pc.yellow("💡 Tip: Adding schemas helps with:"));
            console.log(pc.dim("  • Request validation (body, query, params, headers)"));
            console.log(pc.dim("  • OpenAPI/Swagger UI auto-generation"));
            console.log(pc.dim("  • Better security through input validation"));
            console.log(pc.dim("  • Auto-completion in IDEs"));
        }
    }

    logger.break();
};

const commandDependencies: Record<string, { ts?: string[]; js?: string[]; }> = {
    build: {
        ts: ["tsup", "typescript"]
    }
};

// function checkDependencies(command: string, isTS: boolean) {
//     const config = commandDependencies[command];
//     if (!config) return [];

//     const deps = isTS ? config.ts ?? [] : config.js ?? [];

//     const missing: string[] = [];

//     for (const dep of deps) {
//         const binPath = join(projectRoot, "node_modules", ".bin", dep);
//         if (!existsSync(binPath)) missing.push(dep);
//     }

//     if (missing.length > 0) {
//         console.error("\n❌ Missing required dependencies:");
//         for (const dep of missing) {
//             console.error(`   • ${dep}`);
//         }

//         console.error("\n👉 Install with:");
//         console.error("   npm install --save-dev " + missing.join(" "));
//         console.error("");

//         process.exit(1);
//     }
// };

async function main() {
    const hasDist = existsSync(join(projectRoot, "dist"));
    const hasTsConfig = existsSync(join(projectRoot, "tsconfig.json"));

    switch (command) {
        case "dev": {
            console.log("🚀 Starting development server with hot reload...");
            let srcFile: string;
            let devCmd: string;

            if (hasTsConfig) {
                srcFile = existsSync(join(projectRoot, "src/app.ts")) ? "src/app.ts" : "src/index.ts";
                devCmd = `tsx --watch ${srcFile}`;
            } else {
                srcFile = existsSync(join(projectRoot, "src/app.js")) ? "src/app.js" : existsSync(join(projectRoot, "src/app.mjs")) ? "src/app.mjs" : existsSync(join(projectRoot, "src/index.js")) ? "src/index.js" : "src/index.mjs";
                devCmd = `node --watch ${srcFile}`;
            }

            await runCommand(devCmd, { NODE_ENV: "development" });
            break;
        }
        case "build": {
            console.log("🚀 Building for production...");

            // checkDependencies("build", true);

            const distPath = join(projectRoot, "dist");
            const tsconfigPath = join(projectRoot, "tsconfig.json");
            const hasSprintConfigTs = existsSync(join(projectRoot, "sprint.config.ts"));

            if (!hasSprintConfigTs) {
                console.error("[Sprint] This command only works for TypeScript-based projects.");
                process.exit(1);
            }

            console.log("[Sprint] Cleaning dist...");
            rmSync(distPath, { recursive: true, force: true });
            console.log("[Sprint] dist cleaned ✓");

            console.log("[Sprint] Compiling with tsup...");
            await runCommand(`tsc && tsup`, { NODE_ENV: "production" });
            console.log("[Sprint] Compilation completed ✓");

            if (hasSprintConfigTs) {
                console.log("[Sprint] Compiling sprint.config.ts...");
                await runCommand(`tsup sprint.config.ts --outDir "${distPath}" --format cjs --tsconfig "${tsconfigPath}" --clean false`, { NODE_ENV: "production" });
                console.log("[Sprint] sprint.config.js generated ✓");
            }

            console.log("✅ Build completed successfully!");
            break;
        }
        case "start": {
            console.log("🚀 Starting production server...");
            let entryFile: string | null = null;

            if (hasDist) {
                const candidates = ["dist/app.mjs", "dist/app.js", "dist/index.mjs", "dist/index.js"];
                entryFile = candidates.find(f => existsSync(join(projectRoot, f))) ?? null;

                if (!entryFile) {
                    console.error("[Sprint] Entry file not found in dist/.");
                    console.error("[Sprint] Expected dist/app.mjs or dist/index.mjs");
                    process.exit(1);
                }
            } else {
                const candidates = ["src/app.js", "src/app.mjs", "src/index.js", "src/index.mjs"];
                entryFile = candidates.find(f => existsSync(join(projectRoot, f))) ?? null;

                if (!entryFile) {
                    console.error("[Sprint] Entry file not found in src/.");
                    console.error("[Sprint] Expected src/app.js or src/index.js");
                    process.exit(1);
                }
            }

            await runCommand(`node "${join(projectRoot, entryFile)}"`, { NODE_ENV: "production" });
            break;
        }
        case "doctor":
            runDoctor();
            break;
        case "generate-keys": {
            const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
                modulusLength: 2048,
                publicKeyEncoding: { type: "spki", format: "pem" },
                privateKeyEncoding: { type: "pkcs8", format: "pem" }
            });

            console.log("\n🔑 Generating JWT keys...\n");
            console.log("JWT_PUBLIC_KEY='" + publicKey + "'");
            console.log("\nJWT_PRIVATE_KEY='" + privateKey + "'");
            console.log("\nJWT_ENCRYPTION_SECRET=" + generateJWTSecret());
            console.log("\n📝 Add these to your .env file (use single quotes for multiline values):\n");
            process.exit(0);
            break;
        }
        default:
            console.error(`Unknown command: ${command}`);
            console.log("Use --help for usage information");
            process.exit(1);
    }
};

main().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
});