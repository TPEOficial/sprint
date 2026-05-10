import crypto from "crypto";
import { EventEmitter } from "events";
import type { Job, JobHandler, JobOptions, QueueAdapter, PubSubAdapter } from "./types";

interface InternalJob<T> extends Job<T> {
    _state: "waiting" | "delayed" | "active" | "completed" | "failed";
    _error?: string;
}

function computeBackoff(attempt: number, options: JobOptions["backoff"]): number {
    if (!options) return 0;
    const base = options.delay;
    if (options.type === "fixed") return base;
    const exp = base * Math.pow(2, attempt - 1);
    return options.maxDelay ? Math.min(exp, options.maxDelay) : exp;
};

export interface MemoryQueueOptions {
    /** Max concurrent jobs in process. Default: 1 */
    concurrency?: number;
    /** Default attempts. Default: 3 */
    defaultAttempts?: number;
}

export class MemoryQueue<T = unknown> extends EventEmitter implements QueueAdapter<T> {
    public readonly name: string;
    private waiting: InternalJob<T>[] = [];
    private delayed: InternalJob<T>[] = [];
    private active = 0;
    private dlq: InternalJob<T>[] = [];
    private idempotencyKeys = new Set<string>();
    private handler: JobHandler<T> | null = null;
    private concurrency: number;
    private defaultAttempts: number;
    private paused = false;
    private timer: NodeJS.Timeout | null = null;
    private closed = false;

    constructor(name: string, options: MemoryQueueOptions = {}) {
        super();
        this.name = name;
        this.concurrency = options.concurrency ?? 1;
        this.defaultAttempts = options.defaultAttempts ?? 3;
        this.timer = setInterval(() => this.tick(), 100);
        this.timer.unref?.();
    };

    async add(jobName: string, data: T, options: JobOptions = {}): Promise<Job<T>> {
        if (this.closed) throw new Error(`Queue ${this.name} is closed`);
        if (options.idempotencyKey && this.idempotencyKeys.has(options.idempotencyKey)) return { id: options.idempotencyKey, name: jobName, data, attemptsMade: 0, options, createdAt: Date.now(), processOn: Date.now() };
        if (options.idempotencyKey) this.idempotencyKeys.add(options.idempotencyKey);

        const now = Date.now();
        const job: InternalJob<T> = {
            id: options.idempotencyKey ?? crypto.randomUUID(),
            name: jobName,
            data,
            attemptsMade: 0,
            options: { attempts: this.defaultAttempts, ...options },
            createdAt: now,
            processOn: now + (options.delay ?? 0),
            _state: (options.delay ?? 0) > 0 ? "delayed" : "waiting"
        };

        if (job._state === "delayed") this.delayed.push(job);
        else this.insertWaiting(job);

        this.emit("added", job);
        return job;
    };

    private insertWaiting(job: InternalJob<T>): void {
        const priority = job.options.priority ?? 0;
        let i = 0;
        while (i < this.waiting.length && (this.waiting[i].options.priority ?? 0) <= priority) i++;
        this.waiting.splice(i, 0, job);
    };

    process(handler: JobHandler<T>, concurrency?: number): void {
        if (this.handler) throw new Error(`Queue ${this.name} already has a processor`);
        this.handler = handler;
        if (concurrency) this.concurrency = concurrency;
    };

    private tick(): void {
        if (this.closed || this.paused || !this.handler) return;
        const now = Date.now();

        for (let i = this.delayed.length - 1; i >= 0; i--) {
            if (this.delayed[i].processOn <= now) {
                const j = this.delayed.splice(i, 1)[0];
                j._state = "waiting";
                this.insertWaiting(j);
            }
        }

        while (this.active < this.concurrency && this.waiting.length > 0) {
            const job = this.waiting.shift()!;
            if (job.processOn > now) { this.delayed.push(job); job._state = "delayed"; continue; }
            this.runJob(job);
        }
    };

    private async runJob(job: InternalJob<T>): Promise<void> {
        this.active++;
        job._state = "active";
        job.attemptsMade++;
        try {
            const result = await this.handler!(job);
            job._state = "completed";
            this.emit("completed", job, result);
        } catch (err) {
            const e = err as Error;
            job._error = e.message;
            const max = job.options.attempts ?? this.defaultAttempts;
            if (job.attemptsMade < max) {
                const wait = computeBackoff(job.attemptsMade, job.options.backoff ?? { type: "exponential", delay: 1000 });
                job.processOn = Date.now() + wait;
                job._state = "delayed";
                this.delayed.push(job);
                this.emit("retry", job, e);
            } else {
                job._state = "failed";
                this.dlq.push(job);
                this.emit("failed", job, e);
            }
        } finally {
            this.active--;
        }
    };

    async getDeadLetter(): Promise<Job<T>[]> {
        return this.dlq.map(({ _state, _error, ...rest }) => rest);
    };

    async pause(): Promise<void> { this.paused = true; }
    async resume(): Promise<void> { this.paused = false; }

    async close(): Promise<void> {
        this.closed = true;
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        this.removeAllListeners();
    };
};

export class MemoryPubSub implements PubSubAdapter {
    private channels = new Map<string, Set<(msg: any) => void | Promise<void>>>();
    private closed = false;

    async publish(channel: string, message: unknown): Promise<void> {
        if (this.closed) return;
        const subs = this.channels.get(channel);
        if (!subs) return;
        for (const sub of subs) {
            try { await sub(message); }
            catch { /* swallow per-subscriber errors */ }
        }
    };

    async subscribe(channel: string, handler: (message: any) => void | Promise<void>): Promise<() => Promise<void>> {
        if (this.closed) throw new Error("PubSub is closed");
        let set = this.channels.get(channel);
        if (!set) { set = new Set(); this.channels.set(channel, set); }
        set.add(handler);
        return async () => {
            set!.delete(handler);
            if (set!.size === 0) this.channels.delete(channel);
        };
    };

    async close(): Promise<void> {
        this.closed = true;
        this.channels.clear();
    };
};