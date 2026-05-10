import { AsyncLocalStorage } from "async_hooks";
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

export interface RequestContext {
    requestId: string;
    traceId?: string;
    spanId?: string;
    traceparent?: string;
    tracestate?: string;
    startTime: number;
    user?: { id?: string;[key: string]: any; };
    [key: string]: any;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function getContext(): RequestContext | undefined {
    return storage.getStore();
};

export function getRequestId(): string | undefined {
    return storage.getStore()?.requestId;
};

export function getTraceId(): string | undefined {
    return storage.getStore()?.traceId;
};

export function setContextValue<K extends string>(key: K, value: any): void {
    const ctx = storage.getStore();
    if (ctx) ctx[key] = value;
};

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
    return storage.run(ctx, fn);
};

function parseTraceparent(value: string): { traceId: string; spanId: string } | null {
    // version "-" trace-id "-" parent-id "-" trace-flags
    const parts = value.trim().split("-");
    if (parts.length !== 4) return null;
    const [version, traceId, spanId] = parts;
    if (version !== "00") return null;
    if (!/^[0-9a-f]{32}$/i.test(traceId) || /^0+$/.test(traceId)) return null;
    if (!/^[0-9a-f]{16}$/i.test(spanId) || /^0+$/.test(spanId)) return null;
    return { traceId, spanId };
};

function generateTraceId(): string {
    return crypto.randomBytes(16).toString("hex");
};

function generateSpanId(): string {
    return crypto.randomBytes(8).toString("hex");
};

export interface ContextMiddlewareOptions {
    /** Header name for request ID. Default: "x-request-id" */
    requestIdHeader?: string;
    /** Generate request ID. Default: crypto.randomUUID */
    generateRequestId?: () => string;
    /** Trust incoming X-Request-ID header. Default: true */
    trustIncomingRequestId?: boolean;
}

export function createContextMiddleware(options: ContextMiddlewareOptions = {}) {
    const headerName = (options.requestIdHeader ?? "x-request-id").toLowerCase();
    const generate = options.generateRequestId ?? (() => crypto.randomUUID());
    const trust = options.trustIncomingRequestId ?? true;

    return (req: Request, res: Response, next: NextFunction): void => {
        const incoming = trust ? (req.headers[headerName] as string | undefined) : undefined;
        const requestId = incoming && incoming.length > 0 && incoming.length <= 200 ? incoming : generate();

        const traceparentHeader = req.headers["traceparent"] as string | undefined;
        const tracestateHeader = req.headers["tracestate"] as string | undefined;

        let traceId: string;
        let spanId: string;
        let traceparent: string;
        const parsed = traceparentHeader ? parseTraceparent(traceparentHeader) : null;

        if (parsed) {
            traceId = parsed.traceId;
            spanId = generateSpanId();
            traceparent = `00-${traceId}-${spanId}-01`;
        } else {
            traceId = generateTraceId();
            spanId = generateSpanId();
            traceparent = `00-${traceId}-${spanId}-01`;
        }

        const ctx: RequestContext = {
            requestId,
            traceId,
            spanId,
            traceparent,
            tracestate: tracestateHeader,
            startTime: Date.now()
        };

        (req as any).id = requestId;
        (req as any).requestId = requestId;
        (req as any).context = ctx;

        res.setHeader("X-Request-ID", requestId);
        res.setHeader("traceparent", traceparent);
        if (tracestateHeader) res.setHeader("tracestate", tracestateHeader);

        storage.run(ctx, () => next());
    };
};