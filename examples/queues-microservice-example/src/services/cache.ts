import { defineCache, RedisCache } from "sprint-es/cache";
import { connection } from "./redis.js";

export const cache = defineCache({
    name: "main",
    adapter: new RedisCache({ client: connection, prefix: "app:cache:", defaultTtlMs: 60_000 })
});
