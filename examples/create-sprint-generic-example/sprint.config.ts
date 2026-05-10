import type { SprintOptions } from "sprint-es";

export const config: SprintOptions = {
    cors: {
        origin: ["http://localhost:3000", "https://app.example.com"],
        credentials: true
    },
    security: {
        hsts: { maxAge: 63072000, includeSubDomains: true, preload: false }
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
        enabled: true,
        generateOnBuild: true,
        swaggerUi: {
            enabled: ["development"]
        }
    },
    graphql: {
        enabled: true,
        graphiql: {
            enabled: ["development"]
        }
    }
};

// To use GraphQL, create a schema at src/graphql/schema.ts and import it here
// import { GraphQLSchema } from "graphql";
// export const graphqlSchema = new GraphQLSchema({ ... });