import type { Application, RequestHandler, Request, Response, NextFunction } from "express";

/**
 * Sprint's tRPC adapter. The user must install `@trpc/server` themselves
 * and import primitives (`initTRPC`, `TRPCError`, etc.) from `@trpc/server` directly.
 * This module exposes only the Sprint-specific glue (`attachTrpc`).
 */
export interface AttachTrpcOptions {
    /** Express app (or Router) to mount onto. */
    app: Application | any;
    /** Mount path. Default: "/trpc" */
    path?: string;
    /** tRPC router (peer dep "@trpc/server"). */
    router: any;
    /** createContext function. Default: () => ({}). */
    createContext?: (opts: { req: Request; res: Response; }) => any | Promise<any>;
    /** Pre-built createExpressMiddleware function. If omitted, dynamic-imports it from @trpc/server. */
    createExpressMiddleware?: (opts: any) => RequestHandler;
    /** onError handler. */
    onError?: (opts: { error: any; type: string; path?: string; input?: unknown; ctx?: any; req: Request; }) => void;
}

export async function attachTrpc(options: AttachTrpcOptions): Promise<{ path: string; }> {
    const path = options.path ?? "/trpc";

    let middlewareFactory = options.createExpressMiddleware;
    if (!middlewareFactory) {
        try {
            // @ts-ignore - peer dep
            const mod = await import("@trpc/server/adapters/express");
            middlewareFactory = mod.createExpressMiddleware;
        } catch {
            throw new Error("attachTrpc: '@trpc/server' peer dependency not installed. Run 'npm install @trpc/server'.");
        }
    }

    const middleware = middlewareFactory!({
        router: options.router,
        createContext: options.createContext ?? (() => ({})),
        onError: options.onError
    });

    options.app.use(path, middleware);
    return { path };
};