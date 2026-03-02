import * as crypto from "node:crypto";
import { generateJWTKeys } from "./packageJson.js";

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
};

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
};

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
};