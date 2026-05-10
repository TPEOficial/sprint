import type { Request, Response, NextFunction } from "express";

export interface HttpErrorOptions {
    code?: string;
    details?: unknown;
    cause?: unknown;
    expose?: boolean;
    headers?: Record<string, string>;
}

export class HttpError extends Error {
    public readonly status: number;
    public readonly code: string;
    public readonly details?: unknown;
    public readonly expose: boolean;
    public readonly headers?: Record<string, string>;

    constructor(status: number, message: string, options: HttpErrorOptions = {}) {
        super(message);
        this.name = "HttpError";
        this.status = status;
        this.code = options.code ?? defaultCodeForStatus(status);
        this.details = options.details;
        this.expose = options.expose ?? status < 500;
        this.headers = options.headers;
        if (options.cause !== undefined) (this as any).cause = options.cause;
    }
}

function defaultCodeForStatus(status: number): string {
    const map: Record<number, string> = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        408: "REQUEST_TIMEOUT",
        409: "CONFLICT",
        410: "GONE",
        411: "LENGTH_REQUIRED",
        412: "PRECONDITION_FAILED",
        413: "PAYLOAD_TOO_LARGE",
        415: "UNSUPPORTED_MEDIA_TYPE",
        422: "UNPROCESSABLE_ENTITY",
        425: "TOO_EARLY",
        428: "PRECONDITION_REQUIRED",
        429: "TOO_MANY_REQUESTS",
        500: "INTERNAL_SERVER_ERROR",
        501: "NOT_IMPLEMENTED",
        502: "BAD_GATEWAY",
        503: "SERVICE_UNAVAILABLE",
        504: "GATEWAY_TIMEOUT"
    };
    return map[status] ?? (status >= 500 ? "INTERNAL_SERVER_ERROR" : "ERROR");
}

export class BadRequestError extends HttpError {
    constructor(message = "Bad request", options?: HttpErrorOptions) { super(400, message, options); this.name = "BadRequestError"; }
}
export class UnauthorizedError extends HttpError {
    constructor(message = "Unauthorized", options?: HttpErrorOptions) { super(401, message, options); this.name = "UnauthorizedError"; }
}
export class ForbiddenError extends HttpError {
    constructor(message = "Forbidden", options?: HttpErrorOptions) { super(403, message, options); this.name = "ForbiddenError"; }
}
export class NotFoundError extends HttpError {
    constructor(message = "Not found", options?: HttpErrorOptions) { super(404, message, options); this.name = "NotFoundError"; }
}
export class ConflictError extends HttpError {
    constructor(message = "Conflict", options?: HttpErrorOptions) { super(409, message, options); this.name = "ConflictError"; }
}
export class UnprocessableEntityError extends HttpError {
    constructor(message = "Unprocessable entity", options?: HttpErrorOptions) { super(422, message, options); this.name = "UnprocessableEntityError"; }
}
export class TooManyRequestsError extends HttpError {
    constructor(message = "Too many requests", options?: HttpErrorOptions) { super(429, message, options); this.name = "TooManyRequestsError"; }
}
export class InternalServerError extends HttpError {
    constructor(message = "Internal server error", options?: HttpErrorOptions) { super(500, message, options); this.name = "InternalServerError"; }
}
export class ServiceUnavailableError extends HttpError {
    constructor(message = "Service unavailable", options?: HttpErrorOptions) { super(503, message, options); this.name = "ServiceUnavailableError"; }
}

export interface ErrorHandlerOptions {
    /** Include stack trace in response when status >= 500. Default: NODE_ENV !== "production" */
    includeStack?: boolean;
    /** Custom hook fired on every error (logging, telemetry). */
    onError?: (err: Error, req: Request) => void;
}

export interface ErrorEnvelope {
    error: {
        code: string;
        message: string;
        status: number;
        requestId?: string;
        details?: unknown;
        stack?: string;
    };
}

export function createErrorHandler(options: ErrorHandlerOptions = {}) {
    const includeStack = options.includeStack ?? process.env.NODE_ENV !== "production";

    return (err: any, req: Request, res: Response, _next: NextFunction): void => {
        const isHttp = err instanceof HttpError;
        const status = isHttp ? err.status : (typeof err?.status === "number" ? err.status : 500);
        const safeMessage = isHttp && err.expose ? err.message : status < 500 ? (err?.message || "Error") : "Internal server error";
        const code = isHttp ? err.code : defaultCodeForStatus(status);
        const requestId = (req as any).id || (req as any).requestId;

        if (isHttp && err.headers) for (const [k, v] of Object.entries(err.headers)) res.setHeader(k, v);

        const envelope: ErrorEnvelope = {
            error: {
                code,
                message: safeMessage,
                status,
                ...(requestId ? { requestId } : {}),
                ...(isHttp && err.details !== undefined ? { details: err.details } : {}),
                ...(includeStack && status >= 500 && err?.stack ? { stack: err.stack } : {})
            }
        };

        try { options.onError?.(err, req); } catch { /* swallow */ }

        if (!res.headersSent) res.status(status).json(envelope);
    };
};

export function asyncHandler<T extends (...args: any[]) => any>(fn: T): T {
    return ((req: any, res: any, next: any) => {
        Promise.resolve()
            .then(() => fn(req, res, next))
            .catch(next);
    }) as T;
};