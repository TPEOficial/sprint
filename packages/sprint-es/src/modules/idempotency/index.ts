import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { CacheAdapter } from "../cache";

export interface IdempotencyOptions {
    /** Cache adapter to store responses. */
    cache: CacheAdapter;
    /** Header name carrying the idempotency key. Default: "idempotency-key" */
    header?: string;
    /** TTL in ms. Default: 86_400_000 (24h) */
    ttlMs?: number;
    /** Methods that require idempotency. Default: ["POST", "PUT", "PATCH"] */
    methods?: string[];
    /** Key namespace prefix. Default: "idempotency:" */
    prefix?: string;
    /** Require key on all matched methods (reject without it with 400). Default: false */
    requireKey?: boolean;
}

interface StoredResponse {
    status: number;
    headers: Record<string, string | number | string[]>;
    body: any;
}

/**
 * Idempotency middleware: replays cached response when the same key is seen again.
 * Useful for safe retries on POST/PUT/PATCH (payments, signups).
 */
export function createIdempotencyMiddleware(options: IdempotencyOptions): RequestHandler {
    const header = (options.header ?? "idempotency-key").toLowerCase();
    const ttlMs = options.ttlMs ?? 86_400_000;
    const methods = options.methods ?? ["POST", "PUT", "PATCH"];
    const prefix = options.prefix ?? "idempotency:";
    const requireKey = options.requireKey ?? false;

    return (req: Request, res: Response, next: NextFunction): void => {
        if (!methods.includes(req.method)) return next();

        const key = req.headers[header] as string | undefined;
        if (!key) {
            if (requireKey) {
                res.status(400).json({ error: { code: "IDEMPOTENCY_KEY_REQUIRED", message: `Missing ${header} header`, status: 400 } });
                return;
            }
            return next();
        }

        const storeKey = `${prefix}${req.method}:${req.originalUrl}:${key}`;

        Promise.resolve(options.cache.get<StoredResponse>(storeKey)).then(async (cached) => {
            if (cached) {
                for (const [k, v] of Object.entries(cached.headers)) res.setHeader(k, v as any);
                res.setHeader("Idempotency-Replay", "true");
                res.status(cached.status).json(cached.body);
                return;
            }

            const originalJson = res.json.bind(res);
            const originalStatus = res.status.bind(res);
            let statusCode = 200;
            res.status = (code: number) => { statusCode = code; return originalStatus(code); };
            res.json = (body: any) => {
                if (statusCode < 500) {
                    const headers: Record<string, any> = {};
                    for (const name of res.getHeaderNames()) {
                        if (name.toLowerCase() === "set-cookie") continue;
                        headers[name] = res.getHeader(name);
                    }
                    options.cache.set(storeKey, { status: statusCode, headers, body }, ttlMs).catch(() => {});
                }
                return originalJson(body);
            };

            next();
        }).catch(next);
    };
};