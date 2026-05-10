import { describe, expect, it, jest } from "@jest/globals";
import { createCsrfMiddleware } from "../src/modules/csrf";
import { ForbiddenError } from "../src/modules/errors";

const mockRes = () => {
    const headers: Record<string, any> = {};
    return {
        setHeader(k: string, v: any) { headers[k] = v; },
        getHeader(k: string) { return headers[k]; },
        getHeaders() { return headers; }
    };
};

describe("CSRF", () => {
    it("issues a Set-Cookie when no cookie present and request is safe", (done) => {
        const mw = createCsrfMiddleware();
        const req: any = { method: "GET", headers: {} };
        const res = mockRes();
        mw(req as any, res as any, (err?: any) => {
            expect(err).toBeUndefined();
            const cookies = res.getHeader("Set-Cookie");
            expect(Array.isArray(cookies)).toBe(true);
            expect(cookies[0]).toContain("csrf-token=");
            expect(cookies[0]).toContain("SameSite=lax");
            expect(typeof req.csrfToken).toBe("function");
            expect(req.csrfToken()).toBeTruthy();
            done();
        });
    });

    it("rejects unsafe method without token", (done) => {
        const mw = createCsrfMiddleware();
        const req: any = { method: "POST", headers: {}, body: {} };
        const res = mockRes();
        mw(req as any, res as any, (err?: any) => {
            expect(err).toBeInstanceOf(ForbiddenError);
            expect(err.code).toBe("CSRF_INVALID");
            done();
        });
    });

    it("accepts unsafe method with matching header token", (done) => {
        const mw = createCsrfMiddleware();
        // First, GET to obtain token
        const reqGet: any = { method: "GET", headers: {} };
        const resGet = mockRes();
        mw(reqGet, resGet as any, () => {
            const cookieHeader = (resGet.getHeader("Set-Cookie") as string[])[0];
            const cookieValue = cookieHeader.split(";")[0]; // csrf-token=xxx
            const token = decodeURIComponent(cookieValue.split("=")[1]);

            const reqPost: any = {
                method: "POST",
                headers: { cookie: cookieValue, "x-csrf-token": token },
                body: {}
            };
            const resPost = mockRes();
            mw(reqPost, resPost as any, (err?: any) => {
                expect(err).toBeUndefined();
                done();
            });
        });
    });

    it("rejects with mismatched token", (done) => {
        const mw = createCsrfMiddleware();
        const reqGet: any = { method: "GET", headers: {} };
        const resGet = mockRes();
        mw(reqGet, resGet as any, () => {
            const cookieHeader = (resGet.getHeader("Set-Cookie") as string[])[0];
            const cookieValue = cookieHeader.split(";")[0];

            const reqPost: any = {
                method: "POST",
                headers: { cookie: cookieValue, "x-csrf-token": "wrong-token-of-same-length-aaaaaaaaaaaaaaaaaa" },
                body: {}
            };
            mw(reqPost, mockRes() as any, (err?: any) => {
                expect(err).toBeInstanceOf(ForbiddenError);
                done();
            });
        });
    });

    it("accepts token from body field", (done) => {
        const mw = createCsrfMiddleware({ bodyField: "_csrf" });
        const reqGet: any = { method: "GET", headers: {} };
        const resGet = mockRes();
        mw(reqGet, resGet as any, () => {
            const cookieHeader = (resGet.getHeader("Set-Cookie") as string[])[0];
            const cookieValue = cookieHeader.split(";")[0];
            const token = decodeURIComponent(cookieValue.split("=")[1]);

            const reqPost: any = {
                method: "POST",
                headers: { cookie: cookieValue },
                body: { _csrf: token }
            };
            mw(reqPost, mockRes() as any, (err?: any) => {
                expect(err).toBeUndefined();
                done();
            });
        });
    });

    it("respects custom ignoreMethods", (done) => {
        const mw = createCsrfMiddleware({ ignoreMethods: ["GET", "HEAD", "OPTIONS", "DELETE"] });
        const req: any = { method: "DELETE", headers: {}, body: {} };
        mw(req, mockRes() as any, (err?: any) => {
            expect(err).toBeUndefined();
            done();
        });
    });
});
