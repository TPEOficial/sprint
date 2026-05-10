import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { createIdempotencyMiddleware } from "../src/modules/idempotency";
import { MemoryCache } from "../src/modules/cache";

const mockRes = () => {
    const headers: Record<string, any> = {};
    let statusCode = 200;
    let _body: any;
    return {
        get statusCode() { return statusCode; },
        set statusCode(v: number) { statusCode = v; },
        status(s: number) { statusCode = s; return this; },
        setHeader(k: string, v: any) { headers[k] = v; },
        getHeader(k: string) { return headers[k]; },
        getHeaderNames() { return Object.keys(headers); },
        getHeaders() { return headers; },
        json(b: any) { _body = b; return this; },
        get _body() { return _body; }
    };
};

describe("idempotency", () => {
    let cache: MemoryCache;
    afterEach(() => cache?.close());

    it("skips when no key header present", async () => {
        cache = new MemoryCache({ sweepIntervalMs: 0 });
        const mw = createIdempotencyMiddleware({ cache });
        const next = jest.fn();
        await new Promise<void>((resolve) => {
            mw({ method: "POST", headers: {}, originalUrl: "/x" } as any, mockRes() as any, ((err?: any) => {
                next(err);
                resolve();
            }) as any);
        });
        expect(next).toHaveBeenCalledWith(undefined);
    });

    it("rejects when requireKey=true and key missing", async () => {
        cache = new MemoryCache({ sweepIntervalMs: 0 });
        const mw = createIdempotencyMiddleware({ cache, requireKey: true });
        const res = mockRes();
        const next = jest.fn();
        mw({ method: "POST", headers: {}, originalUrl: "/x" } as any, res as any, next as any);
        await new Promise(r => setImmediate(r));
        expect(res.statusCode).toBe(400);
        expect(res._body.error.code).toBe("IDEMPOTENCY_KEY_REQUIRED");
        expect(next).not.toHaveBeenCalled();
    });

    it("caches response and replays on duplicate key", async () => {
        cache = new MemoryCache({ sweepIntervalMs: 0 });
        const mw = createIdempotencyMiddleware({ cache });

        // First request
        const res1 = mockRes();
        const next1 = jest.fn(() => {
            res1.status(201).json({ id: 1, name: "ada" });
        });
        mw({ method: "POST", headers: { "idempotency-key": "k-1" }, originalUrl: "/users" } as any, res1 as any, next1 as any);
        await new Promise(r => setTimeout(r, 20));
        expect(res1._body).toEqual({ id: 1, name: "ada" });
        expect(res1.statusCode).toBe(201);

        // Second request with same key — should replay from cache
        const res2 = mockRes();
        const next2 = jest.fn();
        mw({ method: "POST", headers: { "idempotency-key": "k-1" }, originalUrl: "/users" } as any, res2 as any, next2 as any);
        await new Promise(r => setTimeout(r, 20));
        expect(res2._body).toEqual({ id: 1, name: "ada" });
        expect(res2.statusCode).toBe(201);
        expect(res2.getHeader("Idempotency-Replay")).toBe("true");
        expect(next2).not.toHaveBeenCalled();
    });

    it("does not cache 5xx responses", async () => {
        cache = new MemoryCache({ sweepIntervalMs: 0 });
        const mw = createIdempotencyMiddleware({ cache });

        const res1 = mockRes();
        mw({ method: "POST", headers: { "idempotency-key": "fail" }, originalUrl: "/x" } as any, res1 as any, (() => {
            res1.status(500).json({ error: "boom" });
        }) as any);
        await new Promise(r => setTimeout(r, 20));

        // Second attempt should NOT be replayed
        const res2 = mockRes();
        const next2 = jest.fn();
        mw({ method: "POST", headers: { "idempotency-key": "fail" }, originalUrl: "/x" } as any, res2 as any, next2 as any);
        await new Promise(r => setTimeout(r, 20));
        expect(next2).toHaveBeenCalled();
    });

    it("only applies to configured methods", async () => {
        cache = new MemoryCache({ sweepIntervalMs: 0 });
        const mw = createIdempotencyMiddleware({ cache, methods: ["POST"] });
        const next = jest.fn();
        mw({ method: "GET", headers: { "idempotency-key": "x" }, originalUrl: "/x" } as any, mockRes() as any, next as any);
        expect(next).toHaveBeenCalled();
    });

    it("scopes key by method+URL", async () => {
        cache = new MemoryCache({ sweepIntervalMs: 0 });
        const mw = createIdempotencyMiddleware({ cache });

        const res1 = mockRes();
        mw({ method: "POST", headers: { "idempotency-key": "k" }, originalUrl: "/a" } as any, res1 as any, (() => {
            res1.status(200).json({ on: "a" });
        }) as any);
        await new Promise(r => setTimeout(r, 20));

        // Same key, different URL → should NOT replay
        const res2 = mockRes();
        const next2 = jest.fn();
        mw({ method: "POST", headers: { "idempotency-key": "k" }, originalUrl: "/b" } as any, res2 as any, next2 as any);
        await new Promise(r => setTimeout(r, 20));
        expect(next2).toHaveBeenCalled();
    });
});
