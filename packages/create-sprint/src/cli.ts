
import { runCLI } from "./index.js";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
    console.log("\n🚀 Sprint - Quickly API Framework\n");
    console.log("Usage: npx create-sprint [options]");
    console.log("\nOptions:");
    console.log("  --ts, --typescript      Create TypeScript project");
    console.log("  --js, --javascript     Create JavaScript project");
    console.log("  --name <name>          Project name (use '.' for current directory)");
    console.log("  --no-install           Skip automatic dependency installation");
    console.log("  --telemetry <type>    Telemetry: none, sentry, glitchtip, discord");
    console.log("  --docker               Add Docker support");
    console.log("  --yes, -y             Skip all prompts (use defaults)");
    console.log("  --help, -h            Show this help message");
    console.log("\nExamples:");
    console.log("  npx create-sprint     Interactive mode");
    console.log("  npx create-sprint -y   Create TypeScript project with defaults");
    console.log("  npx create-sprint --ts --name my-api");
    console.log("  npx create-sprint --js --name . --telemetry sentry --docker\n");
    process.exit(0);
}

runCLI(args).catch(console.error);