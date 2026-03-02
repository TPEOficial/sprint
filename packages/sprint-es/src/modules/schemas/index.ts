import { RequestHandler } from "express";
import { z, ZodSchema as ZodSchemaType, ZodTypeDef, ZodIssue } from "zod";

export { z };

export interface RouteSchemaOptions {
    body?: ZodSchemaType<any, ZodTypeDef, any>;
    queryParams?: ZodSchemaType<any, ZodTypeDef, any>;
    params?: ZodSchemaType<any, ZodTypeDef, any>;
}

interface ZodErrorItem {
    path: string;
    message: string;
}

function parseSchema(schema: ZodSchemaType<any, ZodTypeDef, any>, data: any): { success: true; data: any } | { success: false; errors: ZodErrorItem[] } {
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
}

export function defineRouteSchema<T extends RouteSchemaOptions>(schema: T): RequestHandler {
    return (req, res, next) => {
        const errors: Array<{ location: string; path: string; message: string }> = [];

        if (schema.body && req.body) {
            const result = parseSchema(schema.body, req.body);
            if (!result.success) {
                errors.push(...result.errors.map((e: ZodErrorItem) => ({ location: "body", ...e })));
            }
        }

        if (schema.queryParams && req.query) {
            const result = parseSchema(schema.queryParams, req.query);
            if (!result.success) {
                errors.push(...result.errors.map((e: ZodErrorItem) => ({ location: "queryParams", ...e })));
            }
        }

        if (schema.params && req.params) {
            const result = parseSchema(schema.params, req.params);
            if (!result.success) {
                errors.push(...result.errors.map((e: ZodErrorItem) => ({ location: "params", ...e })));
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ error: "Validation failed", details: errors });
        }

        next();
    };
}

export type { ZodSchema, ZodMiddlewareOptions } from "./types";
