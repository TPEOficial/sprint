import { defineMiddleware } from "../../dist/esm/index.js";

export default defineMiddleware({
    name: "logger",
    priority: 5, // Runs first.
    include: "/**", // All routes.
    handler: (req, res, next) => {
        const start = Date.now();

        res.on("finish", () => {
            const duration = Date.now() - start;
            console.log(`[Logger] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
        });

        next();
    }
});
