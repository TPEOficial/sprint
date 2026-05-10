import type { Request, Response, NextFunction, RequestHandler } from "express";

export interface SecurityHeadersOptions {
    /** Strict-Transport-Security. Default: { maxAge: 15552000, includeSubDomains: true } */
    hsts?: false | { maxAge?: number; includeSubDomains?: boolean; preload?: boolean; };
    /** Content-Security-Policy. Default: only set on text/html responses with "default-src 'none'; frame-ancestors 'none'" */
    csp?: false | string | { policy: string; htmlOnly?: boolean; };
    /** Referrer-Policy. Default: "no-referrer" */
    referrerPolicy?: false | string;
    /** Permissions-Policy. Default: minimal lockdown */
    permissionsPolicy?: false | string;
    /** X-Frame-Options. Default: "DENY" */
    frameOptions?: false | "DENY" | "SAMEORIGIN";
    /** X-Content-Type-Options. Default: "nosniff" */
    contentTypeOptions?: false | "nosniff";
    /** Cross-Origin-Opener-Policy. Default: "same-origin" */
    coop?: false | "same-origin" | "same-origin-allow-popups" | "unsafe-none";
    /** Cross-Origin-Resource-Policy. Default: "same-origin" */
    corp?: false | "same-origin" | "same-site" | "cross-origin";
    /** Cross-Origin-Embedder-Policy. Default: false (off — opt-in due to compatibility) */
    coep?: false | "require-corp" | "credentialless" | "unsafe-none";
    /** Override server identification header. Default: "Sprint" */
    serverHeader?: false | string;
}

const DEFAULT_PERMISSIONS_POLICY = [
    "accelerometer=()",
    "autoplay=()",
    "camera=()",
    "geolocation=()",
    "gyroscope=()",
    "magnetometer=()",
    "microphone=()",
    "payment=()",
    "usb=()"
].join(", ");

export function createSecurityHeadersMiddleware(options: SecurityHeadersOptions = {}): RequestHandler {
    const hsts = options.hsts === false ? null : {
        maxAge: options.hsts?.maxAge ?? 15_552_000,
        includeSubDomains: options.hsts?.includeSubDomains ?? true,
        preload: options.hsts?.preload ?? false
    };

    const csp = options.csp === false ? null : typeof options.csp === "string" ? { policy: options.csp, htmlOnly: true } : options.csp ?? { policy: "default-src 'none'; frame-ancestors 'none'", htmlOnly: true };

    const referrer = options.referrerPolicy === false ? null : options.referrerPolicy ?? "no-referrer";
    const permissions = options.permissionsPolicy === false ? null : options.permissionsPolicy ?? DEFAULT_PERMISSIONS_POLICY;
    const frame = options.frameOptions === false ? null : options.frameOptions ?? "DENY";
    const cto = options.contentTypeOptions === false ? null : options.contentTypeOptions ?? "nosniff";
    const coop = options.coop === false ? null : options.coop ?? "same-origin";
    const corp = options.corp === false ? null : options.corp ?? "same-origin";
    const coep = options.coep === false ? null : options.coep ?? null;
    const serverHeader = options.serverHeader === false ? null : options.serverHeader ?? "Sprint";

    return (req: Request, res: Response, next: NextFunction): void => {
        if (hsts) {
            const parts = [`max-age=${hsts.maxAge}`];
            if (hsts.includeSubDomains) parts.push("includeSubDomains");
            if (hsts.preload) parts.push("preload");
            res.setHeader("Strict-Transport-Security", parts.join("; "));
        }
        if (referrer) res.setHeader("Referrer-Policy", referrer);
        if (permissions) res.setHeader("Permissions-Policy", permissions);
        if (frame) res.setHeader("X-Frame-Options", frame);
        if (cto) res.setHeader("X-Content-Type-Options", cto);
        if (coop) res.setHeader("Cross-Origin-Opener-Policy", coop);
        if (corp) res.setHeader("Cross-Origin-Resource-Policy", corp);
        if (coep) res.setHeader("Cross-Origin-Embedder-Policy", coep);
        if (serverHeader) res.setHeader("X-Powered-By", serverHeader);

        if (csp) {
            if (!csp.htmlOnly) res.setHeader("Content-Security-Policy", csp.policy);
            else {
                const originalSetHeader = res.setHeader.bind(res);
                const applyCspIfHtml = () => {
                    const ct = res.getHeader("Content-Type");
                    if (typeof ct === "string" && ct.includes("text/html") && !res.getHeader("Content-Security-Policy")) originalSetHeader("Content-Security-Policy", csp.policy);
                };
                res.on("pipe", applyCspIfHtml);
                const originalEnd = res.end.bind(res) as (...args: any[]) => any;
                res.end = function (this: Response, ...args: any[]) {
                    applyCspIfHtml();
                    return originalEnd(...args);
                } as any;
            }
        }

        next();
    };
};

export interface CorsOptions {
    /** Allowed origins. Use "*" for any (no credentials). Function for dynamic. Default: false (no CORS) */
    origin?: string | string[] | ((origin: string | undefined) => boolean | string) | false;
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
}

export function createCorsMiddleware(options: CorsOptions = {}): RequestHandler {
    const allowed = options.origin ?? false;
    const methods = (options.methods ?? ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"]).join(", ");
    const allowedHeaders = options.allowedHeaders;
    const exposedHeaders = options.exposedHeaders;
    const credentials = options.credentials ?? false;
    const maxAge = options.maxAge;

    const isAllowed = (origin: string | undefined): string | null => {
        if (allowed === false) return null;
        if (allowed === "*") return credentials ? null : "*";
        if (typeof allowed === "string") return origin === allowed ? origin : null;
        if (Array.isArray(allowed)) return origin && allowed.includes(origin) ? origin : null;
        if (typeof allowed === "function") {
            const result = allowed(origin);
            if (result === true) return origin ?? null;
            if (typeof result === "string") return result;
            return null;
        }
        return null;
    };

    return (req: Request, res: Response, next: NextFunction): void => {
        const origin = req.headers.origin as string | undefined;
        const allowOrigin = isAllowed(origin);

        if (allowOrigin) {
            res.setHeader("Access-Control-Allow-Origin", allowOrigin);
            res.setHeader("Vary", "Origin");
        }
        if (credentials && allowOrigin && allowOrigin !== "*") res.setHeader("Access-Control-Allow-Credentials", "true");
        if (exposedHeaders?.length) res.setHeader("Access-Control-Expose-Headers", exposedHeaders.join(", "));

        if (req.method === "OPTIONS") {
            res.setHeader("Access-Control-Allow-Methods", methods);
            const reqHeaders = req.headers["access-control-request-headers"];
            if (allowedHeaders?.length) res.setHeader("Access-Control-Allow-Headers", allowedHeaders.join(", "));
            else if (typeof reqHeaders === "string") res.setHeader("Access-Control-Allow-Headers", reqHeaders);
            if (typeof maxAge === "number") res.setHeader("Access-Control-Max-Age", String(maxAge));
            res.statusCode = 204;
            res.setHeader("Content-Length", "0");
            res.end();
            return;
        }

        next();
    };
};