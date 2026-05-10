import { describe, expect, it } from "@jest/globals";
import { EventEmitter } from "events";
import { createSSEStream } from "../src/modules/sse";

class MockReq extends EventEmitter {
    aborted = false;
}

class MockRes extends EventEmitter {
    statusCode = 200;
    headers: Record<string, string | number> = {};
    chunks: string[] = [];
    ended = false;
    flushed = false;
    setHeader(k: string, v: string | number) { this.headers[k] = v; }
    getHeader(k: string) { return this.headers[k]; }
    flushHeaders() { this.flushed = true; }
    write(chunk: string) { this.chunks.push(chunk); return true; }
    end() { this.ended = true; this.emit("close"); }
}

describe("SSE", () => {
    it("sets correct headers and flushes", () => {
        const req = new MockReq();
        const res = new MockRes();
        createSSEStream(req as any, res as any, { heartbeatMs: 0 });
        expect(res.headers["Content-Type"]).toBe("text/event-stream");
        expect(res.headers["Cache-Control"]).toContain("no-cache");
        expect(res.headers["Connection"]).toBe("keep-alive");
        expect(res.headers["X-Accel-Buffering"]).toBe("no");
        expect(res.flushed).toBe(true);
    });

    it("formats data-only event", () => {
        const req = new MockReq();
        const res = new MockRes();
        const s = createSSEStream(req as any, res as any, { heartbeatMs: 0 });
        s.send("hello");
        expect(res.chunks.pop()).toBe("data: hello\n\n");
    });

    it("formats event with name + id + JSON data", () => {
        const req = new MockReq();
        const res = new MockRes();
        const s = createSSEStream(req as any, res as any, { heartbeatMs: 0 });
        s.send({ event: "tick", id: "42", data: { n: 1 } });
        const chunk = res.chunks.pop()!;
        expect(chunk).toContain("event: tick");
        expect(chunk).toContain("id: 42");
        expect(chunk).toContain('data: {"n":1}');
    });

    it("multi-line data emits multiple data: lines", () => {
        const req = new MockReq();
        const res = new MockRes();
        const s = createSSEStream(req as any, res as any, { heartbeatMs: 0 });
        s.send({ data: "line1\nline2" });
        const chunk = res.chunks.pop()!;
        expect(chunk).toBe("data: line1\ndata: line2\n\n");
    });

    it("comment writes colon-prefixed line", () => {
        const req = new MockReq();
        const res = new MockRes();
        const s = createSSEStream(req as any, res as any, { heartbeatMs: 0 });
        s.comment("ping");
        expect(res.chunks.pop()).toBe(":ping\n\n");
    });

    it("close ends response and resolves done", async () => {
        const req = new MockReq();
        const res = new MockRes();
        const s = createSSEStream(req as any, res as any, { heartbeatMs: 0 });
        expect(s.closed).toBe(false);
        s.close();
        await s.done;
        expect(s.closed).toBe(true);
        expect(res.ended).toBe(true);
    });

    it("client disconnect closes stream", async () => {
        const req = new MockReq();
        const res = new MockRes();
        const s = createSSEStream(req as any, res as any, { heartbeatMs: 0 });
        req.emit("close");
        await s.done;
        expect(s.closed).toBe(true);
    });

    it("send after close is a no-op", () => {
        const req = new MockReq();
        const res = new MockRes();
        const s = createSSEStream(req as any, res as any, { heartbeatMs: 0 });
        s.close();
        const before = res.chunks.length;
        s.send("ignored");
        expect(res.chunks.length).toBe(before);
    });

    it("retry option emits retry: line", () => {
        const req = new MockReq();
        const res = new MockRes();
        createSSEStream(req as any, res as any, { heartbeatMs: 0, retry: 5000 });
        expect(res.chunks[0]).toBe("retry: 5000\n\n");
    });
});
