import type { SprintOptions } from "sprint-es";

export const config: SprintOptions = {
    cors: { origin: ["http://localhost:3000"], credentials: true },
    graphql: {
        enabled: true,
        path: "/graphql",
        graphiql: {
            enabled: ["development"],
            path: "/graphiql"
        }
    }
};
