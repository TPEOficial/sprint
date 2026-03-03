import { RequestHandler } from "express";
import { z, ZodSchema as ZodSchemaType, ZodTypeDef, ZodIssue, ZodString } from "zod";

export type AuthorizationSource = `query:${string}` | `headers:${string}`;

export interface SprintAuthorizationOptions {
    sources?: AuthorizationSource | AuthorizationSource[];
}

function createSprintAuthorizationSchema(options?: SprintAuthorizationOptions): ZodSchemaType<string, ZodTypeDef, string> {
    const defaultSources: AuthorizationSource[] = ["query:token", "headers:authorization"];
    const sources = options?.sources ? (Array.isArray(options.sources) ? options.sources : [options.sources]) : defaultSources;

    return z.string().describe(JSON.stringify({ __sprintAuthorization: true, sources })) as ZodSchemaType<string, ZodTypeDef, string>;
};

const sprintBuilder = {
    authorization: createSprintAuthorizationSchema
};

const sprintAuth = {
    authorization: createSprintAuthorizationSchema
};

type SprintCallable = typeof sprintAuth & (() => typeof sprintAuth);

const sprintCallable: SprintCallable = function () {
    return sprintAuth;
} as SprintCallable;

Object.assign(sprintCallable, sprintAuth);

type ZodWithSprint = typeof z & {
    sprint: SprintCallable;
};

const proxyZ = new Proxy(z, {
    get(target, prop) {
        if (prop === "sprint") return sprintCallable;
        return (target as any)[prop];
    }
}) as ZodWithSprint;

export { proxyZ as z };
export { sprintBuilder as sprint };

export interface RouteSchemaOptions {
    body?: ZodSchemaType<any, ZodTypeDef, any>;
    queryParams?: ZodSchemaType<any, ZodTypeDef, any>;
    params?: ZodSchemaType<any, ZodTypeDef, any>;
    headers?: ZodSchemaType<any, ZodTypeDef, any>;
    sprint?: {
        authorization?: ZodSchemaType<string, ZodTypeDef, string>;
    };
}

interface ZodErrorItem {
    path: string;
    message: string;
}

function parseSchema(schema: ZodSchemaType<any, ZodTypeDef, any>, data: any): { success: true; data: any; } | { success: false; errors: ZodErrorItem[]; } {
    const result = schema.safeParse(data);
    if (!result.success) {
        return {
            success: false,
            errors: result.error.issues.map((issue: ZodIssue): ZodErrorItem => ({
                path: issue.path.join("."),
                message: issue.message
            }))
        };
    }
    return { success: true, data: result.data };
};

export function defineRouteSchema<T extends RouteSchemaOptions>(schema: T): RequestHandler {
    const middleware: RequestHandler = (req, res, next) => {
        const errors: Array<{ location: string; path: string; message: string; }> = [];
        const method = req.method.toUpperCase();
        const noBodyMethods = ["GET", "HEAD", "DELETE"];

        if (schema.body && !noBodyMethods.includes(method)) {
            const result = parseSchema(schema.body, req.body);
            if (!result.success) errors.push(...result.errors.map(e => ({ location: "body", ...e })));
        }

        if (schema.queryParams) {
            const result = parseSchema(schema.queryParams, req.query);
            if (!result.success) errors.push(...result.errors.map(e => ({ location: "queryParams", ...e })));
        }

        if (schema.params) {
            const result = parseSchema(schema.params, req.params);
            if (!result.success) errors.push(...result.errors.map(e => ({ location: "params", ...e })));
        }

        if (schema.headers) {
            const result = parseSchema(schema.headers, req.headers);
            if (!result.success) errors.push(...result.errors.map(e => ({ location: "headers", ...e })));
        }

        if (schema.sprint?.authorization) {
            const authSchema = schema.sprint.authorization;
            const description = authSchema._def?.description;
            let sources: AuthorizationSource[] = ["query:token", "headers:authorization"];
            
            if (description) {
                try {
                    const parsed = JSON.parse(description);
                    if (parsed.__sprintAuthorization && parsed.sources) {
                        sources = Array.isArray(parsed.sources) ? parsed.sources : [parsed.sources];
                    }
                } catch {}
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

    // Attach schema to middleware.
    (middleware as any).__sprintRouteSchema = schema;

    return middleware;
};

export type { ZodSchema, ZodMiddlewareOptions } from "./types";