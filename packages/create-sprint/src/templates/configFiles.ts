export function getTsConfig() {
    return JSON.stringify({
        compilerOptions: {
            target: "ES2022",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            lib: ["ES2022"],
            types: ["node"],
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
            baseUrl: ".",
            paths: {
                "@/*": ["./src/*"]
            }
        },
        include: ["src/**/*"],
        exclude: ["node_modules", "dist"],
    }, null, 2);
};

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
};

export function getSprintConfigFile(language: string, telemetry: string, swagger: boolean, graphql: boolean) {
    const swaggerEnabled = swagger ? "true" : "false";
    const swaggerUiEnabled = swagger ? '["development"]' : "false";
    const graphqlEnabled = graphql ? "true" : "false";
    const graphiqlEnabled = graphql ? '["development"]' : "false";
    
    if (language === "typescript") {
        let config = `import type { SprintOptions } from "sprint-es";

export const config: SprintOptions = {
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

// To use GraphQL, create a schema at src/graphql/schema.ts and import it here
// import { GraphQLSchema } from "graphql";
// export const graphqlSchema = new GraphQLSchema({ ... });
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
    webhookUrl: process.env.DISCORD_TELEMETRY_WEBHOOK_URL || ""
});
`;
        }

        return config;
    }

    let config = `export const config = {
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

// To use GraphQL, create a schema at src/graphql/schema.js and import it here
// import { GraphQLSchema } from "graphql";
// export const graphqlSchema = new GraphQLSchema({ ... });
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
    webhookUrl: process.env.DISCORD_TELEMETRY_WEBHOOK_URL || ""
});
`;
    }

    return config;
};