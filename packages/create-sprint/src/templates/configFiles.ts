export function getTsConfig() {
    return `
{
  "compilerOptions": {
    /* Target */
    "ignoreDeprecations": "6.0",
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": [
      "ES2022"
    ],
    "types": [
      "node"
    ],
    /* Output */
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    /* Strict */
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    /* Interop */
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    /* Performance */
    "incremental": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": [
        "./src/*"
      ]
    }
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts"
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