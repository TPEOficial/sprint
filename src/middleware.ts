import { RequestHandler } from "express";
import { MiddlewareConfig } from "./types";

/**
 * Helper function to define a middleware with proper typing.
 * Use this in your middleware files. Supports both sync and async handlers.
 *
 * @example
 * // middlewares/auth.ts
 * import { defineMiddleware } from "sprint-es";
 *
 * export default defineMiddleware({
 *     name: "auth",
 *     handler: async (req, res, next) => {
 *         const user = await verifyToken(req.headers.authorization);
 *         if (!user) {
 *             return res.status(401).json({ error: "Unauthorized" });
 *         }
 *         req.user = user;
 *         next();
 *     },
 *     include: ["/api/**", "/admin/**"],
 *     exclude: ["/api/public/**"],
 *     priority: 10
 * });
 */
export function defineMiddleware(config: MiddlewareConfig): MiddlewareConfig {
    const wrapHandler = (handler: RequestHandler): RequestHandler => {
        return (req, res, next) => {
            const result = handler(req, res, next);
            if (result instanceof Promise) result.catch(next);
        };
    };

    return {
        ...config,
        handler: Array.isArray(config.handler) ? config.handler.map(wrapHandler) : wrapHandler(config.handler)
    };
};