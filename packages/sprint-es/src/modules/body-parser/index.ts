import express from "express";
import type { RequestHandler } from "express";

export interface BodyParserOptions {
    /** JSON body limit. Default: "1mb" */
    jsonLimit?: string;
    /** URL-encoded body limit. Default: "1mb" */
    urlEncodedLimit?: string;
    /** Strict JSON parsing. Default: true */
    strict?: boolean;
    /** Allow only specific content types. */
    type?: string | string[];
}

/**
 * Create a body-parser middleware pair (json + urlencoded) with custom limits.
 * Use to override the default global body size for specific routes.
 *
 * @example
 * router.post("/upload-text", ...createBodyLimit({ jsonLimit: "10mb" }), handler);
 */
export function createBodyLimit(options: BodyParserOptions = {}): RequestHandler[] {
    return [
        express.json({
            limit: options.jsonLimit ?? "1mb",
            strict: options.strict ?? true,
            type: options.type
        }),
        express.urlencoded({
            limit: options.urlEncodedLimit ?? "1mb",
            extended: false
        })
    ];
};