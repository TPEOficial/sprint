import fs from "fs";
import http from "http";
import cors from "cors";
import path from "path";
import morgan from "morgan";
import dotenv from "dotenv";
import { pathToFileURL } from "url";
import { RateLimiter } from "toolkitify/rate-limit";
import { isVerbose, matchesPatterns, stripRouteGroups, deepMerge } from "./utils";
import { Handler, SprintOptions, SprintConfig, MiddlewareConfig, LoadedMiddleware, MiddlewareSchema } from "./types";
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

function isEnabledInEnv(value: boolean | string[] | undefined): boolean {
    if (value === undefined) return false;
    if (typeof value === "boolean") return value;
    if (Array.isArray(value)) {
        const env = nodeEnv || "development";
        return value.includes(env);
    }
    return false;
}

async function findProjectRoot(startDir: string): Promise<string | null> {
    let currentDir = startDir;
    while (currentDir !== path.parse(currentDir).root) {
        const packageJsonPath = path.join(currentDir, "package.json");
        if (fs.existsSync(packageJsonPath)) return currentDir;
        currentDir = path.dirname(currentDir);
    }
    return null;
};

async function loadSprintConfig(): Promise<SprintConfig | null> {
    const projectRoot = await findProjectRoot(process.cwd());

    if (!projectRoot) return null;

    const configFiles = isProd ? ["dist/sprint.config.js", "sprint.config.js", "dist/sprint.config.mjs"] : ["sprint.config.ts", "sprint.config.js"];

    for (const configFile of configFiles) {
        const configPath = path.join(projectRoot, configFile);
        if (!fs.existsSync(configPath)) continue;

        try {
            const moduleUrl = pathToFileURL(configPath).href;
            const module = await import(moduleUrl);
            return module.default ?? module.config ?? module ?? null;
        } catch (err) {
            console.warn(`[Sprint] Failed to load config from ${configPath}:`, err);
        }
    }

    return null;
};

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
    private loadedMiddlewares: LoadedMiddleware<MiddlewareSchema>[] = [];
    private counters = { routes: 0, middlewares: 0, cronjobs: 0 };
    private openapi: {
        generateOnBuild: boolean;
        path: string;
        swaggerUi: {
            enabled: boolean;
            path: string;
        };
    } = {
            generateOnBuild: false,
            path: "/openapi.json",
            swaggerUi: {
                enabled: false,
                path: "/swagger"
            }
        };
    private graphql: {
        enabled: boolean;
        path: string;
        graphiql: {
            enabled: boolean;
            path: string;
        };
    } = {
            enabled: false,
            path: "/graphql",
            graphiql: {
                enabled: false,
                path: "/graphiql"
            }
        };
    private graphqlSchema: any = null;
    private registeredRoutes: Array<{
        method: string;
        path: string;
        schema: any;
    }> = [];

    constructor() {
        this.app = express();

        loadSprintConfig().then((config) => {
            const defaults: SprintOptions = {
                port: process.env.PORT,
                routesPath: isProd ? "./dist/routes" : "./src/routes",
                middlewaresPath: isProd ? "./dist/middlewares" : "./src/middlewares",
                cronjobsPath: isProd ? "./dist/cronjobs" : "./src/cronjobs",
                jsonLimit: "50mb",
                urlEncodedLimit: "50mb",
                prefix: "",
                autoListen: true,
                openapi: {
                    generateOnBuild: false,
                    swaggerUi: {
                        enabled: false
                    }
                },
                graphql: {
                    enabled: false,
                    graphiql: {
                        enabled: false
                    }
                }
            };

            const finalConfig = deepMerge(defaults, config || {});

            this.port = finalConfig.port;
            this.routesPath = finalConfig.routesPath || "./src/routes";
            this.middlewaresPath = finalConfig.middlewaresPath || "./src/middlewares";
            this.cronjobsPath = finalConfig.cronjobsPath || "./src/cronjobs";
            this.jsonLimit = finalConfig.jsonLimit || "50mb";
            this.urlEncodedLimit = finalConfig.urlEncodedLimit || "50mb";
            this.prefix = finalConfig.prefix ? ("/" + finalConfig.prefix.replace(/^\/+|\/+$/g, "")) : "";
            this.openapi = {
                generateOnBuild: isEnabledInEnv(finalConfig.openapi?.generateOnBuild),
                path: finalConfig.openapi?.path || "/openapi.json",
                swaggerUi: {
                    enabled: isEnabledInEnv(finalConfig.openapi?.swaggerUi?.enabled),
                    path: finalConfig.openapi?.swaggerUi?.path || "/swagger"
                }
            };
            this.graphql = {
                enabled: isEnabledInEnv(finalConfig.graphql?.enabled),
                path: finalConfig.graphql?.path || "/graphql",
                graphiql: {
                    enabled: isEnabledInEnv(finalConfig.graphql?.graphiql?.enabled),
                    path: finalConfig.graphql?.graphiql?.path || "/graphiql"
                }
            };

            const openApiPath = this.openapi.path;
            const swaggerPath = this.openapi.swaggerUi.path;
            const graphqlPath = this.graphql.path;
            const graphiqlPath = this.graphql.graphiql.path;

            const normalizePath = (p: string) => p.replace(/\/+/g, "/").replace(/\/$/, "") || "/";

            const paths = [
                { name: "openapi.path", value: normalizePath(openApiPath) },
                { name: "openapi.swaggerUi.path", value: normalizePath(swaggerPath) },
                { name: "graphql.path", value: normalizePath(graphqlPath) },
                { name: "graphql.graphiql.path", value: normalizePath(graphiqlPath) }
            ];

            const uniquePaths = new Map<string, string>();
            for (const p of paths) {
                if (uniquePaths.has(p.value)) {
                    console.error(`[Sprint] Error: Route conflict detected!`);
                    console.error(`  - "${p.name}" = "${p.value}"`);
                    console.error(`  - Conflicts with: "${uniquePaths.get(p.value)}"`);
                    console.error(`  Please use different paths for each endpoint.`);
                    process.exit(1);
                }
                uniquePaths.set(p.value, p.name);
            }

            this.loadDefaults();
            this.loadHealthcheck();
            this.routesLoaded = this.init();

            this.routesLoaded.then(async () => {
                if (this.openapi.generateOnBuild) {
                    this.app.get(this.openapi.path, (_, res) => {
                        res.json(this.generateOpenAPISpec());
                    });

                    if (this.openapi.swaggerUi.enabled) {
                        try {
                            const swaggerUi = await import("swagger-ui-express");
                            const ui = swaggerUi.default;
                            this.app.use(this.openapi.swaggerUi.path, (req, res, next) => {
                                res.setHeader(
                                    "Content-Security-Policy",
                                    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https:"
                                );
                                next();
                            });

                            this.app.use(this.openapi.swaggerUi.path, ui.serve, ui.setup(undefined, {
                                swaggerUrl: this.openapi.path
                            }));
                        } catch (err) {
                            console.warn("[Sprint] Failed to load swagger-ui-express:", err);
                        }
                    }
                }

                if (this.graphql.enabled) {
                    try {
                        const { createHandler } = await import("graphql-http/lib/use/express");
                        const { ruruHTML } = await import("ruru/server");

                        this.app.all(this.graphql.path, createHandler({
                            schema: this.graphqlSchema
                        }));

                        if (this.graphql.graphiql.enabled) {
                            this.app.get(this.graphql.graphiql.path, (_, res) => {
                                res.setHeader(
                                    "Content-Security-Policy",
                                    "default-src 'self'; " +
                                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; " +
                                    "style-src 'self' 'unsafe-inline' https://unpkg.com; " +
                                    "img-src 'self' data: https:; " +
                                    "connect-src 'self' https:; " +
                                    "font-src 'self' https:;"
                                );
                                res.type("html");
                                res.end(ruruHTML({ endpoint: this.graphql.path }).replace(/<title>.*?<\/title>/, "<title>Sprint GraphQL IDE</title>"));
                            });

                            if (isVerbose) console.log(`[Sprint] GraphiQL IDE: http://localhost:${this.port}${this.graphql.graphiql.path}`);
                        }

                        if (isVerbose) console.log(`[Sprint] GraphQL endpoint: http://localhost:${this.port}${this.graphql.path}`);
                    } catch (err) {
                        console.warn("[Sprint] Failed to load graphql-http or ruru:", err);
                    }
                }

                this.loadNotFound();
                if (finalConfig.autoListen) this.listen();
            });
        });
    };

    private async init(): Promise<void> {
        const projectRoot = await findProjectRoot(process.cwd());
        const baseDir = projectRoot ?? process.cwd();

        const normalizePath = (p: string) => {
            const clean = p.replace(/^\.\//, "");
            if (isProd) {
                if (clean.startsWith("dist/")) return clean;
                // In production, if not already in dist, force it to dist.
                if (clean.startsWith("src/")) return clean.replace("src/", "dist/");
                // If it's a simple folder name, assume it lives inside dist.
                if (!clean.includes("/")) return path.join("dist", clean);
            }
            return clean;
        };

        const middlewaresCandidate = normalizePath(this.middlewaresPath);
        const routesCandidate = normalizePath(this.routesPath);
        const cronjobsCandidate = normalizePath(this.cronjobsPath);

        const resolve = (p: string) => path.isAbsolute(p) ? p : path.join(baseDir, p);

        // Middlewares
        try {
            const fullPath = resolve(middlewaresCandidate);
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) await this.loadMiddlewares(fullPath);
            else if (isVerbose) console.log(`[Sprint] Middlewares folder not found at: ${fullPath}, skipping.`);
        } catch (err) {
            console.error("[Sprint] Failed to load middlewares:", err);
        }

        // Routes
        try {
            const fullPath = resolve(routesCandidate);
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) await this.loadRoutes(fullPath);
            else console.warn(`[Sprint] Routes folder not found at: ${fullPath}`);
        } catch (err) {
            console.error("[Sprint] Failed to load routes:", err);
        }

        // Cronjobs.
        try {
            const fullPath = resolve(cronjobsCandidate);
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) await this.loadCronJobs(fullPath);
            else if (isVerbose) console.log(`[Sprint] Cronjobs folder not found at: ${fullPath}, skipping.`);
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
        const fileExtensions = isProd ? [".mjs", ".js"] : [".ts"];
        const files = await fs.promises.readdir(middlewaresPath);

        for (const file of files) {
            const filePath = path.join(middlewaresPath, file);
            const stat = await fs.promises.stat(filePath);

            if (stat.isFile() && fileExtensions.some(ext => file.endsWith(ext))) {
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
                        this.counters.middlewares++;
                        if (isVerbose) console.log(`[Sprint] Loaded middleware: ${name} (priority: ${config.priority ?? 100})`);
                    }
                } catch (err) {
                    console.warn(`[Sprint] Failed to load middleware ${filePath}:`, err);
                }
            }
        }

        // Sort middlewares by priority after loading.
        this.loadedMiddlewares.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
    };

    private loadHealthcheck(): void {
        const healthRoutes = this.prefix
            ? [`${this.prefix}/health`, `${this.prefix}/healthcheck`]
            : ["/health", "/healthcheck"];

        this.app.get(healthRoutes, (_, res) => {
            const healthcheckXml = `<?xml version="1.0" encoding="UTF-8"?>
<health>
    <status>ok</status>
    <uptime>${process.uptime().toFixed(2)}</uptime>
</health>`;

            res.setHeader("Content-Type", "application/xml");
            res.send(healthcheckXml);
        });
    };

    private async loadRoutes(routesPath: string) {
        const fileExtensions = isProd ? [".mjs", ".js"] : [".ts"];
        const walkDir = async (dir: string) => {
            const files = await fs.promises.readdir(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = await fs.promises.stat(filePath);

                if (stat.isDirectory()) await walkDir(filePath);
                else if (stat.isFile() && fileExtensions.some(ext => file.endsWith(ext))) {
                    try {
                        const moduleUrl = pathToFileURL(filePath).href;
                        const module = await import(moduleUrl);

                        const router: ExpressRouter | undefined = module.default || module.router;

                        if (router && typeof router === "function" && router.stack && Array.isArray(router.stack)) {
                            let routePath = "/" + path.relative(routesPath, filePath).replace(/\.(ts|js|mjs)$/, "").replace(/\\/g, "/");

                            // Strip route groups (folders wrapped in parentheses) from the path.
                            routePath = stripRouteGroups(routePath);

                            if (routePath.endsWith("/index")) routePath = routePath.slice(0, -6) || "/";

                            // Apply global prefix.
                            const fullRoute = this.prefix + (routePath === "/" ? "" : routePath);
                            const finalRoute = fullRoute || "/";

                            // Register routes for OpenAPI.
                            if (this.openapi.generateOnBuild) {
                                if (!this.registeredRoutes) (this as any).registeredRoutes = [];

                                for (const layer of router.stack) {
                                    if (!layer.route) continue;

                                    const route = layer.route;

                                    for (const routeLayer of route.stack) {
                                        // routeLayer.handle can be a single handler or an array of handlers
                                        const handlers = Array.isArray(routeLayer.handle) ? routeLayer.handle : [routeLayer.handle];

                                        // Find the schema in the handlers (it's usually the first one)
                                        let schema: any;
                                        for (const handler of handlers) {
                                            schema = (handler as any).__sprintRouteSchema;
                                            if (schema) break;
                                        }

                                        const method = (routeLayer.method || "").toUpperCase();

                                        if (method) {
                                            (this as any).registeredRoutes.push({
                                                method,
                                                path: finalRoute + route.path,
                                                schema
                                            });
                                        }
                                    }
                                }
                            }

                            // Get matching middlewares for this route (match against path without prefix for middleware patterns).
                            const routeMiddlewares = this.getMiddlewaresForRoute(routePath);

                            if (routeMiddlewares.length > 0) {
                                this.app.use(finalRoute, ...routeMiddlewares, router);
                                if (isVerbose) console.log(`[Sprint] Loaded route: ${finalRoute} -> ${filePath} (with ${routeMiddlewares.length} middleware(s))`);
                            } else {
                                this.app.use(finalRoute, router);
                                if (isVerbose) console.log(`[Sprint] Loaded route: ${finalRoute} -> ${filePath}`);
                            }
                            this.counters.routes += router.stack.length;
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
        const fileExtensions = isProd ? [".mjs", ".js"] : [".ts"];
        const files = await fs.promises.readdir(cronjobsPath);

        for (const file of files) {
            const filePath = path.join(cronjobsPath, file);
            const stat = await fs.promises.stat(filePath);

            if (stat.isFile() && fileExtensions.some(ext => file.endsWith(ext))) {
                try {
                    const moduleUrl = pathToFileURL(filePath).href;
                    await import(moduleUrl);
                    if (isVerbose) console.log(`[Sprint] Loaded cronjob: ${file.replace(/\.(ts|js)$/, "")}`);
                    this.counters.cronjobs++;
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

    private generateOpenAPISpec() {
        const paths: any = {};

        for (const route of this.registeredRoutes || []) {
            const method = route.method.toLowerCase();

            if (!paths[route.path]) paths[route.path] = {};

            const routeSpec: any = {
                summary: "Auto generated by Sprint",
                responses: {
                    "200": {
                        description: "Success"
                    }
                }
            };

            let allParams: any[] = [];

            // Add request body schema if defined (only for non-GET/HEAD/DELETE methods).
            if (route.schema?.body && !["GET", "HEAD", "DELETE"].includes(route.method)) {
                try {
                    const bodySchema = this.zodSchemaToOpenAPI(route.schema.body);
                    if (Object.keys(bodySchema).length > 0) {
                        routeSpec.requestBody = {
                            content: {
                                "application/json": {
                                    schema: bodySchema
                                }
                            }
                        };
                    }
                } catch (e) {
                    console.warn("[Sprint] Failed to convert body schema:", e);
                }
            }

            // Add query params schema if defined
            if (route.schema?.queryParams) {
                try {
                    const params = this.zodParamsToOpenAPI(route.schema.queryParams);
                    if (params.length > 0) allParams.push(...params);
                } catch (e) {
                    console.warn("[Sprint] Failed to convert query params schema:", e);
                }
            }

            // Add headers schema if defined
            if (route.schema?.headers) {
                try {
                    const headers = this.zodHeadersToOpenAPI(route.schema.headers);
                    if (headers.length > 0) allParams.push(...headers);
                } catch (e) {
                    console.warn("[Sprint] Failed to convert headers schema:", e);
                }
            }

            // Add route sprint.authorization if defined
            if (route.schema?.sprint?.authorization) {
                const authSchema = route.schema.sprint.authorization;
                const description = authSchema._def?.description;
                let sources: string[] = ["query:token", "headers:authorization"];

                if (description) {
                    try {
                        const parsed = JSON.parse(description);
                        if (parsed.__sprintAuthorization && parsed.sources) sources = Array.isArray(parsed.sources) ? parsed.sources : [parsed.sources];
                    } catch { }
                }

                const isRequired = sources.length === 1;

                for (const source of sources) {
                    const [type, key] = source.split(":");
                    if (type === "query") {
                        allParams.push({
                            name: key,
                            in: "query",
                            required: isRequired,
                            schema: { type: "string" }
                        });
                    } else if (type === "headers") {
                        allParams.push({
                            name: key,
                            in: "header",
                            required: isRequired,
                            schema: { type: "string" }
                        });
                    }
                }
            }

            // Add middleware schemas for this route
            if (this.openapi.generateOnBuild) {
                try {
                    const routeMiddlewares = this.getMiddlewaresForRoute(route.path);

                    for (const mw of this.loadedMiddlewares) {
                        const includePatterns = Array.isArray(mw.include) ? mw.include : [mw.include || "/**"];
                        const excludePatterns = Array.isArray(mw.exclude) ? mw.exclude : (mw.exclude ? [mw.exclude] : []);

                        const isIncluded = matchesPatterns(includePatterns, route.path);
                        const isExcluded = excludePatterns.length > 0 && matchesPatterns(excludePatterns, route.path);

                        if (isIncluded && !isExcluded && (mw as any).__sprintMiddlewareSchema) {
                            const mwSchema = (mw as any).__sprintMiddlewareSchema;

                            if (mwSchema.queryParams) {
                                const params = this.zodParamsToOpenAPI(mwSchema.queryParams);
                                if (params.length > 0) allParams.push(...params);
                            }

                            if (mwSchema.headers) {
                                const headers = this.zodHeadersToOpenAPI(mwSchema.headers);
                                if (headers.length > 0) allParams.push(...headers);
                            }

                            if (mwSchema.sprint?.authorization) {
                                const authSchema = mwSchema.sprint.authorization;
                                const description = authSchema._def?.description;
                                let sources: string[] = ["query:token", "headers:authorization"];

                                if (description) {
                                    try {
                                        const parsed = JSON.parse(description);
                                        if (parsed.__sprintAuthorization && parsed.sources) sources = Array.isArray(parsed.sources) ? parsed.sources : [parsed.sources];
                                    } catch { }
                                }

                                const isRequired = sources.length === 1;

                                for (const source of sources) {
                                    const [type, key] = source.split(":");
                                    if (type === "query") {
                                        allParams.push({
                                            name: key,
                                            in: "query",
                                            required: isRequired,
                                            schema: { type: "string" }
                                        });
                                    } else if (type === "headers") {
                                        allParams.push({
                                            name: key,
                                            in: "header",
                                            required: isRequired,
                                            schema: { type: "string" }
                                        });
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.warn("[Sprint] Failed to add middleware schemas to OpenAPI:", e);
                }
            }

            if (allParams.length > 0) {
                const uniqueParams = allParams.filter((param, index, self) => index === self.findIndex((p) => p.name === param.name && p.in === param.in));
                routeSpec.parameters = uniqueParams;
            }

            paths[route.path][method] = routeSpec;
        }

        return {
            openapi: "3.0.0",
            info: {
                title: "Sprint API",
                version: "1.0.0"
            },
            paths
        };
    };

    private zodSchemaToOpenAPI(schema: any): any {
        if (!schema) return {};

        // Handle ZodObject
        if (schema._def?.typeName === "ZodObject" || schema.shape) {
            const shape = schema.shape || schema._def?.shape();
            if (!shape) return {};

            const properties: any = {};
            const required: string[] = [];

            for (const [key, value] of Object.entries(shape)) {
                const zodDef = (value as any)._def;
                const typeName = zodDef?.typeName;

                let propSchema: any = {};

                if (typeName === "ZodString") propSchema = { type: "string" };
                else if (typeName === "ZodNumber") propSchema = { type: "number" };
                else if (typeName === "ZodBoolean") propSchema = { type: "boolean" };
                else if (typeName === "ZodArray") propSchema = { type: "array", items: this.zodSchemaToOpenAPI(zodDef?.type) };
                else if (typeName === "ZodObject") propSchema = this.zodSchemaToOpenAPI(zodDef?.type);
                else if (typeName === "ZodOptional") continue;
                else propSchema = { type: "string" };

                properties[key] = propSchema;

                // Check if required (not optional)
                if (!zodDef?.isOptional && typeName !== "ZodOptional") required.push(key);
            }

            return { type: "object", properties, required: required.length > 0 ? required : undefined };
        }

        return {};
    };

    private zodParamsToOpenAPI(schema: any): any[] {
        if (!schema) return [];

        const params: any[] = [];
        const shape = schema.shape || schema._def?.shape();

        if (!shape) return [];

        for (const [key, value] of Object.entries(shape)) {
            const zodDef = (value as any)._def;
            const typeName = zodDef?.typeName;

            let paramSchema: any = {};

            if (typeName === "ZodString") paramSchema = { type: "string" };
            else if (typeName === "ZodNumber") paramSchema = { type: "number" };
            else if (typeName === "ZodBoolean") paramSchema = { type: "boolean" };
            else paramSchema = { type: "string" };

            params.push({
                name: key,
                in: "query",
                required: !zodDef?.isOptional,
                schema: paramSchema
            });
        }

        return params;
    };

    private zodHeadersToOpenAPI(schema: any): any[] {
        if (!schema) return [];

        const headers: any[] = [];
        const shape = schema.shape || schema._def?.shape();

        if (!shape) return [];

        for (const [key, value] of Object.entries(shape)) {
            const zodDef = (value as any)._def;
            const typeName = zodDef?.typeName;

            let paramSchema: any = {};

            if (typeName === "ZodString") paramSchema = { type: "string" };
            else if (typeName === "ZodNumber") paramSchema = { type: "number" };
            else if (typeName === "ZodBoolean") paramSchema = { type: "boolean" };
            else paramSchema = { type: "string" };

            headers.push({
                name: key,
                in: "header",
                required: !zodDef?.isOptional,
                schema: paramSchema
            });
        }

        return headers;
    };

    // HTTP Methods (prefix is applied automatically).
    public get(path: string, handler: Handler) { return this.app.get(this.applyPrefix(path), handler); }
    public post(path: string, handler: Handler) { return this.app.post(this.applyPrefix(path), handler); }
    public put(path: string, handler: Handler) { return this.app.put(this.applyPrefix(path), handler); }
    public delete(path: string, handler: Handler) { return this.app.delete(this.applyPrefix(path), handler); }
    public patch(path: string, handler: Handler) { return this.app.patch(this.applyPrefix(path), handler); }
    public use(pathOrHandler: string | Handler | MiddlewareConfig, maybeHandler?: Handler) {
        if (typeof pathOrHandler === "string" && maybeHandler) return this.app.use(this.applyPrefix(pathOrHandler), maybeHandler);

        if (pathOrHandler && typeof pathOrHandler === "object" && "handler" in pathOrHandler) {
            const config = pathOrHandler as MiddlewareConfig;
            const handlers = Array.isArray(config.handler) ? config.handler : [config.handler];
            return this.app.use(...handlers);
        }

        return this.app.use(pathOrHandler as Handler);
    };

    public setGraphQLSchema(schema: any): void {
        this.graphqlSchema = schema;
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
                console.log(`   ${dim}Local:${reset}                http://localhost:${bold}${port}${reset}`);
                console.log(`   ${dim}Prefix:${reset}               ${bold}${prefixInfo}${reset}`);
                console.log(`   ${dim}Healthcheck:${reset}          http://localhost:${port}/healthcheck ${dim}(also available at /health)${reset}`);
                console.log("");
                console.log(`   ${dim}Loaded routes:${reset}        ${bold}${this.counters.routes}${reset}`);
                console.log(`   ${dim}Loaded middlewares:${reset}   ${bold}${this.counters.middlewares}${reset}`);
                console.log(`   ${dim}Loaded cronjobs:${reset}      ${bold}${this.counters.cronjobs}${reset}`);

                if (this.openapi.generateOnBuild || this.openapi.swaggerUi.enabled) console.log("");
                if (this.openapi.generateOnBuild) console.log(`   ${dim}OpenAPI Spec:${reset}         http://localhost:${port}${this.openapi.path}`);
                if (this.openapi.swaggerUi.enabled) console.log(`   ${dim}Swagger UI:${reset}           http://localhost:${port}${this.openapi.swaggerUi.path}`);
                if (this.graphql.enabled || this.graphql.graphiql.enabled) console.log("");
                if (this.graphql.enabled) console.log(`   ${dim}GraphQL API:${reset}          http://localhost:${port}${this.graphql.path}`);
                if (this.graphql.graphiql.enabled) console.log(`   ${dim}GraphQL Playground:${reset}   http://localhost:${port}${this.graphql.graphiql.path}`);
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
        if (callback) callback();
    };
};