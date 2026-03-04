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