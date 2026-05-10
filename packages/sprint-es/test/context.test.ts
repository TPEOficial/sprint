import { describe, expect, it, jest } from "@jest/globals";
import { createContextMiddleware, getContext, getRequestId, getTraceId } from "../src/modules/context";

const mockRes = () => {
    const headers: Record<string, string> = {};
    return {
        setHeader: (k: string, v: string) => { headers[k] = v; },
        getHeaders: () => headers
    };
};

describe("context", () => {
    it("generates a request ID when none provided", async () => {
        const mw = createContextMiddleware();
        const req: any = { headers: {} };
        const res = mockRes();
        await new Promise<void>((resolve) => {
            mw(req as any, res as any, () => {
                expect(req.id).toBeTruthy();
                expect(req.id).toMatch(/^[0-9a-f-]{36}$/);
                expect(getRequestId()).toBe(req.id);
                resolve();
            });
        });
    });

    it("trusts incoming X-Request-ID by default", async () => {
        const mw = createContextMiddleware();
        const req: any = { headers: { "x-request-id": "abc-123" } };
        const res = mockRes();
        await new Promise<void>((resolve) => {
            mw(req as any, res as any, () => {
                expect(req.id).toBe("abc-123");
                resolve();
            });
        });
    });

    it("ignores incoming X-Request-ID when trustIncomingRequestId=false", async () => {
        const mw = createContextMiddleware({ trustIncomingRequestId: false });
        const req: any = { headers: { "x-request-id": "spoofed" } };
        const res = mockRes();
        await new Promise<void>((resolve) => {
            mw(req as any, res as any, () => {
                expect(req.id).not.toBe("spoofed");
                resolve();
            });
        });
    });

    it("propagates traceparent and generates new spanId", async () => {
        const mw = createContextMiddleware();
        const incomingTrace = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01";
        const req: any = { headers: { traceparent: incomingTrace } };
        const res = mockRes();
        await new Promise<void>((resolve) => {
            mw(req as any, res as any, () => {
                const ctx = getContext()!;
                expect(ctx.traceId).toBe("0af7651916cd43dd8448eb211c80319c");
                expect(ctx.spanId).not.toBe("b7ad6b7169203331");
                expect(ctx.traceparent).toMatch(/^00-0af7651916cd43dd8448eb211c80319c-[0-9a-f]{16}-01$/);
                resolve();
            });
        });
    });

    it("generates new traceId when traceparent is invalid", async () => {
        const mw = createContextMiddleware();
        const req: any = { headers: { traceparent: "garbage" } };
        const res = mockRes();
        await new Promise<void>((resolve) => {
            mw(req as any, res as any, () => {
                expect(getTraceId()).toMatch(/^[0-9a-f]{32}$/);
                resolve();
            });
        });
    });

    it("sets response headers", async () => {
        const mw = createContextMiddleware();
        const req: any = { headers: {} };
        const res = mockRes();
        await new Promise<void>((resolve) => {
            mw(req as any, res as any, () => {
                expect(res.getHeaders()["X-Request-ID"]).toBeTruthy();
                expect(res.getHeaders()["traceparent"]).toMatch(/^00-/);
                resolve();
            });
        });
    });
});
