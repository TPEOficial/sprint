import { defineMiddleware } from "../../dist/esm/index.js"; // import { defineMiddleware } from "sprint-es";
import { logger } from "../../dist/esm/modules/logger/index.js"; // import { logger } from "sprint-es/logger";

export default defineMiddleware({
    name: "logger",
    priority: 5, // Runs first.
    include: "/**", // All routes.
    handler: (req, res, next) => {
        const start = Date.now();

        res.on("finish", () => {
            const duration = Date.now() - start;
            logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
        });

        next();
    }
});