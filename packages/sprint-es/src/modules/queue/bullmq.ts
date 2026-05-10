import type { Job, JobHandler, JobOptions, QueueAdapter, PubSubAdapter } from "./types";

export interface BullMQQueueOptions {
    /** Pre-built BullMQ Queue instance (peer dep "bullmq"). */
    queue: any;
    /** Pre-built BullMQ Worker factory: (processor) => Worker. */
    workerFactory?: (processor: (job: any) => Promise<unknown>) => any;
    /** Default attempts. Default: 3 */
    defaultAttempts?: number;
}

export class BullMQQueue<T = unknown> implements QueueAdapter<T> {
    public readonly name: string;
    private queue: any;
    private workerFactory?: (processor: (job: any) => Promise<unknown>) => any;
    private worker: any = null;
    private defaultAttempts: number;

    constructor(options: BullMQQueueOptions) {
        if (!options.queue) throw new Error("BullMQQueue: 'queue' (BullMQ Queue instance) is required");
        this.queue = options.queue;
        this.name = options.queue.name;
        this.workerFactory = options.workerFactory;
        this.defaultAttempts = options.defaultAttempts ?? 3;
    };

    async add(jobName: string, data: T, options: JobOptions = {}): Promise<Job<T>> {
        const bullOpts: any = {
            attempts: options.attempts ?? this.defaultAttempts,
            delay: options.delay,
            priority: options.priority,
            removeOnComplete: options.removeOnComplete,
            removeOnFail: options.removeOnFail,
            jobId: options.idempotencyKey
        };
        if (options.backoff) bullOpts.backoff = { type: options.backoff.type === "fixed" ? "fixed" : "exponential", delay: options.backoff.delay };
        const job = await this.queue.add(jobName, data, bullOpts);
        return {
            id: job.id,
            name: job.name,
            data: job.data,
            attemptsMade: job.attemptsMade ?? 0,
            options,
            createdAt: job.timestamp ?? Date.now(),
            processOn: (job.timestamp ?? Date.now()) + (options.delay ?? 0)
        };
    };

    process(handler: JobHandler<T>, concurrency?: number): void {
        if (!this.workerFactory) throw new Error("BullMQQueue: 'workerFactory' required to process jobs");
        if (this.worker) throw new Error(`Queue ${this.name} already has a worker`);
        this.worker = this.workerFactory(async (bullJob: any) => {
            const job: Job<T> = {
                id: bullJob.id,
                name: bullJob.name,
                data: bullJob.data,
                attemptsMade: bullJob.attemptsMade ?? 0,
                options: {},
                createdAt: bullJob.timestamp ?? Date.now(),
                processOn: bullJob.processedOn ?? Date.now()
            };
            return await handler(job);
        });
        if (concurrency && this.worker.concurrency !== undefined) this.worker.concurrency = concurrency;
    };

    async getDeadLetter(): Promise<Job<T>[]> {
        const failed = await this.queue.getFailed?.() ?? [];
        return failed.map((j: any) => ({
            id: j.id,
            name: j.name,
            data: j.data,
            attemptsMade: j.attemptsMade ?? 0,
            options: {},
            createdAt: j.timestamp ?? Date.now(),
            processOn: j.processedOn ?? Date.now()
        }));
    };

    async pause(): Promise<void> { await this.queue.pause?.(); }
    async resume(): Promise<void> { await this.queue.resume?.(); }

    async close(): Promise<void> {
        if (this.worker?.close) await this.worker.close();
        await this.queue.close?.();
    };
};

export interface BullMQPubSubOptions {
    /** ioredis-compatible publisher client. */
    publisher: any;
    /** ioredis-compatible subscriber client (separate connection). */
    subscriber: any;
}

export class BullMQPubSub implements PubSubAdapter {
    private publisher: any;
    private subscriber: any;
    private handlers = new Map<string, Set<(msg: any) => void | Promise<void>>>();
    private bound = false;

    constructor(options: BullMQPubSubOptions) {
        if (!options.publisher || !options.subscriber) throw new Error("BullMQPubSub: 'publisher' and 'subscriber' clients required");
        this.publisher = options.publisher;
        this.subscriber = options.subscriber;
    };

    private ensureBound(): void {
        if (this.bound) return;
        this.bound = true;
        this.subscriber.on("message", async (channel: string, message: string) => {
            const subs = this.handlers.get(channel);
            if (!subs) return;
            let parsed: any = message;
            try { parsed = JSON.parse(message); } catch { /* keep raw */ }
            for (const h of subs) {
                try { await h(parsed); }
                catch { /* swallow */ }
            }
        });
    };

    async publish(channel: string, message: unknown): Promise<void> {
        const payload = typeof message === "string" ? message : JSON.stringify(message);
        await this.publisher.publish(channel, payload);
    };

    async subscribe(channel: string, handler: (message: any) => void | Promise<void>): Promise<() => Promise<void>> {
        this.ensureBound();
        let set = this.handlers.get(channel);
        if (!set) {
            set = new Set();
            this.handlers.set(channel, set);
            await this.subscriber.subscribe(channel);
        }
        set.add(handler);
        return async () => {
            set!.delete(handler);
            if (set!.size === 0) {
                this.handlers.delete(channel);
                await this.subscriber.unsubscribe(channel);
            }
        };
    };

    async close(): Promise<void> {
        await this.publisher.quit?.();
        await this.subscriber.quit?.();
    };
};