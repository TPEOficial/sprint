import fs from "fs";
import http from "http";
import cors from "cors";
import path from "path";
import morgan from "morgan";
import dotenv from "dotenv";
import { pathToFileURL } from "url";
import { RateLimiter } from "toolkitify/rate-limit";
import { isVerbose, matchesPatterns, stripRouteGroups } from "./utils";
import { Handler, SprintOptions, MiddlewareConfig, LoadedMiddleware } from "./types";
import express, { Application, RequestHandler, Router as ExpressRouter } from "express";

dotenv.config();

const limiter = new RateLimiter({
    logs: process.argv.includes("--dev") || isVerbose
});

export class Sprint {
    public app: Application;
    private port: string | number | null | undefined;
    private routesPath: string;
    private middlewaresPath: string;
    private jsonLimit: string;
    private urlEncodedLimit: string;
    private prefix: string;
    private routesLoaded: Promise<void>;
    private server: http.Server;
    private loadedMiddlewares: LoadedMiddleware[] = [];

    constructor({
        port = process.env.PORT,
        routesPath = "./routes",
        middlewaresPath = "./middlewares",
        jsonLimit = "50mb",
        urlEncodedLimit = "50mb",
        prefix = ""
    }: SprintOptions = {}) {
        this.app = express();
        this.port = port;
        this.routesPath = routesPath;
        this.middlewaresPath = middlewaresPath;
        this.jsonLimit = jsonLimit;
        this.urlEncodedLimit = urlEncodedLimit;
        // Normalize prefix: ensure it starts with / and doesn't end with /.
        this.prefix = prefix ? ("/" + prefix.replace(/^\/+|\/+$/g, "")) : "";
        this.server = http.createServer(this.app);
        this.loadDefaults();
        this.loadHealthcheck();
        this.routesLoaded = this.init();
    };

    private async init(): Promise<void> {
        const callerDir = process.argv[1] ? path.dirname(process.argv[1]) : process.cwd();

        // Load middlewares first.
        try {
            const middlewaresCandidate = path.isAbsolute(this.middlewaresPath) ? this.middlewaresPath : path.join(callerDir, this.middlewaresPath);
            if (fs.existsSync(middlewaresCandidate) && fs.statSync(middlewaresCandidate).isDirectory()) await this.loadMiddlewares(middlewaresCandidate);
            else if (isVerbose) console.log(`[Sprint] Middlewares folder not found at: ${middlewaresCandidate}, skipping.`);
        } catch (err) {
            console.error("[Sprint] Failed to load middlewares:", err);
        }

        // Then load routes.
        try {
            const routesCandidate = path.isAbsolute(this.routesPath) ? this.routesPath : path.join(callerDir, this.routesPath);
            if (fs.existsSync(routesCandidate) && fs.statSync(routesCandidate).isDirectory()) await this.loadRoutes(routesCandidate);
            else console.log(`[Sprint] Routes folder not found at: ${routesCandidate}, skipping route loading.`);
        } catch (err) {
            console.error("[Sprint] Failed to load routes:", err);
        }
    };

    private loadDefaults(): void {
        this.app.use((_, res, next) => {
            res.setHeader("Content-Security-Policy", "default-src 'self'");
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader("X-Frame-Options", "DENY");
            res.setHeader("X-XSS-Protection", "1; mode=block");
            return next();
        });

        this.app.set("port", this.port || 5000);
        this.app.set("json spaces", 2);
        this.app.enable("trust proxy");
        this.app.set("trust proxy", true);

        this.app.use(cors());
        this.app.use(morgan("combined"));
        this.app.use(express.json({ limit: this.jsonLimit }));
        this.app.use(express.urlencoded({ limit: this.urlEncodedLimit, extended: false }));
    };

    /**
     * Gets all matching middlewares for a given route path, sorted by priority
     */
    private getMiddlewaresForRoute(routePath: string): RequestHandler[] {
        const matched: { handler: RequestHandler; priority: number; name: string; }[] = [];

        for (const mw of this.loadedMiddlewares) {
            const includePatterns = Array.isArray(mw.include) ? mw.include : [mw.include || "/**"];
            const excludePatterns = Array.isArray(mw.exclude) ? mw.exclude : (mw.exclude ? [mw.exclude] : []);

            const isIncluded = matchesPatterns(includePatterns, routePath);
            const isExcluded = excludePatterns.length > 0 && matchesPatterns(excludePatterns, routePath);

            if (isIncluded && !isExcluded) {
                const handlers = Array.isArray(mw.handler) ? mw.handler : [mw.handler];
                for (const handler of handlers) {
                    matched.push({
                        handler,
                        priority: mw.priority ?? 100,
                        name: mw.name
                    });
                }
            }
        }

        // Sort by priority (lower first)
        matched.sort((a, b) => a.priority - b.priority);

        return matched.map(m => m.handler);
    };

    /**
     * Load all middleware files from the middlewares folder
     */
    private async loadMiddlewares(middlewaresPath: string): Promise<void> {
        const files = await fs.promises.readdir(middlewaresPath);

        for (const file of files) {
            const filePath = path.join(middlewaresPath, file);
            const stat = await fs.promises.stat(filePath);

            if (stat.isFile() && (file.endsWith(".ts") || file.endsWith(".js"))) {
                try {
                    const moduleUrl = pathToFileURL(filePath).href;
                    const module = await import(moduleUrl);
                    const config: MiddlewareConfig | undefined = module.default;

                    if (config && config.handler) {
                        const name = config.name || file.replace(/\.(ts|js)$/, "");
                        this.loadedMiddlewares.push({
                            ...config,
                            name,
                            filePath
                        });
                        console.log(`[Sprint] Loaded middleware: ${name} (priority: ${config.priority ?? 100})`);
                    }
                } catch (err) {
                    console.warn(`[Sprint] Failed to load middleware ${filePath}:`, err);
                }
            }
        }

        // Sort middlewares by priority after loading
        this.loadedMiddlewares.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
    };

    private loadHealthcheck(): void {
        const healthcheckXml = `<?xml version="1.0" encoding="UTF-8"?>
<health>
    <status>ok</status>
    <uptime>${process.uptime().toFixed(2)}</uptime>
</health>`;

        const healthRoute = this.prefix ? `${this.prefix}/healthcheck` : "/healthcheck";
        this.app.get(healthRoute, (_, res) => {
            res.setHeader("Content-Type", "application/xml");
            res.send(healthcheckXml);
        });
    };

    private async loadRoutes(routesPath: string) {
        const walkDir = async (dir: string) => {
            const files = await fs.promises.readdir(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = await fs.promises.stat(filePath);

                if (stat.isDirectory()) await walkDir(filePath);
                else if (stat.isFile() && (file.endsWith(".ts") || file.endsWith(".js"))) {
                    try {
                        const moduleUrl = pathToFileURL(filePath).href;
                        const module = await import(moduleUrl);

                        const router: ExpressRouter | undefined = module.default || module.router;

                        if (router && typeof router === "function" && router.stack && Array.isArray(router.stack)) {
                            let routePath = "/" + path.relative(routesPath, filePath).replace(/\.(ts|js)$/, "").replace(/\\/g, "/");

                            // Strip route groups (folders wrapped in parentheses) from the path.
                            routePath = stripRouteGroups(routePath);

                            if (routePath.endsWith("/index")) routePath = routePath.slice(0, -6) || "/";

                            // Apply global prefix.
                            const fullRoute = this.prefix + (routePath === "/" ? "" : routePath);
                            const finalRoute = fullRoute || "/";

                            // Get matching middlewares for this route (match against path without prefix for middleware patterns).
                            const routeMiddlewares = this.getMiddlewaresForRoute(routePath);

                            if (routeMiddlewares.length > 0) {
                                this.app.use(finalRoute, ...routeMiddlewares, router);
                                console.log(`[Sprint] Loaded route: ${finalRoute} -> ${filePath} (with ${routeMiddlewares.length} middleware(s))`);
                            } else {
                                this.app.use(finalRoute, router);
                                console.log(`[Sprint] Loaded route: ${finalRoute} -> ${filePath}`);
                            }
                        }
                    } catch (err) {
                        console.warn(`[Sprint] Failed to load route ${filePath}:`, err);
                    }
                }
            }
        };

        await walkDir(routesPath);
    };

    private loadNotFound(): void {
        this.app.use((req, res, _next) => {
            const originalSend = res.send.bind(res);
            const sendWrapper = (body?: any) => {
                if (res.statusCode === 404) {
                    const key = `user:${req.ip}:404`;
                    limiter.check({
                        key,
                        limit: 5,
                        interval: "10s",
                        blockDuration: "1m",
                        storage: "memory"
                    }).then((result: { success: boolean; remaining: number; limit: number; reset: number }) => {
                        if (!result.success) {
                            console.log(`[RateLimiter] 404 limit reached for ${req.ip}. Retry at ${new Date(result.reset).toLocaleTimeString()}`);
                            res.status(429).send("Too many invalid requests. Try again later.");
                        } else {
                            console.log(`[RateLimiter] 404 allowed for ${req.ip}. Remaining: ${result.remaining}/${result.limit}`);
                            originalSend(body);
                        }
                    }).catch((err: Error) => {
                        console.error("[RateLimiter] Error checking limit:", err);
                        originalSend(body);
                    });
                } else originalSend(body);
            };

            res.send = sendWrapper as typeof res.send;
            res.status(404).send("Not Found");
        });
    };

    /** Applies prefix to a path */
    private applyPrefix(routePath: string): string {
        if (!this.prefix) return routePath;
        return this.prefix + (routePath.startsWith("/") ? routePath : "/" + routePath);
    };

    // HTTP Methods (prefix is applied automatically).
    public get(path: string, handler: Handler) { return this.app.get(this.applyPrefix(path), handler); }
    public post(path: string, handler: Handler) { return this.app.post(this.applyPrefix(path), handler); }
    public put(path: string, handler: Handler) { return this.app.put(this.applyPrefix(path), handler); }
    public delete(path: string, handler: Handler) { return this.app.delete(this.applyPrefix(path), handler); }
    public patch(path: string, handler: Handler) { return this.app.patch(this.applyPrefix(path), handler); }
    public use(pathOrHandler: string | Handler, maybeHandler?: Handler) {
        if (typeof pathOrHandler === "string" && maybeHandler) return this.app.use(this.applyPrefix(pathOrHandler), maybeHandler);
        return this.app.use(pathOrHandler as Handler);
    };

    public listen(callback?: () => void): void {
        const port = this.app.get("port");
        const healthRoute = this.prefix ? `${this.prefix}/healthcheck` : "/healthcheck";

        this.server.listen(port, () => {
            const prefixInfo = this.prefix ? ` (prefix: ${this.prefix})` : "";
            console.log("\x1b[36m\x1b[1m%s\x1b[0m", `[Sprint] Need stronger route protection? Enhance your security by verifying User-Agent, IP and request patterns. Learn more at https://docs.tpeoficial.com/docs/dymo-api/private/request-verifier.`);
            console.log("\x1b[32m%s\x1b[0m", `[Sprint] Server running on http://localhost:${port}${prefixInfo}`);
            console.log("\x1b[32m%s\x1b[0m", `[Sprint] Healthcheck: http://localhost:${port}${healthRoute}`);
        });

        this.routesLoaded.then(() => {
            this.loadNotFound();
            if (callback) callback();
        });
    };
};