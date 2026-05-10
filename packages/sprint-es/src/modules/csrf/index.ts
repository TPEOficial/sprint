import crypto from "crypto";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { ForbiddenError } from "../errors";

export interface CSRFOptions {
    /** Cookie name. Default: "csrf-token" */
    cookieName?: string;
    /** Header name to read token from. Default: "x-csrf-token" */
    headerName?: string;
    /** Body field name (alternative to header). Default: "_csrf" */
    bodyField?: string;
    /** Cookie options. */
    cookie?: {
        secure?: boolean;
        sameSite?: "strict" | "lax" | "none";
        path?: string;
        domain?: string;
    };
    /** Methods to skip. Default: ["GET", "HEAD", "OPTIONS"] */
    ignoreMethods?: string[];
    /** Token byte length. Default: 32 */
    tokenLength?: number;
}

function generateToken(length: number): string {
    return crypto.randomBytes(length).toString("base64url");
};

function constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return crypto.timingSafeEqual(ab, bb);
};

function readCookie(req: Request, name: string): string | undefined {
    const header = req.headers.cookie;
    if (!header) return undefined;
    for (const part of header.split(";")) {
        const [k, ...v] = part.trim().split("=");
        if (k === name) return decodeURIComponent(v.join("="));
    }
    return undefined;
};

/**
 * Double-submit-cookie CSRF protection.
 * Issues a random token in a cookie, requires the same token in header/body on unsafe methods.
 */
export function createCsrfMiddleware(options: CSRFOptions = {}): RequestHandler {
    const cookieName = options.cookieName ?? "csrf-token";
    const headerName = (options.headerName ?? "x-csrf-token").toLowerCase();
    const bodyField = options.bodyField ?? "_csrf";
    const ignoreMethods = options.ignoreMethods ?? ["GET", "HEAD", "OPTIONS"];
    const tokenLength = options.tokenLength ?? 32;
    const cookieOpts = options.cookie ?? {};

    return (req: Request, res: Response, next: NextFunction): void => {
        let token = readCookie(req, cookieName);

        if (!token) {
            token = generateToken(tokenLength);
            const parts = [`${cookieName}=${encodeURIComponent(token)}`];
            parts.push(`Path=${cookieOpts.path ?? "/"}`);
            if (cookieOpts.domain) parts.push(`Domain=${cookieOpts.domain}`);
            parts.push(`SameSite=${cookieOpts.sameSite ?? "lax"}`);
            if (cookieOpts.secure ?? process.env.NODE_ENV === "production") parts.push("Secure");
            // Note: deliberately NOT HttpOnly (client must read it to send back).
            const existing = res.getHeader("Set-Cookie");
            const cookies = Array.isArray(existing) ? existing : existing ? [String(existing)] : [];
            cookies.push(parts.join("; "));
            res.setHeader("Set-Cookie", cookies);
        }

        (req as any).csrfToken = () => token!;

        if (ignoreMethods.includes(req.method)) return next();

        const submitted = (req.headers[headerName] as string | undefined) ?? (req.body && (req.body as any)[bodyField]);
        if (!submitted || typeof submitted !== "string" || !constantTimeEqual(submitted, token)) return next(new ForbiddenError("Invalid CSRF token", { code: "CSRF_INVALID" }));
        next();
    };
};