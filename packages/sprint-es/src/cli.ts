#!/usr/bin/env node

import { existsSync } from "fs";
import * as crypto from "crypto";
import { resolve, join } from "path";
import { spawn } from "child_process";

const args = process.argv.slice(2);
const command = args[0];

if (!command) {
    console.log("\n🚀 Sprint CLI\n");
    console.log("Usage: sprint-es <command>");
    console.log("\nCommands:");
    console.log("  dev              Start development server");
    console.log("  build            Build for production");
    console.log("  start            Start production server");
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

function runCommand(cmd: string, envVars: Record<string, string>) {
    const child = spawn(cmd, args.slice(1), {
        cwd: projectRoot,
        stdio: "inherit",
        shell: true,
        env: { ...process.env, ...envVars }
    });

    child.on("exit", (code: number | null) => {
        process.exit(code || 0);
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

switch (command) {
    case "dev":
        console.log("🚀 Starting development server with hot reload...");
        const srcFile = existsSync(join(projectRoot, "src/app.ts")) ? "src/app.ts" 
            : existsSync(join(projectRoot, "src/app.js")) ? "src/app.js"
            : existsSync(join(projectRoot, "src/index.ts")) ? "src/index.ts"
            : "src/index.js";
        runCommand(`tsx --watch ${srcFile}`, { NODE_ENV: "development" });
        break;
    case "build":
        console.log("🚀 Building for production...");
        const hasViteConfig = existsSync(join(projectRoot, "vite.config.ts")) || existsSync(join(projectRoot, "vite.config.js"));
        if (hasViteConfig) runCommand("vite build", { NODE_ENV: "production" });
        else {
            console.error("❌ Error: no vite config found.");
            process.exit(1);
        }
        break;
    case "start":
        console.log("🚀 Starting production server...");
        runCommand("node dist/index.js", { NODE_ENV: "production" });
        break;
    case "generate-keys":
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
    default:
        console.error(`Unknown command: ${command}`);
        console.log("Use --help for usage information");
        process.exit(1);
}