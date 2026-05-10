import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
    maxRetriesPerRequest: null
});

export const pubClient = new IORedis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
export const subClient = new IORedis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
