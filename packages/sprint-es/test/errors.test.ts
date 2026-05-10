import { describe, expect, it, jest } from "@jest/globals";
import {
    HttpError,
    BadRequestError,
    UnauthorizedError,
    NotFoundError,
    InternalServerError,
    createErrorHandler,
    asyncHandler
} from "../src/modules/errors";

describe("errors", () => {
    describe("HttpError", () => {
        it("sets default code from status", () => {
            const e = new HttpError(404, "missing");
            expect(e.status).toBe(404);
            expect(e.code).toBe("NOT_FOUND");
        });

        it("exposes by default for 4xx", () => {
            expect(new BadRequestError().expose).toBe(true);
            expect(new InternalServerError().expose).toBe(false);
        });

        it("preserves details and headers", () => {
            const e = new HttpError(429, "slow down", {
                details: { retry: 1 },
                headers: { "Retry-After": "5" }
            });
            expect(e.details).toEqual({ retry: 1 });
            expect(e.headers).toEqual({ "Retry-After": "5" });
        });
    });

    describe("createErrorHandler", () => {
        const mockRes = () => {
            const headers: Record<string, string> = {};
            return {
                statusCode: 200,
                headersSent: false,
                _body: undefined as any,
                status(s: number) { this.statusCode = s; return this; },
                setHeader(k: string, v: string) { headers[k] = v; },
                getHeaders: () => headers,
                json(body: any) { this._body = body; return this; }
            };
        };

        it("returns envelope with correct shape on HttpError", () => {
            const handler = createErrorHandler({ includeStack: false });
            const res = mockRes();
            handler(new BadRequestError("nope", { details: { x: 1 } }), { id: "rid-1" } as any, res as any, () => {});
            expect(res.statusCode).toBe(400);
            expect(res._body.error).toMatchObject({
                code: "BAD_REQUEST",
                status: 400,
                message: "nope",
                requestId: "rid-1",
                details: { x: 1 }
            });
        });

        it("hides 5xx message when expose=false", () => {
            const handler = createErrorHandler({ includeStack: false });
            const res = mockRes();
            handler(new Error("internal stacktrace leak"), {} as any, res as any, () => {});
            expect(res.statusCode).toBe(500);
            expect(res._body.error.message).toBe("Internal server error");
        });

        it("calls onError hook", () => {
            const onError = jest.fn();
            const handler = createErrorHandler({ onError });
            handler(new BadRequestError("x"), {} as any, mockRes() as any, () => {});
            expect(onError).toHaveBeenCalled();
        });

        it("applies custom error headers", () => {
            const handler = createErrorHandler({ includeStack: false });
            const res = mockRes();
            handler(new HttpError(429, "tmr", { headers: { "Retry-After": "10" } }), {} as any, res as any, () => {});
            expect(res.getHeaders()["Retry-After"]).toBe("10");
        });
    });

    describe("asyncHandler", () => {
        it("forwards rejected promise to next", async () => {
            const next = jest.fn();
            const wrapped: any = asyncHandler(async (_req: any, _res: any, _next: any) => { throw new Error("boom"); });
            await wrapped({} as any, {} as any, next as any);
            await new Promise(r => setImmediate(r));
            expect(next).toHaveBeenCalled();
            expect((next as any).mock.calls[0][0].message).toBe("boom");
        });
    });
});
