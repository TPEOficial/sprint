import type { ProjectFeatures } from "../index.js";

export function getTsConfig() {
    return `
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "baseUrl": "./src",
    "paths": {
      "@/*": [
        "*"
      ]
    },
    "moduleResolution": "Node",
    "outDir": "dist",
    "importsNotUsedAsValues": "remove",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules"
  ]
}
    `;
};

function buildCorsBlock(corsInput: string): string {
    const trimmed = (corsInput ?? "").trim();
    if (trimmed === "" || trimmed.toLowerCase() === "deny" || trimmed.toLowerCase() === "none") {
        return `    cors: false,`;
    }
    if (trimmed === "*") {
        return `    cors: { origin: "*" },`;
    }
    const origins = trimmed.split(",").map(o => o.trim()).filter(Boolean);
    return `    cors: {
        origin: ${JSON.stringify(origins)},
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"]
    },`;
}

export function getSprintConfigFile(
    language: string,
    telemetry: string,
    swagger: boolean,
    graphql: boolean,
    features?: Partial<ProjectFeatures>
): string {
    const corsInput = features?.cors ?? "";
    const swaggerEnabled = swagger ? "true" : "false";
    const swaggerUiEnabled = swagger ? '["development"]' : "false";
    const graphqlEnabled = graphql ? "true" : "false";
    const graphiqlEnabled = graphql ? '["development"]' : "false";

    const corsBlock = buildCorsBlock(corsInput);

    const isTs = language === "typescript";
    const importLine = isTs ? `import type { SprintOptions } from "sprint-es";\n\n` : "";
    const exportLine = isTs ? `export const config: SprintOptions = {` : `export const config = {`;

    let config = `${importLine}${exportLine}
${corsBlock}

    security: {
        hsts: { maxAge: 63072000, includeSubDomains: true }
    },

    context: {
        trustIncomingRequestId: true
    },

    errorHandler: {
        includeStack: process.env.NODE_ENV !== "production"
    },

    shutdown: {
        timeoutMs: 30_000
    },

    openapi: {
        enabled: ${swaggerEnabled},
        generateOnBuild: ${swaggerEnabled},
        swaggerUi: {
            enabled: ${swaggerUiEnabled}
        }
    },

    graphql: {
        enabled: ${graphqlEnabled},
        graphiql: {
            enabled: ${graphiqlEnabled}
        }
    }
};
`;

    if (telemetry === "sentry" || telemetry === "glitchtip") {
        config += `\nimport { initTelemetry } from "sprint-es/telemetry";

initTelemetry({
    provider: "${telemetry}",
    dsn: process.env.SENTRY_DSN || "",
    environment: process.env.NODE_ENV || "development"
});
`;
    } else if (telemetry === "discord") {
        config += `\nimport { initTelemetry } from "sprint-es/telemetry";

initTelemetry({
    provider: "discord",
    webhookUrl: process.env.DISCORD_TELEMETRY_WEBHOOK_URL || ""
});
`;
    }

    return config;
};
