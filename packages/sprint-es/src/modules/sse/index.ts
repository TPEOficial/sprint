import type { Request, Response } from "express";

export interface SSEEvent {
    /** Event name. */
    event?: string;
    /** Event ID for client reconnect/Last-Event-ID. */
    id?: string;
    /** Retry hint (ms). */
    retry?: number;
    /** Payload. Auto-JSON-stringified for objects. */
    data: unknown;
}

export interface SSEStream {
    send(event: SSEEvent | unknown): void;
    comment(text: string): void;
    close(): void;
    /** True if client disconnected. */
    readonly closed: boolean;
    /** Resolves when stream closes (client disconnect or .close()). */
    readonly done: Promise<void>;
}

export interface SSEOptions {
    /** Heartbeat interval (ms). Default: 15000. Pass 0 to disable. */
    heartbeatMs?: number;
    /** Initial retry hint sent to client (ms). */
    retry?: number;
    /** Send headers immediately. Default: true. */
    flushHeaders?: boolean;
}

/**
 * Open a Server-Sent Events stream on a response.
 * Returns a writer with send/comment/close.
 */
export function createSSEStream(req: Request, res: Response, options: SSEOptions = {}): SSEStream {
    const heartbeatMs = options.heartbeatMs ?? 15_000;

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (options.flushHeaders !== false && typeof (res as any).flushHeaders === "function") (res as any).flushHeaders();

    let closed = false;
    let resolveDone!: () => void;
    const done = new Promise<void>((r) => { resolveDone = r; });

    const heartbeat = heartbeatMs > 0 ? setInterval(() => {
        if (!closed) res.write(":heartbeat\n\n");
    }, heartbeatMs) : null;
    heartbeat?.unref?.();

    const finish = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        try { res.end(); } catch { /* socket already gone */ }
        resolveDone();
    };

    req.on("close", finish);
    req.on("aborted", finish);
    res.on("close", finish);

    if (options.retry) res.write(`retry: ${options.retry}\n\n`);

    return {
        get closed() { return closed; },
        done,
        send(event) {
            if (closed) return;
            const e = (event && typeof event === "object" && "data" in (event as any)) ? event as SSEEvent : { data: event };
            const lines: string[] = [];
            if (e.event) lines.push(`event: ${e.event}`);
            if (e.id) lines.push(`id: ${e.id}`);
            if (typeof e.retry === "number") lines.push(`retry: ${e.retry}`);
            const payload = typeof e.data === "string" ? e.data : JSON.stringify(e.data);
            for (const line of payload.split(/\r?\n/)) lines.push(`data: ${line}`);
            res.write(lines.join("\n") + "\n\n");
        },
        comment(text) {
            if (closed) return;
            res.write(`:${text}\n\n`);
        },
        close: finish
    };
}
