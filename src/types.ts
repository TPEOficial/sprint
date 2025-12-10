import { Request, Response, NextFunction, RequestHandler } from "express";

export type Handler = (req: Request, res: Response, next: NextFunction) => any;

/**
 * Configuration for a middleware defined in the middlewares folder.
 * Export this from your middleware file using `defineMiddleware()`.
 */
export interface MiddlewareConfig {
    /** The middleware function(s) to execute */
    handler: RequestHandler | RequestHandler[];
    /**
     * Routes to include. Supports patterns:
     * - Exact: "/api/users"
     * - Single level: "/api/*" (matches /api/users but not /api/users/123)
     * - All nested: "/api/**" (matches /api/users, /api/users/123, etc.)
     * @default ["/**"] (all routes)
     */
    include?: string | string[];
    /**
     * Routes to exclude from this middleware.
     * Same pattern support as include.
     * Exclude takes precedence over include.
     */
    exclude?: string | string[];
    /**
     * Priority for middleware execution order.
     * Lower numbers run first. Default is 100.
     * @example 10 = runs early, 100 = normal, 200 = runs late
     */
    priority?: number;
    /** Optional name for logging purposes */
    name?: string;
}

export interface LoadedMiddleware extends MiddlewareConfig {
    name: string;
    filePath: string;
}

export interface SprintOptions {
    port?: string | number | null;
    routesPath?: string;
    /** Path to middlewares folder. Default: "./middlewares" */
    middlewaresPath?: string;
    /** Maximum request body size. Default: "50mb" */
    jsonLimit?: string;
    /** Maximum request body size. Default: "50mb" */
    urlEncodedLimit?: string;
    /**
     * Global prefix for all routes.
     * @example "/api" -> routes become /api/users, /api/posts
     * @example "/api/v1" -> routes become /api/v1/users, /api/v1/posts
     */
    prefix?: string;
}
