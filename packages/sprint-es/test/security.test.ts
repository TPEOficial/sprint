import { describe, expect, it } from "@jest/globals";
import { createSecurityHeadersMiddleware, createCorsMiddleware } from "../src/modules/security";

const mockRes = () => {
    const headers: Record<string, string | number> = {};
    let statusCode = 200;
    let ended = false;
    return {
        setHeader(k: string, v: string | number) { headers[k] = v; },
        getHeader(k: string) { return headers[k]; },
        getHeaders() { return headers; },
        get statusCode() { return statusCode; },
        set statusCode(v: number) { statusCode = v; },
        end() { ended = true; },
        get ended() { return ended; },
        on() {}
    };
};

describe("security headers", () => {
    it("sets HSTS, frame, content-type, COOP, CORP by default", (done) => {
        const mw = createSecurityHeadersMiddleware();
        const res = mockRes();
        mw({} as any, res as any, () => {
            const h = res.getHeaders();
            expect(h["Strict-Transport-Security"]).toContain("max-age=15552000");
            expect(h["Strict-Transport-Security"]).toContain("includeSubDomains");
            expect(h["X-Frame-Options"]).toBe("DENY");
            expect(h["X-Content-Type-Options"]).toBe("nosniff");
            expect(h["Cross-Origin-Opener-Policy"]).toBe("same-origin");
            expect(h["Cross-Origin-Resource-Policy"]).toBe("same-origin");
            expect(h["Referrer-Policy"]).toBe("no-referrer");
            done();
        });
    });

    it("does not set X-XSS-Protection (deprecated)", (done) => {
        const mw = createSecurityHeadersMiddleware();
        const res = mockRes();
        mw({} as any, res as any, () => {
            expect(res.getHeader("X-XSS-Protection")).toBeUndefined();
            done();
        });
    });

    it("disabled options produce no header", (done) => {
        const mw = createSecurityHeadersMiddleware({ hsts: false, frameOptions: false });
        const res = mockRes();
        mw({} as any, res as any, () => {
            expect(res.getHeader("Strict-Transport-Security")).toBeUndefined();
            expect(res.getHeader("X-Frame-Options")).toBeUndefined();
            done();
        });
    });
});

describe("cors", () => {
    it("default = no CORS headers (origin: false)", (done) => {
        const mw = createCorsMiddleware();
        const res = mockRes();
        mw({ method: "GET", headers: { origin: "https://evil.com" } } as any, res as any, () => {
            expect(res.getHeader("Access-Control-Allow-Origin")).toBeUndefined();
            done();
        });
    });

    it("array origin allowlist matches and rejects", (done) => {
        const mw = createCorsMiddleware({ origin: ["https://app.com"] });
        const okRes = mockRes();
        mw({ method: "GET", headers: { origin: "https://app.com" } } as any, okRes as any, () => {
            expect(okRes.getHeader("Access-Control-Allow-Origin")).toBe("https://app.com");
            const denyRes = mockRes();
            mw({ method: "GET", headers: { origin: "https://evil.com" } } as any, denyRes as any, () => {
                expect(denyRes.getHeader("Access-Control-Allow-Origin")).toBeUndefined();
                done();
            });
        });
    });

    it("preflight returns 204 with allow-methods", () => {
        const mw = createCorsMiddleware({ origin: "*", methods: ["GET", "POST"] });
        const res = mockRes();
        mw({ method: "OPTIONS", headers: { origin: "https://x.com" } } as any, res as any, () => {});
        expect(res.statusCode).toBe(204);
        expect(res.ended).toBe(true);
        expect(res.getHeader("Access-Control-Allow-Methods")).toContain("GET");
        expect(res.getHeader("Access-Control-Allow-Methods")).toContain("POST");
    });

    it("wildcard with credentials is rejected (returns null)", (done) => {
        const mw = createCorsMiddleware({ origin: "*", credentials: true });
        const res = mockRes();
        mw({ method: "GET", headers: { origin: "https://x.com" } } as any, res as any, () => {
            expect(res.getHeader("Access-Control-Allow-Origin")).toBeUndefined();
            expect(res.getHeader("Access-Control-Allow-Credentials")).toBeUndefined();
            done();
        });
    });
});
