type Lang = "typescript" | "javascript";

export function getQueueService(language: Lang, choice: "memory" | "bullmq"): string {
    if (choice === "bullmq") {
        if (language === "typescript") {
            return `import { defineQueue, BullMQQueue } from "sprint-es/queue";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
    maxRetriesPerRequest: null
});

export interface EmailJob {
    to: string;
    subject: string;
    body: string;
}

export const emails = defineQueue<EmailJob>({
    name: "emails",
    adapter: new BullMQQueue<EmailJob>({
        queue: new Queue("emails", { connection }),
        workerFactory: (proc) => new Worker("emails", proc, { connection, concurrency: 4 }),
        defaultAttempts: 5
    })
});

emails.process(async (job) => {
    console.log(\`[emails] sending \${job.data.subject} to \${job.data.to} (attempt \${job.attemptsMade})\`);
    // TODO: integrate your SMTP / provider here.
});
`;
        }
        return `import { defineQueue, BullMQQueue } from "sprint-es/queue";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
    maxRetriesPerRequest: null
});

export const emails = defineQueue({
    name: "emails",
    adapter: new BullMQQueue({
        queue: new Queue("emails", { connection }),
        workerFactory: (proc) => new Worker("emails", proc, { connection, concurrency: 4 }),
        defaultAttempts: 5
    })
});

emails.process(async (job) => {
    console.log(\`[emails] sending \${job.data.subject} to \${job.data.to} (attempt \${job.attemptsMade})\`);
    // TODO: integrate your SMTP / provider here.
});
`;
    }

    // memory
    if (language === "typescript") {
        return `import { defineQueue } from "sprint-es/queue";

export interface EmailJob {
    to: string;
    subject: string;
    body: string;
}

export const emails = defineQueue<EmailJob>({ name: "emails" });

emails.process(async (job) => {
    console.log(\`[emails] sending \${job.data.subject} to \${job.data.to} (attempt \${job.attemptsMade})\`);
    // TODO: integrate your SMTP / provider here.
});
`;
    }
    return `import { defineQueue } from "sprint-es/queue";

export const emails = defineQueue({ name: "emails" });

emails.process(async (job) => {
    console.log(\`[emails] sending \${job.data.subject} to \${job.data.to} (attempt \${job.attemptsMade})\`);
    // TODO: integrate your SMTP / provider here.
});
`;
}

export function getCacheService(language: Lang, choice: "memory" | "redis"): string {
    if (choice === "redis") {
        if (language === "typescript") {
            return `import { defineCache, RedisCache } from "sprint-es/cache";
import IORedis from "ioredis";

const client = new IORedis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");

export const cache = defineCache({
    name: "main",
    adapter: new RedisCache({ client, prefix: "app:cache:", defaultTtlMs: 60_000 })
});
`;
        }
        return `import { defineCache, RedisCache } from "sprint-es/cache";
import IORedis from "ioredis";

const client = new IORedis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");

export const cache = defineCache({
    name: "main",
    adapter: new RedisCache({ client, prefix: "app:cache:", defaultTtlMs: 60_000 })
});
`;
    }

    // memory
    if (language === "typescript") {
        return `import { defineCache, MemoryCache } from "sprint-es/cache";

export const cache = defineCache({
    name: "main",
    adapter: new MemoryCache({ maxEntries: 10_000, defaultTtlMs: 60_000 })
});
`;
    }
    return `import { defineCache, MemoryCache } from "sprint-es/cache";

export const cache = defineCache({
    name: "main",
    adapter: new MemoryCache({ maxEntries: 10_000, defaultTtlMs: 60_000 })
});
`;
}

export function getTrpcRouter(language: Lang): string {
    if (language === "typescript") {
        return `import { initTRPC } from "@trpc/server";
import { z } from "sprint-es/schemas";

const t = initTRPC.create();

export const appRouter = t.router({
    hello: t.procedure
        .input(z.object({ name: z.string() }))
        .query(({ input }) => ({ greeting: \`Hello, \${input.name}!\` })),

    createUser: t.procedure
        .input(z.object({ email: z.string().email(), name: z.string().min(1) }))
        .mutation(async ({ input }) => {
            // TODO: persist user
            return { id: crypto.randomUUID(), ...input };
        })
});

export type AppRouter = typeof appRouter;
`;
    }
    return `import { initTRPC } from "@trpc/server";
import { z } from "sprint-es/schemas";

const t = initTRPC.create();

export const appRouter = t.router({
    hello: t.procedure
        .input(z.object({ name: z.string() }))
        .query(({ input }) => ({ greeting: \`Hello, \${input.name}!\` })),

    createUser: t.procedure
        .input(z.object({ email: z.string().email(), name: z.string().min(1) }))
        .mutation(async ({ input }) => {
            return { id: crypto.randomUUID(), ...input };
        })
});
`;
}

export function getGrpcServer(language: Lang): string {
    if (language === "typescript") {
        return `import { createGrpcServer } from "sprint-es/grpc";
import * as grpc from "@grpc/grpc-js";

// Minimal greeter service using a service definition.
// Replace with proto-loaded service in production via @grpc/proto-loader.
const greeterServiceDefinition: grpc.ServiceDefinition = {
    SayHello: {
        path: "/Greeter/SayHello",
        requestStream: false,
        responseStream: false,
        requestSerialize: (v: { name: string }) => Buffer.from(JSON.stringify(v)),
        requestDeserialize: (b: Buffer) => JSON.parse(b.toString()),
        responseSerialize: (v: { message: string }) => Buffer.from(JSON.stringify(v)),
        responseDeserialize: (b: Buffer) => JSON.parse(b.toString())
    }
};

export async function startGrpcServer() {
    return await createGrpcServer({
        address: process.env.GRPC_ADDRESS ?? "0.0.0.0:50051",
        services: [
            {
                service: greeterServiceDefinition,
                implementation: {
                    SayHello: (call: grpc.ServerUnaryCall<{ name: string }, { message: string }>, callback: grpc.sendUnaryData<{ message: string }>) => {
                        callback(null, { message: \`Hello, \${call.request.name}!\` });
                    }
                }
            }
        ]
    });
}
`;
    }
    return `import { createGrpcServer } from "sprint-es/grpc";

const greeterServiceDefinition = {
    SayHello: {
        path: "/Greeter/SayHello",
        requestStream: false,
        responseStream: false,
        requestSerialize: (v) => Buffer.from(JSON.stringify(v)),
        requestDeserialize: (b) => JSON.parse(b.toString()),
        responseSerialize: (v) => Buffer.from(JSON.stringify(v)),
        responseDeserialize: (b) => JSON.parse(b.toString())
    }
};

export async function startGrpcServer() {
    return await createGrpcServer({
        address: process.env.GRPC_ADDRESS ?? "0.0.0.0:50051",
        services: [
            {
                service: greeterServiceDefinition,
                implementation: {
                    SayHello: (call, callback) => {
                        callback(null, { message: \`Hello, \${call.request.name}!\` });
                    }
                }
            }
        ]
    });
}
`;
}

export function getWebSocketScaffold(language: Lang): string {
    if (language === "typescript") {
        return `import type { WebSocketHandler, WebSocket } from "sprint-es/ws";

export const chatHandler: WebSocketHandler = {
    onConnection: (socket: WebSocket, request) => {
        console.log(\`[ws] client connected from \${request.socket.remoteAddress}\`);
        socket.on("message", (raw) => {
            const text = raw.toString();
            socket.send(JSON.stringify({ echo: text, ts: Date.now() }));
        });
        socket.on("close", () => console.log("[ws] client disconnected"));
    }
};
`;
    }
    return `export const chatHandler = {
    onConnection: (socket, request) => {
        console.log(\`[ws] client connected from \${request.socket.remoteAddress}\`);
        socket.on("message", (raw) => {
            const text = raw.toString();
            socket.send(JSON.stringify({ echo: text, ts: Date.now() }));
        });
        socket.on("close", () => console.log("[ws] client disconnected"));
    }
};
`;
}
