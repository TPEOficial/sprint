import type { SprintOptions } from "sprint-es";

export const config: SprintOptions = {
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