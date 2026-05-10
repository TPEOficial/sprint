import { describe, expect, it, jest } from "@jest/globals";
import { createHttpClient, HttpError } from "../src/modules/http-client";

const mockResponse = (status: number, body: any = {}, statusText = ""): Response => ({
    status,
    statusText,
    ok: status >= 200 && status < 300,
    headers: new Headers(),
    json: async () => body,
    text: async () => JSON.stringify(body),
    arrayBuffer: async () => new ArrayBuffer(0)
} as any);

describe("HttpClient", () => {
    it("performs simple GET and parses JSON", async () => {
        const fetchFn: any = jest.fn(async () => mockResponse(200, { hello: "world" }));
        const client = createHttpClient({ fetch: fetchFn });
        const res = await client.get<{ hello: string }>("https://api.example.com/x");
        expect(res.ok).toBe(true);
        expect(await res.json()).toEqual({ hello: "world" });
    });

    it("prepends baseUrl", async () => {
        const fetchFn: any = jest.fn(async () => mockResponse(200));
        const client = createHttpClient({ baseUrl: "https://api.example.com", fetch: fetchFn as any });
        await client.get("/users");
        expect(fetchFn.mock.calls[0][0]).toBe("https://api.example.com/users");
    });

    it("auto-serializes json body and sets Content-Type", async () => {
        const fetchFn: any = jest.fn(async () => mockResponse(201));
        const client = createHttpClient({ fetch: fetchFn });
        await client.post("https://x.com/y", { json: { a: 1 } });
        const init = fetchFn.mock.calls[0][1] as RequestInit;
        expect(init.body).toBe('{"a":1}');
        expect((init.headers as any)["Content-Type"]).toBe("application/json");
    });

    it("throws HttpError on non-2xx without retry", async () => {
        const fetchFn: any = jest.fn(async () => mockResponse(404, { error: "nf" }, "Not Found"));
        const client = createHttpClient({ fetch: fetchFn });
        await expect(client.get("https://x/y")).rejects.toBeInstanceOf(HttpError);
    });

    it("retries on 5xx then succeeds", async () => {
        let n = 0;
        const fetchFn: any = jest.fn(async () => {
            n++;
            return n < 3 ? mockResponse(503) : mockResponse(200, { ok: true });
        });
        const client = createHttpClient({ retries: 3, backoff: { type: "fixed", delay: 5 }, fetch: fetchFn });
        const res = await client.get("https://x/y");
        expect(res.status).toBe(200);
        expect(fetchFn).toHaveBeenCalledTimes(3);
    });

    it("does not retry on 4xx (non-retryable)", async () => {
        const fetchFn: any = jest.fn(async () => mockResponse(404));
        const client = createHttpClient({ retries: 3, backoff: { type: "fixed", delay: 1 }, fetch: fetchFn as any });
        await expect(client.get("https://x/y")).rejects.toBeInstanceOf(HttpError);
        expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it("circuit breaker opens after threshold and rejects fast", async () => {
        const fetchFn: any = jest.fn(async () => mockResponse(500));
        const client = createHttpClient({
            retries: 0,
            circuit: { failureThreshold: 2, resetTimeoutMs: 10_000 },
            fetch: fetchFn as any
        });
        await expect(client.get("https://x/y")).rejects.toThrow();
        await expect(client.get("https://x/y")).rejects.toThrow();
        // Now circuit open; next call should fast-fail without invoking fetch
        const before = fetchFn.mock.calls.length;
        await expect(client.get("https://x/y")).rejects.toThrow();
        expect(fetchFn.mock.calls.length).toBe(before);
        expect(client.circuit?.getState()).toBe("open");
    });

    it("times out long requests", async () => {
        const fetchFn: any = jest.fn((_url: string, init?: RequestInit) => new Promise((_, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }));
        const client = createHttpClient({ timeoutMs: 30, retries: 0, fetch: fetchFn });
        await expect(client.get("https://x/y")).rejects.toThrow();
    });
});
