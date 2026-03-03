import { RequestHandler } from "express";
import { MiddlewareConfig, AsyncRequestHandler, MiddlewareSchema } from "./types";

function createSchemaValidationMiddleware(schema: MiddlewareSchema): RequestHandler {
    return (req, res, next) => {
        const errors: Array<{ location: string; path: string; message: string; }> = [];
        const method = req.method.toUpperCase();
        const noBodyMethods = ["GET", "HEAD", "DELETE"];

        if (schema.body && !noBodyMethods.includes(method)) {
            const result = schema.body.safeParse(req.body);
            if (!result.success) {
                errors.push(...result.error.issues.map(issue => ({
                    location: "body",
                    path: issue.path.join("."),
                    message: issue.message
                })));
            }
        }

        if (schema.queryParams) {
            const result = schema.queryParams.safeParse(req.query);
            if (!result.success) {
                errors.push(...result.error.issues.map(issue => ({
                    location: "queryParams",
                    path: issue.path.join("."),
                    message: issue.message
                })));
            }
        }

        if (schema.params) {
            const result = schema.params.safeParse(req.params);
            if (!result.success) {
                errors.push(...result.error.issues.map(issue => ({
                    location: "params",
                    path: issue.path.join("."),
                    message: issue.message
                })));
            }
        }

        if (schema.headers) {
            const result = schema.headers.safeParse(req.headers);
            if (!result.success) {
                errors.push(...result.error.issues.map(issue => ({
                    location: "headers",
                    path: issue.path.join("."),
                    message: issue.message
                })));
            }
        }

        if (schema.sprint?.authorization) {
            const authSchema = schema.sprint.authorization;
            const description = (authSchema as any)._def?.description;
            let sources: Array<`query:${string}` | `headers:${string}`> = ["query:token", "headers:authorization"];
            
            if (description) {
                try {
                    const parsed = JSON.parse(description);
                    if (parsed.__sprintAuthorization && parsed.sources) sources = Array.isArray(parsed.sources) ? parsed.sources : [parsed.sources];
                } catch { }
            }

            let authValue: string | undefined;
            for (const source of sources) {
                const [type, key] = source.split(":") as [string, string];
                if (type === "query") {
                    const value = req.query[key];
                    if (typeof value === "string" && value.length > 0) {
                        authValue = value;
                        break;
                    }
                } else if (type === "headers") {
                    const value = req.headers[key.toLowerCase()];
                    if (typeof value === "string" && value.length > 0) {
                        authValue = value;
                        break;
                    }
                    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string" && value[0].length > 0) {
                        authValue = value[0];
                        break;
                    }
                }
            }

            if (!authValue) errors.push({ location: "sprint.authorization", path: "authorization", message: "Authorization header or query parameter not found" });
            else (req.sprint as any).authorization = authValue;
        }

        if (errors.length > 0) return res.status(400).json({ error: "Validation failed", details: errors });
        next();
    };
};

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
    const wrapHandler = (handler: RequestHandler | AsyncRequestHandler): RequestHandler => {
        return (req, res, next) => {
            const result = handler(req, res, next);
            if (result instanceof Promise) result.catch(next);
        };
    };

    const handlers: RequestHandler[] = [];

    if (config.schema) {
        handlers.push(createSchemaValidationMiddleware(config.schema));
    }

    const originalHandler = config.handler;
    if (Array.isArray(originalHandler)) {
        handlers.push(...originalHandler.map(wrapHandler));
    } else {
        handlers.push(wrapHandler(originalHandler));
    }

    const finalConfig: MiddlewareConfig = {
        ...config,
        handler: handlers
    };

    if (config.schema) {
        (finalConfig as any).__sprintMiddlewareSchema = config.schema;
    }

    return finalConfig;
};
