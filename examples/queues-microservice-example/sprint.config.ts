import type { SprintOptions } from "sprint-es";

export const config: SprintOptions = {
    cors: false,
    shutdown: { timeoutMs: 30_000 },
    errorHandler: { includeStack: process.env.NODE_ENV !== "production" }
};
