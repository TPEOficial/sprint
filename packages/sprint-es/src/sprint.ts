import fs from "fs";
import http from "http";
import cors from "cors";
import path from "path";
import morgan from "morgan";
import dotenv from "dotenv";
import { pathToFileURL } from "url";
import { RateLimiter } from "toolkitify/rate-limit";
import { isVerbose, matchesPatterns, stripRouteGroups } from "./utils";
import { Handler, SprintOptions, SprintConfig, MiddlewareConfig, LoadedMiddleware } from "./types";
import express, { Application, RequestHandler, Router as ExpressRouter, Request } from "express";
import { AuthorizationSource, SprintRequest } from "./types";

const nodeEnv = process.env.NODE_ENV?.toLowerCase();
const isDev = nodeEnv === "development";
const isProd = nodeEnv === "production";

if (isDev) dotenv.config({ path: ".env.development", quiet: true });
else if (isProd) dotenv.config({ path: ".env.production", quiet: true });
else dotenv.config({ quiet: true });

const limiter = new RateLimiter({
    logs: isDev || isVerbose
});

export const isDevelopment = isDev;
export const isProduction = isProd;

async function findProjectRoot(startDir: string): Promise<string | null> {
    let currentDir = startDir;
    while (currentDir !== path.parse(currentDir).root) {
        const packageJsonPath = path.join(currentDir, "package.json");
        if (fs.existsSync(packageJsonPath)) {
            return currentDir;
        }
        currentDir = path.dirname(currentDir);
    }
    return null;
}

async function loadSprintConfig(): Promise<SprintConfig | null> {
    const callerDir = process.argv[1] ? path.dirname(process.argv[1]) : process.cwd();
    const projectRoot = await findProjectRoot(callerDir);
    
    if (!projectRoot) {
        return null;
    }

    const configFiles = ["sprint.config.ts", "sprint.config.js"];
    
    for (const configFile of configFiles) {
        const configPath = path.join(projectRoot, configFile);
        if (fs.existsSync(configPath)) {
            try {
                const moduleUrl = pathToFileURL(configPath).href;
                const config = await import(moduleUrl);
                return config.default || config;
            } catch (err) {
                console.warn(`[Sprint] Failed to load config from ${configPath}:`, err);
            }
        }
    }
    
    return null;
}

export class Sprint {
    public app: Application;
    private port: string | number | null | undefined = process.env.PORT;
    private routesPath: string = "./routes";
    private middlewaresPath: string = "./middlewares";
    private cronjobsPath: string = "./cronjobs";
    private jsonLimit: string = "50mb";
    private urlEncodedLimit: string = "50mb";
    private prefix: string = "";
    private routesLoaded!: Promise<void>;
    private server!: http.Server;
    private loadedMiddlewares: LoadedMiddleware[] = [];
    private openapi: {
        generateOnBuild: boolean;
    } = { generateOnBuild: false };

    constructor() {
        this.app = express();
        
        loadSprintConfig().then((config) => {
            const defaults: SprintOptions = {
                port: process.env.PORT,
                routesPath: "./routes",
                middlewaresPath: "./middlewares",
                cronjobsPath: "./cronjobs",
                jsonLimit: "50mb",
                urlEncodedLimit: "50mb",
                prefix: "",
                autoListen: true,
                openapi: {
                    generateOnBuild: false
                }
            };

            const finalConfig = { ...defaults, ...config };

            this.port = finalConfig.port;
            this.routesPath = finalConfig.routesPath || "./routes";
            this.middlewaresPath = finalConfig.middlewaresPath || "./middlewares";
            this.cronjobsPath = finalConfig.cronjobsPath || "./cronjobs";
            this.jsonLimit = finalConfig.jsonLimit || "50mb";
            this.urlEncodedLimit = finalConfig.urlEncodedLimit || "50mb";
            this.prefix = finalConfig.prefix ? ("/" + finalConfig.prefix.replace(/^\/+|\/+$/g, "")) : "";
            this.openapi = {
                generateOnBuild: finalConfig.openapi?.generateOnBuild ?? false
            };

            if (this.openapi.generateOnBuild === true) {
                console.log(`[Sprint] ⚠️ openapi.generateOnBuild is enabled but this option makes nothing for now`);
            }

            this.loadDefaults();
            this.loadHealthcheck();
            this.routesLoaded = this.init();

            if (finalConfig.autoListen) this.routesLoaded.then(() => this.listen());
        });
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

        // Load cronjobs.
        try {
            const cronjobsCandidate = path.isAbsolute(this.cronjobsPath) ? this.cronjobsPath : path.join(callerDir, this.cronjobsPath);
            if (fs.existsSync(cronjobsCandidate) && fs.statSync(cronjobsCandidate).isDirectory()) await this.loadCronJobs(cronjobsCandidate);
            else if (isVerbose) console.log(`[Sprint] Cronjobs folder not found at: ${cronjobsCandidate}, skipping.`);
        } catch (err) {
            console.error("[Sprint] Failed to load cronjobs:", err);
        }
    };

    private loadDefaults(): void {
        this.app.disable("x-powered-by");

        this.app.use((req: Request, res, next) => {
            const getAuthorization = (sources?: AuthorizationSource | AuthorizationSource[]): string | undefined => {
                const defaultSources: AuthorizationSource[] = ["query:token", "headers:authorization"];
                const sourceList = sources ? (Array.isArray(sources) ? sources : [sources]) : defaultSources;

                for (const source of sourceList) {
                    const [type, key] = source.split(":") as [string, string];

                    if (type === "query") {
                        const value = req.query[key];
                        if (typeof value === "string" && value.length > 0) return value;
                    } else if (type === "headers") {
                        const value = req.headers[key.toLowerCase()];
                        if (typeof value === "string" && value.length > 0) return value;
                        if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string" && value[0].length > 0) return value[0];
                    }
                }

                return undefined;
            };

            req.sprint = { getAuthorization };
            req.custom = {};
            next();
        });

        this.app.use((_, res, next) => {
            res.setHeader("Content-Security-Policy", "default-src 'self'");
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader("X-Frame-Options", "DENY");
            res.setHeader("X-XSS-Protection", "1; mode=block");
            res.setHeader("X-Powered-By", "Sprint");
            return next();
        });

        this.app.set("port", this.port || process.env.PORT || 5000);
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
                        if (isVerbose) console.log(`[Sprint] Loaded middleware: ${name} (priority: ${config.priority ?? 100})`);
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
                                if (isVerbose) console.log(`[Sprint] Loaded route: ${finalRoute} -> ${filePath} (with ${routeMiddlewares.length} middleware(s))`);
                            } else {
                                this.app.use(finalRoute, router);
                                if (isVerbose) console.log(`[Sprint] Loaded route: ${finalRoute} -> ${filePath}`);
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

    private async loadCronJobs(cronjobsPath: string): Promise<void> {
        const files = await fs.promises.readdir(cronjobsPath);

        for (const file of files) {
            const filePath = path.join(cronjobsPath, file);
            const stat = await fs.promises.stat(filePath);

            if (stat.isFile() && (file.endsWith(".ts") || file.endsWith(".js"))) {
                try {
                    const moduleUrl = pathToFileURL(filePath).href;
                    await import(moduleUrl);
                    if (isVerbose) console.log(`[Sprint] Loaded cronjob: ${file.replace(/\.(ts|js)$/, "")}`);
                } catch (err) {
                    console.warn(`[Sprint] Failed to load cronjob ${filePath}:`, err);
                }
            }
        }
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
                    }).then((result: { success: boolean; remaining: number; limit: number; reset: number; }) => {
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
    public use(pathOrHandler: string | Handler | MiddlewareConfig, maybeHandler?: Handler) {
        if (typeof pathOrHandler === "string" && maybeHandler) {
            return this.app.use(this.applyPrefix(pathOrHandler), maybeHandler);
        }
        
        if (pathOrHandler && typeof pathOrHandler === "object" && "handler" in pathOrHandler) {
            const config = pathOrHandler as MiddlewareConfig;
            const handlers = Array.isArray(config.handler) ? config.handler : [config.handler];
            return this.app.use(...handlers);
        }
        
        return this.app.use(pathOrHandler as Handler);
    };

public listen(callback?: () => void): void {
        const isDev = process.env.NODE_ENV === "development";
        const basePort = this.app.get("port") || 5000;
        const triedPorts: number[] = [];
        let serverStarted = false;
        
        const tryListen = (port: number): void => {
            triedPorts.push(port);
            
            this.server = http.createServer(this.app);
            
            this.server.listen(port, () => {
                serverStarted = true;
                const prefixInfo = this.prefix ? this.prefix : "/";
                const reset = "\x1b[0m";
                const bold = "\x1b[1m";
                const cyan = "\x1b[36m";
                const green = "\x1b[32m";
                const dim = "\x1b[2m";

                console.log("");
                console.log(`   ${bold}${cyan}Sprint${reset}  ready to handle requests`);
                console.log("");
                console.log(`   ${dim}Local:${reset}        http://localhost:${bold}${port}${reset}`);
                console.log(`   ${dim}Prefix:${reset}       ${bold}${prefixInfo}${reset}`);
                console.log(`   ${dim}Healthcheck:${reset}  http://localhost:${port}${this.prefix}/healthcheck`);
                console.log("");
                console.log(`   ${dim}Tip: Need stronger route protection? Learn more at${reset}`);
                console.log(`   ${dim}https://docs.tpeoficial.com/docs/dymo-api/private/request-verifier${reset}`);
                console.log("");
            });

            this.server.on("error", (err: NodeJS.ErrnoException) => {
                if (err.code === "EADDRINUSE" && isDev && !serverStarted) {
                    const nextPort = triedPorts.length === 1 ? 3000 : triedPorts[triedPorts.length - 1] + 1;
                    if (nextPort > 10000) {
                        console.error(`❌ No available ports found after trying: ${triedPorts.join(", ")}`);
                        process.exit(1);
                    }
                    console.log(`⚠️  Port ${port} in use, trying ${nextPort}...`);
                    this.server.close();
                    tryListen(nextPort);
                } else if (!serverStarted) {
                    console.error(`❌ Server error:`, err.message);
                    process.exit(1);
                }
            });
        };

        tryListen(basePort);

        this.routesLoaded.then(() => {
            this.loadNotFound();
            if (callback) callback();
        });
    };
};