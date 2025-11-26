import fs from "fs";
import http from "http";
import cors from "cors";
import path from "path";
import morgan from "morgan";
import dotenv from "dotenv";
import { pathToFileURL } from "url";
import express, { Application, RequestHandler, Router as ExpressRouter, Request, Response, NextFunction } from "express";

dotenv.config();

let __filename: string;
let __dirname: string;

try {
    // @ts-ignore
    __filename = __filename || new URL(import.meta.url).pathname;
    // @ts-ignore
    __dirname = __dirname || path.dirname(__filename);
} catch {
    __dirname = path.resolve();
    __filename = path.join(__dirname, "index.js");
}

type Handler = (req: Request, res: Response, next: NextFunction) => any;

interface SprintOptions {
    port?: string | number | null;
    routesPath?: string;
}

class Sprint {
    public app: Application;
    private port: string | number | null | undefined;
    private routesPath: string;
    private routesLoaded: Promise<void>;
    private server: http.Server;

    constructor({
        port = process.env.PORT,
        routesPath = "./routes"
    }: SprintOptions = {}) {
        this.app = express();
        this.port = port;
        this.routesPath = routesPath;
        this.server = http.createServer(this.app);
        this.loadDefaults();
        this.loadHealthcheck();
        this.routesLoaded = this.initRoutes();
    };

    private async initRoutes(): Promise<void> {
        try {
            const callerDir = process.argv[1] ? path.dirname(process.argv[1]) : process.cwd();
            const candidate = path.isAbsolute(this.routesPath) ? this.routesPath : path.join(callerDir, this.routesPath);
            if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) await this.loadRoutes(candidate);
            else console.log(`[Sprint] Routes folder not found at: ${candidate}, skipping route loading.`);
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
        this.app.use(express.json({ limit: "50mb" }));
        this.app.use(express.urlencoded({ limit: "50mb", extended: false }));
    };

    private loadHealthcheck(): void {
        const healthcheckXml = `<?xml version="1.0" encoding="UTF-8"?>
<health>
    <status>ok</status>
    <uptime>${process.uptime().toFixed(2)}</uptime>
</health>`;

        this.app.get("/healthcheck", (_, res) => {
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
                            let routePrefix = "/" + path.relative(routesPath, filePath)
                                .replace(/\.(ts|js)$/, "")
                                .replace(/\\/g, "/");

                            if (routePrefix.endsWith("/index")) routePrefix = routePrefix.slice(0, -6) || "/";

                            this.app.use(routePrefix, router);
                            console.log(`[Sprint] Loaded route: ${routePrefix} -> ${filePath}`);
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
        this.app.use((_req, res, _next) => res.status(404).send("Not Found"));
    };

    // HTTP Methods.
    public get(path: string, handler: Handler) { return this.app.get(path, handler); }
    public post(path: string, handler: Handler) { return this.app.post(path, handler); }
    public put(path: string, handler: Handler) { return this.app.put(path, handler); }
    public delete(path: string, handler: Handler) { return this.app.delete(path, handler); }
    public patch(path: string, handler: Handler) { return this.app.patch(path, handler); }
    public use(pathOrHandler: string | Handler, maybeHandler?: Handler) {
        if (typeof pathOrHandler === "string" && maybeHandler) return this.app.use(pathOrHandler, maybeHandler);
        return this.app.use(pathOrHandler as Handler);
    };

    public listen(callback?: () => void): void {
        const port = this.app.get("port");

        this.server.listen(port, () => {
            console.log("\x1b[32m%s\x1b[0m", `[Sprint] Server is running on port http://localhost:${port}/ or visit http://localhost:${port}/healthcheck`);
        });

        this.routesLoaded.then(() => {
            this.loadNotFound();
            if (callback) callback();
        });
    };
};

const Router = () => ExpressRouter();

export default Sprint;
export { __filename, __dirname, Router };