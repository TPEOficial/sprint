import { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodSchema } from "./modules/schemas/types";

export type AsyncRequestHandler = (req: SprintRequest, res: SprintResponse, next: NextFunction) => Promise<any>;
export type Handler = (req: SprintRequest, res: SprintResponse, next: NextFunction) => any;

export type AuthorizationSource = 
    | `query:${string}` 
    | `headers:${string}`;

export type SprintRequest = Request & {
    sprint: {
        getAuthorization: (sources?: AuthorizationSource | AuthorizationSource[]) => string | undefined;
        authorization?: string;
    };
    custom: any;
}

export type SprintResponse = Response;

declare global {
    namespace Express {
        interface Request {
            sprint: {
                getAuthorization: (sources?: AuthorizationSource | AuthorizationSource[]) => string | undefined;
                authorization?: string;
            };
            custom: any;
        }
    }
}

export interface MiddlewareSchema {
    body?: ZodSchema;
    queryParams?: ZodSchema;
    params?: ZodSchema;
    headers?: ZodSchema;
    sprint?: {
        authorization?: ZodSchema;
    };
}

/**
 * Configuration for a middleware defined in the middlewares folder.
 * Export this from your middleware file using `defineMiddleware()`.
 */
export interface MiddlewareConfig<TSchema extends MiddlewareSchema = MiddlewareSchema> {
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
    /**
     * Schema for request validation and OpenAPI generation.
     * Supports body, queryParams, params, headers, and sprint.authorization.
     */
    schema?: TSchema;
}

export interface LoadedMiddleware<TSchema extends MiddlewareSchema = MiddlewareSchema>
    extends MiddlewareConfig<TSchema> {
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
        enabled?: boolean | string[];
        generateOnBuild?: boolean | string[];
        path?: string;
        swaggerUi?: {
            enabled?: boolean | string[];
            path?: string;
        };
    };

    graphql?: {
        enabled?: boolean | string[];
        path?: string;
        graphiql?: {
            enabled?: boolean | string[];
            path?: string;
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
        enabled?: boolean | string[];
        generateOnBuild?: boolean | string[];
        path?: string;
        swaggerUi?: {
            enabled?: boolean | string[];
            path?: string;
        };
    };
    graphql?: {
        enabled?: boolean | string[];
        path?: string;
        graphiql?: {
            enabled?: boolean | string[];
            path?: string;
        };
    };
}

export type { NextFunction } from "express";