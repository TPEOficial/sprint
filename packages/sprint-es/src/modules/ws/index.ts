import type { Server, IncomingMessage } from "http";
import { registerResource, onShutdown } from "../lifecycle";

/**
 * Re-export of the `ws` library's `WebSocket` type for ergonomic imports.
 * Falls back to `any` when the peer dep is not installed.
 *
 * @example
 * import type { WebSocket, WebSocketHandler } from "sprint-es/ws";
 */
// @ts-ignore - peer dep, may not be installed
export type { WebSocket } from "ws";

export interface WebSocketHandler<TSocket = any> {
    onConnection: (socket: TSocket, request: IncomingMessage) => void | Promise<void>;
    /** Optional path filter. */
    path?: string;
}

export interface AttachWebSocketOptions {
    /** HTTP server to upgrade. */
    server: Server;
    /** Handlers keyed by path or "*" for any. */
    handlers: Record<string, WebSocketHandler>;
    /** Pre-built ws.WebSocketServer instance (peer dep "ws"). If omitted, one is created. */
    wss?: any;
    /** Heartbeat ping interval ms. Default: 30000. 0 disables. */
    heartbeatMs?: number;
    /** Register on lifecycle for graceful shutdown. Default: true */
    registerLifecycle?: boolean;
}

/**
 * Attach a WebSocket layer to an HTTP server.
 * Requires "ws" peer dependency.
 */
export async function attachWebSocket(options: AttachWebSocketOptions): Promise<{ wss: any; close: () => Promise<void> }> {
    let WebSocketServer: any = null;
    if (options.wss) {
        // user-provided
    } else {
        try {
            // @ts-ignore - peer dep
            WebSocketServer = (await import("ws")).WebSocketServer;
        } catch {
            throw new Error("attachWebSocket: 'ws' peer dependency not installed. Run 'npm install ws'.");
        }
    }

    const wss = options.wss ?? new WebSocketServer({ noServer: true });
    const heartbeatMs = options.heartbeatMs ?? 30_000;

    options.server.on("upgrade", (request, socket, head) => {
        const url = request.url || "/";
        const path = url.split("?")[0];
        const handler = options.handlers[path] || options.handlers["*"];
        if (!handler) {
            socket.destroy();
            return;
        }
        wss.handleUpgrade(request, socket, head, (ws: any) => {
            wss.emit("connection", ws, request, handler);
        });
    });

    wss.on("connection", async (ws: any, request: any, handler: WebSocketHandler) => {
        ws.isAlive = true;
        ws.on("pong", () => { ws.isAlive = true; });
        try { await handler.onConnection(ws, request); }
        catch (err) {
            try { ws.close(1011, (err as Error).message); } catch { /* socket gone */ }
        }
    });

    const heartbeat = heartbeatMs > 0 ? setInterval(() => {
        for (const ws of wss.clients) {
            if (!ws.isAlive) { ws.terminate(); continue; }
            ws.isAlive = false;
            try { ws.ping(); } catch { /* socket gone */ }
        }
    }, heartbeatMs) : null;
    heartbeat?.unref?.();

    const close = async () => {
        if (heartbeat) clearInterval(heartbeat);
        for (const ws of wss.clients) try { ws.close(1001, "Server shutting down"); } catch { /* ignore */ }
        await new Promise<void>((resolve) => wss.close(() => resolve()));
    };

    if (options.registerLifecycle !== false) {
        registerResource("websocket", { close });
        onShutdown(close);
    }

    return { wss, close };
};