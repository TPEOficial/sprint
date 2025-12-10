import { defineMiddleware } from "../../dist/esm/index.js"; // import { defineMiddleware } from "sprint-es";
import { createRateLimit } from "../../dist/esm/modules/rate-limit/index.js"; // import { createRateLimit } from "sprint-es/rate-limit";

const ratelimitIp = createRateLimit(3, "5s", "ip");

export default defineMiddleware({
    name: "admin",
    priority: 7, // Runs after logger.
    include: "/admin/**",
    handler: async (req, res, next) => {
        const { success, limit, remaining, reset } = await ratelimitIp.limit(req.ip);

        if (!success) return res.status(429).send("Too many requests. Try again later.");

        console.log(`Request allowed. Remaining: ${remaining}/${limit}`);
        next();
    }
});