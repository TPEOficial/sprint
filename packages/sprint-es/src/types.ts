import { Request, Response, NextFunction, RequestHandler } from "express";

export type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export type Handler = (req: Request, res: Response, next: NextFunction) => any;

export type AuthorizationSource = 
    | `query:${string}` 
    | `headers:${string}`;

export interface SprintRequest {
    getAuthorization: (sources?: AuthorizationSource | AuthorizationSource[]) => string | undefined;
}

export type SprintResponse = Response;

declare global {
    namespace Express {
        interface Request {
            sprint: SprintRequest;
            /* Customized item where you can store anything you need during the request. */
            custom: any;
        }
    }
}

/**
 * Configuration for a middleware defined in the middlewares folder.
 * Export this from your middleware file using `defineMiddleware()`.
 */
export interface MiddlewareConfig {
    /** The middleware function(s) to execute. Supports both sync and async handlers. */
    handler: RequestHandler | AsyncRequestHandler | (RequestHandler | AsyncRequestHandler)[];
    /**
     * Routes to include. Supports patterns:
     * - Exact: "/api/users"
     * - Single level: "/api/*" (matches /apiapi/users/123)
     * -/users but not / All nested: "/api/**" (matches /api/users, /api/users/123, etc.)
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
    /** Path to cronjobs folder. Default: "./cronjobs" */
    cronjobsPath?: string;
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
    /** Auto-start the server. Default: true */
    autoListen?: boolean;

    openapi?: {
        enabled?: boolean;
        generateOnBuild?: boolean;
        swaggerUi?: {
            enabled?: boolean;
        };
    };
}

export interface SprintConfig {
    port?: string | number | null;
    routesPath?: string;
    middlewaresPath?: string;
    cronjobsPath?: string;
    jsonLimit?: string;
    urlEncodedLimit?: string;
    prefix?: string;
    autoListen?: boolean;
    openapi?: {
        enabled?: boolean;
        generateOnBuild?: boolean;
        swaggerUi?: {
            enabled?: boolean;
        };
    };
}

export type { NextFunction } from "express";