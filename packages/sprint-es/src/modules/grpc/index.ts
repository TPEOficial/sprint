import { registerResource, onShutdown } from "../lifecycle";

export interface GrpcServiceDefinition {
    /** Service definition (from grpc-loader or generated proto). */
    service: any;
    /** Implementation: handler map keyed by method name. */
    implementation: Record<string, (...args: any[]) => any>;
}

export interface CreateGrpcServerOptions {
    /** Pre-built grpc.Server instance (peer dep "@grpc/grpc-js"). If omitted, one is created. */
    server?: any;
    /** Services to register. */
    services: GrpcServiceDefinition[];
    /** Bind address. Default: "0.0.0.0:50051" */
    address?: string;
    /** Server credentials. Default: insecure. */
    credentials?: any;
    /** Register on lifecycle. Default: true */
    registerLifecycle?: boolean;
    /** Graceful shutdown drain timeout (ms). Default: 10_000 */
    drainMs?: number;
}

export interface GrpcServerHandle {
    server: any;
    address: string;
    port: number;
    close: () => Promise<void>;
}

export async function createGrpcServer(options: CreateGrpcServerOptions): Promise<GrpcServerHandle> {
    let grpc: any;
    let server: any = options.server;

    if (!server) {
        try {
            // @ts-ignore - peer dep
            grpc = await import("@grpc/grpc-js");
        } catch {
            throw new Error("createGrpcServer: '@grpc/grpc-js' peer dependency not installed. Run 'npm install @grpc/grpc-js'.");
        }
        server = new grpc.Server();
    } else {
        try {
            // @ts-ignore - peer dep (only needed for credentials default)
            grpc = await import("@grpc/grpc-js");
        } catch { /* ok if user supplied credentials */ }
    }

    for (const svc of options.services) server.addService(svc.service, svc.implementation);

    const address = options.address ?? "0.0.0.0:50051";
    const credentials = options.credentials ?? grpc?.ServerCredentials.createInsecure();

    const port = await new Promise<number>((resolve, reject) => {
        server.bindAsync(address, credentials, (err: Error | null, port: number) => {
            if (err) return reject(err);
            resolve(port);
        });
    });

    const drainMs = options.drainMs ?? 10_000;

    const close = async () => {
        await new Promise<void>((resolve) => {
            const forced = setTimeout(() => {
                try { server.forceShutdown(); } catch { /* ignore */ }
                resolve();
            }, drainMs);
            forced.unref?.();
            server.tryShutdown(() => { clearTimeout(forced); resolve(); });
        });
    };

    if (options.registerLifecycle !== false) {
        registerResource(`grpc:${address}`, { close });
        onShutdown(close);
    }

    return { server, address, port, close };
};