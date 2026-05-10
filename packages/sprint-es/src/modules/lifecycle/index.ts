import type { Server } from "http";

export type ResourceState = "starting" | "ready" | "draining" | "closed" | "failed";

export interface ResourceHooks {
    init?: () => Promise<void> | void;
    close?: () => Promise<void> | void;
    /** Optional readiness probe. Return true when ready to serve traffic. */
    ready?: () => Promise<boolean> | boolean;
}

export interface RegisteredResource extends ResourceHooks {
    name: string;
    state: ResourceState;
    error?: Error;
}

export interface ShutdownOptions {
    /** Time to wait for in-flight requests before forced exit. Default: 30000 ms */
    timeoutMs?: number;
    /** Signals to listen on. Default: ["SIGTERM", "SIGINT"] */
    signals?: NodeJS.Signals[];
    /** Exit code on graceful shutdown. Default: 0 */
    exitCode?: number;
    /** Logger. Default: console */
    logger?: { info: (msg: string) => void; warn: (msg: string) => void; error: (msg: string) => void };
}

const resources = new Map<string, RegisteredResource>();
const shutdownHooks: Array<() => Promise<void> | void> = [];
let shuttingDown = false;
let signalsBound = false;

export function registerResource(name: string, hooks: ResourceHooks): RegisteredResource {
    if (resources.has(name)) throw new Error(`Resource "${name}" already registered`);
    const r: RegisteredResource = { name, state: "starting", ...hooks };
    resources.set(name, r);
    return r;
};

export function getResource(name: string): RegisteredResource | undefined {
    return resources.get(name);
};

export function listResources(): RegisteredResource[] {
    return Array.from(resources.values());
};

export function unregisterResource(name: string): void {
    resources.delete(name);
};

export async function initResources(): Promise<void> {
    for (const r of resources.values()) {
        if (!r.init) { r.state = "ready"; continue; }
        try {
            await r.init();
            r.state = "ready";
        } catch (err) {
            r.state = "failed";
            r.error = err as Error;
            throw err;
        }
    }
};

export async function checkReadiness(): Promise<{ ready: boolean; resources: Array<{ name: string; state: ResourceState; ready: boolean; }> }> {
    const results: Array<{ name: string; state: ResourceState; ready: boolean }> = [];
    let allReady = !shuttingDown;
    for (const r of resources.values()) {
        let ready = r.state === "ready";
        if (ready && r.ready) {
            try { ready = !!(await r.ready()); }
            catch { ready = false; }
        }
        if (!ready) allReady = false;
        results.push({ name: r.name, state: r.state, ready });
    }
    return { ready: allReady, resources: results };
};

export function onShutdown(fn: () => Promise<void> | void): void {
    shutdownHooks.push(fn);
};

export function isShuttingDown(): boolean {
    return shuttingDown;
};

export async function shutdown(server: Server | undefined, options: ShutdownOptions = {}): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;

    const log = options.logger ?? console;
    const timeoutMs = options.timeoutMs ?? 30_000;

    for (const r of resources.values()) r.state = "draining";

    log.info("[Sprint] Graceful shutdown started");

    const forced = setTimeout(() => {
        log.error(`[Sprint] Shutdown timeout (${timeoutMs}ms) — forcing exit`);
        process.exit(1);
    }, timeoutMs);
    forced.unref?.();

    try {
        if (server) {
            await new Promise<void>((resolve) => {
                server.close(() => resolve());
                // Stop accepting new connections, drain keep-alive
                (server as any).closeIdleConnections?.();
                setTimeout(() => (server as any).closeAllConnections?.(), Math.min(timeoutMs / 2, 10_000)).unref?.();
            });
            log.info("[Sprint] HTTP server closed");
        }

        for (const fn of shutdownHooks.reverse()) {
            try { await fn(); }
            catch (err) { log.warn(`[Sprint] Shutdown hook error: ${(err as Error).message}`); }
        }

        for (const r of Array.from(resources.values()).reverse()) {
            if (!r.close) { r.state = "closed"; continue; }
            try {
                await r.close();
                r.state = "closed";
                log.info(`[Sprint] Closed resource: ${r.name}`);
            } catch (err) {
                r.state = "failed";
                r.error = err as Error;
                log.warn(`[Sprint] Failed to close resource ${r.name}: ${(err as Error).message}`);
            }
        }

        clearTimeout(forced);
        log.info("[Sprint] Graceful shutdown complete");
    } catch (err) {
        clearTimeout(forced);
        log.error(`[Sprint] Shutdown error: ${(err as Error).message}`);
        throw err;
    }
};

export function bindShutdownSignals(server: Server | undefined, options: ShutdownOptions = {}): void {
    if (signalsBound) return;
    signalsBound = true;

    const signals = options.signals ?? (["SIGTERM", "SIGINT"] as NodeJS.Signals[]);
    const exitCode = options.exitCode ?? 0;

    for (const sig of signals) {
        process.on(sig, async () => {
            try {
                await shutdown(server, options);
                process.exit(exitCode);
            } catch {
                process.exit(1);
            }
        });
    }

    process.on("uncaughtException", (err) => {
        (options.logger ?? console).error(`[Sprint] Uncaught exception: ${err.stack || err.message}`);
    });

    process.on("unhandledRejection", (reason) => {
        (options.logger ?? console).error(`[Sprint] Unhandled rejection: ${reason instanceof Error ? reason.stack : String(reason)}`);
    });
};

/** Test helper: reset internal state. Do not use in production code. */
export function __resetLifecycle(): void {
    resources.clear();
    shutdownHooks.length = 0;
    shuttingDown = false;
    signalsBound = false;
};